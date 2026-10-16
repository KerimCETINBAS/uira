const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");

test("Forever icon enum covers the pinned spell/item snapshot deterministically", async () => {
    const { iconEnumSource } = await import("../tools/icon-data.mjs");
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/icons/forever.json"), "utf8"));
    const spells = JSON.parse(fs.readFileSync(path.join(root, "data/spells/forever.json"), "utf8"));
    assert.equal(catalog.build, spells.build);
    assert.equal(catalog.product, spells.product);
    assert.equal(catalog.icons.length, 4404);
    assert.equal(catalog.spellCatalogSHA256, createHash("sha256").update(JSON.stringify(spells)).digest("hex"));
    assert.deepEqual(catalog.sources.map(source => source.table), ["Item", "ItemSparse", "SpellMisc"]);
    assert.ok(catalog.sources.every(source => source.rows > 0 && source.url.includes("build=" + catalog.build) && /^[a-f0-9]{64}$/.test(source.sha256)));
    const source = fs.readFileSync(path.join(root, "src/icons/index.ts"), "utf8").replaceAll("\r\n", "\n");
    assert.equal(source, iconEnumSource(catalog));
    const expected = new Set(catalog.icons.map(row => row[0])), found = new Set();
    const members = new Set();
    for (const match of source.matchAll(/^\s+(\w+) = (\d+),$/gm)) {
        assert.ok(!members.has(match[1]), "duplicate enum member: " + match[1]); members.add(match[1]);
        assert.ok(expected.has(Number(match[2])));
        if (match[1].endsWith("_" + match[2])) found.add(Number(match[2]));
    }
    assert.deepEqual(found, expected);
    assert.ok(catalog.icons.some(row => row[3].includes("spell") && row[3].includes("item")));
    assert.ok(catalog.icons.every(row => row[2].includes(row[1]) && new Set(row[2]).size === row[2].length));
    const result = require("typescript-to-lua").transpileString(source + "\nexport const example = Icons.BlessingOfFreedom_135968;", { luaTarget: "5.1", types: [] });
    assert.equal(result.diagnostics.length, 0, result.diagnostics.map(d => d.messageText).join("\n"));
    assert.match(result.file.lua, /example = 135968/);
    assert.doesNotMatch(result.file.lua, /Icons\s*=|BlessingOfFreedom/);
    assert.ok(result.file.lua.length < 300, "catalog must not create a runtime enum table");
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.exports["./icons"].types, "./lib/icons/index.d.ts");
    assert.ok(pkg.files.includes("data/icons/forever.json"));
});

test("icon extraction deduplicates shared textures and retains unnamed client references", async () => {
    const { collectIcons, iconEnumSource } = await import("../tools/icon-data.mjs");
    const spells = { spells: [[1, "Heal", "", "PaladinSpells", true], [2, "Heal", "", "NPCSpells", false]] };
    const tables = {
        SpellMisc: [{ SpellID: "1", SpellIconFileDataID: "11", ActiveIconFileDataID: "12" }, { SpellID: "2", SpellIconFileDataID: "13", ActiveIconFileDataID: "0" }, { SpellID: "999", SpellIconFileDataID: "14", ActiveIconFileDataID: "0" }],
        Item: [{ ID: "5", IconFileDataID: "11" }, { ID: "6", IconFileDataID: "15" }],
        ItemSparse: [{ ID: "5", Display_lang: "Potion" }],
    };
    const icons = collectIcons(spells, tables);
    assert.deepEqual(icons[0], [11, "Heal", ["Heal", "Potion"], ["item", "spell"]]);
    assert.deepEqual(icons.map(row => row[0]), [11, 12, 13, 14, 15]);
    assert.equal(icons[3][1], "Spell 999"); assert.equal(icons[4][1], "Item 6");
    const source = iconEnumSource({ version: 1, product: "wow_classic_beta", build: "1.60.1.70374", icons });
    assert.doesNotMatch(source, /\n    Heal =/); // same name points at multiple textures
    assert.match(source, /Heal_11 = 11/);
    tables.Item[0].IconFileDataID = "bad";
    assert.throws(() => collectIcons(spells, tables), /Invalid icon/);
    assert.throws(() => iconEnumSource({ version: 1, product: "wow", build: "12.0.1", icons }), /Unsupported/);
});
