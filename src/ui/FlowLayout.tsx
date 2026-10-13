import type { LayoutProps, ILayout } from "./Layout";
import type { Element } from "./primitives/jsx";
import { UI } from "./primitives/jsx";

export interface FlowOptions {
    direction: "horizontal" | "vertical";
    /** Wrap to another row (horizontal) or column (vertical) when full. */
    grow?: boolean;
    /** Space between rows/columns; defaults to gap. */
    lineGap?: number;
}

export type FlowLayoutProps = LayoutProps & FlowOptions;

export interface IFlowLayout extends ILayout {
    kind: "flow";
    props: FlowLayoutProps;
    children: Element[];
}

export function FlowLayout(props: Partial<FlowLayoutProps> & { child?: Element | Element[] }): Element {
    return UI.createElement("flow", props, props.child ?? []);
}
