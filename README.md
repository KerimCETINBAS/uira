# wuira

Build WoW Forever interfaces with TypeScript and JSX.

wuira is a UI framework and addon toolchain for developers who want to describe their interface in code, compose reusable components, and keep game data separate from presentation. Write TypeScript, arrange native widgets with JSX, and compile your addon to Lua.

## Why wuira?

An interface should be easy to understand by reading its source. A health display can be a progress bar inside a layout; a player display can be a composition of bars, labels, and icons rather than a special unit-frame class. wuira provides the foundations for that approach, with TypeScript checking your component props before the addon reaches the game.

The snippets below use the lowercase JSX primitives. In a generated project, import `{ UI, wuira }` from `wuira` before mounting a view. Each view example is independent.

### JSX composition

<!-- Screenshot: a reusable ResourceBar component inside a Cell. -->

Describe UI trees with components and reusable functions. No separate XML view files are required.

```tsx
function ResourceBar({ current }: { current: number }) {
    return <progress width="inherit" height={24} min={0} max={100} current={current} />;
}

function App() {
    return (
        <cell width={200} height={40} padding={8}>
            <ResourceBar current={75} />
        </cell>
    );
}

wuira.Mount(App);
```

### Native widgets

<!-- Screenshot: a native StatusBar with a dark background. -->

Cells mount to WoW frames, and progress bars use the game's native StatusBar widget.

```tsx
const view = (
    <progress
        width={200} height={24}
        min={0} max={100} current={65}
        foreground={{ color: { r: 0.1, g: 0.75, b: 0.4 } }}
        background={{ color: { r: 0.08, g: 0.08, b: 0.08 } }}
    />
);

wuira.Mount(view);
```

### Layout primitives

<!-- Screenshot: two vertically stacked progress bars with a gap. -->

Flow and grid layouts arrange children, with spacing and sizing options shared across components.

```tsx
const view = (
    <flow width={200} height={56} direction="vertical" gap={8}>
        <progress height={24} min={0} max={100} current={80} />
        <progress height={24} min={0} max={100} current={45} />
    </flow>
);

wuira.Mount(view);
```

For rows and columns, use `<grid columns={2} gap={8}>` with an explicit width and height.

### Data sources

<!-- Screenshot: live player health and mana bars. -->

Connect health and mana values to progress bars without writing a separate resource-specific container class.

```tsx
import { HP, Mana, Unit } from "wuira/datasources";

function App() {
    const hp = new HP(Unit.Player);
    const mana = new Mana(Unit.Player);

    return (
        <flow width={200} height={52} direction="vertical" gap={4}>
            <progress height={24} source={hp} />
            <progress height={24} source={mana} />
        </flow>
    );
}

wuira.Mount(App);
```

### Visual styling

<!-- Screenshot: a dark Cell with a thin colored border. -->

Configure backgrounds, borders, textures, and glow through reusable decoration objects.

```tsx
import { Background, Border } from "wuira/ui";


const view = (
    <cell width={200} height={64} decorations={{
        background: new Background({ color: { r: 0.06, g: 0.08, b: 0.1 } }),
        border: new Border({ thickness: 1, color: { r: 0.3, g: 0.8, b: 0.7 } }),
    }} />
);

wuira.Mount(view);
```

### Addon tooling

<!-- Screenshot: creating and building an addon in the terminal. -->

Create a project, compile TypeScriptToLua, and generate the TOC and module-loading files through one CLI.

```sh
npx wuira@latest create MyAddon
cd MyAddon
npm install
npm run build
```

### Readable Lua output

<!-- Screenshot: source files alongside their emitted Lua modules. -->

Emitted modules remain split across files following the source structure.

```text
src/index.tsx            → dist/index.lua
src/components/Panel.tsx → dist/components/Panel.lua
wuira/ui dependency     → dist/lua_modules/wuira/lib/ui/index.lua

MyAddon.toc loads the module registry, emitted files, and startup entry.
```

Use wuira when you want to build and distribute an addon UI in TypeScript, share visual components, and let the toolchain handle Lua module loading. Node.js runs during development; the game loads the generated Lua files without a JavaScript runtime.

## Scope and current status

wuira is an early framework for addon authors. It is not a complete UI replacement, an in-game visual editor, or a WeakAuras replacement. JSX describes widgets; there is no React runtime or automatic reactive rendering layer.

The current core includes Cells, flow and grid layouts, progress bars, decorations, health and mana sources, a local console polyfill, and project tooling. A complete WoW API surface, secure action and click-cast abstractions, nameplate adapters, and preset management are not implemented yet. Combat restrictions and secret-value rules still apply; framework abstractions cannot bypass them.

The target client is WoW Forever. Compatibility with Retail or other Classic clients is not promised without verification. Expect API changes while the framework takes shape.

## Getting started

The framework, npm package, CLI command, and public API are named `wuira`. Future extension packages can use the `@wuira/` organization scope once that organization is registered.

