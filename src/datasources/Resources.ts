import { ProgressSource } from "./ProgressSource";
import { UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";

export { Unit } from "./UnitSource";

/** Direct API-to-widget binding; opaque values are never compared or calculated. */
abstract class Resource extends ProgressSource {
    protected constructor(
        current: () => number,
        maximum: () => number,
        percent: () => number,
        private readonly unitToken: string,
        private readonly events: string[],
    ) {
        super({ current, min: () => 0, max: maximum, percent });
    }

    protected Listen(frame: wuiraNativeFrame, refresh: () => void): void {
        frame.SetScript("OnEvent", (_frame, event, unit) => {
            if (event === "PLAYER_ENTERING_WORLD" || unit === this.unitToken) refresh();
        });
        frame.RegisterEvent("PLAYER_ENTERING_WORLD");
        for (const event of this.events) frame.RegisterEvent(event);
    }
}

export class HP extends Resource {
    public readonly target: UnitSource;
    public get unit(): string { return this.target.Token; }
    public constructor(unit: UnitInput) {
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
