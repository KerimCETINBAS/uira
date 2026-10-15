# wuira

Build WoW Forever interfaces with TypeScript and JSX.

wuira is a UI framework and addon toolchain for developers who want to describe their interface in code, compose reusable components, and keep game data separate from presentation. Write TypeScript, arrange native widgets with JSX, and compile your addon to Lua.

## Why wuira?

An interface should be easy to understand by reading its source. A health display can be a progress bar inside a layout; a player display can be a composition of bars, labels, and icons rather than a special unit-frame class. wuira provides the foundations for that approach, with TypeScript checking your component props before the addon reaches the game.

The snippets below use the lowercase JSX primitives. In a generated project, import `{ UI, Wuira }` from `wuira` before mounting a view. Each view example is independent. Wuira is a static accessor; Wuira.App is the current addon's WuiraApp instance and owns its mounted trees and cleanup. Separate addons keep independent application state. The lowercase wuira export remains available for existing addons.

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

Wuira.Mount(App);
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

Wuira.Mount(view);
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

Wuira.Mount(view);
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

Wuira.Mount(App);
```

### Conditional sources and health predictions

```tsx
import { UI } from "wuira";
import { ProgressBar } from "wuira/ui";
import { HP, Unit } from "wuira/datasources";

const hp = new HP(Unit.Player)
    .UseHealPrediction()
    .UseAbsorbPrediction()
    .When(value => value >= 20); // Current health points, not a percentage.

const view = (
    <ProgressBar width={220} height={24} source={hp}
        healPrediction={{ texture: "blizzard", color: { r: 0.4, g: 1, b: 0.5, a: 0.5 } }}
        absorbPrediction={{ texture: "solid", color: { r: 0.8, g: 0.9, b: 1, a: 0.55 } }} />
);
```

Configure sources before mounting. `.When()` filters native binding updates using
the source's own value; repeated calls combine with AND. A false condition hides
the bound bar and suppresses writes until a relevant event makes it true again.
The basic health events remain subscribed so the source can reactivate; there is
no health polling. Predicates should depend on this source's event-driven state,
not unrelated mutable values. `.Value` remains a fresh, checked snapshot rather
than a filtered subscription. Secret values never reach condition callbacks:
a conditional binding becomes inactive until readable data returns. Without a
condition, opaque values continue directly to native widgets.

Each prediction channel is allocated and its event registered only when explicitly
enabled and supported. No prediction snapshots are cached. Access
`hp.HealPrediction?.Value` and `hp.AbsorbPrediction?.Value` when readable, or check
the channel's `IsAvailable` flag. Direct reads retain the usual secret-value guard.
The APIs provide incoming healing and existing damage-absorb shields, not a
forecast of future damage. The adapter uses
[Blizzard's unit prediction APIs](https://github.com/Gethe/wow-ui-source/blob/live/Interface/AddOns/Blizzard_APIDocumentationGenerated/UnitDocumentation.lua).

Enabled channels draw by default; `healPrediction={false}` or
`absorbPrediction={false}` suppresses an individual overlay. Incoming healing starts
at the native health-fill edge and clips at the bar boundary. Shields overlay
inward from the opposite edge, remaining visible even at full health. Both accept
independent textures/colors and support horizontal, vertical, and reversed bars.
There is no arithmetic on secret health or prediction amounts. Raw incoming heals
are not reduced by heal-absorb debuffs; overheal is visually clipped. Prediction
overlays require the native health scale, so min/max/current overrides are rejected.
Prediction reads pause while the parent HP condition is inactive. The renderer
cleans up the overlays and resource subscriptions on unmount.

### Slash commands

```ts
import { Wuira } from "wuira";

const unregister = Wuira.registerCommand("/myaddon", (...args: string[]) => {
    console.log("Arguments:", ...args);
});

