declare const _G: Record<string, unknown>;
declare function InCombatLockdown(this: void): boolean;

interface StockFrame extends wuiraNativeFrame {
    GetParent(): wuiraNativeFrame;
    HookScript(script: "OnShow", handler: (this: void, frame: StockFrame) => void): void;
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
