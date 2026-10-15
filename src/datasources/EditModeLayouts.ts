import { DataSource } from "./DataSource";

interface NativeLayout { layoutName: string; layoutType: number; interfaceStyle?: number; }
interface NativeLayouts { layouts: NativeLayout[]; activeLayout: number; }
declare const C_EditMode: { GetLayouts?: (this: void) => NativeLayouts | undefined } | undefined;

export type EditModeLayoutsStatus = "ready" | "unavailable" | "restricted";
export interface EditModeLayout {
    /** Native one-based index. Deleting another layout can change this number. */
    readonly index: number;
    readonly name: string;
    readonly type: number;
    readonly interfaceStyle?: number;
    /** Derived from native type, interface style and name; changes on rename. */
    readonly key: string;
}
export interface EditModeLayoutSnapshot {
    readonly layouts: readonly EditModeLayout[];
    readonly active?: EditModeLayout;
}

/** Read-only native Edit Mode layouts, refreshed by events without polling. */
export class EditModeLayouts extends DataSource<EditModeLayoutSnapshot> {
    private snapshot: EditModeLayoutSnapshot = { layouts: [] };
    private status: EditModeLayoutsStatus = "unavailable";
    private readonly listeners = new Set<(value: EditModeLayoutSnapshot) => void>();
    private readonly frame: wuiraNativeFrame;
    private disposed = false;

    public constructor() {
        super({ layouts: [] });
        this.frame = CreateFrame("Frame", undefined, UIParent);
        for (const event of ["EDIT_MODE_LAYOUTS_UPDATED", "PLAYER_ENTERING_WORLD", "PLAYER_SPECIALIZATION_CHANGED"]) this.frame.RegisterEvent(event);
        this.frame.SetScript("OnEvent", (_frame: wuiraNativeFrame, event: string, value?: NativeLayouts) =>
            this.Refresh(event === "EDIT_MODE_LAYOUTS_UPDATED" ? value : undefined));
        this.Refresh();
    }
    public get Status(): EditModeLayoutsStatus { return this.status; }
    public get Layouts(): readonly EditModeLayout[] { return this.Value.layouts; }
    public get Active(): EditModeLayout | undefined { return this.Value.active; }
    protected override HasSecretFields(): boolean { return this.status === "restricted"; }
    protected override GetValue(): EditModeLayoutSnapshot {
        return { layouts: this.snapshot.layouts.map(layout => ({ ...layout })),
            active: this.snapshot.active === undefined ? undefined : { ...this.snapshot.active } };
    }
    /** No initial emission. Availability changes also notify observers. */
    public onChange(listener: (value: EditModeLayoutSnapshot) => void): () => void {
        if (this.disposed) error("EditModeLayouts: source is disposed");
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    private Refresh(value?: NativeLayouts): void {
        const signature = () => this.status + "|" + this.snapshot.layouts.map(layout => layout.index + ":" + layout.key.length + ":" + layout.key).join("|") + "|active:" + (this.snapshot.active?.index ?? "");
        const previous = signature();
        this.snapshot = { layouts: [] }; this.status = "unavailable";
        if (value !== undefined || C_EditMode?.GetLayouts !== undefined) {
            try {
                const native = value ?? C_EditMode?.GetLayouts?.();
                if (issecretvalue(native)) this.status = "restricted";
                else if (native !== undefined) {
                    if (issecretvalue(native.layouts) || issecretvalue(native.activeLayout)) this.status = "restricted";
                    else if (Array.isArray(native.layouts) && Number.isInteger(native.activeLayout) && native.activeLayout > 0) {
                        const layouts: EditModeLayout[] = []; this.status = "ready";
                        for (let offset = 0; offset < native.layouts.length; offset++) {
                            const layout = native.layouts[offset];
                            if (issecretvalue(layout) || issecretvalue(layout.layoutName) || issecretvalue(layout.layoutType) || issecretvalue(layout.interfaceStyle)) { this.status = "restricted"; break; }
                            if (typeof layout.layoutName !== "string" || !Number.isInteger(layout.layoutType)
                                || (layout.interfaceStyle !== undefined && !Number.isInteger(layout.interfaceStyle))) { this.status = "unavailable"; break; }
                            layouts.push({ index: offset + 1, name: layout.layoutName, type: layout.layoutType, interfaceStyle: layout.interfaceStyle,
                                key: layout.layoutType + ":" + (layout.interfaceStyle ?? "") + ":" + layout.layoutName });
                        }
                        if (this.status === "ready") this.snapshot = { layouts, active: layouts[native.activeLayout - 1] };
                    }
                }
            } catch { this.status = "unavailable"; }
        }
        if (signature() !== previous && (this.status !== "ready" || this.CanEmit(this.GetValue()))) {
            for (const listener of Array.from(this.listeners)) listener(this.GetValue());
        }
    }
    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true; this.listeners.clear(); this.frame.UnregisterAllEvents();
        this.frame.SetScript("OnEvent", undefined); this.frame.Hide();
    }
}