// /myaddon arg1 arg2 arg3 passes three string arguments.
// /myaddon alone calls the callback with no arguments.
// Call unregister() when the command is no longer needed.
```

Command names start with a slash and a letter, followed by letters, digits,
underscores or hyphens. Names are case-insensitive and cannot replace an existing
command. Register aliases separately with the same callback.

Arguments are separated by whitespace and retain their case. Single or double
quotes group words into one argument; `""` passes an empty string. Within quotes,
a backslash can escape the matching quote or another backslash. An unclosed quote
reports an error without calling the callback. Argument counts are unrestricted;
validate required arguments inside your callback.

### Addon settings and editing tools

Create a standalone window with mounted JSX content. Bind a header as its drag
handle; Escape or `Close()` releases the content while preserving the host's
screen position for the next opening:

```tsx
import { Window, FlowLayout, Label } from "wuira/ui";

const window = new Window({ width: 1000, height: 680 });
window.Open(() => (
    <FlowLayout onMount={frame => window.BindDragHandle(frame)}>
        <Label height={40} text="My addon" />
    </FlowLayout>
));
```

Register a normal JSX view in Forever's native addon settings list:

```tsx
import { UI, AddonSettings } from "wuira";
import { FlowLayout, Button, Label } from "wuira/ui";

const settings = new AddonSettings("MyAddon", () => (
    <FlowLayout width={560} height={300} padding={20} gap={12}>
        <Label height={28} text="MyAddon settings" />
        <Button width={180} height={32} onClick={() => console.log("Settings opened")}>
            <Label text="Example control" align="CENTER" />
        </Button>
    </FlowLayout>
));
settings.Open();
```

`Cell.onMount` receives the configured native frame and may return an unmount
cleanup. `FrameMover` provides a drag proxy with screen-center coordinates
(positive y down). `KeybindCapture` provides hover-to-bind overlays, modifier keys,
Delete/Backspace clearing, and an Escape callback. These tools stop editing in
combat. Addons own mode controls, saved positions, binding conflict policy and
rebuilding protected buttons outside combat.

### Learned spells

`KnownSpells` keeps a cached snapshot of learned player spellbook IDs. It refreshes
on world entry, level, training and talent events without polling. Named entries
in `Spells` are numeric IDs; `Has` also matches a representative ID against learned
ranks by localized name. Future and inactive-spec spellbook entries are excluded.

```ts
import { Spells } from "wuira";
import { KnownSpells } from "wuira/datasources";

const known = new KnownSpells();
const spellIds = known.Value; // readonly number[], read from the cache
const canJudge = known.Has(Spells.Judgement);
const activeSpells = known.Entries.filter(spell => spell.isPassive === false);
const learnedRank = known.Find(Spells.Judgement); // { id, name, isPassive } or undefined
const seals = known.Filter("Seal*"); // Detached matching entries, including learned ranks.
const stop = known.onChange(ids => console.log("Learned spells:", ids.length));
// On disposal: stop(); known.Dispose();
```

`Entries` returns detached cached metadata. An unknown passive flag stays
`undefined`; unreadable spellbooks return no entries. Metadata changes also notify
`onChange` observers, even when the spell IDs have not changed.

`Filter` matches the entire localized name. `*` matches any sequence and `?` one
byte; matching ignores ASCII case. Filtering reads the cache without polling the
spellbook. Patterns must use names in the client's language.

Protected button trees must be rebuilt outside combat; applications can defer a
changed selection until `PLAYER_REGEN_ENABLED`. `Cell.alpha` changes appearance
without changing a button's protected action or its interaction state.

For wrapped action rows, `FlowLayout` supports `grow` and per-line `justify`:

```tsx
<FlowLayout width={220} height={52} direction="horizontal" gap={4} grow justify="center">
    {buttons /* 24-unit buttons wrap after eight; the last row is centered. */}
</FlowLayout>
```

Use `ForEach` to expand a snapshot into layout children without wrapper frames:

```tsx
import { UI } from "wuira";
import { FlowLayout, ForEach, SecureButton } from "wuira/ui";

