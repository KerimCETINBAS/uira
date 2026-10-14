import { skinMicroMenu } from "./MicroMenu";
import type { MicroMenuSkinOptions } from "./MicroMenu";

declare const _G: Record<string, unknown>;
declare function InCombatLockdown(this: void): boolean;
declare const C_ActionBar: { UnregisterActionUIButton?: (this: void, frame: wuiraNativeFrame) => void } | undefined;

interface StockFrame extends wuiraNativeFrame {
}

export interface BlizzardUIOptions {
    actionBars?: boolean;
    player?: boolean;
    target?: boolean;
    focus?: boolean;
}

/** Opt-in stock UI visibility. Native buttons, bindings and event handlers remain intact. */
export class BlizzardUI {
    private constructor() {}

    /** Style native micro-menu buttons. Reload restores their original textures. */
    public static SkinMicroMenu(options: MicroMenuSkinOptions = {}): () => void {
        return skinMicroMenu(options);
    }

    /** Disable stock action-bar event/update paths. Restoring their scripts requires reload. */
    public static DisableActionBars(): () => void {
        const unhide = this.Hide({ actionBars: true });
        const listener = CreateFrame("Frame", undefined, UIParent);
        const roots = ["MainActionBar", "MainMenuBar", "MultiBarBottomLeft", "MultiBarBottomRight",
            "MultiBarRight", "MultiBarLeft", "MultiBar5", "MultiBar6", "MultiBar7", "StanceBar", "PetActionBar"];
        const managers = ["ActionBarController", "ActionBarButtonEventsFrame", "ActionBarActionEventsFrame",
            "ActionBarButtonUpdateFrame", "ActionBarButtonRangeCheckFrame", "ActionBarButtonUsableWatcherFrame"];
        const apply = () => {
            if (InCombatLockdown()) return;
            const seen = new Set<wuiraNativeFrame>();
            const quiet = (frame: StockFrame | undefined) => {
                if (frame === undefined || frame.UnregisterAllEvents === undefined || seen.has(frame)) return;
                seen.add(frame);
                frame.UnregisterAllEvents();
                frame.SetScript("OnEvent", undefined);
                frame.SetScript("OnUpdate", undefined);
                if (frame.GetChildren !== undefined) {
                    const children = [...frame.GetChildren()];
                    for (const child of children) quiet(child as StockFrame);
                }
            };
            for (const name of [...roots, ...managers]) quiet(_G[name] as StockFrame | undefined);
            for (const prefix of ["ActionButton", "MultiBarBottomLeftButton", "MultiBarBottomRightButton",
                "MultiBarRightButton", "MultiBarLeftButton", "MultiBar5Button", "MultiBar6Button", "MultiBar7Button"]) {
                for (let index = 1; index <= 12; index += 1) {
                    const button = _G[prefix + index] as wuiraNativeFrame | undefined;
                    if (button !== undefined) C_ActionBar?.UnregisterActionUIButton?.(button);
                }
            }
        };
        listener.RegisterEvent("ADDON_LOADED");
        listener.RegisterEvent("PLAYER_ENTERING_WORLD");
        listener.RegisterEvent("PLAYER_REGEN_ENABLED");
        listener.SetScript("OnEvent", apply);
        apply();
        return () => { listener.UnregisterAllEvents(); listener.SetScript("OnEvent", undefined); unhide(); };
    }

    /** Returns a restore function; protected changes wait until combat ends. */
    public static Hide(options: BlizzardUIOptions): () => void {
        const names: string[] = [];
        if (options.actionBars) names.push(
            "MainActionBar", "MainMenuBar", "MultiBarBottomLeft", "MultiBarBottomRight",
            "MultiBarRight", "MultiBarLeft", "MultiBar5", "MultiBar6", "MultiBar7",
            "StanceBar", "PetActionBar",
        );
        if (options.player) names.push("PlayerFrame");
        if (options.target) names.push("TargetFrame");
        if (options.focus) names.push("FocusFrame");

        const hidden = CreateFrame("Frame", undefined, UIParent);
        hidden.SetAllPoints(UIParent);
        hidden.Hide();
        const listener = CreateFrame("Frame", undefined, UIParent);
        const parents = new Map<StockFrame, wuiraNativeFrame>();
        let enabled = true;

        const apply = () => {
            if (InCombatLockdown()) return;
            if (!enabled) {
                for (const [frame, parent] of parents) {
                    // Do not undo another addon's subsequent ownership change.
                    if (frame.GetParent() === hidden) frame.SetParent(parent);
                }
                parents.clear();
                listener.UnregisterAllEvents();
                listener.SetScript("OnEvent", undefined);
                listener.Hide();
                return;
            }
            for (const name of names) {
                const frame = _G[name] as StockFrame | undefined;
                if (frame === undefined) continue;
                if (!parents.has(frame)) {
                    parents.set(frame, frame.GetParent());
                    frame.HookScript("OnShow", () => {
                        if (enabled && !InCombatLockdown() && frame.GetParent() !== hidden) frame.SetParent(hidden);
                    });
                }
                if (frame.GetParent() !== hidden) frame.SetParent(hidden);
            }
        };
        listener.RegisterEvent("PLAYER_REGEN_ENABLED");
        listener.RegisterEvent("PLAYER_ENTERING_WORLD");
        listener.RegisterEvent("ADDON_LOADED");
        listener.SetScript("OnEvent", apply);
        apply();
        return () => { enabled = false; apply(); };
    }
}
