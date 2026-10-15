import { ProgressSource } from "./ProgressSource";
import { Unit, UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";
import { DataSource } from "./DataSource";
import type { ProgressOverrides } from "./ProgressSource";
import { ManaRegenTimer } from "./ManaRegenTimer";

export { Unit } from "./UnitSource";

/** Direct API-to-widget binding; opaque values are never compared or calculated. */
abstract class Resource extends ProgressSource {
    private readonly listeners = new Set<(event: string, payload: unknown[], value: number) => void>();
    private eventFrame?: wuiraNativeFrame;
    private dispatching = false;
    private eventValue = 0;
    private stopUnit?: () => void;
    protected constructor(
        current: () => number,
        maximum: () => number,
        percent: () => number,
        private readonly unitReference: UnitSource,
        private readonly events: string[],
    ) {
        super({ current, min: () => 0, max: maximum, percent });
    }

    protected AddEvents(...events: string[]): void {
        for (const event of events) {
            if (this.events.includes(event)) continue;
            this.events.push(event);
            if (this.listeners.size > 0) this.eventFrame?.RegisterEvent(event);
        }
    }

    protected override GetValue(): number { return this.dispatching ? this.eventValue : super.GetValue(); }

    /** Future readable value changes only. Unsubscribe when the consumer is removed. */
    public onChange(listener: (value: number) => void): () => void {
        let previous = this.GetValue();
        let readable = !issecretvalue(previous);
        return this.Observe((_, _payload, value) => {
            if (issecretvalue(value) || !this.CanEmit(value)) return;
            if (readable && value === previous) return;
            previous = value;
            readable = true;
            listener(value);
        });
    }

    /** One native event frame is shared by widgets, observers, and accessories. */
    protected Observe(listener: (event: string, payload: unknown[], value: number) => void): () => void {
        this.listeners.add(listener);
        if (this.listeners.size === 1) {
            if (this.eventFrame === undefined) this.eventFrame = CreateFrame("Frame", undefined, UIParent);
            const frame = this.eventFrame;
            const dispatch = (event: string, payload: unknown[]) => {
                this.eventValue = super.GetValue();
                this.dispatching = true;
                try {
                    for (const callback of this.listeners) callback(event, payload, this.eventValue);
                } finally { this.dispatching = false; }
            };
            frame.SetScript("OnEvent", (_frame, event, ...payload: unknown[]) => {
                if (event !== "PLAYER_ENTERING_WORLD" && (issecretvalue(payload[0]) || payload[0] !== this.unitReference.Token)) return;
                dispatch(event, payload);
            });
            this.stopUnit = this.unitReference.onChange(() => dispatch("UNIT_IDENTITY_CHANGED", [this.unitReference.Token]));
            frame.RegisterEvent("PLAYER_ENTERING_WORLD");
            for (const event of this.events) frame.RegisterEvent(event);
        }
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0) {
                this.stopUnit?.(); this.stopUnit = undefined;
                this.eventFrame?.UnregisterAllEvents();
                this.eventFrame?.SetScript("OnEvent", undefined);
            }
        };
    }

    protected Listen(_frame: wuiraNativeFrame, refresh: () => void): () => void {
        return this.Observe(() => refresh());
    }
}

/** Live optional prediction channel. Secret amounts only travel to native sinks. */
export class HealthPrediction extends DataSource<number> {
    public constructor(private readonly read: (() => number | undefined) | undefined) { super(0); }
    public get IsAvailable(): boolean { return this.read !== undefined; }
    protected override GetValue(): number {
        const value = this.read?.();
        if (issecretvalue(value)) return value!;
        return value ?? 0;
    }
    public ApplyTo(frame: wuiraNativeStatusBar, maximum: number): void {
        if (!this.IsAvailable) { frame.Hide(); return; }
        const value = this.GetValue();
        if (!this.CanEmit(value)) { frame.Hide(); return; }
        frame.SetMinMaxValues(0, maximum);
        frame.SetValue(value);
        frame.Show();
    }
}