function SealButtons() {
    return (
        <FlowLayout width={220} height={24} direction="horizontal" gap={4}>
            <ForEach items={known.Filter("Seal*")}>
                {(spell, index) => (
                    <SecureButton width={24} height={24}
                        action={{ type: "spell", spell: spell.id }} condition={spell.isPassive === false} />
                )}
            </ForEach>
        </FlowLayout>
    );
}
```

The render function receives the item and its zero-based index. Use `ForEach`
inside a layout for multiple siblings; Cell still accepts at most one expanded
child. Nested loops are flattened in order. Array inputs create no subscriptions:
recreate the view from `known.onChange` when needed, outside combat for protected
trees. Each filtered rank remains a separate entry. Observable list sources also
support keyed updates, as shown below under Group members.

All visual cells accept `condition={boolean}` or `condition={() => boolean}`.
This controls visibility and retains the layout slot. It combines with datasource
activity and the existing `visible` predicate. Callbacks use the shared visibility
update driver; protected changes wait until combat ends. Secret conditions hide
the cell without inspecting their value.

### Empty native action bars

This is opt-in and removes real action-slot assignments, not just their visuals.
Declare a character-specific backup variable in the addon's TOC:

```text
## SavedVariablesPerCharacter: MyAddonActionBarBackup
```

```ts
import { ActionBars } from "wuira";

ActionBars.InstallEmptyMode({
    addon: "MyAddon",
    variable: "MyAddonActionBarBackup",
    clearCommand: "/myaddonclearbars",
    restoreCommand: "/myaddonrestorebars",
});
```

The first world entry captures supported spell, item, and macro assignments.
Use `/reload` to persist a new backup, then `/myaddonclearbars` outside combat to
clear the 180 action slots used by the installed Forever implementation. Slot
changes run directly from the command, never from world-entry or cursor events.
Independently, initialization hides stock bars, removes their descendant event/update handlers, disables their
shared action-bar event managers, and detaches native action UI registrations.
It does not create a replacement bar or remove key-binding assignments.
Changes wait until combat ends, and a busy cursor blocks slot changes.

The restore command puts assignments back into empty or identical slots. Use
`/reload` afterwards to restore native handlers and visibility. The stock bars
remain enabled on future loads. A refused slot operation leaves bar suppression
active and is not automatically retried. Blocked/forbidden native calls report
their API name in the local console; command execution does not bypass client restrictions.
Unsupported action types, secret slot data, uncovered assignments, and conflicting
restores stop the operation. `Capture()`, `Clear(backup)`, and `Restore(backup)` are
also available for applications that manage their own persistence and lifecycle.

### Secure action buttons

`SecureButton` extends Cell's descriptor and props, including size, positioning,
decorations and one child. Mount it like any other component:

```tsx
import { UI, Wuira } from "wuira";
import { SecureButton, Label } from "wuira/ui";

Wuira.Mount(() => (
    <SecureButton width={80} height={24}
        action={{ type: "spell", spell: 635, unit: "player" }}>
        <Label text="Holy Light" align="CENTER" />
    </SecureButton>
));
```

Supported actions are `{ type: "spell", spell, unit? }`,
`{ type: "item", item, unit? }`, `{ type: "macro", macro }`,
`{ type: "action", slot, unit? }` and `{ type: "target", unit }`.
Spell and macro references accept IDs/indices or names. Items accept an ID
(converted to `item:ID`) or the native item string. Macros refer to existing
game macros, not arbitrary Lua callbacks or generated macro text.

The default is left-button release; `button="RightButton"` selects another
button. Secure buttons always receive mouse input, while visual children remain
click-through by default. Omitting `action` creates an inert secure button.

Actions and units are static mount-time attributes. Changing the descriptor
later does not rewrite them. Mounting a protected tree during combat raises an
error before any frame is created. Visibility changes and unmount requests wait
until combat ends, including changes to ancestors containing secure buttons.
Click-cast presets are not provided by this primitive yet. The native action mapping
follows [Forever's secure templates](https://github.com/Gethe/wow-ui-source/blob/forever/Interface/AddOns/Blizzard_FrameXML/SecureTemplates.lua).

For an icon action with a radial cooldown and temporary key binding:

```tsx
import { Spells } from "wuira";
import { SpellSource } from "wuira/datasources";
import { Icon } from "wuira/ui";

