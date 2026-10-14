import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/spells/forever.json"), "utf8"));
if (catalog.version !== 1 || catalog.product !== "wow_classic_beta") throw new Error("Unsupported spell catalog");
const output = path.join(root, "src/spells"); fs.mkdirSync(output, { recursive: true });
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const identifier = name => {
    const result = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "")
        .split(/[^A-Za-z0-9]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join("");
    return /^[A-Za-z]/.test(result) ? result : "Spell" + result;
};
const groups = new Map(), ids = new Set();
for (const row of catalog.spells) {
    const [id, , , category] = row;
    if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) || !/^[A-Z][A-Za-z]*Spells$/.test(category)) throw new Error("Invalid spell record: " + id);
    ids.add(id); if (!groups.has(category)) groups.set(category, []); groups.get(category).push(row);
}
const header = "/** Generated from Forever " + catalog.build + ". Do not edit; run npm run spells:generate. */\n";
const exports = [];
for (const [category, rows] of [...groups].sort(([a], [b]) => compare(a, b))) {
    const lines = [], aliases = new Map(), occupied = new Set();
    for (const row of rows) {
        const [id, name, subtext] = row;
        const base = identifier(name || "UnnamedSpell");
        const rank = /^Rank ([0-9]+)$/.exec(subtext);
        const member = base + (rank ? "Rank" + rank[1] : "") + "_" + id;
        occupied.add(member); lines.push("    " + member + " = " + id + ",");
        if (!aliases.has(base)) aliases.set(base, []); aliases.get(base).push(row);
    }
    for (const [base, values] of [...aliases].sort(([a], [b]) => compare(a, b))) {
        if (occupied.has(base)) continue;
        const linked = values.filter(row => row[4]);
        const candidates = linked.length ? linked : values;
        const rank = row => Number(/^Rank ([0-9]+)$/.exec(row[2])?.[1] ?? Number.MAX_SAFE_INTEGER);
        candidates.sort((a, b) => rank(a) - rank(b) || a[0] - b[0]);
        // Ambiguous unranked names require the explicit ID-suffixed member.
        if (candidates.length > 1 && rank(candidates[0]) === rank(candidates[1])) continue;
        occupied.add(base); lines.push("    " + base + " = " + candidates[0][0] + ",");
    }
    fs.writeFileSync(path.join(output, category + ".ts"), header + "export const enum " + category + " {\n" + lines.join("\n") + "\n}\n");
    exports.push('export { ' + category + ' } from "./' + category + '";');
}
const bindings = catalog.bindings.actions.map(([name]) => "    " + name + " = " + JSON.stringify(name) + ",");
fs.writeFileSync(path.join(output, "BindingActions.ts"), "/** Native binding command tokens; these are not spell IDs or keyboard shortcuts. */\nexport const enum BindingActions {\n" + bindings.join("\n") + "\n}\n");
exports.push('export { BindingActions } from "./BindingActions";');
fs.writeFileSync(path.join(output, "index.ts"), header + exports.join("\n") + "\n");
console.log("Generated " + ids.size + " spell IDs in " + groups.size + " categories and " + bindings.length + " binding actions");
