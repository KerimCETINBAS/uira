import type { ICell } from "../ui/Cell";
import type { SecureButtonProps } from "../ui/SecureButton";
import type { ButtonProps } from "../ui/Button";
import type { LabelProps } from "../ui/Label";
import type { IconProps } from "../ui/Icon";
import { createSecureButton } from "../platform/SecureButton";
import { renderSecureButton } from "./secureButton";
import { renderProgress } from "./progress";
import type { MountedTree, RenderedCell } from "./types";

export function createWidget(cell: ICell, parent: wuiraNativeFrame): wuiraNativeFrame {
    const frame = cell.kind === "progress"
        ? CreateFrame("StatusBar", undefined, parent)
        : cell.kind === "secureButton" ? createSecureButton(parent, cell.props as SecureButtonProps)
        : cell.kind === "button" ? CreateFrame("Button", undefined, parent)
        : CreateFrame("Frame", undefined, parent);
    frame.Hide();
    frame.EnableMouse(cell.kind === "secureButton" || cell.kind === "button" || !(cell.props.clickThrough ?? true));
    return frame;
}

export function renderWidget(item: RenderedCell, tree: MountedTree, updates: (() => void)[], onActiveChange: (active: boolean) => void): void {
    if (item.cell.kind === "secureButton") renderSecureButton(item, tree);
    if (item.cell.kind === "button") {
        const onClick = (item.cell.props as ButtonProps).onClick;
        item.frame.SetScript("OnClick", onClick === undefined ? undefined : () => onClick());
        tree.bindings.push(() => item.frame.SetScript("OnClick", undefined));
    }
    if (item.cell.kind === "label") {
        const props = item.cell.props as LabelProps;
        const label = item.frame.CreateFontString(undefined, "OVERLAY");
        label.SetAllPoints(item.frame);
        label.SetFont(props.font ?? "Fonts\\FRIZQT__.TTF", props.fontSize ?? 12, "OUTLINE");
        label.SetJustifyH(props.align ?? "LEFT");
        label.SetJustifyV("MIDDLE");
        const color = props.color;
        label.SetTextColor(color?.r ?? 1, color?.g ?? 1, color?.b ?? 1, color?.a ?? 1);
        const text = props.text;
        if (typeof text === "function") {
            let previous: string | undefined;
            updates.push(() => {
                const value = text();
                if (issecretvalue(value) || value !== previous) label.SetText(value);
                if (!issecretvalue(value)) previous = value;
            });
        } else label.SetText(text);
    }
    if (item.cell.kind === "icon") {
        const props = item.cell.props as IconProps;
        const texture = item.frame.CreateTexture(undefined, "OVERLAY");
        texture.SetAllPoints(item.frame);
        const uv = props.texCoords ?? [0, 1, 0, 1];
        texture.SetTexCoord(uv[0], uv[1], uv[2], uv[3]);
        texture.SetTexture(props.texture);
        props.textureSource?.BindTo(item.frame, texture, onActiveChange);
    }
    if (item.cell.kind === "progress") renderProgress(item, tree, onActiveChange);
}
