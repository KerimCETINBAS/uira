import { DataSource } from "./DataSource";
import { TextureSource } from "./TextureSource";
import { SpellCooldown } from "./SpellCooldown";
import type { SecureAction } from "../ui/SecureButton";

/** Localized spell identity, texture and native cooldown, independent of action slots. */
export class SpellSource extends DataSource<string | undefined> {
    public readonly Texture: TextureSource;
    public readonly Cooldown: SpellCooldown;
    public constructor(public readonly spellId: number) {
        super(undefined);
        this.Texture = new TextureSource(() => C_Spell?.GetSpellTexture?.(spellId), ["SPELLS_CHANGED", "PLAYER_ENTERING_WORLD"]);
        // Name-based secure casting lets the game choose the appropriate learned rank.
        this.Cooldown = new SpellCooldown(this.Identifier, { ignoreGCD: true });
    }
    protected override GetValue(): string | undefined { return C_Spell?.GetSpellName?.(this.spellId); }
    public get Identifier(): number | string { return this.Value ?? this.spellId; }
    public get Action(): SecureAction { return { type: "spell", spell: this.Identifier }; }
}
