/** Build-time catalog data. Nothing in this module runs inside the game. */
export function collectIcons(spells, tables) {
    const spellNames = new Map(spells.spells.map(row => [row[0], row]));
    const itemNames = new Map(tables.ItemSparse.map(row => [Number(row.ID), row.Display_lang]));
    if (!tables.SpellMisc.length || !tables.SpellMisc.every(row => "SpellIconFileDataID" in row && "ActiveIconFileDataID" in row && "SpellID" in row)
        || !tables.Item.length || !tables.Item.every(row => "IconFileDataID" in row)
        || !tables.ItemSparse.length || !tables.ItemSparse.every(row => "Display_lang" in row)) throw new Error("Unexpected client icon schema");
    const icons = new Map();
    const add = (value, name, kind, priority) => {
        const id = Number(value);
        if (!Number.isSafeInteger(id) || id < 0) throw new Error("Invalid icon FileDataID");
        if (id === 0) return;
        const icon = icons.get(id) ?? { id, names: new Map(), kinds: new Set() };
        const label = name.trim();
        icon.names.set(label, Math.min(icon.names.get(label) ?? Infinity, priority));
        icon.kinds.add(kind); icons.set(id, icon);
    };
    for (const row of tables.SpellMisc) {
        const spell = spellNames.get(Number(row.SpellID));
        const name = spell?.[1]?.trim() || "Spell " + row.SpellID;
        const priority = spell?.[4] ? 0 : spell ? 2 : 4;
        add(row.SpellIconFileDataID, name, "spell", priority);
        add(row.ActiveIconFileDataID, name + " (active)", "spell", priority + 1);
    }
    for (const row of tables.Item) {
        const name = itemNames.get(Number(row.ID))?.trim();
        add(row.IconFileDataID, name || "Item " + row.ID, "item", name ? 1 : 4);
    }
    return [...icons.values()].sort((a, b) => a.id - b.id).map(icon => {
        const names = [...icon.names].sort(([a, pa], [b, pb]) => pa - pb || (a < b ? -1 : a > b ? 1 : 0)).map(([name]) => name);
        return [icon.id, names[0], names, [...icon.kinds].sort()];
    });
}

export function iconEnumSource(catalog) {
    if (catalog.version !== 1 || catalog.product !== "wow_classic_beta" || !/^1\.60\./.test(catalog.build)) throw new Error("Unsupported icon catalog");
    const identifier = name => {
        const value = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "")
            .split(/[^A-Za-z0-9]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join("");
        return /^[A-Za-z]/.test(value) ? value : "Icon" + value;
    };
    const ids = new Set(), aliases = new Map(), occupied = new Set(), lines = [];
    for (const [id, name, names] of catalog.icons) {
        if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) || !name || !Array.isArray(names) || !names.includes(name)) throw new Error("Invalid icon record: " + id);
        ids.add(id);
        const key = identifier(name) + "_" + id;
        occupied.add(key); lines.push("    " + key + " = " + id + ",");
        for (const alias of names) {
            const key = identifier(alias);
            if (!aliases.has(key)) aliases.set(key, new Set());
            aliases.get(key).add(id);
        }
    }
    for (const [name, values] of [...aliases].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) if (values.size === 1 && !occupied.has(name)) {
        occupied.add(name); lines.push("    " + name + " = " + [...values][0] + ",");
    }
    return "// Auto generated. Do not edit.\n// Source: Forever " + catalog.build + "; run npm run icons:generate.\n"
        + "/** Native texture FileDataIDs, independent of spell and action IDs. */\nexport const enum Icons {\n" + lines.join("\n") + "\n}\n";
}
