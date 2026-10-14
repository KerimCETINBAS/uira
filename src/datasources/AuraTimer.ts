import { TimerSource } from "./TimerSource";
import type { NativeDuration } from "./TimerSource";
import { TextureSource } from "./TextureSource";
import { UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";

export interface AuraTimerOptions {
    /** Spell IDs resolve to localized names, so different ranks share a lookup. */
    spellIds: readonly number[];
    filter?: "HELPFUL" | "HARMFUL" | "HELPFUL|PLAYER" | "HARMFUL|PLAYER";
}
export type AuraTimerStatus = "active" | "inactive" | "restricted" | "unavailable";

/** Selected aura duration and icon; selection policy belongs to the application. */
export class AuraTimer extends TimerSource {
    public readonly target: UnitSource;
    public readonly Texture: TextureSource;
    private status: AuraTimerStatus = "inactive";
    public constructor(unit: UnitInput, private readonly options: AuraTimerOptions) {
        const target = resolveUnit(unit);
        const events = ["UNIT_AURA", "PLAYER_ENTERING_WORLD", "PLAYER_TARGET_CHANGED", "PLAYER_FOCUS_CHANGED", "SPELLS_CHANGED"];
        super(() => this.ReadDuration(), events, target.Token);
        this.target = target;
        this.Texture = new TextureSource(() => this.ReadAura()?.icon, events, target.Token);
    }
    public get Status(): AuraTimerStatus { this.ReadAura(); return this.status; }

    private ReadAura(): wuiraNativeAuraData | undefined {
        const query = C_UnitAuras?.GetAuraDataBySpellName;
        const getName = C_Spell?.GetSpellName;
        if (query === undefined || getName === undefined) { this.status = "unavailable"; return undefined; }
        try {
            for (const id of this.options.spellIds) {
                const name = getName(id);
                if (issecretvalue(name)) { this.status = "restricted"; return undefined; }
                if (name === undefined) continue;
                const aura = query(this.target.Token, name, this.options.filter ?? "HELPFUL");
                if (issecretvalue(aura)) { this.status = "restricted"; return undefined; }
                if (aura !== undefined) { this.status = "active"; return aura; }
            }
            const restricted = C_Secrets?.ShouldAurasBeSecret?.();
            this.status = issecretvalue(restricted) || restricted === true ? "restricted" : "inactive";
        } catch { this.status = "unavailable"; }
        return undefined;
    }

    private ReadDuration(): NativeDuration | undefined {
        const aura = this.ReadAura();
        if (aura === undefined) return undefined;
        try {
            const id = aura.auraInstanceID;
            if (C_UnitAuras?.GetAuraDuration !== undefined && (issecretvalue(id) || id !== undefined)) {
                return C_UnitAuras.GetAuraDuration(this.target.Token, id!);
            }
            const total = aura.duration;
            const end = aura.expirationTime;
            if (issecretvalue(total) || issecretvalue(end)) { this.status = "restricted"; return undefined; }
            if (total === undefined || end === undefined || total <= 0) return undefined;
            if (C_DurationUtil === undefined) { this.status = "unavailable"; return undefined; }
            const timer = C_DurationUtil.CreateDuration();
            timer.SetTimeFromStart(end - total, total);
            return timer;
        } catch { this.status = "unavailable"; return undefined; }
    }
}
