# Changelog

Notable changes to wuira are recorded here, newest first. Add changes to
`Unreleased` during development, grouped under Added, Changed, Fixed, or Removed
as appropriate. When releasing, move those entries into a versioned section
with the release date and highlight breaking changes explicitly.

## Unreleased

No changes yet.

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
