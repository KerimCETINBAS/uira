import { ProgressSource } from "./ProgressSource";
import { Unit, UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";
import { DataSource } from "./DataSource";
import type { ProgressOverrides } from "./ProgressSource";

export { Unit } from "./UnitSource";

/** Direct API-to-widget binding; opaque values are never compared or calculated. */
abstract class Resource extends ProgressSource {
    private readonly listeners = new Set<wuiraNativeFrame>();
    protected constructor(
        current: () => number,
        maximum: () => number,
        percent: () => number,
        private readonly unitToken: string,
        private readonly events: string[],
    ) {
        super({ current, min: () => 0, max: maximum, percent });
    }

    protected AddEvents(...events: string[]): void {
        for (const event of events) {
            if (this.events.includes(event)) continue;
            this.events.push(event);
            for (const frame of this.listeners) frame.RegisterEvent(event);
        }
    }

    protected Listen(frame: wuiraNativeFrame, refresh: () => void): () => void {
        this.listeners.add(frame);
        frame.SetScript("OnEvent", (_frame, event, unit) => {
            if (event === "PLAYER_ENTERING_WORLD" || unit === this.unitToken) refresh();
        });
        frame.RegisterEvent("PLAYER_ENTERING_WORLD");
        for (const event of this.events) frame.RegisterEvent(event);
        return () => {
            this.listeners.delete(frame);
            frame.UnregisterAllEvents();
            frame.SetScript("OnEvent", undefined);
        };
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
            () => UnitHealthPercent(target.Token, true, CurveConstants.ScaleTo100), target.Token, ["UNIT_HEALTH", "UNIT_MAXHEALTH"]);
        this.target = target;
    }
}

/** Explicit mana (power type 0), even while the unit uses rage/energy. */
export class Mana extends Resource {
    public readonly target: UnitSource;
    public get unit(): string { return this.target.Token; }
    public constructor(unit: UnitInput) {
        const target = resolveUnit(unit);
        super(() => UnitPower(target.Token, 0), () => UnitPowerMax(target.Token, 0),
            () => UnitPowerPercent(target.Token, 0, true, CurveConstants.ScaleTo100), target.Token, ["UNIT_POWER_UPDATE", "UNIT_MAXPOWER", "UNIT_DISPLAYPOWER"]);
        this.target = target;
    }
}

export const DataSources = { Resources: { HP, Mana } };
