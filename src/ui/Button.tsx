import type { Cell, CellProps } from "./Cell";
import type { Element } from "./primitives/jsx";
import { UI } from "./primitives/jsx";

export type ButtonProps = CellProps & { onClick?: () => void; clickThrough?: false };

/** A normal UI button for settings and editor controls. */
export function Button(props: Partial<ButtonProps> & { child?: Element }, child?: Element): Cell {
    return UI.createElement("button", props, props.child ?? child ?? []);
}
