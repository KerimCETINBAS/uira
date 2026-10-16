import { wuira } from "../wuira";
import type { Cell } from "../ui/Cell";
import type { Element } from "../ui/primitives/jsx";

export interface NativeNameplate extends wuiraNativeFrame {
    readonly UnitFrame?: NativeNameplateVisual;
    readonly namePlateUnitToken?: string;
    GetUnit?(): string | undefined;
}
export interface NativeNameplateVisual extends wuiraNativeFrame {
    readonly healthBar?: wuiraNativeStatusBar;
    readonly castBar?: wuiraNativeStatusBar;
}
declare const C_NamePlate: {
    GetNamePlates(this: void): NativeNameplate[];
    GetNamePlateForUnit(this: void, unit: string): NativeNameplate | undefined;
} | undefined;
declare function UnitGUID(this: void, unit: string): string | undefined;
declare const geterrorhandler: ((this: void) => (this: void, message: unknown) => void) | undefined;

function report(failure: unknown): void {
    try { geterrorhandler?.()(failure); } catch { /* Error reporters must not interrupt restoration. */ }
}
function safe(frame: wuiraNativeFrame): boolean {
    if (issecretvalue(frame)) return false;
    const forbidden = frame.IsForbidden?.();
    if (issecretvalue(forbidden) || forbidden === true) return false;
    const protectedFrame = frame.IsProtected?.();
    return !issecretvalue(protectedFrame) && protectedFrame !== true;
}
function publicNumber(value: number): void {
    if (issecretvalue(value) || typeof value !== "number" || !Number.isFinite(value)) error("Nameplates: expected a public finite number");
}

export interface NameplateInfo {
    readonly Unit: string;
    readonly GUID: string;
    /** Engine-owned carrier. Do not mutate it or attach secure controls through this API. */
    readonly Frame: NativeNameplate;
    readonly Native: NativeNameplateVisual;
}
export type NameplateSelector = (this: void, plate: NameplateInfo) => boolean;
export type NameplateCustomize = (this: void, plate: NameplateContext) => void;
export type NameplateRender = (this: void, plate: NameplateContext) => Cell;

/** One unit binding. Use the reversible methods; direct native writes are not tracked. */
export class NameplateContext implements NameplateInfo {
    private active = true;
    private readonly cleanup: (() => void)[] = [];
    public constructor(public readonly Unit: string, public readonly GUID: string,
        public readonly Frame: NativeNameplate, public readonly Native: NativeNameplateVisual) {}

    /** Register owned subscriptions/sources immediately, before subsequent work can throw. */
    public OnDispose(cleanup: () => void): void {
        if (!this.active) error("Nameplate binding is disposed");
        this.cleanup.push(cleanup);
    }
    private check(frame: wuiraNativeFrame): void {
        if (!this.active) error("Nameplate binding is disposed");
        let current = frame;
        const seen = new Set<wuiraNativeFrame>();
        while (current !== this.Native) {
            if (!safe(current) || seen.has(current) || current === this.Frame || current === UIParent) error("Nameplates: expected an accessible native visual descendant");
            seen.add(current);
            current = current.GetParent();
        }
        if (!safe(current)) error("Nameplates: restricted native visual");
    }
    public Alpha(frame: wuiraNativeFrame, value: number): void {
        this.check(frame); publicNumber(value);
        const previous = frame.GetAlpha(); publicNumber(previous);
        this.OnDispose(() => { const current = frame.GetAlpha(); if (!issecretvalue(current) && current === value) frame.SetAlpha(previous); });
        frame.SetAlpha(value);
    }
    public Scale(frame: wuiraNativeFrame, value: number): void {
        this.check(frame); publicNumber(value);
        if (value <= 0) error("Nameplates: scale must be positive");
        const previous = frame.GetScale(); publicNumber(previous);
        this.OnDispose(() => { const current = frame.GetScale(); if (!issecretvalue(current) && current === value) frame.SetScale(previous); });
        frame.SetScale(value);
    }
    public Size(frame: wuiraNativeFrame, width: number, height: number): void {
        this.check(frame); publicNumber(width); publicNumber(height);
        if (width < 0 || height < 0) error("Nameplates: size must be nonnegative");
        const w = frame.GetWidth(), h = frame.GetHeight(); publicNumber(w); publicNumber(h);
        this.OnDispose(() => {
            const cw = frame.GetWidth(), ch = frame.GetHeight();
            if (!issecretvalue(cw) && !issecretvalue(ch) && cw === width && ch === height) frame.SetSize(w, h);
        });
        frame.SetSize(width, height);
    }
    public BarColor(bar: wuiraNativeStatusBar, r: number, g: number, b: number, a = 1): void {
        this.check(bar);
        for (const n of [r, g, b, a]) publicNumber(n);
        const [pr, pg, pb, pa] = bar.GetStatusBarColor();
        for (const n of [pr, pg, pb, pa]) publicNumber(n);
        this.OnDispose(() => {
            const [cr, cg, cb, ca] = bar.GetStatusBarColor();
            if ([cr, cg, cb, ca].some(n => issecretvalue(n))) return;
            if (cr === r && cg === g && cb === b && ca === a) bar.SetStatusBarColor(pr, pg, pb, pa);
        });
        bar.SetStatusBarColor(r, g, b, a);
    }
    /** Internal lifecycle endpoint; cleanup failures cannot prevent other restorations. */
    public Dispose(): void {
        if (!this.active) return;
        this.active = false;
        for (let i = this.cleanup.length - 1; i >= 0; i--) {
            try { this.cleanup[i](); } catch (failure) { report(failure); }
        }
        this.cleanup.length = 0;
    }
}