const judgement = new SpellSource(Spells.Judgement);
const button = (
    <SecureButton width={40} height={40} action={judgement.Action}
        binding="1" cooldown={judgement.Cooldown} finishGlow>
        <Icon textureSource={judgement.Texture} />
    </SecureButton>
);
```

`binding` temporarily routes the key to this native button and adds its label;
`showHotkey={false}` suppresses the label. Unmount removes the override and leaves
saved bindings intact. The radial widget owns countdown timing and the short
completion flash, including opaque combat durations. `SpellSource.Cooldown`
ignores the GCD so unrelated casts do not trigger a completion flash.

### Native skins

Skin Forever's existing character, professions, spellbook and other micro-menu
buttons while keeping the game's click handlers, tooltips and notifications:

```tsx
import { UI } from "wuira";
import { MicroBar } from "wuira/skins";
import { Cell, Background } from "wuira/ui";

const micro = new MicroBar();
micro.render(bar => {
    bar.Style({
        background: { r: 0.035, g: 0.045, b: 0.065, a: 0.9 },
        accent: { r: 0.4, g: 0.75, b: 1 },
        padding: 6,
    });
    bar.mount(() => (
        <Cell width={12} height={2} decorations={{
            background: new Background({ color: { r: 0.4, g: 0.75, b: 1 } }),
        }} />
    ), "TOP");
    bar.OnHover(hovered => console.log("Micro menu hover:", hovered));
    return bar;
});
```

`render` receives the skin adapter once its game-owned frame is ready. The same
object exposes `Frame`, `Style`, `OnHover`, and `mount`; mounts become children of
the native frame and are released by `Dispose()`. Native clicks, events and
tooltips remain intact. Rendering waits until combat ends.

`HoverTracker` supplies generic secure trigger/popup frames and auto-hide regions;
the addon owns their visuals, contents and positioning. Compact menu launchers
and themes belong in the consuming UI rather than the framework. Hover callbacks
are ordinary addon callbacks; use secure hover visibility for protected panels.

`BlizzardUI.SkinMicroMenu(options)` is also available for styling alone. Stopping
styling hides its added panel; reload restores original native textures.

### Resource observation and mana regen

Resource changes can also be observed without mounting a widget:

```ts
const mana = new Mana(Unit.Player).UseRegenTimer();
const unsubscribe = mana.onChange(value => console.log(value));
// Call unsubscribe() when this consumer is removed.
```

`onChange` reports future readable value changes, with no initial callback.
It honors `.When()` and never sends secret values to user code. Native bar
bindings still accept secret values directly. Bars, observers, and the regen
accessory share one lazy native event listener; it unregisters when the last
consumer detaches. `.Value` is still available for a one-time read.

`mana.RegenTimer` can be bound to a thin `ProgressBar`. Its `Phase` is
`fiveSecondRule`, `estimatedTick`, or `inactive`. Successful mana-cost casts
start/restart a five-second window, followed by estimated two-second cycles.
Mana events keep those cycles alive without resetting a running cycle. No
server tick clock is exposed: this is an estimate, including when the cost is
secret. Zero-cost casts do not restart the window. The native widget animates
the fill; one-shot callbacks handle phase transitions, with no Lua frame polling.
Full readable mana cancels the clock. When mana is secret, a native step curve
hides full mana visually; Lua cannot use that hidden result to dispose the timer,
so the estimate stops when mana events cease. The frame is reused on the next
cast. Configure this player-only accessory before mounting.

### Native aura, cooldown, and cast timers

```tsx
import { UI, Spells } from "wuira";
import { FlowLayout, ProgressBar, Icon, Label } from "wuira/ui";
import { AuraTimer, GlobalCooldown, CastTimer, Unit } from "wuira/datasources";

const aura = new AuraTimer(Unit.Player, { spellIds: [Spells.SealOfRighteousness], filter: "HELPFUL" });
const gcd = new GlobalCooldown();
const cast = new CastTimer(Unit.Player);

