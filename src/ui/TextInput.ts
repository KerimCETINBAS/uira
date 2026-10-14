interface NativeEditBox extends wuiraNativeFrame {
    SetAutoFocus(value: boolean): void;
    SetMultiLine(value: boolean): void;
    SetFont(path: string, size: number, flags: string): boolean;
    SetTextInsets(left: number, right: number, top: number, bottom: number): void;
    SetMaxBytes(bytes: number): void;
    SetText(text: string): void;
    GetText(): string;
    HighlightText(): void;
    SetFocus(): void;
    ClearFocus(): void;
}
declare function CreateFrame(this: void, kind: "EditBox", name: undefined, parent: wuiraNativeFrame): NativeEditBox;

/** Native text entry hosted by a mounted Cell. Dispose it in that Cell's onMount cleanup. */
export class TextInput {
    public readonly Frame: NativeEditBox;
    private disposed = false;
    public constructor(parent: wuiraNativeFrame, options: { text?: string; maxBytes?: number; onEscape?: () => void } = {}) {
        this.Frame = CreateFrame("EditBox", undefined, parent);
        this.Frame.SetAutoFocus(false);
        this.Frame.SetMultiLine(false);
        this.Frame.SetFont("Fonts\\FRIZQT__.TTF", 12, "");
        this.Frame.SetTextInsets(8, 8, 4, 4);
        this.Frame.SetMaxBytes(options.maxBytes ?? 262144);
        this.Frame.SetAllPoints(parent);
        this.Frame.SetText(options.text ?? "");
        this.Frame.SetScript("OnEscapePressed", () => { this.Frame.ClearFocus(); options.onEscape?.(); });
        this.Frame.Show();
    }
    public get Value(): string { return this.Frame.GetText(); }
    public Focus(selectAll = false): void { this.Frame.SetFocus(); if (selectAll) this.Frame.HighlightText(); }
    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.Frame.ClearFocus();
        this.Frame.SetScript("OnEscapePressed", undefined);
        this.Frame.Hide();
    }
}
