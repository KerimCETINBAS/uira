import { DataSource } from "./DataSource";

declare const IsInRaid: ((this: void) => boolean) | undefined;
declare const GetNumGroupMembers: ((this: void) => number) | undefined;

export type GroupScope = "auto" | "party" | "raid";

/** Fresh roster tokens, including offline members. Tokens are not persistent identities. */
export class GroupMembers extends DataSource<readonly string[]> {
    private restricted = false;
    private readonly listeners = new Set<(units: readonly string[]) => void>();
    private frame?: wuiraNativeFrame;

    public constructor(public readonly scope: GroupScope = "auto") { super([]); }
    /** Roster/connection events, with one listener frame while observed. No polling. */
    public onChange(listener: (units: readonly string[]) => void): () => void {
        this.listeners.add(listener);
        if (this.listeners.size === 1) {
            this.frame ??= CreateFrame("Frame", undefined, UIParent);
            for (const event of ["GROUP_ROSTER_UPDATE", "UNIT_PET", "UNIT_CONNECTION", "UNIT_NAME_UPDATE", "PLAYER_ENTERING_WORLD"]) this.frame.RegisterEvent(event);
            this.frame.SetScript("OnEvent", () => {
                const units = this.GetValue(); if (this.restricted) return;
                for (const callback of this.listeners) callback(units);
            });
        }
        return () => { this.listeners.delete(listener); if (this.listeners.size === 0) this.StopListening(); };
    }
    private StopListening(): void { this.frame?.UnregisterAllEvents(); this.frame?.SetScript("OnEvent", undefined); this.frame?.Hide(); }
    public Dispose(): void { this.listeners.clear(); this.StopListening(); }

    protected override HasSecretFields(): boolean { return this.restricted; }

    protected override GetValue(): readonly string[] {
        this.restricted = false;
        if (IsInRaid === undefined || GetNumGroupMembers === undefined) {
            error("GroupMembers: this client does not expose the required group APIs");
        }
        const raid = IsInRaid();
        const count = GetNumGroupMembers();
        if (issecretvalue(raid) || issecretvalue(count)) {
            this.restricted = true;
            return [];
        }
        if (!Number.isInteger(count) || count < 0 || count > 1024) {
            error("GroupMembers: invalid group member count");
        }
        if (raid) {
            if (this.scope === "party") return [];
            const units: string[] = [];
            for (let index = 1; index <= count; index++) units.push(`raid${index}`);
            return units;
        }
        if (this.scope === "raid") return [];
        if (count === 0) return this.scope === "auto" ? ["player"] : [];
        const units = ["player"];
        // The native total includes the player; partyN tokens represent everyone else.
        for (let index = 1; index < count; index++) units.push(`party${index}`);
        return units;
    }
}

/** Includes the player in a party; empty when solo or in a raid. */
export class PartyMembers extends GroupMembers {
    public constructor() { super("party"); }
}

/** Includes the player through their raidN token; empty outside a raid. */
export class RaidMembers extends GroupMembers {
    public constructor() { super("raid"); }
}
