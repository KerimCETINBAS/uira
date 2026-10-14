declare function IsShiftKeyDown(this: void): boolean;
declare function IsControlKeyDown(this: void): boolean;
declare function IsAltKeyDown(this: void): boolean;
declare const ChatEdit_GetActiveWindow: ((this: void) => wuiraNativeFrame | undefined) | undefined;

interface Target {
    frame: wuiraNativeFrame;
    overlay: wuiraNativeFrame;
    onBinding: (key: string | undefined) => void;
}

/** Hover-to-bind input capture. It reports keys; the addon owns persistence and actions. */
export class KeybindCapture {
    private readonly frame: wuiraNativeFrame;
    private readonly targets = new Set<Target>();
    private hovered?: Target;
    private active = false;

    public constructor(private readonly onCancel: () => void) {
        this.frame = CreateFrame("Frame", undefined, UIParent);
        this.frame.SetFrameStrata("FULLSCREEN_DIALOG");
        this.frame.SetSize(1, 1);
        this.frame.SetPoint("TOPLEFT", UIParent, "TOPLEFT", 0, 0);
        this.frame.EnableMouse(false);
        this.frame.EnableKeyboard(false);
        this.frame.Hide();
        this.frame.SetScript("OnKeyDown", (_frame, key) => this.OnKey(key));
        this.frame.RegisterEvent("PLAYER_REGEN_DISABLED");
        this.frame.SetScript("OnEvent", () => { this.SetActive(false); this.onCancel(); });
    }

    /** Independent overlays block clicks without rewriting the secure button. */
    public AddTarget(frame: wuiraNativeFrame, onBinding: Target["onBinding"]): () => void {
        if (InCombatLockdown()) error("KeybindCapture: register targets outside combat");
        const overlay = CreateFrame("Frame", undefined, UIParent);
        overlay.SetFrameStrata("DIALOG");
        overlay.SetSize(frame.GetWidth(), frame.GetHeight());
        const [x, y] = frame.GetCenter();
        const [screenX, screenY] = UIParent.GetCenter();
        if (x === undefined || y === undefined || screenX === undefined || screenY === undefined) error("KeybindCapture: target has no screen position");
        overlay.SetPoint("CENTER", UIParent, "CENTER", x - screenX, y - screenY);
        overlay.EnableMouse(true);
        const color = overlay.CreateTexture(undefined, "OVERLAY");
        color.SetAllPoints(overlay);
        color.SetColorTexture(0.4, 0.75, 1, 0.14);
        const target = { frame, overlay, onBinding };
        overlay.SetScript("OnEnter", () => {
            if (!this.active) return;
            this.hovered = target;
            color.SetColorTexture(0.4, 0.75, 1, 0.45);
        });
        overlay.SetScript("OnLeave", () => {
            if (this.hovered === target) this.hovered = undefined;
            color.SetColorTexture(0.4, 0.75, 1, 0.14);
        });
        this.targets.add(target);
        if (this.active) overlay.Show(); else overlay.Hide();
        return () => {
            if (this.hovered === target) this.hovered = undefined;
            this.targets.delete(target);
            overlay.SetScript("OnEnter", undefined);
            overlay.SetScript("OnLeave", undefined);
            overlay.EnableMouse(false);
            overlay.Hide();
        };
    }

    public SetActive(active: boolean): void {
        if (active && InCombatLockdown()) error("KeybindCapture: enable outside combat");
        this.active = active;
        this.hovered = undefined;
        this.frame.EnableKeyboard(active);
        if (active) {
            this.frame.SetPropagateKeyboardInput(true);
            this.frame.Show();
        } else this.frame.Hide();
        for (const target of this.targets) {
            if (active) {
                const [x, y] = target.frame.GetCenter();
                const [screenX, screenY] = UIParent.GetCenter();
                if (x !== undefined && y !== undefined && screenX !== undefined && screenY !== undefined) {
                    target.overlay.ClearAllPoints();
                    target.overlay.SetPoint("CENTER", UIParent, "CENTER", x - screenX, y - screenY);
                }
                target.overlay.Show();
            } else target.overlay.Hide();
        }
    }

    private OnKey(key: string): void {
        if (!this.active || InCombatLockdown()) return;
        this.frame.SetPropagateKeyboardInput(true);
        const chat = ChatEdit_GetActiveWindow?.();
        if (chat?.IsShown()) return;
        if (key === "ESCAPE") {
            this.frame.SetPropagateKeyboardInput(false);
            this.onCancel();
            return;
        }
        if (this.hovered === undefined || ["LSHIFT", "RSHIFT", "LCTRL", "RCTRL", "LALT", "RALT", "ENTER", "PRINTSCREEN"].includes(key)) return;
        this.frame.SetPropagateKeyboardInput(false);
        const binding = key === "BACKSPACE" || key === "DELETE" ? undefined
            : (IsControlKeyDown() ? "CTRL-" : "") + (IsAltKeyDown() ? "ALT-" : "")
                + (IsShiftKeyDown() ? "SHIFT-" : "") + key;
        this.hovered.onBinding(binding);
        // A consumer may refresh its targets synchronously while applying the key.
        this.frame.SetPropagateKeyboardInput(false);
    }

    public Dispose(): void {
        this.SetActive(false);
        this.frame.UnregisterAllEvents();
        this.frame.SetScript("OnEvent", undefined);
        this.frame.SetScript("OnKeyDown", undefined);
        for (const target of this.targets) {
            target.overlay.SetScript("OnEnter", undefined);
            target.overlay.SetScript("OnLeave", undefined);
            target.overlay.EnableMouse(false);
        }
        this.targets.clear();
    }
}
