import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseCSV } from "./spell-data.mjs";
import { collectIcons } from "./icon-data.mjs";
const root = path.resolve(import.meta.dirname, "..");
const argument = name => process.argv[process.argv.indexOf(name) + 1];
const build = process.argv.includes("--build") ? argument("--build") : undefined;
const spells = JSON.parse(fs.readFileSync(path.join(root, "data/spells/forever.json"), "utf8"));
if (!build || !build.startsWith("1.60.") || build !== spells.build || spells.product !== "wow_classic_beta") throw new Error("Use the same verified Forever build as the spell catalog");
const cached = process.argv.includes("--cached"), directory = path.join(root, "data/icons/.cache", build);
fs.mkdirSync(directory, { recursive: true });
const hash = value => createHash("sha256").update(value).digest("hex"), sources = [];
async function table(name) {
    const url = "https://wago.tools/db2/" + name + "/csv?build=" + build, file = path.join(directory, name + ".csv");
    let text;
    if (cached) text = fs.readFileSync(file, "utf8");
    else {
        const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) throw new Error("Icon data download failed: " + name + " (" + response.status + ")");
        text = await response.text(); fs.writeFileSync(file, text);
    }
    const rows = parseCSV(text); sources.push({ table: name, url, sha256: hash(text), rows: rows.length }); return [name, rows];
}
const results = await Promise.allSettled(["SpellMisc", "Item", "ItemSparse"].map(table));
const failures = results.filter(result => result.status === "rejected");
if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Icon data download failed");
const tables = Object.fromEntries(results.map(result => result.value));
const rows = collectIcons(spells, tables);
if (rows.length < 500) throw new Error("Icon catalog is unexpectedly small");
const catalog = { version: 1, product: spells.product, build, locale: spells.locale,
    sources: sources.sort((a,b) => a.table.localeCompare(b.table)), spellCatalogSHA256: hash(JSON.stringify(spells)),
    columns: ["fileDataId","name","aliases","kinds"], icons: rows };
fs.mkdirSync(path.join(root,"data/icons"),{recursive:true});
fs.writeFileSync(path.join(root,"data/icons/forever.json"),JSON.stringify(catalog,null,2)+"\n");
console.log("Saved "+rows.length+" spell/item icons for Forever "+build);