interface Rule { owner: NameplateRules; selector: NameplateSelector; customize?: NameplateCustomize; render?: NameplateRender; }
interface Binding { info: NameplateInfo; rule?: Rule; context?: NameplateContext; }
const rules: Rule[] = [];
const bindings = new Map<string, Binding>();
let listener: wuiraNativeFrame | undefined;
let reconciling = false;
// A single dormant hook per pooled native visual; no native scripts or events are removed.
const suppressions = new Map<wuiraNativeFrame, { active: boolean; writing: boolean; alpha: number }>();

function suppress(context: NameplateContext): void {
    const native = context.Native;
    let state = suppressions.get(native);
    if (state === undefined) {
        state = { active: false, writing: false, alpha: 1 };
        suppressions.set(native, state);
        const record = state;
        hooksecurefunc(native, "SetAlpha", () => {
            if (!record.active || record.writing || !safe(native)) return;
            const alpha = native.GetAlpha();
            if (issecretvalue(alpha)) return;
            record.alpha = alpha;
            record.writing = true;
            try { native.SetAlpha(0); } finally { record.writing = false; }
        });
    }
    const record = state;
    const alpha = native.GetAlpha(); publicNumber(alpha);
    record.alpha = alpha;
    context.OnDispose(() => {
        record.active = false;
        if (!issecretvalue(native.GetAlpha()) && native.GetAlpha() === 0) native.SetAlpha(record.alpha);
    });
    record.active = true;
    record.writing = true;
    try { native.SetAlpha(0); } finally { record.writing = false; }
}
function visualOnly(element: Element, seen = new Set<Element>()): void {
    if (seen.has(element)) error("Nameplates: cyclic or shared JSX tree");
    seen.add(element);
    if (element.kind === "secureButton") error("Nameplates: secure controls require a separate lifecycle");
    if (element.child !== undefined) visualOnly(element.child, seen);
    for (const child of element.children ?? []) visualOnly(child, seen);
}
function clear(unit: string): void {
    const binding = bindings.get(unit);
    bindings.delete(unit);
    binding?.context?.Dispose();
}
function update(unit: string, force: boolean): void {
    if (issecretvalue(unit) || typeof unit !== "string") return;
    const frame = C_NamePlate?.GetNamePlateForUnit(unit);
    const native = frame !== undefined && safe(frame) ? frame.UnitFrame : undefined;
    const guid = UnitGUID(unit);
    if (frame === undefined || native === undefined || !safe(native) || issecretvalue(guid) || guid === undefined) { clear(unit); return; }
    // Carrier and UnitFrame can independently be recycled for another unit.
    for (const [other, binding] of bindings) {
        if (other !== unit && (binding.info.Frame === frame || binding.info.Native === native)) clear(other);
    }
    const info: NameplateInfo = { Unit: unit, GUID: guid, Frame: frame, Native: native };
    const previous = bindings.get(unit);
    if (previous !== undefined && (previous.info.GUID !== guid || previous.info.Frame !== frame || previous.info.Native !== native)) clear(unit);
    let winner: Rule | undefined;
    try {
        for (const rule of rules) {
            const matches = rule.selector(info);
            if (issecretvalue(matches)) error("Nameplates: selector returned a secret value");
            if (matches === true) { winner = rule; break; }
        }
    } catch (failure) { clear(unit); report(failure); return; }
    const existing = bindings.get(unit);
    if (!force && existing !== undefined && existing.rule === winner) return;
    clear(unit);
    const binding: Binding = { info, rule: winner };
    bindings.set(unit, binding);
    if (winner === undefined) return;
    const context = new NameplateContext(unit, guid, frame, native);
    binding.context = context;
    try {
        if (winner.customize !== undefined) winner.customize(context);
        else if (winner.render !== undefined) {
            const view = winner.render(context);
            visualOnly(view);
            const mounted = wuira.Mount(view, "CENTER", frame);
            if (mounted === undefined) error("Nameplates: Replace must return a visual element");
            context.OnDispose(() => wuira.Unmount(mounted));
            suppress(context);
        }
    } catch (failure) { context.Dispose(); binding.context = undefined; report(failure); }
}
function reconcile(force = false): void {
    if (reconciling) error("Nameplates: cannot change rules during a callback");
    reconciling = true;
    try {
        const visible = new Set<string>();
        for (const plate of C_NamePlate?.GetNamePlates() ?? []) {
            if (!safe(plate)) continue;
            const nativeUnit = plate.GetUnit?.();
            if (issecretvalue(nativeUnit)) continue;
            const unit = nativeUnit ?? plate.namePlateUnitToken;
            if (issecretvalue(unit) || typeof unit !== "string") continue;
            visible.add(unit); update(unit, force);
        }
        for (const [unit] of bindings) if (!visible.has(unit)) clear(unit);
    } finally { reconciling = false; }
}
function watch(): void {
    if (listener !== undefined) return;
    listener = CreateFrame("Frame", undefined, UIParent);
    for (const event of ["NAME_PLATE_UNIT_ADDED", "NAME_PLATE_UNIT_REMOVED", "PLAYER_ENTERING_WORLD", "PLAYER_REGEN_ENABLED",
        "UNIT_NAME_UPDATE", "UNIT_FACTION", "PLAYER_TARGET_CHANGED"]) listener.RegisterEvent(event);
    listener.SetScript("OnEvent", (_frame, event, unit) => {
        if (reconciling) return;
        if (event === "NAME_PLATE_UNIT_REMOVED") {
            reconciling = true;
            try { if (unit !== undefined && !issecretvalue(unit)) clear(unit); } finally { reconciling = false; }
            return;
        }
        if (unit !== undefined && !issecretvalue(unit)) {
            if (event !== "NAME_PLATE_UNIT_ADDED" && !bindings.has(unit)) return;
            reconciling = true;
            try { update(unit, event !== "NAME_PLATE_UNIT_ADDED"); } finally { reconciling = false; }
        } else reconcile(true);
    });
}

