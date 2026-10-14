import { DataSource } from "./DataSource";

/** A native texture reader with event-driven updates; no per-frame polling. */
export class TextureSource extends DataSource<string | number | undefined> {
    public constructor(private readonly read: () => string | number | undefined,
        private readonly events: readonly string[], private readonly unit?: string) { super(undefined); }
    protected override GetValue() { return this.read(); }
    public BindTo(frame: wuiraNativeFrame, texture: wuiraNativeTexture, onActiveChange?: (active: boolean) => void): void {
        const refresh = () => {
            const value = this.read();
            const active = this.CanEmit(value);
            onActiveChange?.(active);
            if (active) texture.SetTexture(value);
        };
        frame.SetScript("OnEvent", (_frame, event, unit) => {
            if (!event.startsWith("UNIT_") || this.unit === undefined || unit === this.unit) refresh();
        });
        for (const event of this.events) frame.RegisterEvent(event);
        refresh();
    }
}
