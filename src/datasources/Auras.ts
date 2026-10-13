import { DataSource } from "./DataSource";
import { UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";

interface NativeAura {
    spellId: number;
    name: string;
    icon: number;
    sourceUnit?: string;
}

// Capability checked at runtime: Forever support must be verified in game.
declare const C_UnitAuras: {
    GetAuraDataByIndex?: (this: void, unit: string, index: number, filter: string) => NativeAura | undefined;
} | undefined;
declare function UnitIsUnit(this: void, first: string, second: string): boolean;

export type AuraSourceStatus = "known" | "unknown" | "restricted";

/** Readable aura snapshot. Unit tokens describe the source at snapshot time. */
export class Aura {
    public constructor(
        public readonly spellId: number,
        public readonly name: string,
        public readonly icon: number,
        public readonly sourceUnit: string | undefined,
        public readonly sourceStatus: AuraSourceStatus,
        private readonly sourceSelf: boolean | undefined,
    ) {}

    /** Undefined means ownership could not be established; it does not mean another caster. */
    public isSourceSelf(): boolean | undefined { return this.sourceSelf; }
}

/** Reads a fresh snapshot on access; it does not install listeners or poll. */
export abstract class AuraSource extends DataSource<readonly Aura[]> {
    private restricted = false;

    public readonly target: UnitSource;
    protected constructor(unit: UnitInput, private readonly filter: "HELPFUL" | "HARMFUL") {
        super([]);
        this.target = resolveUnit(unit);
    }
    public get unit(): string { return this.target.Token; }

    protected override HasSecretFields(): boolean { return this.restricted; }

    protected override GetValue(): readonly Aura[] {
        this.restricted = false;
        const read = C_UnitAuras?.GetAuraDataByIndex;
        if (read === undefined) error("AuraSource: this client does not expose C_UnitAuras.GetAuraDataByIndex");
        const result: Aura[] = [];
        for (let index = 1; index <= 1024; index++) {
            const raw = read(this.unit, index, this.filter);
            if (issecretvalue(raw)) { this.restricted = true; return []; }
            if (raw === undefined) return result;
            if (issecretvalue(raw.spellId) || issecretvalue(raw.name) || issecretvalue(raw.icon)) {
                this.restricted = true;
                return [];
            }
            let sourceUnit: string | undefined;
            let sourceSelf: boolean | undefined;
            let status: AuraSourceStatus = "unknown";
            if (issecretvalue(raw.sourceUnit)) {
                status = "restricted";
            } else if (raw.sourceUnit !== undefined) {
                sourceUnit = raw.sourceUnit;
                status = "known";
                const self = UnitIsUnit(sourceUnit, "player");
                if (!issecretvalue(self)) sourceSelf = self;
            }
            result.push(new Aura(raw.spellId, raw.name, raw.icon, sourceUnit, status, sourceSelf));
        }
        // Never present a truncated enumeration as a complete list of buffs.
        error("AuraSource: aura enumeration exceeded its safety limit");
    }
}

export class Buffs extends AuraSource {
    public constructor(unit: UnitInput) { super(unit, "HELPFUL"); }
}

export class Debuffs extends AuraSource {
    public constructor(unit: UnitInput) { super(unit, "HARMFUL"); }
}