/** An independently disposable ordered registration group. First matching rule wins globally. */
export class NameplateRules {
    private disposed = false;
    private add(rule: Rule): this {
        if (reconciling) error("Nameplates: cannot change rules during a callback");
        if (this.disposed) error("Nameplate rules are disposed");
        rules.push(rule); watch(); reconcile(); return this;
    }
    public Apply(selector: NameplateSelector, customize: NameplateCustomize): this { return this.add({ owner: this, selector, customize }); }
    public Replace(selector: NameplateSelector, render: NameplateRender): this { return this.add({ owner: this, selector, render }); }
    /** Re-evaluate after external preset/selector data changes; native events handle unit changes. */
    public Refresh(): void {
        if (this.disposed) error("Nameplate rules are disposed");
        reconcile(true);
    }
    public Dispose(): void {
        if (reconciling) error("Nameplates: cannot change rules during a callback");
        if (this.disposed) return;
        this.disposed = true;
        for (let i = rules.length - 1; i >= 0; i--) if (rules[i].owner === this) rules.splice(i, 1);
        if (rules.length !== 0) { reconcile(); return; }
        reconciling = true;
        try { for (const [unit] of bindings) clear(unit); } finally { reconciling = false; }
        listener?.UnregisterAllEvents(); listener?.SetScript("OnEvent", undefined); listener = undefined;
    }
}

/** Each entry call creates a new group; chained calls append to that group. */
export class Nameplates {
    private constructor() {}
    public static Apply(selector: NameplateSelector, customize: NameplateCustomize): NameplateRules { return new NameplateRules().Apply(selector, customize); }
    public static Replace(selector: NameplateSelector, render: NameplateRender): NameplateRules { return new NameplateRules().Replace(selector, render); }
    public static Create(): NameplateRules { return new NameplateRules(); }
}