export class HP extends Resource {
    private healPrediction?: HealthPrediction;
    private absorbPrediction?: HealthPrediction;
    public get HealPrediction(): HealthPrediction | undefined { return this.healPrediction; }
    public get AbsorbPrediction(): HealthPrediction | undefined { return this.absorbPrediction; }
    public UseHealPrediction(): this {
        if (this.healPrediction === undefined) {
            this.healPrediction = new HealthPrediction(UnitGetIncomingHeals === undefined ? undefined
                : () => UnitGetIncomingHeals(this.unit));
            if (this.healPrediction.IsAvailable) this.AddEvents("UNIT_HEAL_PREDICTION");
        }
        return this;
    }
    public UseAbsorbPrediction(): this {
        if (this.absorbPrediction === undefined) {
            this.absorbPrediction = new HealthPrediction(UnitGetTotalAbsorbs === undefined ? undefined
                : () => UnitGetTotalAbsorbs(this.unit));
            if (this.absorbPrediction.IsAvailable) this.AddEvents("UNIT_ABSORB_AMOUNT_CHANGED");
        }
        return this;
    }
    public override BindTo(frame: wuiraNativeStatusBar, options: ProgressOverrides = {}): () => void {
        if ((options.healPredictionBar !== undefined || options.absorbPredictionBar !== undefined)
            && (options.min !== undefined || options.max !== undefined || options.current !== undefined)) {
            error("HP: prediction overlays require the native health scale without min/max/current overrides");
        }
        return super.BindTo(frame, { ...options, onRefresh: () => {
            if (options.healPredictionBar !== undefined || options.absorbPredictionBar !== undefined) {
                const maximum = UnitHealthMax(this.unit);
                if (options.healPredictionBar !== undefined) this.healPrediction?.ApplyTo(options.healPredictionBar, maximum);
                if (options.absorbPredictionBar !== undefined) this.absorbPrediction?.ApplyTo(options.absorbPredictionBar, maximum);
            }
            options.onRefresh?.();
        } }) as () => void;
    }
    public readonly target: UnitSource;
    public get unit(): string { return this.target.Token; }
    public constructor(unit: UnitInput = Unit.Player) {
        const target = resolveUnit(unit);
        super(() => UnitHealth(target.Token), () => UnitHealthMax(target.Token),
            () => UnitHealthPercent(target.Token, true, CurveConstants.ScaleTo100), target, ["UNIT_HEALTH", "UNIT_MAXHEALTH", "UNIT_CONNECTION"]);
        this.target = target;
    }
}

/** Explicit mana (power type 0), even while the unit uses rage/energy. */
export class Mana extends Resource {
    private regenTimer?: ManaRegenTimer;
    public get RegenTimer(): ManaRegenTimer | undefined { return this.regenTimer; }
    public UseRegenTimer(): this {
        if (this.unit !== "player") error("Mana.UseRegenTimer: only the player is supported");
        if (this.regenTimer === undefined) {
            this.AddEvents("UNIT_SPELLCAST_SUCCEEDED");
            this.regenTimer = new ManaRegenTimer(listener => this.Observe(listener));
        }
        return this;
    }
    public readonly target: UnitSource;
    public get unit(): string { return this.target.Token; }
    public constructor(unit: UnitInput) {
        const target = resolveUnit(unit);
        super(() => UnitPower(target.Token, 0), () => UnitPowerMax(target.Token, 0),
            () => UnitPowerPercent(target.Token, 0, true, CurveConstants.ScaleTo100), target, ["UNIT_POWER_UPDATE", "UNIT_MAXPOWER", "UNIT_DISPLAYPOWER", "UNIT_CONNECTION"]);
        this.target = target;
    }
}

export const DataSources = { Resources: { HP, Mana } };
