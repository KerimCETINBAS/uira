import type { SecureButtonProps } from "../ui/SecureButton";
import { configureSecureButton } from "../platform/SecureButton";
import type { MountedTree, RenderedCell } from "./types";

export function renderSecureButton(item: RenderedCell, tree: MountedTree): void {
    const props = item.cell.props as SecureButtonProps;
    tree.bindings.push(configureSecureButton(item.frame as wuiraNativeSecureButton, props));
    if (props.cooldown !== undefined) {
        const cooldown = CreateFrame("Cooldown", undefined, item.frame, "CooldownFrameTemplate");
        tree.frames.push(cooldown);
        cooldown.EnableMouse(false);
        cooldown.SetAllPoints(item.frame);
        cooldown.SetFrameLevel(item.frame.GetFrameLevel() + 2);
        cooldown.SetDrawSwipe(true);
        cooldown.SetDrawEdge(false);
        cooldown.SetDrawBling(props.finishGlow ?? false);
        cooldown.SetHideCountdownNumbers(false);
        cooldown.SetSwipeColor(0, 0, 0, 0.7);
        cooldown.GetCountdownFontString().SetFont("Fonts\\FRIZQT__.TTF", 13, "OUTLINE");
        tree.bindings.push(props.cooldown.BindCooldown(cooldown));
    }
    if (props.binding !== undefined && props.showHotkey !== false) {
        const overlay = CreateFrame("Frame", undefined, item.frame);
        tree.frames.push(overlay);
        overlay.EnableMouse(false);
        overlay.SetAllPoints(item.frame);
        overlay.SetFrameLevel(item.frame.GetFrameLevel() + 3);
        const hotkey = overlay.CreateFontString(undefined, "OVERLAY");
        hotkey.SetAllPoints(overlay);
        hotkey.SetFont("Fonts\\FRIZQT__.TTF", 11, "OUTLINE");
        hotkey.SetJustifyH("RIGHT");
        hotkey.SetJustifyV("TOP");
        hotkey.SetTextColor(1, 1, 1, 1);
        hotkey.SetText(props.binding);
    }
}