function Timers() {
    return (
        <FlowLayout width={200} height={94} direction="vertical" gap={2}>
            <Icon width={24} height={24} textureSource={aura.Texture} />
            <ProgressBar height={24} source={aura}><Label text="Aura" /></ProgressBar>
            <ProgressBar height={18} source={gcd} />
            <ProgressBar height={22} source={cast} />
        </FlowLayout>
    );
}
```

These timers pass opaque native duration objects to `SetTimerDuration`; they do
not calculate restricted durations in Lua. `SpellCooldown(spellId)` tracks a
specific spell, and `GlobalCooldown` supplies the GCD identifier internally.
`CastTimer` follows casts and channels. `AuraTimer` resolves localized spell names
and exposes an associated `Texture` source, with status indicating active,
inactive, restricted, or unavailable data. Aura access still follows the client's
restrictions; missing readable data is not reconstructed from combat events.
`Label` and `Icon` are visual Cells. Application code supplies which spells to
track; native API declarations and reads remain in wuira.

### Swing timers

```tsx
import { UI, Wuira } from "wuira";
import { ProgressBar } from "wuira/ui";
import { SwingTimer, SwingHand } from "wuira/datasources";

const mainHand = new SwingTimer(SwingHand.MainHand);
const view = Wuira.Mount(<ProgressBar width={200} height={12} source={mainHand} />);

// Other choices: SwingHand.OffHand and SwingHand.Ranged.
// mainHand.Value: remaining seconds; Max.Value: duration; Percent.Value: remaining percent.
// When removing the feature:
if (view !== undefined) wuira.Unmount(view);
mainHand.Dispose();
```

This source follows the player's `PLAYER_SWING(duration, swingType)` events.
It does not reconstruct swings from the combat log or track enemy attack cycles.
`HasTiming` is false until the first readable event and after a weapon/world reset;
zero before that event is not evidence of a synchronized swing. After a recorded
cycle expires, remaining time reaches zero. Secret payloads block datasource
computation until a readable event or reset arrives.

Native progress binding uses `C_DurationUtil` and `StatusBar:SetTimerDuration`,
with no Lua per-frame animation. Range/current overrides are not supported for
this binding. Unmount detaches each bar; call `Dispose()` to stop the source's
event listener when its owning feature ends. Support is capability-checked;
actual timing still needs validation in Forever. The adapter follows the
[Forever swing API definition](https://github.com/Gethe/wow-ui-source/blob/bd2470aed543f72697a044e989285b6c83e63f73/Interface/AddOns/Blizzard_APIDocumentationGenerated/SwingTimerDocumentation.lua).

### Native Edit Mode layouts

```ts
import { EditModeLayouts } from "wuira/datasources";

const layouts = new EditModeLayouts();
console.log(layouts.Active?.name);
const stop = layouts.onChange(snapshot => console.log(snapshot.active?.key));
// On teardown: stop(); layouts.Dispose();
```

`Layouts` lists native indices, names, types and derived keys. `Value` is a detached
snapshot; native events refresh it without polling. Check `Status` for availability.
Forever exposes an index rather than a persistent UUID: `key` combines type,
interface style and name, survives index shifts, and changes on rename. These keys
describe local game layouts, not portable layout exports.

### Group members

```ts
import { GroupMembers, PartyMembers, RaidMembers, Buffs } from "wuira/datasources";

const group = new GroupMembers();
for (const unit of group.Value) {
    const buffs = new Buffs(unit);
    // Apply your own buff-tracking rules to buffs.Value when readable.
}

const party = new PartyMembers();
const raid = new RaidMembers();
```

`GroupMembers` returns `["player"]` while solo, `player` plus `partyN` tokens
in a party, and `raidN` tokens in a raid. `PartyMembers` is empty outside a
party; `RaidMembers` is empty outside a raid. The player is included once.
Offline members are retained. Each `.Value` access reads the current roster.
`onChange` subscribes to roster, pet, connection and name events without polling;
unsubscribe or call `Dispose()` when done. Tokens may refer to different members
after roster changes and should not be used as persistent identities.

`GroupRoster` adds GUID-based keys, full-name/realm fallback, pet ownership and
raid subgroup metadata. Pass it directly to `ForEach` to retain mounted cells and
their resource subscriptions while the roster changes:

```tsx
import { UI, Wuira } from "wuira";
import { ForEach, ProgressBar, type Element } from "wuira/ui";
import { GroupRoster, HP, UnitSource } from "wuira/datasources";

