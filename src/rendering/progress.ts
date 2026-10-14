import type { IProgressBar } from "../ui/ProgressBar";
import type { TextureOptions } from "../types/Texture";
import { HP } from "../datasources/Resources";
import { resolveStatusBarTexture } from "../ui/decorations/statusBarTextures";
import type { MountedTree, RenderedCell } from "./types";

export function renderProgress(item: RenderedCell, tree: MountedTree, onActiveChange: (active: boolean) => void): void {
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
