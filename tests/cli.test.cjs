const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

test("CLI creates and builds a standalone empty-JSX addon", async () => {
  const { create, build } = await import("../cli/wuira.mjs");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "wuira-cli-"));
  try {
    const library = spawnSync(process.execPath, [path.join(__dirname, "../tools/build-library.mjs")], { encoding: "utf8" });
    assert.equal(library.status, 0, library.stdout + library.stderr);
    assert.throws(() => create("../Bad", temp));
    const project = create("HelloAddon", temp);
    assert.throws(() => create("HelloAddon", temp));
    fs.mkdirSync(path.join(project, "node_modules"));
    const installed = path.join(project, "node_modules/wuira");
    fs.mkdirSync(installed);
    for (const directory of ["config", "tools", "lib"]) fs.cpSync(path.join(__dirname, "..", directory), path.join(installed, directory), { recursive: true });
    fs.copyFileSync(path.join(__dirname, "../package.json"), path.join(installed, "package.json"));
    assert.equal(JSON.parse(fs.readFileSync(path.join(project, "tsconfig.json"))).extends, "wuira/config/tsconfig.json");
    assert.ok(!fs.existsSync(path.join(project, "tools")));
    assert.ok(!fs.existsSync(path.join(project, "cli")));
    assert.ok(!fs.existsSync(path.join(project, "src/wuira")));
    await build(project);
    assert.ok(fs.existsSync(path.join(project, "LICENSE")));
    const toc = fs.readFileSync(path.join(project, "dist/HelloAddon.toc"), "utf8");
    const loads = toc.split(/\r?\n/).filter(line => line && !line.startsWith("#"))
      .map(file => `dofile(${JSON.stringify(file.replace(/\\/g, "/"))})`);
    const script = `function issecretvalue(value) return type(value) == "table" and rawget(value,"secret") == true end\nlocal messages = {}\nfunction print(message) table.insert(messages,message) end\nfunction CreateFrame() error("Empty JSX must not create a frame") end\n${loads.join("\n")}\nassert(#messages == 1 and string.find(messages[1], "HelloAddon loaded", 1, true))\nassert(__wuiraModules_HelloAddon ~= nil)\nconsole.warn("warning", 42)\nconsole.error("error")\nassert(#messages == 3)\n`;
    fs.writeFileSync(path.join(project, "verify.lua"), script);
    const result = spawnSync(process.execPath, [require.resolve("fengari-node-cli/src/lua-cli.js"), "../verify.lua"], { cwd: path.join(project, "dist"), encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stderr, "");
    fs.appendFileSync(path.join(project, "src/index.tsx"), `
import { UI } from "wuira";
import { Cell, ProgressBar } from "wuira/ui";
import { HP, Unit } from "wuira/datasources";
const hp = new HP(Unit.Player);
const view = <Cell width={160} height={24}><ProgressBar source={hp} /></Cell>;
if (view.kind !== "cell" || view.child?.source !== hp) throw "Public exports failed";
// @ts-expect-error Width must be a number or inherit.
const invalid = <Cell width="invalid" />;
import { Store, StoreRegistry } from "wuira/store";
class MemorySettings extends Store {
    CastSpellId = 1232;
}
const store = new StoreRegistry();
store.set(MemorySettings, settings => { settings.CastSpellId = 635; return settings; });
if (store.get(MemorySettings).CastSpellId !== 635) throw "Store update failed";
if (false) {
    // @ts-expect-error Snapshot properties are readonly.
    store.get(MemorySettings).CastSpellId = 10;
    // @ts-expect-error Updater must return the settings data.
    store.set(MemorySettings, settings => 123);
}
`);
    const external = path.join(temp, "GameAddOns/HelloAddon");
    fs.writeFileSync(path.join(project, "wuira.config.mjs"), `export default { name: "HelloAddon", outDir: ${JSON.stringify(external)} };`);
    await build(project);
    assert.ok(fs.existsSync(path.join(external, "HelloAddon.toc")));
    const newLoads = fs.readFileSync(path.join(external, "HelloAddon.toc"), "utf8").split(/\r?\n/)
      .filter(line => line && !line.startsWith("#"))
      .map(file => `dofile(${JSON.stringify(file.replace(/\\/g, "/"))})`);
    fs.writeFileSync(path.join(project, "verify.lua"), script.replace(loads.join("\n"), newLoads.join("\n")));
    const externalResult = spawnSync(process.execPath, [require.resolve("fengari-node-cli/src/lua-cli.js"), path.join(project, "verify.lua")], { cwd: external, encoding: "utf8" });
    assert.equal(externalResult.stderr, "", externalResult.stdout + externalResult.stderr);
    assert.equal(externalResult.status, 0);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
