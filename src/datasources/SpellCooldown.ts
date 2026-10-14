import { TimerSource } from "./TimerSource";

/** Native cooldown duration, including opaque timings during combat. */
export class SpellCooldown extends TimerSource {
    public constructor(public readonly spellId: number | string, options: { ignoreGCD?: boolean } = {}) {
        super(() => C_Spell?.GetSpellCooldownDuration?.(spellId, options.ignoreGCD ?? false), ["SPELL_UPDATE_COOLDOWN", "PLAYER_ENTERING_WORLD", "SPELLS_CHANGED"]);
    }
    public get IsAvailable(): boolean { return C_Spell?.GetSpellCooldownDuration !== undefined; }
}

export class GlobalCooldown extends SpellCooldown {
    public constructor() { super(61304); }
}
