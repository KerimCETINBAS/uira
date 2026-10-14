import { DataSource } from "./DataSource";

declare const string: { match(this: void, value: string, pattern: string): string | undefined };

declare const Enum: {
    SpellBookSpellBank?: { Player: number };
    SpellBookItemType?: { Spell: number };
} | undefined;

export type KnownSpellsStatus = "ready" | "unavailable" | "restricted";
export interface KnownSpell {
    readonly id: number;
    readonly name?: string;
    /** Undefined when the client cannot determine whether this spell is passive. */
    readonly isPassive?: boolean;
}

/** Cached learned player spellbook IDs. Native events refresh the snapshot; no polling. */
export class KnownSpells extends DataSource<readonly number[]> {
    private ids: number[] = [];
    private entries: KnownSpell[] = [];
    private status: KnownSpellsStatus = "unavailable";
    private readonly listeners = new Set<(spells: readonly number[]) => void>();
    private readonly frame: wuiraNativeFrame;
    private disposed = false;

    public constructor() {
        super([]);
        this.frame = CreateFrame("Frame", undefined, UIParent);
        for (const event of ["PLAYER_ENTERING_WORLD", "PLAYER_LEVEL_UP", "SPELLS_CHANGED",
            "LEARNED_SPELL_IN_SKILL_LINE", "PLAYER_TALENT_UPDATE", "CHARACTER_POINTS_CHANGED"]) {
            // Talent event availability differs between client branches.
            try { this.frame.RegisterEvent(event); } catch { /* SPELLS_CHANGED remains the common fallback. */ }
        }
        this.frame.SetScript("OnEvent", () => this.Refresh());
        this.Refresh();
    }

    public get Status(): KnownSpellsStatus { return this.status; }
    /** Detached cached metadata, with no native reads. Unreadable books return no entries. */
    public get Entries(): readonly KnownSpell[] { return this.entries.map(entry => ({ ...entry })); }
    /** Whole-name glob over cached localized names. Supports * and ?, ignoring ASCII case. */
    public Filter(pattern: string): readonly KnownSpell[] {
        if (issecretvalue(pattern) || typeof pattern !== "string") error("KnownSpells.Filter requires a public name pattern");
        let glob = "^";
        for (const character of pattern.toLowerCase()) {
            if (character === "*") glob += ".*";
            else if (character === "?") glob += ".";
            else glob += ("^$()%.[]+-".includes(character) ? "%" : "") + character;
        }
        glob += "$";
        return this.entries.filter(entry => entry.name !== undefined && string.match(entry.name.toLowerCase(), glob) !== undefined)
            .map(entry => ({ ...entry }));
    }
    protected override GetValue(): readonly number[] { return this.ids.slice(); }
    protected override HasSecretFields(): boolean { return this.status === "restricted"; }

    /** Representative enum IDs match any learned rank through its localized name. */
    public Has(spell: number | string): boolean {
        return this.Find(spell) !== undefined;
    }

    /** Resolve a representative spell ID or localized name to a learned rank. */
    public Find(spell: number | string): KnownSpell | undefined {
        if (this.status !== "ready" || issecretvalue(spell)) return undefined;
        const exact = this.entries.find(entry => entry.id === spell);
        if (exact !== undefined) return { ...exact };
        const name = typeof spell === "string" ? spell : C_Spell?.GetSpellName?.(spell);
        if (issecretvalue(name) || name === undefined) return undefined;
        const entry = this.entries.find(entry => entry.name === name);
        return entry === undefined ? undefined : { ...entry };
    }

    /** No initial emission; only changed, readable snapshots reach observers. */
    public onChange(listener: (spells: readonly number[]) => void): () => void {
        if (this.disposed) error("KnownSpells: source is disposed");
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    private Refresh(): void {
        const signature = () => this.status + ":" + this.entries.map(entry => entry.id + ":" + (entry.name ?? "") + ":" + String(entry.isPassive)).join("|");
        const previous = signature();
        const ids = new Set<number>();
        const entries = new Map<number, KnownSpell>();
        this.status = "ready";
        const add = (id: number | undefined, name?: string, passive?: boolean) => {
            if (issecretvalue(id) || issecretvalue(name)) { this.status = "restricted"; return; }
            if (id === undefined || id <= 0) return;
            ids.add(id);
            const resolved = name ?? C_Spell?.GetSpellName?.(id);
            if (issecretvalue(resolved)) { this.status = "restricted"; return; }
            const isPassive = passive ?? C_Spell?.IsSpellPassive?.(id);
            if (issecretvalue(isPassive)) { this.status = "restricted"; return; }
            entries.set(id, { id, name: resolved, isPassive });
        };
        const book = C_SpellBook;
        const bank = Enum?.SpellBookSpellBank?.Player;
        const spellType = Enum?.SpellBookItemType?.Spell;
        if (book?.GetNumSpellBookSkillLines !== undefined && book.GetSpellBookSkillLineInfo !== undefined
            && book.GetSpellBookItemInfo !== undefined && bank !== undefined && spellType !== undefined) {
            const count = book.GetNumSpellBookSkillLines();
            if (issecretvalue(count)) this.status = "restricted";
            else for (let line = 1; line <= count; line += 1) {
                const info = book.GetSpellBookSkillLineInfo(line);
                if (issecretvalue(info)) { this.status = "restricted"; break; }
                if (info === undefined) continue;
                if (issecretvalue(info.itemIndexOffset) || issecretvalue(info.numSpellBookItems)) { this.status = "restricted"; break; }
                for (let slot = info.itemIndexOffset + 1; slot <= info.itemIndexOffset + info.numSpellBookItems; slot += 1) {
                    const item = book.GetSpellBookItemInfo(slot, bank);
                    if (issecretvalue(item)) { this.status = "restricted"; break; }
                    if (item === undefined) continue;
                    if (issecretvalue(item.itemType) || issecretvalue(item.isOffSpec)) { this.status = "restricted"; break; }
                    if (item.itemType === spellType && !item.isOffSpec) add(item.spellID, item.name, item.isPassive);
                }
            }
        } else if (GetNumSpellTabs !== undefined && GetSpellTabInfo !== undefined && GetSpellBookItemInfo !== undefined) {
            const count = GetNumSpellTabs();
            if (issecretvalue(count)) this.status = "restricted";
            else for (let tab = 1; tab <= count; tab += 1) {
                const [, , offset, size] = GetSpellTabInfo(tab);
                if (issecretvalue(offset) || issecretvalue(size)) { this.status = "restricted"; break; }
                for (let slot = offset + 1; slot <= offset + size; slot += 1) {
                    const [kind, id] = GetSpellBookItemInfo(slot, "spell");
                    if (issecretvalue(kind)) { this.status = "restricted"; break; }
                    if (kind === "SPELL") add(id, undefined, IsPassiveSpell?.(slot, "spell"));
                }
            }
        } else this.status = "unavailable";
        this.ids = this.status === "ready" ? Array.from(ids).sort((a, b) => a - b) : [];
        this.entries = this.ids.map(id => entries.get(id)!);
        const next = signature();
        if (next !== previous && this.status === "ready" && this.CanEmit(this.ids)) {
            for (const listener of this.listeners) listener(this.ids.slice());
        }
    }

    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.frame.UnregisterAllEvents();
        this.frame.SetScript("OnEvent", undefined);
        this.frame.Hide();
        this.listeners.clear();
    }
}
