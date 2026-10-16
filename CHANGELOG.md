# Changelog

Notable changes to wuira are recorded here, newest first. Add changes to
`Unreleased` during development, grouped under Added, Changed, Fixed, or Removed
as appropriate. When releasing, move those entries into a versioned section
with the release date and highlight breaking changes explicitly.

## Unreleased

## 0.2.6 — 2026-10-16

### Changed

- Keep wuira source conversion callback-based. Case mappings and arithmetic
  formula factories now belong to LumaUI's builder layer.

### Removed

- **Breaking:** Remove the `CaseConverter` and `MathConverter` APIs introduced in
  0.2.5, including the expression parser. Use `new SourceConverter(source,
  value => ...)` in wuira code; LumaUI owns its editable case/math definitions.

## 0.2.5 — 2026-10-16

### Added

- `SourceConverter`, `CaseConverter` and `MathConverter` with checked reads,
  shared event subscriptions, strict case matching and a bounded arithmetic
  parser. Restricted values never reach conversion callbacks. ClassSource now
  provides lazy native change subscriptions for unit identity and class data.

- Generated `Icons` const enum and packaged icon catalog under `wuira/icons`,
  using native texture FileDataIDs from the same pinned Forever client build as
  the spell enums. Includes spell, active-spell and item icons with searchable
  names and aliases, plus repeatable update and generation commands.

### Fixed

- Wait for the completed addon load before opening SavedVariables. The native
  `IsAddOnLoaded` loading flag no longer causes stores to retain a temporary table
  and lose changes on reload.

## 0.2.4 — 2026-10-15

### Added

- Observable keyed ForEach rendering. Stable keys retain native widgets and their
  subscriptions across joins, leaves, reorder and metadata updates; only added or
  removed records mount or dispose. Supports grouped layout and wrapping.
- Native GroupRoster metadata with GUID identity, full-name/realm fallback, pet
  ownership and raid subgroup membership. Retains the last readable roster if
  native membership data becomes restricted.
- Cell keys, event-driven GroupMembers subscriptions and shared UnitSource
  retargeting. HP/Mana readers and event filters follow the existing unit reference.

### Changed

- Defer keyed structural updates and unit retargeting until combat ends, keeping
  protected click targets aligned with displayed data.

## 0.2.3 — 2026-10-15

### Added

- Tooltip attachment in Cell decorations, inherited by all visual components.
  Route hover to native GameTooltip or another native tooltip with custom text,
  extra lines or a callback using native spell, item, unit, hyperlink and action APIs.
- Motion-only hover input preserves click-through behavior and existing scripts;
  owned tooltips close on leave, hide and disposal without changing secure actions.

## 0.2.2 — 2026-10-15

### Added

- Event-driven EditModeLayouts source with native layout metadata, active layout,
  availability status and disposable change subscriptions. Layout keys use native
  type, interface style and name; indices are not persistent IDs.

### Fixed

- Keep generated spell files in LF format on Windows checkouts so deterministic
  generation checks compare identical bytes across operating systems.

## 0.2.1 — 2026-10-15

### Changed

- Make Wuira the static accessor for the addon's WuiraApp instance, which owns
  mounted trees and their lifecycle. Keep wuira as a compatibility alias.
- Move the renderer out of ui/mount.ts into WuiraApp and focused rendering
  helpers for geometry, widgets, visibility, decorations and updates.
- Generate new addon entry points using Wuira.Mount.

## 0.2.0 — 2026-10-15

### Removed

- **Breaking:** Remove the legacy Spells enum. Use the generated categorized
  enums from wuira/spells, such as PaladinSpells, instead.

### Fixed

- Clean library output before compilation so removed modules are excluded from
  published packages.

## 0.1.10 — 2026-10-15

### Added

- Generated, categorized compile-time spell enums covering all 31,863 IDs in
  Forever client 1.60.1.70374, including racial, pet, profession and world records.
- Separate native BindingActions command tokens, pinned source provenance and
  offline enum regeneration from a committed client snapshot.

### Fixed

- Resolve root Store exports through an explicit index module and apply Node16
  module resolution to the framework's own TypeScript project.

## 0.1.9 — 2026-10-15

### Added

- Generic `Encoding.Encode` / `Decode` using native CBOR, compression and Base64,
  with decode size checks. Import formats and schema validation stay in applications.
- Native `ScrollHost` for clipped, mouse-wheel scrolling inside mounted Cells.
- Native `TextInput` hosts for copy/paste and text entry inside mounted Cells,
  including focus selection, Escape callbacks and cleanup.

### Fixed

- `TextInput` passes the required font flags to Forever's native EditBox API.
- `Window.Open` retains its current content if a replacement fails to render or
  mount. Header cleanup only stops a drag when the window is actually moving.

## 0.1.8 — 2026-10-14

### Added

- Standalone `Window` hosts with draggable headers, Escape-to-close, content
  cleanup, and protected-content close deferral.
- Frameless `ForEach` JSX expansion with typed render children and nested groups.
  Cell's single-child rule is enforced after expansion; lists are snapshots.
- `Cell.condition` accepts a boolean or visibility callback, combines with existing
  `visible`, and respects protected-tree combat deferral. Secret conditions hide cells.
