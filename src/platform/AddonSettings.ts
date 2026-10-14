import { wuira } from "../wuira";
import type { Cell } from "../ui/Cell";

interface SettingsCategory { GetID(): number; }
declare const Settings: {
    RegisterCanvasLayoutCategory(this: void, frame: wuiraNativeFrame, name: string): SettingsCategory;
    RegisterAddOnCategory(this: void, category: SettingsCategory): void;
    OpenToCategory(this: void, id: number): void;
} | undefined;
declare const _G: Record<string, unknown>;

/** Registers a JSX settings view in the client's native addon settings list. */
export class AddonSettings {
    public readonly Frame: wuiraNativeFrame;
    private readonly category: SettingsCategory;

    public constructor(name: string, view: Cell | (() => Cell | void)) {
        if (Settings?.RegisterCanvasLayoutCategory === undefined) error("AddonSettings: native settings API is unavailable");
        this.Frame = CreateFrame("Frame", undefined, UIParent);
        this.Frame.Hide();
        wuira.Mount(view, undefined, this.Frame);
        this.category = Settings.RegisterCanvasLayoutCategory(this.Frame, name);
        Settings.RegisterAddOnCategory(this.category);
    }

    public Open(): void { Settings!.OpenToCategory(this.category.GetID()); }
    public Close(): void { (_G.SettingsPanel as wuiraNativeFrame | undefined)?.Hide(); }
}
