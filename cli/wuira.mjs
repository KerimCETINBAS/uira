#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

export function create(name, cwd = process.cwd()) {
  if (!name || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) throw new Error("Use an addon name containing letters, numbers, underscores or hyphens, starting with a letter.");
  const target = path.join(cwd, name);
  if (fs.existsSync(target)) throw new Error(`Destination already exists: ${target}`);
  fs.mkdirSync(target, { recursive: true });
  const version = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
  const variables = { addonName: name, packageName: name.toLowerCase(), frameworkVersion: version };
  const template = path.join(root, "templates/addon");
  for (const entry of fs.readdirSync(template, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const source = path.join(entry.parentPath, entry.name);
    const relative = path.relative(template, source);
    const destination = path.join(target, relative === "gitignore" ? ".gitignore" : relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const content = fs.readFileSync(source, "utf8").replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in variables)) throw new Error(`Unknown template variable: ${key}`);
      return variables[key];
    });
    fs.writeFileSync(destination, content);
  }
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(target, "LICENSE"));
  return target;
}

export async function build(cwd = process.cwd()) {
  if (!fs.existsSync(path.join(cwd, "tsconfig.json"))) throw new Error("Run wuira build inside an addon project.");
  const configFile = path.join(cwd, "wuira.config.mjs");
  const config = fs.existsSync(configFile) ? (await import(pathToFileURL(configFile).href + `?updated=${fs.statSync(configFile).mtimeMs}`)).default : {};
  if (config === null || typeof config !== "object") throw new Error("wuira.config.mjs must export a configuration object.");
  if (config.outDir !== undefined && (typeof config.outDir !== "string" || config.outDir.trim() === "")) throw new Error("outDir must be a nonempty path.");
  const output = path.resolve(cwd, config.outDir ?? "dist");
  if (output === path.parse(output).root || output === path.resolve(cwd)) throw new Error("Choose a dedicated addon output directory.");
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "wuira-build-"));
  const compiler = require.resolve("typescript-to-lua/dist/tstl.js", { paths: [cwd, root] });
  try {
    const result = spawnSync(process.execPath, [compiler, "-p", "tsconfig.json", "--outDir", stage], {
      cwd, stdio: "inherit", env: { ...process.env, WUIRA_STANDALONE: "1", ...(config.name ? { WUIRA_ADDON_NAME: config.name } : {}) },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Addon build failed.");
    fs.mkdirSync(output, { recursive: true });
    fs.cpSync(stage, output, { recursive: true });
    console.log(`Built addon: ${output}`);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, name] = process.argv.slice(2);
    if (command === "create") console.log(`Created ${create(name)}\nNext: cd ${name}, npm install, wuira build`);
    else if (command === "build") await build();
    else if (!command || command === "--help") console.log("wuira create <addonName>\nwuira build");
    else throw new Error(`Unknown command: ${command}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
