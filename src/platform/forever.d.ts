// Minimal API surface observed in locally installed Forever addons.
// Global functions use dot calls; widget methods use Lua's colon calls.
type wuiraAnchor = import("../types/Position").Anchor;
type wuiraDrawLayer = "BACKGROUND" | "OVERLAY";
interface wuiraNativeTexture {
    SetAllPoints(frame: wuiraNativeFrame): void;
    SetColorTexture(red: number, green: number, blue: number, alpha: number): void;
    SetTexture(path: string | number | undefined): void;
    SetVertexColor(red: number, green: number, blue: number, alpha: number): void;
    SetBlendMode(mode: import("../types/Texture").BlendMode): void;
    SetHorizTile(enabled: boolean): void;
    SetVertTile(enabled: boolean): void;
    SetTexCoord(left: number, right: number, top: number, bottom: number): void;
    SetSize(width: number, height: number): void;
    SetPoint(point: wuiraAnchor, relativeTo: wuiraNativeFrame, relativePoint: wuiraAnchor, x: number, y: number): void;
    SetParent(parent: wuiraNativeFrame): void;
    ClearAllPoints(): void;
    Show(): void;
    Hide(): void;
}

interface wuiraNativeFrame {
    SetClipsChildren(clips: boolean): void;
    GetFrameLevel(): number;
    SetFrameLevel(level: number): void;
    CreateFontString(name: undefined, layer: "OVERLAY"): wuiraNativeFontString;
    EnableMouse(enabled: boolean): void;
    RegisterEvent(event: string): void;
    UnregisterAllEvents(): void;
    SetScript(script: "OnEvent", handler: ((this: void, frame: wuiraNativeFrame, event: string, unit?: string) => void) | undefined): void;
    SetScript(script: "OnUpdate", handler: ((this: void, frame: wuiraNativeFrame, elapsed: number) => void) | undefined): void;
    GetWidth(): number;
    GetHeight(): number;
    SetSize(width: number, height: number): void;
    SetPoint(point: wuiraAnchor, relativeTo: wuiraNativeFrame | wuiraNativeTexture, relativePoint: wuiraAnchor, x: number, y: number): void;
    CreateTexture(name: undefined, layer: wuiraDrawLayer): wuiraNativeTexture;
    Show(): void;
    Hide(): void;
    SetParent(parent: wuiraNativeFrame): void;
    ClearAllPoints(): void;
    SetAllPoints(frame: wuiraNativeFrame): void;
    SetBackdrop(backdrop: { edgeFile: string; edgeSize: number }): void;
    SetBackdropBorderColor(red: number, green: number, blue: number, alpha: number): void;
}

interface wuiraNativeFontString {
    SetAllPoints(frame: wuiraNativeFrame): void;
    SetFont(path: string, size: number, flags?: string): boolean;
    SetText(text: string): void;
    SetTextColor(r: number, g: number, b: number, a: number): void;
    SetJustifyH(align: "LEFT" | "CENTER" | "RIGHT"): void;
    SetJustifyV(align: "MIDDLE"): void;
}

declare const UIParent: wuiraNativeFrame;
interface wuiraNativeStatusBar extends wuiraNativeFrame {
    GetStatusBarTexture(): wuiraNativeTexture;
    SetMinMaxValues(min: number, max: number): void;
    SetValue(value: number): void;
    SetStatusBarTexture(path: string): void;
    SetStatusBarColor(red: number, green: number, blue: number, alpha: number): void;
    SetOrientation(orientation: "HORIZONTAL" | "VERTICAL"): void;
    SetReverseFill(reverse: boolean): void;
}

declare function CreateFrame(this: void, kind: "StatusBar", name: undefined, parent: wuiraNativeFrame): wuiraNativeStatusBar;
declare function CreateFrame(this: void, kind: "Frame", name: undefined, parent: wuiraNativeFrame, template?: "BackdropTemplate"): wuiraNativeFrame;
declare function error(this: void, message: string): never;
declare function issecretvalue(this: void, value: unknown): boolean;
declare function UnitHealth(this: void, unit: string): number;
declare function UnitHealthMax(this: void, unit: string): number;
declare const UnitGetIncomingHeals: ((this: void, unit: string) => number | undefined) | undefined;
declare const UnitGetTotalAbsorbs: ((this: void, unit: string) => number | undefined) | undefined;
declare function UnitPower(this: void, unit: string, powerType: number): number;
declare function UnitPowerMax(this: void, unit: string, powerType: number): number;
declare const CurveConstants: { readonly ScaleTo100: unknown };
declare function UnitHealthPercent(this: void, unit: string, predicted: boolean, curve: unknown): number;
declare function UnitPowerPercent(this: void, unit: string, powerType: number, predicted: boolean, curve: unknown): number;

interface wuiraNativeAuraData {
    name?: string;
    icon?: number;
    auraInstanceID?: number;
    duration?: number;
    expirationTime?: number;
}
declare const C_UnitAuras: {
    GetAuraDataBySpellName?: (this: void, unit: string, name: string, filter: string) => wuiraNativeAuraData | undefined;
    GetAuraDuration?: (this: void, unit: string, id: number) => import("../datasources/TimerSource").NativeDuration | undefined;
} | undefined;
declare const C_Spell: {
    GetSpellName?: (this: void, id: number) => string | undefined;
    GetSpellCooldownDuration?: (this: void, id: number) => import("../datasources/TimerSource").NativeDuration | undefined;
} | undefined;
declare const C_DurationUtil: {
    CreateDuration(this: void): import("../datasources/TimerSource").NativeDuration & {
        SetTimeFromStart(start: number, duration: number): void;
    };
} | undefined;
declare const C_Secrets: { ShouldAurasBeSecret?: (this: void) => boolean } | undefined;
