import { DataSource } from "./DataSource";

declare function UnitGUID(this: void, unit: string): string | undefined;
declare function UnitIsPlayer(this: void, unit: string): boolean;
declare function UnitIsUnit(this: void, first: string, second: string): boolean;

export const Unit = { Player: "player", Target: "target", Focus: "focus" } as const;

export interface UnitIdentity {
    readonly token: string;
    readonly guid: string;
}

export class UnitPredicates {
    public constructor(private readonly token: string) {}
    public get PC(): boolean | undefined {
        const value = UnitIsPlayer(this.token);
        return issecretvalue(value) ? undefined : value;
    }
    public get Self(): boolean | undefined {
        const value = UnitIsUnit(this.token, "player");
        return issecretvalue(value) ? undefined : value;
    }
}

/** Shared live unit reference; identity is read again rather than cached by token. */
export class UnitSource extends DataSource<UnitIdentity | undefined> {
    public readonly Is: UnitPredicates;
    private restricted = false;
    public constructor(public readonly Token: string) {
        super(undefined);
        this.Is = new UnitPredicates(Token);
    }
    protected override HasSecretFields(): boolean { return this.restricted; }
    protected override GetValue(): UnitIdentity | undefined {
        const guid = UnitGUID(this.Token);
        this.restricted = issecretvalue(guid);
        if (this.restricted || guid === undefined) return undefined;
        return { token: this.Token, guid };
    }
}

export type UnitInput = string | UnitSource;

/** Reuse explicit unit references; string inputs remain a convenience shorthand. */
export function resolveUnit(unit: UnitInput): UnitSource {
    return typeof unit === "string" ? new UnitSource(unit) : unit;
}