Available on npm as [`wuira`](https://www.npmjs.com/package/wuira):

```sh
npx wuira create MyAddon
```

A TypeScript and JSX UI framework for WoW Forever. TypeScriptToLua emits separate Lua files following the source directory structure. No Rollup or single-file Lua bundle is required.

## CLI

Create an addon with Node.js 22.13 or newer:

```sh
npx wuira@latest create MyAddon
cd MyAddon
npm install
npm run build
```

Alternatively, install globally with `npm install -g wuira`, then use `wuira create MyAddon`. To test unpublished changes, run `npm install` and `npm link` in this repository, or invoke `node /path/to/wuira/cli/wuira.mjs create MyAddon` directly. Templates reflect the installed CLI version; repository changes become available through npm after the next release.

`create` refuses to overwrite an existing directory. It generates TypeScriptToLua configuration, addon metadata, a module loader, an MIT license, and this minimal `src/index.tsx`:

```tsx
import "wuira/console-polyfill";
import { UI, wuira } from "wuira";


function App() {
    console.log("MyAddon loaded");
    return <></>;
}

wuira.Mount(App);
```

An empty fragment creates no native frame. Only empty fragments are currently supported; use a layout for multiple visual elements.

`console.log/info/warn/error` use a global WoW console polyfill. Output goes to the local chat window, never to other players. The addon uses no Node.js runtime or stdin/stdout. `console.error` does not throw. Arguments are formatted with Lua `tostring`; objects are not deeply inspected. The CLI uses its own Node.js terminal console.

Importing `wuira` installs the global console polyfill automatically. The shared TypeScript config loads its global declarations and uses Node16 module resolution for package exports; DOM typings are not required. `wuira.Mount` accepts a `Cell`, no value, or a function returning `Cell | void`, so addons without a visual tree can simply log and return.

## Build and distribution

`wuira build` transpiles through `tsconfig.json`. It writes a standalone addon directory containing individual Lua modules, a loader, a startup file, and `<addonName>.toc`. The default output directory is `dist/`. The addon name lives in `wuira.config.mjs`; Interface version and other metadata live in `addon.toc.in`. The default Interface version, 16001, targets the Forever playground.

Copy the contents of `dist/` to `Interface/AddOns/<addonName>/`, or configure the build to output there directly. No Node.js runtime or separate wuira addon is required in game. Module registries are isolated by addon name.

Framework code and generated `.d.ts` declarations come from the installed npm package. Import UI components from `wuira/ui`, data sources from `wuira/datasources`, and the mounting API from `wuira`. No framework source files or build scripts are copied into addon projects. This repository contains only the framework and CLI; addon entry points and TOC metadata are generated in consumer projects.

Project templates live in `templates/addon/`. Generated projects depend on `wuira` and extend `wuira/config/tsconfig.json`. Shared settings and the TSTL module plugin stay in the installed package; build scripts are not copied into projects. Project-local `rootDir`, `outDir`, and source includes remain in the generated `tsconfig.json`.

`npm run build` resolves the locally installed `wuira` command automatically. Use `npx wuira build` when invoking the CLI directly.

Configure the addon output in `wuira.config.mjs`:

```js
export default {
    name: "MyAddon",
    outDir: "./dist",
    // Or: outDir: "G:/Games/WoW/Interface/AddOns/MyAddon",
};
```

Relative output paths resolve from the project directory. Absolute paths can target the game's addon directory, keeping the development project elsewhere. Builds compile into a temporary staging directory before copying successful output to the destination. Existing files with matching names are overwritten; unrelated files are retained. The emitted TOC uses paths relative to the output folder, so the entire folder can be moved independently.

The CLI, configuration, and build plugin use ESM (`.mjs`). Only Lua and TOC files are needed in game. `npm run build` in the framework repository generates distributable Lua modules and TypeScript declarations in `lib/`; addon builds include the framework modules they import.

## Development

```sh
npm ci
npm run build
npm run check
npm test
```

`.github/workflows/ci.yml` runs type checks, builds, tests, and a package dry run on pushes and pull requests, on both Linux and Windows with Node.js 22. CI does not publish packages and requires no npm token.

Cell is the basic visual box. FlowLayout and GridLayout arrange children. ProgressBar uses a native StatusBar, while data sources connect values to presentation. Behavior from other WoW versions must be verified against the Forever API before use.

Licensed under MIT; see [LICENSE](LICENSE).

## Releases

The first version is published. To publish the next version locally, validate the project, increment the patch version, and publish:

```sh
npm run check
npm run build
npm test
npm version patch --no-git-tag-version
npm publish --access public
```

Publishing requires npm authentication and 2FA, or a granular access token with write access and Bypass 2FA enabled. Commit both `package.json` and `package-lock.json` after changing the version. npm versions cannot be published twice.

For future automated releases, every pushed Git tag triggers `.github/workflows/publish.yml`. It checks types, builds, tests, and publishes to npm. Tags must match `package.json` version, optionally prefixed with `v`. Do not push a release tag for a version already published locally; the workflow would attempt to publish it again.

To enable automated publishing, configure the GitHub repository secret `NPM_TOKEN` with an npm granular access token authorized to publish `wuira` and bypass 2FA. Never commit the token. GitHub Actions must be enabled. Local setup does not publish a package or push a tag.
