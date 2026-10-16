# Nameplates

Import `Nameplates` from `wuira` or `wuira/skins`. Wuira owns native access,
events, unit bindings and visual cleanup. Preset selection, NPC rules, editor
data and component collections belong to the consuming addon (for example LumaUI).
No class or mob presets are built into Wuira.

`NativeSkin` remains the adapter for fixed named frames. Nameplates use a separate
event-driven manager because both carriers and unit visuals are dynamically pooled.

## Rules and ownership

`Nameplates.Apply(selector, customize)` and `Nameplates.Replace(selector, render)`
start independent groups. Chained calls append to that same group. `Nameplates.Create()`
starts an empty group, useful for collections:

```tsx
const plates = Nameplates.Create();
collection.forEach(component => {
    plates.Replace(p => component.matches(p.Unit, p.GUID), p => component.render(p));
});
// When preset data changes:
plates.Refresh();
// On addon feature shutdown:
plates.Dispose();
```

Rules are ordered by registration time across all groups. **The first matching
rule wins, regardless of whether it is Apply or Replace.** Apply rules do not
accumulate before/after a replacement. Put specific rules before fallbacks.
Disposing a losing group leaves the winning binding intact. Disposing a winning
group restores its changes and then activates the next matching rule, if any.
Dispose is idempotent; adding rules to a disposed group is an error.

Selectors receive `Unit`, public `GUID`, engine-owned `Frame`, and native visual
`Native` (with optional `healthBar` / `castBar`). Restricted identities/frames
never reach selectors. A selector error or secret result leaves the plate native;
it does not activate a less specific fallback. Callback errors go to WoW's error
handler. A failing winner is retried on refresh or the next relevant native event.
Callbacks must not add/dispose/refresh groups while reconciliation is running.

## Apply

Apply reuses Blizzard's visuals and bars. The context exposes reversible
`Alpha(frame, value)`, `Scale(frame, value)`, `Size(frame, width, height)`, and
`BarColor(bar, r, g, b, a?)`. These accept the native visual or its accessible,
unprotected descendants; the engine-owned carrier is excluded.

Cleanup restores a property only if it still equals the value this binding wrote,
so a later external write is preserved. Blizzard or another addon can overwrite
Apply styling; it is reapplied on relevant identity/faction/target/world events or
explicit refresh, rather than continuously polled. Direct native writes through
`Frame`/`Native` are outside rollback ownership and should be avoided.

Register each owned subscription immediately with `p.OnDispose(stop)` before
doing more work that could throw. Disposers run in reverse order, and a failing
disposer cannot prevent the remaining cleanup operations.

## Replace

Replace mounts the factory's fresh visual JSX under the native carrier, centered
on it, and suppresses native UnitFrame alpha only after mounting succeeds. It
keeps native scripts and events registered. A dormant hook per pooled UnitFrame
maintains suppression and remembers subsequent public native alpha writes for
restoration. This does not arbitrate competing nameplate addons that also hide,
reparent or replace native visuals.

Factories run per unit binding. Do not return one cached JSX instance for several
plates: mounting rejects simultaneous reuse. Bind sources inside the factory,
for example `new HP(p.Unit)`; mounting owns their widget subscriptions. Register
additional manual subscriptions through `OnDispose`.

Nameplate add/remove events, GUID changes and reuse of either carrier or UnitFrame
dispose the previous binding before a fresh factory runs. Already visible plates
are discovered on registration and world entry. Name/faction/target events and
`Refresh()` reevaluate selection and visuals. Health events are handled by data
sources, without polling selectors. Refresh also rebuilds matching views so edited
preset values take effect. Protected/forbidden frames and secret GUIDs are skipped.

Native positioning, movement, click bounds and ordinary targeting stay with the
engine. This API does not resize the carrier or alter native click areas. Ordinary
unprotected visuals can mount/unmount during combat. Secure JSX is rejected,
including outside combat: secure nameplate buttons need a separate design for
combat-time creation, positioning and correct targeting. Fixed arena secure cells
do not establish that dynamic nameplate buttons are safe.

The Lua integration tests exercise the compiled framework with mock WoW APIs,
including actual HP source subscription cleanup and mounting failures. They do
not establish real-client behavior or compatibility with other nameplate addons.
