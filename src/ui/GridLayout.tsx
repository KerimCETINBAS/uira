import type { LayoutProps, ILayout } from "./Layout";
import type { Element } from "./primitives/jsx";
import { UI } from "./primitives/jsx";

export interface GridOptions {
    columns: number;
    rowGap?: number;
    columnGap?: number;
    /** Defaults to the maximum child width/height. Does not resize children. */
    cellWidth?: number;
    cellHeight?: number;
}

export type GridLayoutProps = LayoutProps & GridOptions;

export interface IGridLayout extends ILayout {
    kind: "grid";
    props: GridLayoutProps;
    children: Element[];
}

export function GridLayout(props: Partial<GridLayoutProps> & { child?: Element | Element[] }): Element {
    return UI.createElement("grid", props, props.child ?? []);
}
