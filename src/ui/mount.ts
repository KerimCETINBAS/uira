import type { CellProps, ICell } from "./Cell";
import type { Element } from "./primitives/jsx";
import type { Decoration } from "./decorations/Decoration";
import { measureLayout, MeasuredCell } from "./layout/measureLayout";
import type { IProgressBar } from "./ProgressBar";
import type { Anchor } from "../types/Position";
import { Background } from "./decorations/Background";
import { Border } from "./decorations/Border";
import { resolveStatusBarTexture } from "./decorations/statusBarTextures";
import type { LabelProps } from "./Label";
import type { IconProps } from "./Icon";
import { HP } from "../datasources/Resources";
import type { TextureOptions } from "../types/Texture";

const mountedFrames = new Map<CellProps, wuiraNativeFrame>();
const mountedTrees = new Map<wuiraNativeFrame, { frames: wuiraNativeFrame[]; cells: ICell[]; decorations: Decoration[]; bindings: (() => void)[] }>();

export function unmount(frame: wuiraNativeFrame): void {
    const tree = mountedTrees.get(frame);
    if (tree === undefined) return;
    for (const dispose of tree.bindings) dispose();
    for (const decoration of tree.decorations) decoration.dispose();
    for (const child of tree.frames) {
        child.UnregisterAllEvents();
        child.SetScript("OnEvent", undefined);
        child.SetScript("OnUpdate", undefined);
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
    const tree = { frames: pending.map(item => item.frame), cells: pending.map(item => item.cell), decorations: [] as Decoration[], bindings: [] as (() => void)[] };
    mountedTrees.set(root, tree);
    try {
        const updates: (() => void)[] = [];
        for (const item of pending) {
            let sourceActive = true;
            let lastVisible: boolean | undefined;
            const visible = item.cell.props.visible;
            const refreshVisibility = () => {
                const value = sourceActive && (visible?.() ?? true);
                if (value === lastVisible) return;
                lastVisible = value;
                if (value) item.frame.Show(); else item.frame.Hide();
            };
            const onActiveChange = (active: boolean) => { sourceActive = active; refreshVisibility(); };
            const position = item.cell.props;
            const target = anchors.get(item.frame)!;
            const x = item.placement?.x ?? (position.mode === "absolute" ? position.x : position.offset.x);
            const y = item.placement?.y ?? (position.mode === "absolute" ? position.y : position.offset.y);
            const overrideAnchor = item.frame === root ? rootAnchor : undefined;
            const anchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.anchor ?? "TOPLEFT");
            const relativeAnchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.relativeAnchor ?? anchor);
            item.frame.SetPoint(anchor, target, relativeAnchor, x + item.margin.left, -(y + item.margin.top));
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
                    let healPredictionBar: wuiraNativeStatusBar | undefined;
                    let absorbPredictionBar: wuiraNativeStatusBar | undefined;
                    if (source instanceof HP) {
                        const overlay = (style: TextureOptions, heal: boolean): wuiraNativeStatusBar => {
                            bar.SetClipsChildren(true);
                            const layer = CreateFrame("StatusBar", undefined, bar);
                            tree.frames.push(layer);
                            layer.EnableMouse(false);
                            layer.SetFrameLevel(bar.GetFrameLevel());
                            layer.SetSize(item.width, item.height);
                            layer.SetStatusBarTexture(resolveStatusBarTexture(style.texture ?? "solid"));
                            const tint = style.color!;
                            layer.SetStatusBarColor(tint.r, tint.g, tint.b, tint.a ?? 0.5);
                            const texture = layer.GetStatusBarTexture();
                            texture.SetBlendMode(style.blendMode ?? "BLEND");
                            texture.SetHorizTile(style.tileX ?? false);
                            texture.SetVertTile(style.tileY ?? false);
                            const uv = style.texCoords ?? [0, 1, 0, 1];
                            texture.SetTexCoord(uv[0], uv[1], uv[2], uv[3]);
                            const vertical = props.orientation === "vertical";
                            const reverse = props.reverse ?? false;
                            layer.SetOrientation(vertical ? "VERTICAL" : "HORIZONTAL");
                            layer.SetReverseFill(heal ? reverse : !reverse);
                            if (heal) {
                                const point = vertical ? (reverse ? "TOPLEFT" : "BOTTOMLEFT") : (reverse ? "TOPRIGHT" : "TOPLEFT");
                                const relative = vertical ? (reverse ? "BOTTOMLEFT" : "TOPLEFT") : (reverse ? "TOPLEFT" : "TOPRIGHT");
                                layer.SetPoint(point, bar.GetStatusBarTexture(), relative, 0, 0);
                            } else {
                                // Shields overlay from the far edge, including at full health.
                                layer.SetAllPoints(bar);
                            }
                            return layer;
                        };
                        if (source.HealPrediction?.IsAvailable === true && props.healPrediction !== false) {
                            healPredictionBar = overlay({ ...props.healPrediction,
                                color: props.healPrediction?.color ?? { r: 0.4, g: 1, b: 0.5, a: 0.5 } }, true);
                        }
                        if (source.AbsorbPrediction?.IsAvailable === true && props.absorbPrediction !== false) {
                            absorbPredictionBar = overlay({ ...props.absorbPrediction,
                                color: props.absorbPrediction?.color ?? { r: 0.8, g: 0.9, b: 1, a: 0.55 } }, false);
                        }
                    }
                    const dispose = source.BindTo(bar, {
                        min: props.min, max: props.max, current: props.current ?? props.value,
                        onActiveChange, healPredictionBar, absorbPredictionBar,
                    });
                    if (dispose !== undefined) tree.bindings.push(dispose);
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
            refreshVisibility();
            if (visible !== undefined) {
                updates.push(refreshVisibility);
            }
        }
        if (updates.length > 0) {
            // An independent driver continues to run even when a root is hidden.
            const driver = CreateFrame("Frame", undefined, parent);
            tree.frames.push(driver);
            let elapsed = 0;
            driver.SetScript("OnUpdate", (_frame, delta) => {
                elapsed += delta;
                if (elapsed < 0.05) return;
                elapsed = 0;
                for (const update of updates) update();
            });
            for (const update of updates) update();
            driver.Show();
        }
    } catch (failure) {
        unmount(root);
        throw failure;
    }
    return root;
}
