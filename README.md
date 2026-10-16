

# wuira

Build WoW Forever interfaces with TypeScript and JSX.

wuira is a UI framework and addon toolchain for developers who want to describe interfaces in code, compose reusable components, and keep game data separate from presentation. Write TypeScript, arrange native widgets with JSX, and compile your addon to Lua.

```tsx
import { UI, wuira } from "wuira";

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

## Highlights

- **JSX composition** — Describe UI trees with components. No separate XML view files.
- **Native widgets** — Cells mount to WoW frames; progress bars use the native StatusBar widget.
- **Layout primitives** — Arrange children with `flow` and `grid`.
- **Data sources** — HP, Mana, auras, cooldowns, casts, swings, group members, class/spec, spellbook.
- **Source converters** — Transform checked values with typed callbacks. See [source converters](docs/source-converters.md).
- **Slash commands** — Register commands with quoting and escaping support.
- **Windows and settings** — `Window`, `AddonSettings`, `FrameMover`, `KeybindCapture`.
- **Secure buttons** — Spell, item, macro, action, and target actions with `SecureButton`.
- **Native skins** — Style Blizzard UI through adapters such as `MicroBar`.
- **Stores** — Snapshot-based data storage with SavedVariables support.
- **Client catalogs** — Generated [spell enums](docs/spells.md) and [icon enums](docs/icons.md) from the pinned Forever client data.

## Installation

Requires Node.js 22.13 or newer.

```sh
npx wuira@latest create MyAddon
cd MyAddon
npm install
npm run build
```

`create` refuses to overwrite an existing directory. It generates TypeScriptToLua configuration, addon metadata, a module loader, an MIT license, and a minimal `src/index.tsx`.

## Data sources

```tsx
import { HP, Mana, Unit } from "wuira/datasources";

const hp = new HP(Unit.Player).UseHealPrediction().UseAbsorbPrediction();
const mana = new Mana(Unit.Player).UseRegenTimer();

<progress height={24} source={hp} />
<progress height={24} source={mana} />
```

Other sources include `AuraTimer`, `GlobalCooldown`, `CastTimer`, `SpellCooldown`, `SwingTimer`, `GroupMembers`, `PartyMembers`, `RaidMembers`, `Buffs`, `Debuffs`, `KnownSpells`, `Spells`, `UnitSource`, `ClassSource`, `SpecSource`, and `SpellSource`.

## Secure buttons

```tsx
<SecureButton width={80} height={24}
    action={{ type: "spell", spell: 635, unit: "player" }}>
    <Label text="Holy Light" align="CENTER" />
</SecureButton>
```

Supported action types: `spell`, `item`, `macro`, `action`, and `target`. Actions and units are static mount-time attributes. Protected trees cannot be mounted during combat.

## Stores

```ts
class LumaSettings extends Store {
    static readonly Token = "luma.settings";
    CastSpellId = 1232;
    Width = 220;
}

const store = new StoreRegistry({ addon: "LumaUI", variable: "LumaUIDB" });
store.onReady(() => console.log(store.get(LumaSettings).Width));
```

`get()` does not subscribe. `subscribe()` observes future commits. `set()` works on a detached draft, validates it, commits it, and sends one notification per observer. Supported values are finite numbers, strings, booleans, arrays, and nested data objects.

## Build and distribution

`wuira build` transpiles through `tsconfig.json`. It writes individual Lua modules, a loader, a startup file, and `<addonName>.toc` into `dist/`. Copy the output to `Interface/AddOns/<addonName>/`, or configure the build to output there directly.

```js
// wuira.config.mjs
export default {
    name: "MyAddon",
    outDir: "./dist",
};
```

No Node.js runtime or separate wuira addon is required in game. Framework code comes from the npm package and is not copied into addon projects.

## CLI

```sh
npx wuira create MyAddon
npx wuira build
```

For global installation, use `npm install -g wuira`. To test unpublished changes, run `npm install && npm link` in this repository, or invoke `node /path/to/wuira/cli/wuira.mjs` directly.

## Scope and status

wuira is an early framework. It is not a complete UI replacement, an in-game visual editor, or a WeakAuras replacement. JSX describes widgets; there is no React runtime or automatic reactive rendering layer. Combat restrictions and secret-value rules still apply and cannot be bypassed by the framework.

Current core includes Cells, flow and grid layouts, progress bars, decorations, health and mana sources, a local console polyfill, and project tooling. Not yet implemented: a complete WoW API surface, click-cast abstractions, nameplate adapters, and preset management.

The target client is WoW Forever. Compatibility with Retail or other Classic clients is not promised without verification.

## Development

```sh
npm ci
npm run build
npm run check
npm test
```

CI runs type checks, builds, tests, and a package dry run on Linux and Windows with Node.js 22. It does not publish packages and requires no npm token.

## License

MIT — see [LICENSE](LICENSE).

## AI disclosure

wuira is developed with AI assistance for implementation, documentation, and tests. AI-assisted code is reviewed line by line. Releases also undergo TypeScript checks, Lua runtime tests, and package build validation. Project maintainers remain responsible for the code and release decisions.

## Releases

See [CHANGELOG.md](CHANGELOG.md) for release history. Record new changes under `Unreleased`, then move them into a dated version section before publishing.
