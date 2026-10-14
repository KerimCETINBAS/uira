interface NativeScrollFrame extends wuiraNativeFrame {
    SetScrollChild(child: wuiraNativeFrame): void;
    UpdateScrollChildRect(): void;
    GetVerticalScrollRange(): number;
    GetVerticalScroll(): number;
    SetVerticalScroll(offset: number): void;
}
declare function CreateFrame(this: void, kind: "ScrollFrame", name: undefined, parent: wuiraNativeFrame): NativeScrollFrame;

/** Native clipping and mouse-wheel scrolling for content mounted inside a Cell. */
export class ScrollHost {
    public readonly Frame: NativeScrollFrame;
    private disposed = false;
    public constructor(parent: wuiraNativeFrame, private readonly onScroll?: (offset: number) => void) {
        this.Frame = CreateFrame("ScrollFrame", undefined, parent);
        this.Frame.SetSize(parent.GetWidth(), parent.GetHeight());
        this.Frame.SetAllPoints(parent);
        this.Frame.EnableMouse(true);
        this.Frame.SetScript("OnMouseWheel", (_frame, delta) => this.ScrollBy(-delta * 32));
        this.Frame.Show();
    }
    public SetContent(content: wuiraNativeFrame, offset = 0): void {
        this.Frame.SetScrollChild(content);
        this.Frame.UpdateScrollChildRect();
        this.ScrollTo(offset);
    }
    public ScrollBy(amount: number): void { this.ScrollTo(this.Frame.GetVerticalScroll() + amount); }
    public ScrollTo(offset: number): void {
        if (this.disposed) return;
        const value = Math.max(0, Math.min(this.Frame.GetVerticalScrollRange(), offset));
        this.Frame.SetVerticalScroll(value);
        this.onScroll?.(value);
    }
    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.Frame.SetScript("OnMouseWheel", undefined);
        this.Frame.Hide();
    }
}
