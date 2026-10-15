import { DataSource } from "./DataSource";

declare function UnitGUID(this: void, unit: string): string | undefined;
declare function UnitIsPlayer(this: void, unit: string): boolean;
declare function UnitIsUnit(this: void, first: string, second: string): boolean;

export const Unit = { Player: "player", Target: "target", Focus: "focus" } as const;

export interface UnitIdentity {
    readonly token: string;
    readonly guid: string;
}

export class UnitPredicates {
    public constructor(private readonly token: () => string) {}
    public get PC(): boolean | undefined {
        const value = UnitIsPlayer(this.token());
        return issecretvalue(value) ? undefined : value;
    }
    public get Self(): boolean | undefined {
        const value = UnitIsUnit(this.token(), "player");
        return issecretvalue(value) ? undefined : value;
    }
}

/** Shared live unit reference; identity is read again rather than cached by token. */
export class UnitSource extends DataSource<UnitIdentity | undefined> {
    public readonly Is: UnitPredicates;
    private restricted = false;
    private readonly listeners = new Set<() => void>();
    public constructor(private token: string) {
        super(undefined);
        this.Is = new UnitPredicates(() => this.Token);
    }
    public get Token(): string { return this.token; }
    /** Keep source objects/subscriptions while a stable identity moves to another unit slot. */
    public Retarget(token: string): void {
        if (token === this.token) return;
        if (InCombatLockdown()) error("UnitSource: retarget after combat so secure actions and displayed data stay aligned");
        if (issecretvalue(token) || typeof token !== "string" || token.trim() === "") error("UnitSource: expected a public unit token");
        this.token = token;
        for (const listener of this.listeners) listener();
    }
    public onChange(listener: () => void): () => void {
        this.listeners.add(listener); return () => { this.listeners.delete(listener); };
    }
    protected override HasSecretFields(): boolean { return this.restricted; }
    protected override GetValue(): UnitIdentity | undefined {
        const guid = UnitGUID(this.Token);
        this.restricted = issecretvalue(guid);
        if (this.restricted || guid === undefined) return undefined;
        return { token: this.Token, guid };
    }
}

export type UnitInput = string | UnitSource;

/** Reuse explicit unit references; string inputs remain a convenience shorthand. */
export function resolveUnit(unit: UnitInput): UnitSource {
    return typeof unit === "string" ? new UnitSource(unit) : unit;
}
