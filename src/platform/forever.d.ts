// Minimal API surface observed in locally installed Forever addons.
// Global functions use dot calls; widget methods use Lua's colon calls.
type wuiraAnchor = import("../types/Position").Anchor;
type wuiraDrawLayer = "BACKGROUND" | "OVERLAY";
type wuiraNativeReturns<T extends unknown[]> = T & { readonly __tstlMultiReturn: unknown };
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
    GetCenter(): wuiraNativeReturns<[number | undefined, number | undefined]>;
    IsShown(): boolean;
    SetMovable(movable: boolean): void;
    SetClampedToScreen(clamped: boolean): void;
    RegisterForDrag(...buttons: string[]): void;
    StartMoving(): void;
    StopMovingOrSizing(): void;
    EnableKeyboard(enabled: boolean): void;
    SetPropagateKeyboardInput(propagate: boolean): void;
    SetScript(script: "OnClick" | "OnDragStart" | "OnDragStop" | "OnEnter" | "OnLeave", handler: ((this: void, frame: wuiraNativeFrame) => void) | undefined): void;
    SetScript(script: "OnKeyDown", handler: ((this: void, frame: wuiraNativeFrame, key: string) => void) | undefined): void;
    GetName(): string | undefined;
    IsProtected?(): boolean;
    GetParent(): wuiraNativeFrame;
    GetNumPoints(): number;
    GetPoint(index: number): wuiraNativeReturns<[wuiraAnchor, wuiraNativeFrame, wuiraAnchor, number, number]>;
    GetScale(): number;
    GetChildren(): wuiraNativeFrame[] & { readonly __tstlMultiReturn: unknown };
    IsMouseOver(): boolean;
    SetFrameStrata(strata: "BACKGROUND" | "LOW" | "MEDIUM" | "HIGH" | "DIALOG" | "FULLSCREEN" | "FULLSCREEN_DIALOG" | "TOOLTIP"): void;
    HookScript(script: "OnEnter" | "OnLeave" | "OnShow" | "OnHide" | "OnSizeChanged", handler: (this: void, frame: wuiraNativeFrame) => void): void;
    SetAlpha(alpha: number): void;
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
    SetJustifyV(align: "MIDDLE" | "TOP" | "BOTTOM"): void;
}

interface wuiraNativeCooldown extends wuiraNativeFrame {
    SetCooldownFromDurationObject(duration: import("../datasources/TimerSource").NativeDuration, clearIfZero?: boolean): void;
    SetDrawSwipe(draw: boolean): void;
    SetDrawEdge(draw: boolean): void;
    SetDrawBling(draw: boolean): void;
    SetHideCountdownNumbers(hide: boolean): void;
    SetSwipeColor(r: number, g: number, b: number, a: number): void;
    GetCountdownFontString(): wuiraNativeFontString;
    Clear(): void;
}

declare const UIParent: wuiraNativeFrame;
declare const _G: Record<string, unknown>;
declare const SlashCmdList: Record<string, (this: void, message: string) => void>;
interface wuiraNativeStatusBar extends wuiraNativeFrame {
    GetStatusBarTexture(): wuiraNativeTexture;
    SetMinMaxValues(min: number, max: number): void;
    SetValue(value: number): void;
    SetStatusBarTexture(path: string): void;
    SetStatusBarColor(red: number, green: number, blue: number, alpha: number): void;
    SetOrientation(orientation: "HORIZONTAL" | "VERTICAL"): void;
    SetReverseFill(reverse: boolean): void;
}
type wuiraMouseClick = "LeftButtonUp" | "RightButtonUp" | "MiddleButtonUp" | "Button4Up" | "Button5Up";
interface wuiraNativeSecureButton extends wuiraNativeFrame {
    RegisterForClicks(...clicks: wuiraMouseClick[]): void;
    SetAttribute(name: string, value: string | number | boolean | undefined): void;
    SetID(id: number): void;
}

declare function CreateFrame(this: void, kind: "StatusBar", name: undefined, parent: wuiraNativeFrame): wuiraNativeStatusBar;
declare function CreateFrame(this: void, kind: "Frame", name: undefined, parent: wuiraNativeFrame, template?: "BackdropTemplate"): wuiraNativeFrame;
declare function CreateFrame(this: void, kind: "Button", name: string | undefined, parent: wuiraNativeFrame, template: "SecureActionButtonTemplate"): wuiraNativeSecureButton;
declare function CreateFrame(this: void, kind: "Button", name: undefined, parent: wuiraNativeFrame): wuiraNativeFrame;
declare function CreateFrame(this: void, kind: "Cooldown", name: undefined, parent: wuiraNativeFrame, template: "CooldownFrameTemplate"): wuiraNativeCooldown;
declare function SetOverrideBindingClick(this: void, owner: wuiraNativeFrame, priority: boolean, key: string, buttonName: string, mouseButton: string): void;
declare function ClearOverrideBindings(this: void, owner: wuiraNativeFrame): void;
declare function error(this: void, message: string): never;
declare function InCombatLockdown(this: void): boolean;
declare function hooksecurefunc(this: void, name: string, callback: (this: void) => void): void;
declare function hooksecurefunc(this: void, frame: wuiraNativeFrame, method: string, callback: (this: void) => void): void;
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
    IsSpellPassive?: (this: void, id: number | string) => boolean;
    PickupSpell?: (this: void, id: number) => void;
    GetSpellPowerCost?: (this: void, id: number) => { type: number; cost?: number }[] | undefined;
    GetSpellName?: (this: void, id: number | string) => string | undefined;
    GetSpellTexture?: (this: void, id: number | string) => number | undefined;
    GetSpellCooldownDuration?: (this: void, id: number | string, ignoreGCD?: boolean) => import("../datasources/TimerSource").NativeDuration | undefined;
} | undefined;

declare const C_Item: { PickupItem?: (this: void, id: number) => void } | undefined;

declare const C_SpellBook: {
    GetNumSpellBookSkillLines?: (this: void) => number;
    GetSpellBookSkillLineInfo?: (this: void, line: number) => {
        itemIndexOffset: number; numSpellBookItems: number;
    } | undefined;
    GetSpellBookItemInfo?: (this: void, slot: number, bank: number) => {
        itemType: number; spellID?: number; name?: string; isOffSpec?: boolean; isPassive?: boolean;
    } | undefined;
} | undefined;
declare const GetNumSpellTabs: ((this: void) => number) | undefined;
declare const GetSpellTabInfo: ((this: void, tab: number) => wuiraNativeReturns<[string, number, number, number]>) | undefined;
declare const GetSpellBookItemInfo: ((this: void, slot: number, bank: "spell") => wuiraNativeReturns<[string | undefined, number | undefined]>) | undefined;
declare const IsPassiveSpell: ((this: void, slot: number, bank: "spell") => boolean) | undefined;
declare const C_DurationUtil: {
    CreateDuration(this: void): import("../datasources/TimerSource").NativeDuration & {
        SetTimeFromStart(start: number, duration: number): void;
    };
} | undefined;
declare const C_Secrets: { ShouldAurasBeSecret?: (this: void) => boolean } | undefined;

declare const GetNumTotemSlots: ((this: void) => number) | undefined;
declare const GetTotemInfo: ((this: void, slot: number) => wuiraNativeReturns<[
    boolean | undefined, string | undefined, number | undefined, number | undefined,
    number | undefined, number | undefined, number | undefined,
]>) | undefined;
declare const GetTotemDuration: ((this: void, slot: number) => import("../datasources/TimerSource").NativeDuration) | undefined;
