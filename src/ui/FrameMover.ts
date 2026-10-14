export interface FramePosition { x: number; y: number; }
export interface FrameMoverOptions {
    label: string;
    onMove: (position: FramePosition) => void;
}

/** A screen-space drag proxy. Protected targets are positioned only outside combat. */
export class FrameMover {
    public readonly Frame: wuiraNativeFrame;
    private dragging = false;
    private last?: FramePosition;
    private disposed = false;

    public constructor(private readonly target: wuiraNativeFrame, private readonly options: FrameMoverOptions) {
        if (InCombatLockdown()) error("FrameMover: create outside combat");
        const frame = CreateFrame("Frame", undefined, UIParent);
        this.Frame = frame;
        frame.SetFrameStrata("DIALOG");
        frame.SetSize(target.GetWidth(), target.GetHeight());
        frame.EnableMouse(true);
        frame.SetMovable(true);
        frame.SetClampedToScreen(true);
        frame.RegisterForDrag("LeftButton");
        const [x, y] = target.GetCenter();
        const [screenX, screenY] = UIParent.GetCenter();
        if (x === undefined || y === undefined || screenX === undefined || screenY === undefined) error("FrameMover: target has no screen position");
        // No parent or anchor dependency on the protected target.
        frame.SetPoint("CENTER", UIParent, "CENTER", x - screenX, y - screenY);
        const texture = frame.CreateTexture(undefined, "BACKGROUND");
        texture.SetAllPoints(frame);
        texture.SetColorTexture(0.15, 0.5, 0.8, 0.45);
        const label = frame.CreateFontString(undefined, "OVERLAY");
        label.SetAllPoints(frame);
        label.SetFont("Fonts\\FRIZQT__.TTF", 12, "OUTLINE");
        label.SetText(options.label);
        frame.SetScript("OnDragStart", () => {
            if (this.disposed || InCombatLockdown()) return;
            this.dragging = true;
            frame.StartMoving();
            frame.SetScript("OnUpdate", () => this.Update());
        });
        frame.SetScript("OnDragStop", () => this.Stop(true));
        frame.RegisterEvent("PLAYER_REGEN_DISABLED");
        frame.SetScript("OnEvent", () => this.Dispose());
        frame.Show();
    }

    private Update(): void {
        if (!this.dragging || InCombatLockdown()) return;
        const [x, y] = this.Frame.GetCenter();
        const [screenX, screenY] = UIParent.GetCenter();
        if (x === undefined || y === undefined || screenX === undefined || screenY === undefined) return;
        this.last = { x: x - screenX, y: screenY - y };
        this.target.ClearAllPoints();
        this.target.SetPoint("CENTER", UIParent, "CENTER", this.last.x, -this.last.y);
    }

    private Stop(commit: boolean): void {
        if (!this.dragging) return;
        this.Update();
        this.dragging = false;
        this.Frame.StopMovingOrSizing();
        this.Frame.SetScript("OnUpdate", undefined);
        if (commit && this.last !== undefined) this.options.onMove(this.last);
    }

    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        // A last legal position is data; saving it does not mutate protected targets.
        this.Stop(true);
        this.Frame.UnregisterAllEvents();
        this.Frame.SetScript("OnEvent", undefined);
        this.Frame.SetScript("OnDragStart", undefined);
        this.Frame.SetScript("OnDragStop", undefined);
        this.Frame.EnableMouse(false);
        this.Frame.RegisterForDrag();
        this.Frame.Hide();
    }
}
