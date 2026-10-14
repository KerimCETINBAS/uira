import { TimerSource } from "./TimerSource";
import type { NativeDuration } from "./TimerSource";
import { Unit, UnitSource, resolveUnit } from "./UnitSource";
import type { UnitInput } from "./UnitSource";

declare const UnitCastingDuration: ((this: void, unit: string) => NativeDuration | undefined) | undefined;
declare const UnitChannelDuration: ((this: void, unit: string) => NativeDuration | undefined) | undefined;
type NativeReturns<T extends unknown[]> = T & { readonly __tstlMultiReturn: unknown };
declare const UnitCastingInfo: ((this: void, unit: string) => NativeReturns<[string | undefined]>) | undefined;
declare const UnitChannelInfo: ((this: void, unit: string) => NativeReturns<[string | undefined]>) | undefined;

/** Remaining cast/channel time using the native duration object. */
export class CastTimer extends TimerSource {
    public readonly target: UnitSource;
    public get SpellName(): string {
        const [casting] = UnitCastingInfo !== undefined ? UnitCastingInfo(this.target.Token) : [undefined];
        if (issecretvalue(casting)) return casting!;
        if (casting !== undefined) return casting;
        const [channel] = UnitChannelInfo !== undefined ? UnitChannelInfo(this.target.Token) : [undefined];
        if (issecretvalue(channel)) return channel!;
        return channel ?? "";
    }
    public constructor(unit: UnitInput = Unit.Player) {
        const target = resolveUnit(unit);
        if (UnitCastingDuration === undefined || UnitChannelDuration === undefined) {
            error("CastTimer: native cast/channel durations are unavailable");
        }
        super(() => {
            const casting = UnitCastingDuration(target.Token);
            if (issecretvalue(casting) || casting !== undefined) return casting;
            return UnitChannelDuration(target.Token);
        }, [
            "UNIT_SPELLCAST_START", "UNIT_SPELLCAST_STOP", "UNIT_SPELLCAST_DELAYED",
            "UNIT_SPELLCAST_INTERRUPTED", "UNIT_SPELLCAST_FAILED", "UNIT_SPELLCAST_SUCCEEDED",
            "UNIT_SPELLCAST_CHANNEL_START", "UNIT_SPELLCAST_CHANNEL_UPDATE", "UNIT_SPELLCAST_CHANNEL_STOP",
            "PLAYER_ENTERING_WORLD", "PLAYER_TARGET_CHANGED", "PLAYER_FOCUS_CHANGED",
        ], target.Token);
        this.target = target;
    }
}
