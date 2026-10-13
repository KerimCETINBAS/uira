import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// WoW loads files through the TOC, rather than a filesystem-based require.
// Register each emitted module first; execute the entry only after registration.
export default {
  moduleResolution(dependency, requiringFile) {
    if (requiringFile.endsWith(".lua")) return;
    if (dependency === "wuira" || dependency.startsWith("wuira/")) {
      const packageFile = require.resolve("wuira/package.json", { paths: [path.dirname(requiringFile)] });
      const subpath = dependency === "wuira" ? "index" : dependency.slice(6);
      const base = path.join(path.dirname(packageFile), "lib", subpath);
      for (const file of [base + ".lua", path.join(base, "index.lua")]) {
        if (fs.existsSync(file)) return file;
      }
    }
  },
  beforeEmit(program, options, host, files) {
    const root = path.dirname(options.configFilePath);
    const configPath = path.join(root, "wuira.json");
    const addon = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : { name: "wuira" };
    if (process.env.WUIRA_ADDON_NAME) addon.name = process.env.WUIRA_ADDON_NAME;
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(addon.name)) throw new Error("Invalid addon name");
    const registry = "__wuiraModules_" + addon.name.replace(/-/g, "_");
    const out = path.resolve(root, options.outDir);
    const moduleFiles = files.filter(file => file.outputPath.endsWith(".lua"));
    for (const file of moduleFiles) {
      const id = path.relative(out, file.outputPath).replace(/\\/g, "/").replace(/\.lua$/, "").replace(/\//g, ".");
      file.code = `${registry}.factories[${JSON.stringify(id)}] = function(require)\n${file.code}\nend\n`;
    }

    const sourceRoot = path.resolve(root, options.rootDir);
    const modules = program.getSourceFiles()
      .filter(file => !file.isDeclarationFile && path.resolve(file.fileName).startsWith(sourceRoot + path.sep))
      .map(file => path.relative(sourceRoot, file.fileName).replace(/\.tsx?$/, ".lua"));
    // Include any Lua dependencies emitted by TSTL as well.
    for (const file of moduleFiles) {
      const relative = path.relative(out, file.outputPath);
      if (!modules.includes(relative)) modules.push(relative);
    }
    modules.sort();
    const loader = fs.readFileSync(path.join(import.meta.dirname, "module-loader.lua"), "utf8");
    const actualRegistry = addon.name === "wuira" && !fs.existsSync(configPath) ? "__wuiraModules" : registry;
    if (actualRegistry !== registry) for (const file of moduleFiles) file.code = file.code.replace(registry, actualRegistry);
    files.push({ outputPath: path.join(out, "__loader.lua"), code: loader.replace(/__wuiraModules/g, actualRegistry) });
    // Framework builds register modules only; addon projects own their startup and TOC.
    if (!fs.existsSync(path.join(root, "addon.toc.in"))) return;
    files.push({ outputPath: path.join(out, "__start.lua"), code: `${actualRegistry}.require("index")\n` });
    const toc = fs.readFileSync(path.join(root, "addon.toc.in"), "utf8");
    const entries = ["__loader.lua", ...modules, "__start.lua"]
      .map(file => (process.env.WUIRA_STANDALONE ? file : path.relative(root, path.join(out, file))).replace(/\//g, "\\"));
    files.push({ outputPath: path.join(process.env.WUIRA_STANDALONE ? out : root, `${addon.name}.toc`), code: toc + "\n" + entries.join("\n") + "\n" });
  },
};
