const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
test("Forever spell enums cover the entire pinned client snapshot without runtime tables", async () => {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/spells/forever.json"), "utf8"));
    assert.equal(catalog.product, "wow_classic_beta");
    assert.equal(catalog.build, "1.60.1.70374");
    assert.equal(catalog.spells.length, 31863);
    const expected = new Set(catalog.spells.map(row => row[0])), found = new Set();
    for (const category of new Set(catalog.spells.map(row => row[3]))) {
        const source = fs.readFileSync(path.join(root, "src/spells", category + ".ts"), "utf8");
        assert.match(source, /export const enum /);
        for (const match of source.matchAll(/^\s+\w+_(\d+) = (\d+),$/gm)) {
            assert.equal(match[1], match[2]);
            const id = Number(match[1]); assert.ok(!found.has(id), "duplicate categorized spell ID"); found.add(id);
        }
    }
    assert.deepEqual(found, expected);
    assert.ok(catalog.sources.every(source => source.url.includes("build=" + catalog.build) && /^[a-f0-9]{64}$/.test(source.sha256)));
    assert.ok(catalog.bindings.actions.some(([name]) => name === "MOVEFORWARD"));
    assert.ok(catalog.bindings.actions.some(([name]) => name === "ATTACKTARGET"));
    const generated = fs.readdirSync(path.join(root, "src/spells")).map(name => [name, fs.readFileSync(path.join(root, "src/spells", name), "utf8")]);
    const result = spawnSync(process.execPath, ["tools/generate-spells.mjs"], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    for (const [name, before] of generated) assert.equal(fs.readFileSync(path.join(root, "src/spells", name), "utf8"), before, "generation must be deterministic");
});
test("DB2 CSV parsing preserves quoted commas, quotes and multiline cells", async () => {
    const { parseCSV } = await import("../tools/spell-data.mjs");
    assert.deepEqual(parseCSV('\uFEFFID,Name\r\n1,"Spell, name"\r\n2,"Line\nwith ""quotes"""\r\n'), [
        { ID: "1", Name: "Spell, name" }, { ID: "2", Name: 'Line\nwith "quotes"' },
    ]);
    assert.throws(() => parseCSV('ID,Name\n1,"unfinished'), /Unterminated/);
});
