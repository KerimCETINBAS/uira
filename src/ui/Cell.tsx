import type { Element } from "./primitives/jsx";
import { UI } from "./primitives/jsx";
import type { Decorations } from "./decorations/Decorations";
import type { Position } from "../types/Position";
import type { Spacing } from "../types/Spacing";

export type Size = number | "inherit";

/** Common visual descriptor accepted by the mounting API. */
export interface Cell extends Element {}

export type CellProps = {
    width: Size;
    height: Size;
    margin?: Spacing;
    padding?: Spacing;
    /** Defaults to true: visual cells do not intercept mouse input. */
    clickThrough?: boolean;
    decorations?: Decorations;
    /** Visibility does not remove the cell's reserved layout slot. */
    visible?: () => boolean;
} & Position<ICell>;

export interface ICell extends Element {
    kind: "cell" | "flow" | "grid" | "progress" | "label" | "icon";
    props: CellProps;
}

export function Cell(props: Partial<CellProps> & { child?: Element }, child?: Element): Cell {
    return UI.createElement("cell", props, props.child ?? child ?? []);
}
