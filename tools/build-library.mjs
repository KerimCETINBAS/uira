import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const result = spawnSync(process.execPath, [require.resolve("typescript-to-lua/dist/tstl.js"), "-p", "tsconfig.lib.json"], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
fs.mkdirSync(path.join(root, "lib/platform"), { recursive: true });
fs.copyFileSync(path.join(root, "src/platform/forever.d.ts"), path.join(root, "lib/platform/forever.d.ts"));
for (const file of ["index.d.ts", "ui/index.d.ts", "datasources/index.d.ts", "store/index.d.ts"]) {
  const target = path.join(root, "lib", file);
  const reference = file === "index.d.ts" ? "./platform/forever.d.ts" : "../platform/forever.d.ts";
  fs.writeFileSync(target, `/// <reference path="${reference}" />\n` + fs.readFileSync(target, "utf8"));
}
