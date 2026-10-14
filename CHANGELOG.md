# Changelog

Notable changes to wuira are recorded here, newest first. Add changes to
`Unreleased` during development, grouped under Added, Changed, Fixed, or Removed
as appropriate. When releasing, move those entries into a versioned section
with the release date and highlight breaking changes explicitly.

## Unreleased

No changes yet.

## 0.1.5 — 2026-10-14

### Added

- Event-driven `.When(value => boolean)` source conditions. Inactive bindings
  hide their visual and skip writes; secret inputs never reach callbacks.
  Repeated conditions combine with AND, and fresh `.Value` reads remain unchanged.
- Opt-in `HP.UseHealPrediction()` and `HP.UseAbsorbPrediction()` channels,
  with lazy allocation, capability checks, and optional event subscriptions.
- Independently styled healing and shield overlays on HP progress bars,
  including direct native handling of secret amounts and clipping at bar bounds.
- Opt-in `BlizzardUI.Hide` for stock action bars and player/target/focus frames,
  with combat deferral and a restore callback, preserving native event handlers.
- Cell visibility predicates and live label text, with cleanup on unmount.
- Timer activity flags and cast/channel spell names for conditional UI rows.
- Public `Spells` enum with named Paladin Seal spell IDs.
- Player swing countdown sources for main-hand, off-hand, and ranged attacks,
  driven by Forever's native swing events and native StatusBar timer animation.
- Explicit unknown timing before the first readable event, secret-value guards,
  weapon-change resets, and source disposal.
- Label and Icon primitives, with event-driven texture sources.
- Native duration sources for aura timers, spell/global cooldowns, and cast/channel
  countdowns. Selected aura icons share the aura source's selection policy.

### Fixed

- Initialize native timer and swing bars with a normalized 0–1 range instead
  of the default resource range.
- Mount lifecycle now runs datasource binding cleanup callbacks on unmount.

### Validation and limitations

- Lua tests cover conditional activation/reactivation, secret callback guards,
  optional prediction reads/events, overlay placement, and unmount cleanup.
- Prediction amounts require the client's native unit APIs. Incoming healing
  is raw (not reduced by heal-absorb debuffs); overheal is visually clipped.
  HP overrides are incompatible with prediction overlays. In-game prediction
  visuals still need validation in Forever.

## 0.1.4 — 2026-10-14

### Added

- Class-based stores with optional stable tokens, one-time readonly snapshots,
  transactional callback updates, and observer subscriptions.
- Memory-only stores when no token is declared; SavedVariables-backed records
  when a token and registry persistence configuration are provided.
- SavedVariables initialization after the owning addon's `ADDON_LOADED` event,
  default restoration, collision checks, and serializable data validation.

## 0.1.3 — 2026-10-14

### Added

- A maintained changelog included in the npm package.
- Buff and debuff sources with caster unit information, explicit source availability,
  and `Aura.isSourceSelf()` returning `undefined` when ownership is unknown.
- Target and focus unit constants.
- Group, party, and raid member sources exposing fresh roster unit tokens,
  with explicit solo behavior and no duplicate player entry in raids.
- Player-only class and specialization sources, including native talent-point
  values when available and explicit GUID-checked inspect requests for other players.
- Shared `UnitSource` references with live identity and `Is.PC` / `Is.Self`
  predicates, accepted by class, spec, aura, and resource sources.

### Changed

- Resource and aura constructors accept shared `UnitSource` references while
  retaining support for string unit arguments.

### Validation and limitations

- Mocked Lua tests cover aura ownership and restrictions, solo/party/raid
  membership, shared unit identity, and inspect responses after target changes.
- Forever aura and inspect capabilities still require in-game validation.
  Inspect is explicit, combat-restricted, and not automatically queued or retried.

## 0.1.2 — 2026-10-14

### Added

- A public `Cell` type shared with the mounting API.
- Support for `wuira.Mount` callbacks returning `void`, allowing addons without
  a visual tree to initialize without an empty JSX fragment.

### Changed

- Importing `wuira` automatically installs the global WoW console polyfill.
- The addon template logs its startup message without creating a visual tree.

### Fixed

- Shared TypeScript configuration explicitly uses Node16 module resolution,
  allowing package imports and their generated declarations to resolve.
- Global console declarations load through the shared configuration without
  requiring DOM typings or an explicit polyfill import in application code.

## 0.1.1 — 2026-10-14

### Added

- Public package imports: `wuira`, `wuira/ui`, and `wuira/datasources`.
- Generated Lua modules and TypeScript declarations distributed in `lib/`.
- Shared compiler configuration through `wuira/config/tsconfig.json`.
- Project templates maintained under `templates/addon/`.
- `wuira.config.mjs` for addon names and relative or absolute output paths.
- Standalone addon output containing its TOC and required Lua modules.
- GitHub Actions CI for Linux and Windows and tag-triggered npm publishing.
- English documentation with component and CLI examples.

### Changed

- Standardized framework, CLI, configuration, and API names to `wuira`.
- Converted CLI and build tooling to ESM `.mjs` files.
- Framework sources and build scripts are no longer copied into generated
  projects; they consume the installed npm package.

### Removed

- The framework repository's playable addon entry, TOC, and PlayerFrame
  playground. Addon entries are generated in consumer projects instead.

## 0.1.0 — 2026-10-14

### Added

- Initial public npm release with `wuira create` and `wuira build` commands.
- TypeScriptToLua compilation with separate Lua modules and a WoW module loader.
- JSX Cells, flow and grid layouts, and native StatusBar progress bars.
- Background, border, texture, and glow decorations.
- Health and mana data sources and a local WoW console polyfill.
- MIT license and addon project scaffolding.
