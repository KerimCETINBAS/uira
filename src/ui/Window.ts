import { wuira } from "../wuira";
import type { Cell } from "./Cell";

export interface WindowOptions { width: number; height: number; }

/** A draggable, standalone UI host. Closing releases its mounted content. */
export class Window {
    public readonly Frame: wuiraNativeFrame;
    private content?: wuiraNativeFrame;
    private pendingClose = false;
    private disposed = false;
    private moving = false;

    public constructor(options: WindowOptions) {
        if (!Number.isFinite(options.width) || !Number.isFinite(options.height)
            || options.width <= 0 || options.height <= 0) error("Window requires positive finite dimensions");
        const frame = CreateFrame("Frame", undefined, UIParent);
        this.Frame = frame;
        frame.SetSize(options.width, options.height);
        frame.SetPoint("CENTER", UIParent, "CENTER", 0, 0);
        frame.SetFrameStrata("DIALOG");
        frame.SetMovable(true);
        frame.SetClampedToScreen(true);
        frame.EnableMouse(true);
        frame.EnableKeyboard(false);
        frame.Hide();
        frame.SetScript("OnKeyDown", (_frame, key) => {
            if (frame.IsProtected?.() && InCombatLockdown()) {
                if (key === "ESCAPE") this.Close();
                return;
            }
            frame.SetPropagateKeyboardInput(key !== "ESCAPE");
            if (key === "ESCAPE") this.Close();
        });
        frame.RegisterEvent("PLAYER_REGEN_ENABLED");
        frame.SetScript("OnEvent", () => { if (this.pendingClose) this.Close(); });
    }

    public get IsOpen(): boolean { return this.Frame.IsShown(); }

    public Open(view: Cell | (() => Cell | void)): void {
        if (this.disposed) error("Window is disposed");
        if (this.Frame.IsProtected?.() && InCombatLockdown()) error("Window: update protected content outside combat");
        this.pendingClose = false;
        // Keep the current view usable if rendering or mounting its replacement fails.
        const next = wuira.Mount(view, undefined, this.Frame);
        const previous = this.content;
        this.content = next;
        if (previous !== undefined) wuira.Unmount(previous);
        this.Frame.SetPropagateKeyboardInput(true);
        this.Frame.EnableKeyboard(true);
        this.Frame.Show();
    }

    /** Use as a header's onMount callback, returning the cleanup to the mounted tree. */
    public BindDragHandle(handle: wuiraNativeFrame): () => void {
        handle.EnableMouse(true);
        handle.RegisterForDrag("LeftButton");
        handle.SetScript("OnDragStart", () => {
            if (!InCombatLockdown()) { this.Frame.StartMoving(); this.moving = true; }
        });
        handle.SetScript("OnDragStop", () => this.StopMoving());
        return () => {
            this.StopMoving();
            handle.RegisterForDrag();
            handle.SetScript("OnDragStart", undefined);
            handle.SetScript("OnDragStop", undefined);
        };
    }

    public Close(): void {
        if (this.Frame.IsProtected?.() && InCombatLockdown()) { this.pendingClose = true; return; }
        this.pendingClose = false;
        this.StopMoving();
        this.Frame.EnableKeyboard(false);
        this.Frame.Hide();
        if (this.content !== undefined) wuira.Unmount(this.content);
        this.content = undefined;
    }

    public Dispose(): void {
        if (this.disposed) return;
        if (this.Frame.IsProtected?.() && InCombatLockdown()) error("Window: dispose protected content outside combat");
        this.Close();
        this.Frame.UnregisterAllEvents();
        this.Frame.SetScript("OnEvent", undefined);
        this.Frame.SetScript("OnKeyDown", undefined);
        this.disposed = true;
    }

    private StopMoving(): void {
        if (!this.moving) return;
        this.Frame.StopMovingOrSizing();
        this.moving = false;
    }
}
