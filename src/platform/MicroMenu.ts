import type { Color } from "../types/Color";

declare const _G: Record<string, unknown>;
declare function InCombatLockdown(this: void): boolean;
declare function hooksecurefunc(this: void, name: string, callback: (this: void) => void): void;

interface MenuTexture extends wuiraNativeTexture {
    SetAlpha(alpha: number): void;
}
interface MenuFrame extends wuiraNativeFrame {
    BorderArt?: MenuTexture;
    BackgroundArt?: MenuTexture;
}
interface MicroButton extends wuiraNativeFrame {
    Background?: MenuTexture;
    PushedBackground?: MenuTexture;
    Shadow?: MenuTexture;
    PushedShadow?: MenuTexture;
    GetNormalTexture?(): MenuTexture | undefined;
    GetPushedTexture?(): MenuTexture | undefined;
    GetDisabledTexture?(): MenuTexture | undefined;
    GetHighlightTexture?(): MenuTexture | undefined;
}

export interface MicroMenuSkinOptions {
    background?: Color;
    border?: Color;
    buttonBackground?: Color;
    icon?: Color;
    accent?: Color;
    disabledIcon?: Color;
    padding?: number;
    panel?: boolean;
}

/** Style Forever's existing micro buttons without replacing their scripts or layout.
 * Disposing stops maintenance; reload restores the native textures.
 */
export function skinMicroMenu(options: MicroMenuSkinOptions = {}): () => void {
    const background = options.background ?? { r: 0.035, g: 0.045, b: 0.065, a: 0.9 };
    const border = options.border ?? { r: 0.22, g: 0.28, b: 0.36, a: 0.8 };
    const buttonBackground = options.buttonBackground ?? { r: 0.08, g: 0.1, b: 0.14, a: 0.75 };
    const icon = options.icon ?? { r: 0.78, g: 0.83, b: 0.9 };
    const accent = options.accent ?? { r: 0.4, g: 0.75, b: 1 };
    const disabledIcon = options.disabledIcon ?? { r: 0.35, g: 0.38, b: 0.44 };
    const padding = options.padding ?? 6;
    if (!Number.isFinite(padding) || padding < 0) error("MicroMenu: padding must be a non-negative number");
    const listener = CreateFrame("Frame", undefined, UIParent);
    let enabled = true;
    let applying = false;
    let hooked = false;
    let panel: wuiraNativeFrame | undefined;
    const tint = (texture: MenuTexture | undefined, color: Color) => {
        texture?.SetVertexColor(color.r, color.g, color.b, color.a ?? 1);
    };
    const fill = (texture: MenuTexture | undefined, color: Color) => {
        texture?.SetColorTexture(color.r, color.g, color.b, color.a ?? 1);
    };
    const apply = () => {
        if (!enabled || applying || InCombatLockdown()) return;
        const menu = _G.MicroMenu as MenuFrame | undefined;
        if (menu === undefined) return;
        applying = true;
        try {
            if (!hooked && _G.LoadMicroButtonTextures !== undefined) {
                hooked = true;
                hooksecurefunc("LoadMicroButtonTextures", () => apply());
            }
            if (panel === undefined && options.panel !== false) {
                panel = CreateFrame("Frame", undefined, menu);
                panel.EnableMouse(false);
                panel.SetFrameLevel(menu.GetFrameLevel());
                panel.SetPoint("TOPLEFT", menu, "TOPLEFT", -padding, padding);
                panel.SetPoint("BOTTOMRIGHT", menu, "BOTTOMRIGHT", padding, -padding);
                const bg = panel.CreateTexture(undefined, "BACKGROUND");
                bg.SetAllPoints(panel);
                bg.SetColorTexture(background.r, background.g, background.b, background.a ?? 1);
                for (const edge of ["TOP", "BOTTOM", "LEFT", "RIGHT"] as const) {
                    const line = panel.CreateTexture(undefined, "OVERLAY");
                    line.SetColorTexture(border.r, border.g, border.b, border.a ?? 1);
                    if (edge === "TOP" || edge === "BOTTOM") {
                        const left = edge === "TOP" ? "TOPLEFT" : "BOTTOMLEFT";
                        const right = edge === "TOP" ? "TOPRIGHT" : "BOTTOMRIGHT";
                        line.SetPoint(left, panel, left, 0, 0);
                        line.SetPoint(right, panel, right, 0, 0);
                        line.SetSize(1, 1);
                    } else {
                        const top = edge === "LEFT" ? "TOPLEFT" : "TOPRIGHT";
                        const bottom = edge === "LEFT" ? "BOTTOMLEFT" : "BOTTOMRIGHT";
                        line.SetPoint(top, panel, top, 0, 0);
                        line.SetPoint(bottom, panel, bottom, 0, 0);
                        line.SetSize(1, 1);
                    }
                }
            }
            menu.BorderArt?.SetAlpha(0);
            menu.BackgroundArt?.SetAlpha(0);
            for (const name of ["CharacterMicroButton", "ProfessionMicroButton", "SpellbookMicroButton",
                "TalentMicroButton", "PlayerSpellsMicroButton", "QuestLogMicroButton", "GuildMicroButton",
                "LFDMicroButton", "LegacyMicroButton", "CollectionsMicroButton", "EJMicroButton",
                "AchievementMicroButton", "HousingMicroButton", "StoreMicroButton", "MainMenuMicroButton", "HelpMicroButton"]) {
                const button = _G[name] as MicroButton | undefined;
                if (button === undefined) continue;
                fill(button.Background, buttonBackground);
                fill(button.PushedBackground, { r: accent.r * 0.25, g: accent.g * 0.25, b: accent.b * 0.25, a: 0.9 });
                button.Shadow?.SetAlpha(0);
                button.PushedShadow?.SetAlpha(0);
                tint(button.GetNormalTexture?.(), icon);
                tint(button.GetPushedTexture?.(), accent);
                tint(button.GetHighlightTexture?.(), accent);
                tint(button.GetDisabledTexture?.(), disabledIcon);
            }
        } finally { applying = false; }
    };
    // The game can reload icon atlases after bindings, guild or specialization changes.
    listener.RegisterEvent("ADDON_LOADED");
    listener.RegisterEvent("PLAYER_ENTERING_WORLD");
    listener.RegisterEvent("PLAYER_REGEN_ENABLED");
    listener.SetScript("OnEvent", apply);
    apply();
    return () => {
        enabled = false;
        listener.UnregisterAllEvents();
        listener.SetScript("OnEvent", undefined);
        panel?.Hide();
    };
}
