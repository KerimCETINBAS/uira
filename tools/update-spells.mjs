import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseCSV } from "./spell-data.mjs";

const root = path.resolve(import.meta.dirname, "..");
const argument = name => process.argv[process.argv.indexOf(name) + 1];
const build = process.argv.includes("--build") ? argument("--build") : undefined;
if (!build || !/^\d+\.\d+\.\d+\.\d+$/.test(build)) throw new Error("Use --build <Forever client version>, e.g. 1.60.1.70374");
if (!build.startsWith("1.60.")) throw new Error("Only the Forever 1.60 client branch is supported; other WoW products are not imported");
const cached = process.argv.includes("--cached");
const directory = path.join(root, "data/spells/.cache", build);
fs.mkdirSync(directory, { recursive: true });
const hash = value => createHash("sha256").update(value).digest("hex");
const sources = [];
async function download(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error("HTTP " + response.status + ": " + url);
    return response;
}
async function table(name) {
    const url = "https://wago.tools/db2/" + name + "/csv?build=" + build;
    const filename = path.join(directory, name + ".csv");
    let text;
    if (cached) text = fs.readFileSync(filename, "utf8");
    else {
        const response = await download(url);
        if (!response.headers.get("content-type")?.includes("text/csv")) throw new Error("Expected CSV: " + name);
        text = await response.text(); fs.writeFileSync(filename, text);
    }
    const rows = parseCSV(text);
    sources.push({ table: name, url, sha256: hash(text), rows: rows.length });
    return [name, rows];
}
const results = await Promise.allSettled(["Spell", "SpellName", "SpellClassOptions", "SkillLine", "SkillLineAbility", "ChrClasses"].map(table));
const failures = results.filter(result => result.status === "rejected");
if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Spell data download failed");
const tables = Object.fromEntries(results.map(result => result.value));
const spells = new Map(tables.Spell.map(row => [Number(row.ID), row]));
const names = new Map(tables.SpellName.map(row => [Number(row.ID), row.Name_lang]));
if (spells.size < 1000 || spells.size !== names.size || [...spells.keys()].some(id => !names.has(id))) throw new Error("Spell and SpellName universes differ");
const families = new Map(tables.ChrClasses.map(row => [Number(row.SpellClassSet), row.Name_lang + "Spells"]));
const classes = new Map(tables.ChrClasses.map(row => [Number(row.ID), row.Name_lang + "Spells"]));
const options = new Map(tables.SpellClassOptions.map(row => [Number(row.SpellID), Number(row.SpellClassSet)]));
const skills = new Map(tables.SkillLine.map(row => [Number(row.ID), row]));
const linked = new Map();
for (const row of tables.SkillLineAbility) {
    const id = Number(row.Spell); if (!linked.has(id)) linked.set(id, []);
    linked.get(id).push(row);
}
const secondaryProfessions = new Set(["Cooking", "First Aid", "Fishing"]);
function category(id) {
    const abilities = linked.get(id) ?? [];
    const lines = abilities.map(row => skills.get(Number(row.SkillLine))).filter(Boolean);
    if (lines.some(line => /\bRacial\b/.test(line.DisplayName_lang))) return "RacialSpells";
    if (lines.some(line => line.CategoryID === "11" || secondaryProfessions.has(line.DisplayName_lang))) return "ProfessionSpells";
    if (lines.some(line => line.DisplayName_lang.startsWith("Pet - "))) return "PetSpells";
    const family = families.get(options.get(id)); if (family) return family;
    const owners = new Set();
    for (const ability of abilities) for (const [classId, name] of classes) if ((Number(ability.ClassMask) & (1 << (classId - 1))) !== 0) owners.add(name);
    if (owners.size === 1) return [...owners][0];
    if (lines.length) return "GeneralSpells";
    return "WorldSpells";
}
const rows = [...spells].sort(([a], [b]) => a - b).map(([id, spell]) => [
    id, names.get(id), spell.NameSubtext_lang, category(id), (linked.get(id) ?? []).length > 0,
]);
const treeFile = path.join(directory, "ui-tree.json");
const tree = cached ? JSON.parse(fs.readFileSync(treeFile, "utf8"))
    : await (await download("https://api.github.com/repos/Gethe/wow-ui-source/git/trees/forever?recursive=1")).json();
if (!/^[a-f0-9]{40}$/.test(tree.sha)) throw new Error("Expected a pinned Forever UI commit");
if (!cached) fs.writeFileSync(treeFile, JSON.stringify(tree));
const bindingPath = "Interface/AddOns/Blizzard_FrameXML/Bindings_Camelot.xml";
const bindingURL = "https://raw.githubusercontent.com/Gethe/wow-ui-source/" + tree.sha + "/" + bindingPath;
const xml = cached ? fs.readFileSync(path.join(directory, "Bindings_Camelot.xml"), "utf8") : await (await download(bindingURL)).text();
if (!cached) fs.writeFileSync(path.join(directory, "Bindings_Camelot.xml"), xml);
const actions = new Map();
for (const match of xml.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<Binding\s+([^>]+)>/g)) {
    const attributes = Object.fromEntries([...match[1].matchAll(/([\w]+)="([^"]*)"/g)].map(value => [value[1], value[2]]));
    if (!attributes.name || attributes.name === "HEADER") continue;
    if (!/^[A-Z][A-Z0-9_]*$/.test(attributes.name)) throw new Error("Unexpected binding token: " + attributes.name);
    actions.set(attributes.name, attributes.category ?? "");
}
if (actions.size < 100) throw new Error("Binding snapshot is incomplete");
const catalog = {
    version: 1, product: "wow_classic_beta", build, locale: "enUS",
    sources: sources.sort((a, b) => a.table.localeCompare(b.table)),
    columns: ["id", "name", "rank", "category", "skillLineLinked"], spells: rows,
    bindings: { commit: tree.sha, url: bindingURL, sha256: hash(xml), actions: [...actions].sort(([a], [b]) => a.localeCompare(b)) },
};
fs.writeFileSync(path.join(root, "data/spells/forever.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log("Saved " + rows.length + " spell IDs and " + actions.size + " bindings for " + build);
