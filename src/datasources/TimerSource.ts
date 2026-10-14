import { DataSource } from "./DataSource";
import type { ProgressOverrides } from "./ProgressSource";

/** Opaque native object: pass it to the renderer instead of doing Lua arithmetic. */
export interface NativeDuration { readonly __wuiraDuration: unique symbol; }
declare const C_DurationUtil: { CreateDuration(this: void): NativeDuration } | undefined;
declare const Enum: {
    StatusBarInterpolation?: { Immediate: number };
    StatusBarTimerDirection?: { RemainingTime: number };
} | undefined;
interface TimerBar extends wuiraNativeStatusBar {
    SetTimerDuration?: (duration: NativeDuration, interpolation: number, direction: number) => void;
}

/** Duration reader whose animation is performed entirely by the native widget. */
export class TimerSource extends DataSource<NativeDuration | undefined> {
    private boundDuration?: NativeDuration;
    private bindingCount = 0;
    public constructor(private readonly read: () => NativeDuration | undefined,
        private readonly events: readonly string[], private readonly unit?: string) { super(undefined); }
    protected override GetValue() { return this.read(); }
    public get IsActive(): boolean {
        const duration = this.bindingCount > 0 ? this.boundDuration : this.read();
        if (issecretvalue(duration)) return true;
        if (duration === undefined) return false;
        const remaining = (duration as NativeDuration & { GetRemainingDuration?: () => number }).GetRemainingDuration?.();
        // Opaque combat timings stay native; never compare secret numbers in Lua.
        return issecretvalue(remaining) || remaining === undefined || remaining > 0;
    }
    public BindTo(frame: wuiraNativeStatusBar, options: ProgressOverrides = {}): () => void {
        if (options.min !== undefined || options.max !== undefined || options.current !== undefined) {
            error("TimerSource: min/max/current overrides are not supported");
        }
        const bar = frame as TimerBar;
        const immediate = Enum?.StatusBarInterpolation?.Immediate;
        const remaining = Enum?.StatusBarTimerDirection?.RemainingTime;
        if (bar.SetTimerDuration === undefined || C_DurationUtil === undefined || immediate === undefined || remaining === undefined) {
            error("TimerSource: native timer support is unavailable");
        }
        const empty = C_DurationUtil.CreateDuration();
        // Native duration bars animate a normalized fraction, not resource units.
        bar.SetMinMaxValues(0, 1);
        const refresh = () => {
            const duration = this.read();
            this.boundDuration = duration;
            const active = this.CanEmit(duration);
            options.onActiveChange?.(active);
            if (!active) return;
            if (issecretvalue(duration)) { bar.SetTimerDuration!(duration!, immediate, remaining); return; }
            bar.SetTimerDuration!(duration ?? empty, immediate, remaining);
            if (duration === undefined) bar.SetValue(0);
        };
        frame.SetScript("OnEvent", (_frame, event, unit) => {
            if (!event.startsWith("UNIT_") || this.unit === undefined || unit === this.unit) refresh();
        });
        for (const event of this.events) frame.RegisterEvent(event);
        this.bindingCount += 1;
        refresh();
        let disposed = false;
        return () => {
            if (disposed) return;
            disposed = true;
            this.bindingCount -= 1;
        };
    }
}
