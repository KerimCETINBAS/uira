import { ProgressSource } from "./ProgressSource";
import type { ProgressOverrides } from "./ProgressSource";

declare function GetTime(this: void): number;
declare const C_SwingTimer: object | undefined;
interface TimerDuration { SetTimeFromStart(start: number, duration: number): void; }
declare const C_DurationUtil: { CreateDuration(this: void): TimerDuration } | undefined;
declare const Enum: {
    PlayerSwingType?: { MainHand: number; OffHand: number; Ranged: number };
    StatusBarInterpolation?: { Immediate: number };
    StatusBarTimerDirection?: { RemainingTime: number };
} | undefined;
interface TimerBar extends wuiraNativeStatusBar {
    SetTimerDuration?: (duration: TimerDuration, interpolation: number, direction: number) => void;
}

export const SwingHand = { MainHand: "MainHand", OffHand: "OffHand", Ranged: "Ranged" } as const;
export type SwingHand = typeof SwingHand[keyof typeof SwingHand];

/** Player-only countdown driven by Forever's native PLAYER_SWING event. */
export class SwingTimer extends ProgressSource {
    private duration = 0;
    private endTime = 0;
    private known = false;
    private restricted = false;
    private events?: wuiraNativeFrame;
    private readonly bindings = new Set<() => void>();

    public constructor(public readonly hand: SwingHand = SwingHand.MainHand) {
        // Readers execute only after construction has completed.
        super({
            current: () => this.Remaining(), min: () => 0, max: () => this.duration,
            percent: () => this.duration > 0 ? this.Remaining() / this.duration * 100 : 0,
        });
        this.Start();
    }

    /** False until a readable swing event is received, including after reload/reset. */
    public get HasTiming(): boolean { return this.known && !this.restricted; }
    public get IsActive(): boolean { return this.HasTiming && this.Remaining() > 0; }
    protected override HasSecretFields(): boolean { return this.restricted; }
    private Remaining(): number { return this.known ? Math.max(0, this.endTime - GetTime()) : 0; }

    public Start(): void {
        if (this.events !== undefined) return;
        if (C_SwingTimer === undefined || Enum?.PlayerSwingType === undefined) {
            error("SwingTimer: this client does not expose the Forever swing API");
        }
        const swingType = Enum.PlayerSwingType[this.hand];
        if (swingType === undefined) error("SwingTimer: unsupported swing hand");
        const events = CreateFrame("Frame", undefined, UIParent);
        this.events = events;
        events.RegisterEvent("PLAYER_SWING");
        events.RegisterEvent("PLAYER_ENTERING_WORLD");
        events.RegisterEvent("WEAPON_SLOT_CHANGED");
        events.SetScript("OnEvent", (_frame, event, ...payload: unknown[]) => {
            if (event !== "PLAYER_SWING") { this.Reset(); return; }
            const [duration, hand] = payload;
            if (issecretvalue(hand)) { this.Reset(true); return; }
            if (hand !== swingType) return;
            if (issecretvalue(duration)) { this.Reset(true); return; }
            if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
                this.Reset();
                return;
            }
            this.duration = duration;
            this.endTime = GetTime() + duration;
            this.known = true;
            this.restricted = false;
            this.Notify();
        });
    }

    private Reset(restricted = false): void {
        this.duration = 0;
        this.endTime = 0;
        this.known = false;
        this.restricted = restricted;
        this.Notify();
    }
    private Notify(): void { for (const refresh of this.bindings) refresh(); }

    public override BindTo(frame: wuiraNativeStatusBar, options: ProgressOverrides = {}): () => void {
        if (options.min !== undefined || options.max !== undefined || options.current !== undefined) {
            error("SwingTimer: native timer binding does not support min/max/current overrides");
        }
        const bar = frame as TimerBar;
        const interpolation = Enum?.StatusBarInterpolation?.Immediate;
        const direction = Enum?.StatusBarTimerDirection?.RemainingTime;
        if (bar.SetTimerDuration === undefined || C_DurationUtil === undefined || interpolation === undefined || direction === undefined) {
            error("SwingTimer: native StatusBar timer support is unavailable");
        }
        this.Start();
        const timer = C_DurationUtil.CreateDuration();
        bar.SetMinMaxValues(0, 1);
        const refresh = () => {
            const active = this.CanEmit(this.Remaining());
            options.onActiveChange?.(active);
            if (!active) return;
            if (this.HasTiming && this.Remaining() > 0) {
                timer.SetTimeFromStart(this.endTime - this.duration, this.duration);
                bar.SetTimerDuration!(timer, interpolation, direction);
            } else {
                // A completed native duration cancels any earlier animation.
                timer.SetTimeFromStart(GetTime() - 1, 1);
                bar.SetTimerDuration!(timer, interpolation, direction);
                bar.SetValue(0);
            }
        };
        this.bindings.add(refresh);
        refresh();
        return () => { this.bindings.delete(refresh); };
    }

    protected Listen(): void { /* Binding uses the source's shared native event listener. */ }

    /** Dispose when the owning feature is removed; unmount only detaches its bars. */
    public Dispose(): void {
        this.Reset();
        this.bindings.clear();
        this.events?.UnregisterAllEvents();
        this.events?.SetScript("OnEvent", undefined);
        this.events?.Hide();
        this.events = undefined;
    }
}
