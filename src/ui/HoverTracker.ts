declare function InCombatLockdown(this: void): boolean;
declare function CreateFrame(this: void, kind: "Frame", name: undefined, parent: wuiraNativeFrame,
    template?: "SecureHandlerEnterLeaveTemplate" | "SecureHandlerShowHideTemplate"): HoverFrame;

export interface HoverFrame extends wuiraNativeFrame {
    SetFrameRef(name: string, frame: wuiraNativeFrame): void;
    SetAttribute(name: string, value: string | number): void;
}
export interface HoverTrackerOptions {
    hideDelay?: number;
    regions?: readonly wuiraNativeFrame[];
}

/** Generic secure hover visibility. Callers own presentation, content and positioning. */
export class HoverTracker {
    public readonly Trigger: HoverFrame;
    public readonly Popup: HoverFrame;
    private readonly listener: wuiraNativeFrame;
    private regionCount = 0;
    private disposing = false;
    private disposed = false;

    public constructor(options: HoverTrackerOptions = {}) {
        if (InCombatLockdown()) error("HoverTracker: create the tracker outside combat");
        const delay = options.hideDelay ?? 0.25;
        if (!Number.isFinite(delay) || delay < 0) error("HoverTracker: hideDelay must be non-negative");
        this.Trigger = CreateFrame("Frame", undefined, UIParent, "SecureHandlerEnterLeaveTemplate");
        this.Popup = CreateFrame("Frame", undefined, UIParent, "SecureHandlerShowHideTemplate");
        this.Trigger.EnableMouse(true);
        this.Popup.EnableMouse(false);
        this.Popup.SetFrameRef("trigger", this.Trigger);
        this.Popup.SetAttribute("hide-delay", delay);
        this.Popup.SetAttribute("region-count", 0);
        this.Popup.SetAttribute("_onshow", `
            self:RegisterAutoHide(self:GetAttribute("hide-delay"))
            self:AddToAutoHide(self:GetFrameRef("trigger"))
            for index = 1, self:GetAttribute("region-count") do
                self:AddToAutoHide(self:GetFrameRef("region" .. index))
            end
        `);
        this.Trigger.SetFrameRef("popup", this.Popup);
        this.Trigger.SetAttribute("_onenter", 'self:GetFrameRef("popup"):Show()');
        this.Popup.Hide();
        for (const region of options.regions ?? []) this.AddRegion(region);
        this.listener = CreateFrame("Frame", undefined, UIParent);
        this.listener.RegisterEvent("PLAYER_REGEN_ENABLED");
        this.listener.SetScript("OnEvent", () => { if (this.disposing) this.Dispose(); });
    }

    public AddRegion(frame: wuiraNativeFrame): this {
        if (this.disposing || this.disposed) error("HoverTracker is disposed");
        if (InCombatLockdown()) error("HoverTracker: configure regions outside combat");
        this.regionCount += 1;
        this.Popup.SetFrameRef("region" + this.regionCount, frame);
        this.Popup.SetAttribute("region-count", this.regionCount);
        return this;
    }

    public Dispose(): void {
        if (this.disposed) return;
        this.disposing = true;
        if (InCombatLockdown()) return;
        this.Trigger.SetAttribute("_onenter", "");
        this.Trigger.Hide();
        this.Popup.Hide();
        this.listener.UnregisterAllEvents();
        this.listener.SetScript("OnEvent", undefined);
        this.disposed = true;
    }
}
