import { DataSource } from "./DataSource";
import { GroupMembers } from "./GroupMembers";
import type { GroupScope } from "./GroupMembers";

declare function UnitGUID(this: void, unit: string): string | undefined;
declare function UnitFullName(this: void, unit: string): wuiraNativeReturns<[string | undefined, string | undefined]>;
declare function UnitExists(this: void, unit: string): boolean;
declare function GetRaidRosterInfo(this: void, index: number): wuiraNativeReturns<[string | undefined, number, number | undefined]>;

export interface GroupRosterMember { readonly key: string; readonly guid?: string; readonly unit: string; readonly pet: boolean; readonly group: string; }
export function getPetUnitToken(unit: string): string {
    if (unit === "player") return "pet";
    return unit.replace("party", "partypet").replace("raid", "raidpet");
}

/** Small snapshots describe identity/order only; keyed rendering owns widgets and unit sources. */
export class GroupRoster extends DataSource<readonly GroupRosterMember[]> {
    private readonly roster: GroupMembers;
    private readonly knownNames = new Map<string, string>();
    private snapshot: readonly GroupRosterMember[] = [];
    private restricted = false;
    public get Status(): "ready" | "restricted" { return this.restricted ? "restricted" : "ready"; }
    public constructor(private readonly scope: GroupScope = "auto", private readonly options: { pets?: boolean; includeSelfWhenSolo?: boolean } = {}) {
        super([]); this.roster = new GroupMembers(scope);
    }
    protected override GetValue(): readonly GroupRosterMember[] {
        this.restricted = this.roster.IsSecret();
        if (this.restricted) return this.snapshot;
        let units = [...this.roster.Value];
        if (units.length === 0 && this.options.includeSelfWhenSolo) units = ["player"];
        const members = units.map(unit => this.Read(unit, false));
        if (this.scope === "raid") members.sort((a, b) => Number(a.group) - Number(b.group) || Number(a.unit.slice(4)) - Number(b.unit.slice(4)));
        if (this.options.pets) for (const unit of units) {
            const pet = getPetUnitToken(unit), exists = UnitExists(pet);
            if (!issecretvalue(exists) && exists) members.push(this.Read(pet, true));
        }
        this.snapshot = members; return members;
    }
    private Read(unit: string, pet: boolean): GroupRosterMember {
        const rawGUID = UnitGUID(unit);
        const guid = issecretvalue(rawGUID) ? undefined : rawGUID;
        const [rawName, rawRealm] = UnitFullName(unit);
        let fullName = issecretvalue(rawName) || issecretvalue(rawRealm) || rawName === undefined ? undefined : rawName + "-" + (rawRealm ?? "");
        if (pet && fullName !== undefined) {
            const owner = unit === "pet" ? "player" : unit.replace("partypet", "party").replace("raidpet", "raid");
            const [name, realm] = UnitFullName(owner);
            fullName = (!issecretvalue(name) && !issecretvalue(realm) && name !== undefined ? name + "-" + (realm ?? "") : owner) + "/" + fullName;
        }
        if (guid !== undefined && fullName !== undefined) this.knownNames.set(fullName, guid);
        const identity = guid ?? (fullName === undefined ? undefined : this.knownNames.get(fullName));
        let group = "1";
        if (unit.startsWith("raid") && !pet) {
            const [, , subgroup] = GetRaidRosterInfo(Number(unit.slice(4)));
            if (!issecretvalue(subgroup) && subgroup !== undefined && subgroup >= 1 && subgroup <= 8) group = String(subgroup);
        }
        return { key: identity === undefined ? "name:" + (fullName ?? unit) : "guid:" + identity, guid, unit, pet, group };
    }
    public onChange(listener: (members: readonly GroupRosterMember[]) => void): () => void {
        return this.roster.onChange(() => listener(this.Value));
    }
    public Dispose(): void { this.roster.Dispose(); this.knownNames.clear(); this.snapshot = []; }
}
