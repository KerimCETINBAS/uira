import { DataSource } from "./DataSource";
import { UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";

type NativeReturns<T extends unknown[]> = T & { readonly __tstlMultiReturn: unknown };
declare function UnitClass(this: void, unit: string): NativeReturns<[string | undefined, string | undefined, number | undefined]>;
declare function UnitGUID(this: void, unit: string): string | undefined;
declare function UnitIsUnit(this: void, first: string, second: string): boolean;
declare function UnitIsPlayer(this: void, unit: string): boolean;
declare const CanInspect: ((this: void, unit: string) => boolean) | undefined;
declare const NotifyInspect: ((this: void, unit: string) => void) | undefined;
declare function InCombatLockdown(this: void): boolean;
declare const C_SpecializationInfo: {
    GetNumSpecializationsForClassID?: (this: void, classId: number) => number;
    GetSpecializationInfo?: (this: void, index: number, inspect: boolean, pet: boolean, unit?: string, sex?: number, group?: number, classId?: number) => NativeReturns<[
        number, string | undefined, string | undefined, number | undefined, string | undefined, number | undefined, number | undefined
    ]>;
} | undefined;

export interface ClassInfo {
    readonly id: number;
    readonly token: string;
    readonly name: string;
}

export class ClassSource extends DataSource<ClassInfo | undefined> {
    private restricted = false;
    public readonly target: UnitSource;
    public constructor(unit: UnitInput) { super(undefined); this.target = resolveUnit(unit); }
    public get unit(): string { return this.target.Token; }
    protected override HasSecretFields(): boolean { return this.restricted; }
    protected override GetValue(): ClassInfo | undefined {
        this.restricted = false;
        const player = UnitIsPlayer(this.unit);
        if (issecretvalue(player)) { this.restricted = true; return undefined; }
        if (!player) return undefined;
        const [name, token, id] = UnitClass(this.unit);
        if (issecretvalue(name) || issecretvalue(token) || issecretvalue(id)) {
            this.restricted = true;
            return undefined;
        }
        if (name === undefined || token === undefined || id === undefined) return undefined;
        return { name, token, id };
    }
}

export interface SpecializationInfo {
    readonly id: number;
    readonly name?: string;
    readonly icon?: number;
    readonly role?: string;
    /** Native value when provided by the client; never estimated. */
    readonly pointsSpent?: number;
}

export type InspectStatus = "idle" | "pending" | "ready" | "unsupported";

/** Own data is read live; other units require an explicit inspect request. */
export class SpecSource extends DataSource<readonly SpecializationInfo[] | undefined> {
    private restricted = false;
    private snapshot?: readonly SpecializationInfo[];
    private snapshotGUID?: string;
    private listener?: wuiraNativeFrame;
    private status: InspectStatus = "idle";

    public readonly target: UnitSource;
    public constructor(unit: UnitInput) { super(undefined); this.target = resolveUnit(unit); }
    public get unit(): string { return this.target.Token; }
    public get Status(): InspectStatus {
        const guid = UnitGUID(this.unit);
        if (!issecretvalue(guid) && this.snapshotGUID !== undefined && guid !== this.snapshotGUID) return "idle";
        return this.status;
    }
    protected override HasSecretFields(): boolean { return this.restricted; }

    protected override GetValue(): readonly SpecializationInfo[] | undefined {
        const player = UnitIsPlayer(this.unit);
        if (issecretvalue(player)) { this.restricted = true; return undefined; }
        if (!player) { this.restricted = false; return undefined; }
        const self = UnitIsUnit(this.unit, "player");
        if (issecretvalue(self)) { this.restricted = true; return undefined; }
        if (self) return this.Read(false);
        const guid = UnitGUID(this.unit);
        if (issecretvalue(guid)) { this.restricted = true; return undefined; }
        if (guid === undefined || guid !== this.snapshotGUID) { this.restricted = false; return undefined; }
        return this.snapshot;
    }

    private Read(inspect: boolean): readonly SpecializationInfo[] | undefined {
        this.restricted = false;
        const api = C_SpecializationInfo;
        if (api?.GetNumSpecializationsForClassID === undefined || api.GetSpecializationInfo === undefined) {
            this.status = "unsupported";
            return undefined;
        }
        const classes = new ClassSource(this.target);
        if (classes.IsSecret()) { this.restricted = true; return undefined; }
        const info = classes.Value;
        if (info === undefined) return undefined;
        const count = api.GetNumSpecializationsForClassID(info.id);
        if (issecretvalue(count)) { this.restricted = true; return undefined; }
        if (!Number.isInteger(count) || count < 0 || count > 32) error("Specializations: invalid specialization count");
        const result: SpecializationInfo[] = [];
        for (let index = 1; index <= count; index++) {
            const [id, name, _description, icon, role, _stat, pointsSpent] = api.GetSpecializationInfo(index, inspect, false, inspect ? this.unit : undefined, undefined, undefined, info.id);
            if ([id, name, icon, role, pointsSpent].some(value => issecretvalue(value))) {
                this.restricted = true;
                return undefined;
            }
            if (id <= 0) return undefined;
            result.push({ id, name, icon, role, pointsSpent });
        }
        this.status = "ready";
        return result;
    }

    /** Returns false if an inspect cannot start. No request is made from a getter. */
    public RequestInspect(): boolean {
        this.Dispose();
        this.snapshot = undefined;
        this.snapshotGUID = undefined;
        this.restricted = false;
        const player = UnitIsPlayer(this.unit);
        if (issecretvalue(player)) { this.restricted = true; return false; }
        if (!player) return false;
        if (CanInspect === undefined || NotifyInspect === undefined || C_SpecializationInfo?.GetSpecializationInfo === undefined) {
            this.status = "unsupported";
            return false;
        }
        if (InCombatLockdown()) return false;
        const guid = UnitGUID(this.unit);
        if (issecretvalue(guid)) { this.restricted = true; return false; }
        const allowed = CanInspect(this.unit);
        if (issecretvalue(allowed)) { this.restricted = true; return false; }
        if (guid === undefined || !allowed) return false;
        this.snapshotGUID = guid;
        this.status = "pending";
        const listener = CreateFrame("Frame", undefined, UIParent);
        this.listener = listener;
        listener.RegisterEvent("INSPECT_READY");
        listener.SetScript("OnEvent", (_frame, _event, inspectedGUID) => {
            if (issecretvalue(inspectedGUID) || inspectedGUID !== guid) return;
            const current = UnitGUID(this.unit);
            if (issecretvalue(current) || current !== guid) { this.Dispose(); return; }
            this.snapshot = this.Read(true);
            this.StopListening();
            if (this.status === "pending") this.status = "idle";
        });
        NotifyInspect(this.unit);
        return true;
    }

    private StopListening(): void {
        this.listener?.UnregisterAllEvents();
        this.listener?.SetScript("OnEvent", undefined);
        this.listener?.Hide();
        this.listener = undefined;
    }

    public Dispose(): void {
        this.StopListening();
        this.status = "idle";
        this.snapshot = undefined;
        this.snapshotGUID = undefined;
    }
}

export { SpecSource as Specializations };
