import type { CellProps, ICell } from "./Cell";
import type { Color } from "../types/Color";
import type { ProgressSource } from "../datasources/ProgressSource";
import { UI, Element } from "./primitives/jsx";
import type { TextureOptions } from "../types/Texture";
import type { BackgroundProps } from "./decorations/Background";
import type { BorderProps } from "./decorations/Border";

export type ProgressBarProps = CellProps & {
    value?: number;
    current?: number;
    source?: ProgressSource;
    min?: number;
    max?: number;
    color?: Color;
    /** Fill settings; explicit fields take priority over color/texture aliases. */
    foreground?: TextureOptions;
    /** Full-size track behind the fill. false disables a decoration background. */
    background?: BackgroundProps | false;
    /** Backdrop edge texture; track/background is configured independently. */
    backdrop?: BorderProps | false;
    /** Native texture path. Defaults to a solid white texture, tinted with color. */
    texture?: string;
    orientation?: "horizontal" | "vertical";
    reverse?: boolean;
};

export interface IProgressBar extends ICell {
    kind: "progress";
    props: ProgressBarProps;
}

export function ProgressBar(props: Partial<ProgressBarProps> & { child?: Element }, child?: Element): Element {
    return UI.createElement("progress", props, props.child ?? child ?? []);
}