- `KnownSpells.Filter(pattern)` matches cached localized names with whole-name
  `*`/`?` globs and ASCII case-insensitive comparisons, returning detached metadata.
- Per-line `FlowLayout.justify` alignment (`start`, `center`, or `end`), including
  wrapped rows and vertical columns.
- Cached `KnownSpells.Entries` metadata and rank-aware `Find`, including localized
  names and native passive flags. Metadata changes also notify observers.
- Named Paladin Blessing, Greater Blessing, and Aura spell identifiers.

### Fixed

- Layout children accept mixed JSX siblings and nested arrays with ordered
  expansion and cycle checks.

### Validation and limitations

- Lua and package tests cover loop expansion, typed render children, visibility,
  cached name filtering, alignment, window cleanup, and protected close deferral.
- ForEach expands a snapshot when its view is created. Applications own event
  subscriptions and rebuild protected views outside combat. Serialized expression
  parsing and the visual editor are application features.

## 0.1.7 — 2026-10-14

### Added

- README AI disclosure describing AI assistance, line-by-line code review,
  release validation, and maintainer responsibility.

## 0.1.6 — 2026-10-14

### Added

- `wuira.registerCommand("/command", callback)` registers native slash commands,
  passes parsed arguments as `(...args: string[])` and returns idempotent cleanup.
  Quoted arguments preserve spaces and empty values. Names are case-insensitive;
  existing commands are preserved and native hash/proxy entries are cleaned up.
- Native `AddonSettings` canvas registration, normal JSX `Button` controls and
  Cell `onMount` lifecycle callbacks with cleanup.
- Generic `FrameMover` drag proxies and `KeybindCapture` hover-to-bind overlays.
  Both stop editing in combat; protected actions remain configured outside combat.
- `KnownSpells` caches learned player spellbook IDs, with rank-aware `Has`,
  event-driven `onChange` subscriptions and disposal. World entry, level,
  training and talent events refresh the list; reading it never polls the book.
- `Cell.alpha` accepts fixed opacity or a live visual callback, including on
  secure buttons. Opacity updates do not enable, disable or rewrite actions.
- Named `Spells.HolyShock` and `Spells.Exorcism` identifiers.
- Named Paladin utility spell identifiers: Divine Favor, Lay on Hands, Blessing
  of Protection, Blessing of Freedom, Voice of Truth, and Hammer of Justice.
- `TotemTimer` reads player-owned ground effects by spell ID or localized name,
  matching ranks and passing opaque native durations directly to progress bars.
  Restricted effect identities are not inspected or guessed.
- `SecureButton`, a Cell-compatible JSX primitive backed by Forever's native
  `SecureActionButtonTemplate`. Supports static spell, item, existing macro,
  action-slot and target actions, a selected mouse button, and one visual child.
  Native click handlers are preserved; actions execute on mouse release.
  Protected trees must mount outside combat; visibility and unmount are deferred
  until combat ends. Click-cast presets are not included yet.
- Secure buttons accept temporary `binding` overrides with native key labels,
  radial `cooldown` sources and a native completion flash through `finishGlow`.
  Overrides are removed on unmount without changing saved key bindings.
- `SpellSource` exposes localized secure actions, textures and cooldowns that
  ignore the global cooldown. Added Judgement, Holy Strike and Consecration IDs.
- `BlizzardUI.SkinMicroMenu()` styles Forever's existing micro menu with a flat
  panel, muted icons and accent highlights. Native click handlers, tooltips,
  notifications and layout remain owned by the game; styling waits during combat.
- `wuira/skins` with `MicroBar` and a shared `NativeSkin` adapter. `render` receives
  the adapter, including `mount(view, anchor)` and `OnHover`; custom mounts are
  disposed with the skin without replacing native button scripts.
- Generic `HoverTracker` secure trigger/popup frames, configurable auto-hide delay
  and extra hover regions. Addons own layout, launcher presentation and themes.
- Explicit action-slot capture/clear/restore APIs and opt-in empty native bars.
  New backups require a manual reload before the explicit clear command. Native bar
  descendants, event/update managers, and action UI registrations are disabled;
  suppression runs independently of slot operations. Clear/restore never run
  from world-entry or cursor events; refused calls are reported without automatic
  retries. A restore command re-enables the stock UI after manual reload. No replacement bar
  is created. Unsupported action types and conflicting restores are rejected.
- Resource `onChange` subscriptions with unsubscribe callbacks. Widgets and
  observers share one lazy native event listener per resource, reading its
  current value once per event. Secret amounts never reach user callbacks.
- `Mana.UseRegenTimer()` and its `RegenTimer` accessory: a cast-driven five-second
  window followed by estimated two-second sweeps kept alive by mana events.
  Full readable mana stops the clock; native alpha curves mask full secret mana.
  Unmount cancels timers and detaches the accessory without stopping other users.

### Fixed

- Preserve saved entries in initially empty Store records when loading a new
  registry; Lua's empty-table ambiguity no longer resets custom binding maps.
- Honor explicit non-top-left anchors on a Cell's child, allowing thin overlays
  to sit on the bottom edge of a progress bar.

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
