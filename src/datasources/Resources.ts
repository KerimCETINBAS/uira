import { ProgressSource } from "./ProgressSource";

export const Unit = { Player: "player" } as const;

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
    public constructor(public readonly unit: string) {
        super(() => UnitHealth(unit), () => UnitHealthMax(unit),
            () => UnitHealthPercent(unit, true, CurveConstants.ScaleTo100), unit, ["UNIT_HEALTH", "UNIT_MAXHEALTH"]);
    }
}

/** Explicit mana (power type 0), even while the unit uses rage/energy. */
export class Mana extends Resource {
    public constructor(public readonly unit: string) {
        super(() => UnitPower(unit, 0), () => UnitPowerMax(unit, 0),
            () => UnitPowerPercent(unit, 0, true, CurveConstants.ScaleTo100), unit, ["UNIT_POWER_UPDATE", "UNIT_MAXPOWER", "UNIT_DISPLAYPOWER"]);
    }
}

export const DataSources = { Resources: { HP, Mana } };
