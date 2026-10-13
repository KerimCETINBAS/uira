# {{addonName}}

Run `npm install`, then `npm run build` (or `npx wuira build`).

Edit `src/index.tsx` to build your UI. The initial empty fragment creates no native frame and logs only to the local WoW chat.

Copy the contents of `dist/` to `Interface/AddOns/{{addonName}}/`. The output includes its own TOC and all required Lua modules.

Import components from `wuira/ui`, data sources from `wuira/datasources`, and `UI` and `wuira` from `wuira`. Generated declarations and compiled Lua come from the npm package; no framework sources are copied into your project.

Set `outDir` in `wuira.config.mjs` to a relative or absolute path to build directly into your game's addon folder. Node.js and this configuration file are development tools only; they are not needed by the game.

Interface 16001 targets Forever. Edit `addon.toc.in` to change addon metadata.
