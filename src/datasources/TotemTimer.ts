import { TimerSource } from "./TimerSource";
import type { NativeDuration } from "./TimerSource";

export type TotemTimerStatus = "active" | "inactive" | "restricted" | "unavailable";

/** Player-owned ground effects exposed by the game's totem API, across spell ranks. */
export class TotemTimer extends TimerSource {
    private status: TotemTimerStatus = "inactive";

    public constructor(public readonly spell: number | string) {
        super(() => this.ReadDuration(), ["PLAYER_TOTEM_UPDATE", "PLAYER_ENTERING_WORLD", "PLAYER_REGEN_ENABLED", "SPELLS_CHANGED"]);
    }

    public get Status(): TotemTimerStatus { this.ReadDuration(); return this.status; }

    private ReadDuration(): NativeDuration | undefined {
        if (GetTotemInfo === undefined || GetTotemDuration === undefined || GetNumTotemSlots === undefined) {
            this.status = "unavailable";
            return undefined;
        }
        const name = typeof this.spell === "string" ? this.spell : C_Spell?.GetSpellName?.(this.spell);
        if (issecretvalue(name)) { this.status = "restricted"; return undefined; }
        const slots = GetNumTotemSlots();
        if (issecretvalue(slots)) { this.status = "restricted"; return undefined; }
        let restricted = false;
        for (let slot = 1; slot <= slots; slot += 1) {
            const [active, effectName, , , , , spellId] = GetTotemInfo(slot);
            // Identity must be public; timings may stay opaque in the native duration.
            if (issecretvalue(active)) { restricted = true; continue; }
            if (!active) continue;
            const sameId = !issecretvalue(spellId) && spellId === this.spell;
            const sameName = !issecretvalue(effectName) && name !== undefined && effectName === name;
            if (!sameId && !sameName) {
                if (issecretvalue(spellId) || issecretvalue(effectName)) restricted = true;
                continue;
            }
            this.status = "active";
            return GetTotemDuration(slot);
        }
        this.status = restricted ? "restricted" : "inactive";
        return undefined;
    }
}
