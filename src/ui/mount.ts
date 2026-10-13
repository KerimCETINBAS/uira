import type { CellProps, ICell } from "./Cell";
import type { Element } from "./primitives/jsx";
import type { Decoration } from "./decorations/Decoration";
import { measureLayout, MeasuredCell } from "./layout/measureLayout";
import type { IProgressBar } from "./ProgressBar";
import type { Anchor } from "../types/Position";
import { Background } from "./decorations/Background";
import { Border } from "./decorations/Border";
import { resolveStatusBarTexture } from "./decorations/statusBarTextures";

const mountedFrames = new Map<CellProps, wuiraNativeFrame>();
const mountedTrees = new Map<wuiraNativeFrame, { frames: wuiraNativeFrame[]; cells: ICell[]; decorations: Decoration[] }>();

export function unmount(frame: wuiraNativeFrame): void {
    const tree = mountedTrees.get(frame);
    if (tree === undefined) return;
    for (const decoration of tree.decorations) decoration.dispose();
    for (const child of tree.frames) {
        child.UnregisterAllEvents();
        child.SetScript("OnEvent", undefined);
        child.Hide();
    }
    for (const cell of tree.cells) mountedFrames.delete(cell.props);
    mountedTrees.delete(frame);
}

/** Creates the tree before resolving anchors. Positive y moves down. */
export function mount(element: Element, parent: wuiraNativeFrame = UIParent, rootAnchor?: Anchor): wuiraNativeFrame {
    const frames = new Map<CellProps, wuiraNativeFrame>();
    const pending: { cell: ICell; width: number; height: number; margin: MeasuredCell["margin"]; frame: wuiraNativeFrame; parent: wuiraNativeFrame; placement?: { x: number; y: number } }[] = [];

    function create(measured: MeasuredCell, parent: wuiraNativeFrame, placement?: { x: number; y: number }): wuiraNativeFrame {
        const { cell, width, height } = measured;
        if (frames.has(cell.props) || mountedFrames.has(cell.props)) error("A Cell can only be mounted once at a time");
        const frame = cell.kind === "progress"
            ? CreateFrame("StatusBar", undefined, parent)
            : CreateFrame("Frame", undefined, parent);
        frame.Hide();
        frame.EnableMouse(!(cell.props.clickThrough ?? true));
        frames.set(cell.props, frame);
        pending.push({ cell, width, height, margin: measured.margin, frame, parent, placement });
        frame.SetSize(width, height);
        for (let index = 0; index < measured.children.length; index += 1) {
            create(measured.children[index], frame, measured.placements?.[index]);
        }
        return frame;
    }

    const rootProps = (element as ICell).props;
    const root = create(measureLayout(element, {
        width: rootProps.width === "inherit" ? parent.GetWidth() : undefined,
        height: rootProps.height === "inherit" ? parent.GetHeight() : undefined,
    }), parent);
    const anchors = new Map<wuiraNativeFrame, wuiraNativeFrame>();
    for (const item of pending) {
        const position = item.cell.props;
        if (item.placement !== undefined) {
            anchors.set(item.frame, item.parent);
        } else if (position.mode === "absolute") {
            anchors.set(item.frame, UIParent);
        } else {
            const target = position.relativeTo === undefined
                ? item.parent
                : frames.get(position.relativeTo.props);
            if (target === undefined) error("relativeTo must reference a Cell in the same mounted tree");
            if (target === item.frame) error("A Cell cannot anchor to itself");
            anchors.set(item.frame, target);
        }
    }
    // Reject indirect anchor cycles before asking the client to apply them.
    for (const item of pending) {
        let target = anchors.get(item.frame);
        while (target !== undefined) {
            if (target === item.frame) error("Cell positioning contains an anchor cycle");
            target = anchors.get(target);
        }
    }
    const tree = { frames: pending.map(item => item.frame), cells: pending.map(item => item.cell), decorations: [] as Decoration[] };
    mountedTrees.set(root, tree);
    try {
        for (const item of pending) {
            const position = item.cell.props;
            const target = anchors.get(item.frame)!;
            const x = item.placement?.x ?? (position.mode === "absolute" ? position.x : position.offset.x);
            const y = item.placement?.y ?? (position.mode === "absolute" ? position.y : position.offset.y);
            const overrideAnchor = item.frame === root ? rootAnchor : undefined;
            const anchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.anchor ?? "TOPLEFT");
            const relativeAnchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.relativeAnchor ?? anchor);
            item.frame.SetPoint(anchor, target, relativeAnchor, x + item.margin.left, -(y + item.margin.top));
            if (item.cell.kind === "progress") {
                const props = (item.cell as IProgressBar).props;
                const bar = item.frame as wuiraNativeStatusBar;
                const color = props.foreground?.color ?? props.color;
                bar.SetStatusBarTexture(resolveStatusBarTexture(props.foreground?.texture ?? props.texture ?? "solid"));
                bar.SetStatusBarColor(color?.r ?? 1, color?.g ?? 1, color?.b ?? 1, color?.a ?? 1);
                if (props.foreground !== undefined) {
                    const fill = bar.GetStatusBarTexture();
                    fill.SetHorizTile(props.foreground.tileX ?? false);
                    fill.SetVertTile(props.foreground.tileY ?? false);
                    fill.SetBlendMode(props.foreground.blendMode ?? "BLEND");
                    const uv = props.foreground.texCoords ?? [0, 1, 0, 1];
                    fill.SetTexCoord(uv[0], uv[1], uv[2], uv[3]);
                }
                bar.SetOrientation(props.orientation === "vertical" ? "VERTICAL" : "HORIZONTAL");
                bar.SetReverseFill(props.reverse ?? false);
                bar.SetMinMaxValues(props.min ?? 0, props.max ?? 100);
                const source = item.cell.source ?? props.source;
                if (source !== undefined) {
                    source.BindTo(bar, {
                        min: props.min, max: props.max, current: props.current ?? props.value,
                    });
                } else {
                    bar.SetValue(props.current ?? props.value ?? 0);
                }
            }
            const decorations = item.cell.props.decorations;
            // Explicit slots: Lua arrays with nil entries cannot be iterated safely.
            function attach(decoration: Decoration | undefined): void {
                if (decoration !== undefined) {
                    decoration.mount(item.frame, item.width, item.height);
                    tree.decorations.push(decoration);
                }
            }
            const progress = item.cell.kind === "progress" ? (item.cell as IProgressBar).props : undefined;
            attach(progress?.background === false ? undefined
                : progress?.background !== undefined ? new Background(progress.background) : decorations?.background);
            attach(progress?.backdrop === false ? undefined
                : progress?.backdrop !== undefined ? new Border(progress.backdrop) : decorations?.border);
            attach(decorations?.glow);
            mountedFrames.set(item.cell.props, item.frame);
            item.frame.Show();
        }
    } catch (failure) {
        unmount(root);
        throw failure;
    }
    return root;
}
