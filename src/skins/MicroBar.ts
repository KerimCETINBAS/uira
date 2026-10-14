import { NativeSkin } from "./NativeSkin";
import { skinMicroMenu } from "../platform/MicroMenu";
import type { MicroMenuSkinOptions } from "../platform/MicroMenu";

export class MicroBar extends NativeSkin {
    private stopStyling?: () => void;
    public constructor() { super("MicroMenu"); }

    public Style(options: MicroMenuSkinOptions): this {
        this.stopStyling?.();
        this.stopStyling = skinMicroMenu(options);
        return this;
    }

    public override Dispose(): void {
        if (!InCombatLockdown()) { this.stopStyling?.(); this.stopStyling = undefined; }
        super.Dispose();
    }
}
