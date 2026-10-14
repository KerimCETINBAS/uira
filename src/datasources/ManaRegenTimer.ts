import { ProgressSource } from "./ProgressSource";
import type { ProgressOverrides } from "./ProgressSource";

declare function GetTime(this: void): number;
interface ScheduledTimer { Cancel(): void; }
declare const C_Timer: { NewTimer(this: void, delay: number, callback: (this: void) => void): ScheduledTimer };
interface Curve { AddPoint(x: number, y: number): void; SetType(type: number): void; }
declare const C_CurveUtil: { CreateCurve(this: void): Curve } | undefined;
declare const Enum: {
    LuaCurveType?: { Step: number };
    StatusBarInterpolation: { Immediate: number };
    StatusBarTimerDirection: { RemainingTime: number };
};
interface Clock { SetTimeFromStart(start: number, duration: number): void; }
interface TimerBar extends wuiraNativeStatusBar {
    SetTimerDuration?: (duration: Clock, interpolation: number, direction: number) => void;
}
type ObserveMana = (listener: (event: string, payload: unknown[], value: number) => void) => () => void;
export type ManaRegenPhase = "fiveSecondRule" | "estimatedTick" | "inactive";

/** Owned by Mana.UseRegenTimer(). The two-second phase is an estimate, not a server clock. */
export class ManaRegenTimer extends ProgressSource {
    private phase: ManaRegenPhase = "inactive";
    private start = 0;
    private total = 0;
    private manaChanged = false;
    private scheduled?: ScheduledTimer;
    private unsubscribe?: () => void;
    private readonly bindings = new Set<() => void>();
    private alphaCurve?: Curve;
    private disposed = false;

    public constructor(private readonly observe: ObserveMana) {
        super({ current: () => this.Remaining(), min: () => 0, max: () => this.total,
            percent: () => this.total > 0 ? this.Remaining() / this.total * 100 : 0 });
    }
    public get Phase(): ManaRegenPhase { return this.phase; }
    public get IsActive(): boolean { return this.phase !== "inactive"; }
    private Remaining(): number { return this.IsActive ? Math.max(0, this.start + this.total - GetTime()) : 0; }

    private OnManaEvent(event: string, payload: unknown[], mana: number): void {
        if (event === "PLAYER_ENTERING_WORLD") { this.Stop(); return; }
        if (!issecretvalue(mana)) {
            const maximum = UnitPowerMax("player", 0);
            if (!issecretvalue(maximum) && mana >= maximum) { this.Stop(); return; }
        }
        if (event === "UNIT_SPELLCAST_SUCCEEDED") {
            const spellId = payload[2];
            if (issecretvalue(spellId) || typeof spellId !== "number") return;
            const costs = C_Spell?.GetSpellPowerCost?.(spellId);
            if (issecretvalue(costs) || costs === undefined) return;
            for (const cost of costs) {
                if (issecretvalue(cost.type) || cost.type !== 0) continue;
                // A hidden mana cost is a possible expenditure, not measured mana.
                if (issecretvalue(cost.cost) || (cost.cost !== undefined && cost.cost > 0)) {
                    this.Begin("fiveSecondRule", GetTime());
                    return;
                }
            }
        } else if (event === "UNIT_POWER_UPDATE" && !issecretvalue(payload[1]) && payload[1] === "MANA") {
            if (this.phase === "inactive") this.Begin("estimatedTick", GetTime());
            else if (this.phase === "estimatedTick") this.manaChanged = true;
        }
        this.Notify();
    }
    private Begin(phase: "fiveSecondRule" | "estimatedTick", start: number): void {
        this.scheduled?.Cancel();
        this.phase = phase;
        this.total = phase === "fiveSecondRule" ? 5 : 2;
        this.start = start;
        this.manaChanged = false;
        this.Notify();
        const end = start + this.total;
        this.scheduled = C_Timer.NewTimer(Math.max(0.01, end - GetTime()), () => {
            this.scheduled = undefined;
            if (this.phase === "fiveSecondRule" || this.manaChanged) {
                this.Begin("estimatedTick", end > GetTime() - 2 ? end : GetTime());
            } else this.Stop();
        });
    }
    private Notify(): void { for (const refresh of this.bindings) refresh(); }
    private Stop(): void {
        this.scheduled?.Cancel();
        this.scheduled = undefined;
        this.phase = "inactive";
        this.total = 0;
        this.manaChanged = false;
        this.Notify();
    }
    public override BindTo(frame: wuiraNativeStatusBar, options: ProgressOverrides = {}): () => void {
        if (this.disposed) error("ManaRegenTimer: source is disposed");
        if (options.min !== undefined || options.max !== undefined || options.current !== undefined) error("ManaRegenTimer: range/current overrides are unsupported");
        const bar = frame as TimerBar;
        if (bar.SetTimerDuration === undefined || C_DurationUtil === undefined) error("ManaRegenTimer: native duration support is unavailable");
        const timer = C_DurationUtil.CreateDuration();
        if (this.alphaCurve === undefined && C_CurveUtil !== undefined && Enum.LuaCurveType !== undefined) {
            this.alphaCurve = C_CurveUtil.CreateCurve();
            this.alphaCurve.SetType(Enum.LuaCurveType.Step);
            this.alphaCurve.AddPoint(0, 1);
            this.alphaCurve.AddPoint(1, 0);
        }
        bar.SetMinMaxValues(0, 1);
        let lastStart: number | undefined;
        let lastTotal: number | undefined;
        const refresh = () => {
            const active = this.IsActive && this.CanEmit(this.Remaining());
            options.onActiveChange?.(active);
            if (!active) return;
            // Native alpha hides full secret mana without a Lua comparison.
            if (this.alphaCurve !== undefined) bar.SetAlpha(UnitPowerPercent("player", 0, true, this.alphaCurve));
            if (lastStart !== this.start || lastTotal !== this.total) {
                timer.SetTimeFromStart(this.start, this.total);
                bar.SetTimerDuration!(timer, Enum.StatusBarInterpolation.Immediate, Enum.StatusBarTimerDirection.RemainingTime);
                lastStart = this.start;
                lastTotal = this.total;
            }
        };
        this.bindings.add(refresh);
        if (this.unsubscribe === undefined) this.unsubscribe = this.observe((event, payload, mana) => this.OnManaEvent(event, payload, mana));
        refresh();
        return () => {
            this.bindings.delete(refresh);
            if (this.bindings.size === 0) {
                this.unsubscribe?.();
                this.unsubscribe = undefined;
                this.Stop();
            }
        };
    }
    protected Listen(): void { /* The owning Mana resource supplies all native events. */ }
    public Dispose(): void {
        this.disposed = true;
        this.Stop();
        this.bindings.clear();
        this.unsubscribe?.();
        this.unsubscribe = undefined;
    }
}