const roster = new GroupRoster("party", { pets: true, includeSelfWhenSolo: true });
const units = new Map<Element, UnitSource>();
const view = (
    <ForEach items={roster} key={member => member.key}
        direction="vertical" wrapAfter={5} gap={4} lineGap={8}
        onUpdate={(view, member) => units.get(view)!.Retarget(member.unit)}
        onDispose={view => { units.delete(view); }}>
        {member => {
            const unit = new UnitSource(member.unit);
            const view = <ProgressBar width={160} height={24} source={new HP(unit)} />;
            units.set(view, unit);
            return view;
        }}
    </ForEach>
);
const frame = Wuira.Mount(view)!;
// On teardown: Wuira.Unmount(frame); roster.Dispose();
```

Observable inputs expose `Value` and `onChange`, and require unique, public keys.
Only new keys call the child factory; removed keys unmount and call `onDispose`.
Use `onUpdate` to update retained views when their unit token or metadata changes.
Structural changes wait until combat ends. The observable `ForEach` owns its
layout and sizes its native host; mount it as a root or reserve an explicit slot
in its parent layout. `groupBy` can arrange raid subgroups in separate columns.

### Player class and specialization

```ts
import { UnitSource, ClassSource, SpecSource, Unit } from "wuira/datasources";

const target = new UnitSource(Unit.Target);
const playerClass = new ClassSource(target);
const specs = new SpecSource(target);

console.log(target.Is.PC); // boolean | undefined when restricted
console.log(playerClass.Value?.token);
specs.RequestInspect();
// Later, after INSPECT_READY: specs.Value contains native specialization data.
// Each entry exposes id, name, icon, role, and pointsSpent when provided.
// Call specs.Dispose() when the owning feature is removed or cancels the request.
```

These sources accept real players only; NPCs produce no data or inspect request.
The same `UnitSource` can be passed to `Buffs`, `Debuffs`, `HP`, and `Mana`.
Its `Value` contains the current token and GUID, rather than a cached identity.
`Retarget(token)` changes a shared reference outside combat; bound HP/Mana widgets
refresh without replacing their sources. `onChange` observes these explicit token
changes, not every change to the native unit's identity.
`Is.PC` and `Is.Self` return `undefined` when their native result is secret.
String unit tokens are still supported as a convenience shorthand.
Own specialization data is read directly. Other players require an explicit,
out-of-combat inspect request and a matching response GUID. An unknown result
remains `undefined`, and a changed unit token cannot expose another player's
cached result. Secret values are guarded by the datasource API. Requests are
not globally queued or automatically retried; callers own cancellation and
request timing. Inspect permission, range, hostile-player support, and the
meaning of talent-point fields must be verified on Forever. Being a player
does not by itself guarantee inspect access.

### Aura ownership

Buff and debuff sources expose fresh snapshots with caster information. Application
code decides which blessings or other effects should be displayed.

```ts
import { Buffs, Debuffs, Unit } from "wuira/datasources";

const buffs = new Buffs(Unit.Target);
const debuffs = new Debuffs(Unit.Target);

buffs.Compute(auras => {
    for (const aura of auras) {
        if (aura.isSourceSelf() === true) {
            console.log(aura.name, "applied by me");
        } else if (aura.isSourceSelf() === false) {
            console.log(aura.name, "applied by", aura.sourceUnit);
        }
        // undefined means ownership is unknown, not that another player cast it.
    }
});
```

`sourceStatus` is `known`, `unknown`, or `restricted`. Restricted caster values
are not exposed. Secret spell/name/icon data blocks `.Value` and `.Compute` through
the normal datasource guard; `.IsSecret()` reports it. Missing native API support
raises an explicit error instead of returning an apparently empty list. Reads do
not install event listeners or poll automatically. The current adapter requires
`C_UnitAuras.GetAuraDataByIndex`; Forever availability and restrictions still need
in-game verification. Unit tokens refer to snapshot time and are not persistent
caster identities. No Paladin-specific spell catalog or filtering is built in.

### Native tooltips

`Tooltip` attaches to any Cell through decorations. It forwards hover to the
game's native tooltip API and creates no visual regions or update loop.

```tsx
import { Cell, Tooltip } from "wuira/ui";

<Cell width={40} height={40} decorations={{
    tooltip: new Tooltip({ text: "My tooltip", lines: [{ text: "Extra details" }] }),
}} />;

