import type { ICell, CellProps } from "./Cell";
import type { Element } from "./primitives/jsx";

export type LayoutProps = CellProps & { sizing?: "fixed" | "content"; gap?: number };

export interface ILayout extends ICell {
    props: LayoutProps;
    children: Element[];
}