<Cell width={40} height={40} decorations={{
    tooltip: new Tooltip({ show: tooltip => tooltip.SetSpellByID(635) }),
}} />;
```

The same attachment works on SecureButton. Call SetItemByID, SetUnit, SetHyperlink
or SetAction inside `show` for other native content. `text` may be a function
evaluated on hover; `show` may return false to suppress display. Optional `target`
selects another native tooltip, and `anchor` defaults to ANCHOR_RIGHT.
Hover preserves click-through and existing scripts. Leave, hide and unmount close
only a tooltip still owned by that Cell. Use one decoration instance per Cell.

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

Wuira.Mount(view);
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
import { UI, Wuira } from "wuira";


function App() {
    console.log("MyAddon loaded");
    return <></>;
}

Wuira.Mount(App);
```

An empty fragment creates no native frame. Only empty fragments are currently supported; use a layout for multiple visual elements.

`console.log/info/warn/error` use a global WoW console polyfill. Output goes to the local chat window, never to other players. The addon uses no Node.js runtime or stdin/stdout. `console.error` does not throw. Arguments are formatted with Lua `tostring`; objects are not deeply inspected. The CLI uses its own Node.js terminal console.

Importing `wuira` installs the global console polyfill automatically. The shared TypeScript config loads its global declarations and uses Node16 module resolution for package exports; DOM typings are not required. `Wuira.Mount` accepts a `Cell`, no value, or a function returning `Cell | void`, so addons without a visual tree can simply log and return.

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

## Stores

Use data classes to define defaults. Without a static token, records live only
in memory and are keyed by the class itself:

```ts
import { Store, StoreRegistry } from "wuira/store";

class SessionSettings extends Store {
    CastSpellId = 1232;
}

const store = new StoreRegistry();
const snapshot = store.get(SessionSettings); // One-time, deeply readonly copy.

const unsubscribe = store.subscribe(SessionSettings, settings => {
    console.log("New spell:", settings.CastSpellId);
});

store.set(SessionSettings, settings => {
    settings.CastSpellId = 635;
    return settings;
});

unsubscribe();
```

`get()` does not subscribe. `subscribe()` observes future commits and returns an
unsubscribe function; call `get()` for initial data. Each subscriber receives an
independent snapshot. `set()` works on a detached draft, validates the returned
data, commits it, and sends one notification per observer. If the updater throws,
the previous record is preserved. Stores contain data fields, not class methods.

For persistence, declare a stable token and the owning addon's SavedVariables:

```toc
## SavedVariables: LumaUIDB
```

```ts
class LumaSettings extends Store {
    static readonly Token = "luma.settings";
    CastSpellId = 1232;
    Width = 220;
}

const store = new StoreRegistry({ addon: "LumaUI", variable: "LumaUIDB" });
store.onReady(() => {
    console.log(store.get(LumaSettings).Width);
    store.set(LumaSettings, settings => {
        settings.Width = 240;
        return settings;
    });
});
```

Add the TOC declaration to the addon's `addon.toc.in`. The registry waits for
`ADDON_LOADED` before opening persistent records. Tokenless records can still be
used immediately. WoW writes the saved table on normal logout/reload; `set()`
does not force a disk flush. Keep tokens stable across versions. New default
fields are filled in and incompatible saved field types fall back to defaults;
renaming keys or changing schema meaning still requires an application migration.

Supported values are finite numbers, strings, booleans, arrays, and nested data
objects. Functions, cycles, and secret values cannot be saved. Two classes cannot
claim the same token within a registry. Share one registry instance per database.
`Dispose()` removes its observers and pending initialization listener. Profile
selection, schema migrations, and reactive widget binding are separate features.

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

## AI disclosure

wuira is developed with AI assistance for implementation, documentation, and
tests. AI-assisted code is reviewed line by line. Releases also undergo
TypeScript checks, Lua runtime tests, and package build validation. Project
maintainers remain responsible for the code and release decisions.

## Releases

See [CHANGELOG.md](CHANGELOG.md) for release history. Record new changes under
`Unreleased`, then move them into a dated version section before publishing.

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
