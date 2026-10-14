import type { CellProps } from "../Cell";
import type { FlowLayoutProps } from "../FlowLayout";
import type { GridLayoutProps } from "../GridLayout";
import type { ProgressBarProps } from "../ProgressBar";
import type { ProgressSource } from "../../datasources/ProgressSource";
import type { TimerSource } from "../../datasources/TimerSource";
import type { LabelProps } from "../Label";
import type { IconProps } from "../Icon";

/** Declarative UI description; native frames are created by mount. */
export interface Element {
    kind: string;
    props: object;
    child?: Element;
    children?: Element[];
    source?: ProgressSource | TimerSource;
}

export type Component<P extends object> = (props: P, child?: Element) => Element;

export namespace UI {
    export function Fragment(): Element {
        return { kind: "empty", props: {} };
    }
    export function createElement<P extends object>(
        component: Component<P> | "cell" | "flow" | "grid" | "progress" | "label" | "icon",
        props: P | undefined,
        ...children: (Element | Element[])[]
    ): Element {
        const elements: Element[] = [];
        for (const child of children) {
            if (Array.isArray(child)) {
                for (const element of child) elements.push(element);
            } else {
                elements.push(child);
            }
        }
        const properties = props ?? ({} as P);
        if (typeof component === "string") {
            const input = properties as unknown as Partial<FlowLayoutProps & GridLayoutProps & ProgressBarProps>;
            const resolved = {
                ...properties,
                width: input.width ?? (input.sizing === "content" ? 0 : "inherit"),
                height: input.height ?? (input.sizing === "content" ? 0 : "inherit"),
                mode: input.mode ?? "relative",
                ...(input.mode === "absolute"
                    ? { x: input.x ?? 0, y: input.y ?? 0 }
                    : { offset: input.offset ?? { x: 0, y: 0 } }),
                ...(component === "flow" ? { direction: input.direction ?? "vertical" } : {}),
                ...(component === "grid" ? { columns: input.columns ?? 1 } : {}),
            };
            if (component === "flow" || component === "grid") {
                return { kind: component, props: resolved, children: elements };
            }
            if (elements.length > 1) throw "Cell accepts at most one child; use FlowLayout for multiple children";
            return {
                kind: component, props: resolved, child: elements[0],
                source: (properties as unknown as { source?: ProgressSource | TimerSource }).source,
            };
        }
        const componentProps = children.length === 0 ? properties
            : { ...properties, child: elements.length === 1 ? elements[0] : elements };
        if (component === Fragment && elements.length !== 0) throw "Only empty fragments are supported for now";
        return component(componentProps, elements[0]);
    }

    // Keep JSX types beside the factory so TSX files only need one import.
    export namespace JSX {
        export type Element = import("./jsx").Element;
        export interface ElementChildrenAttribute { child: {}; }
        export interface IntrinsicElements {
            cell: Partial<CellProps> & { child?: Element };
            flow: Partial<FlowLayoutProps> & { child?: Element | Element[] };
            grid: Partial<GridLayoutProps> & { child?: Element | Element[] };
            progress: Partial<ProgressBarProps> & { child?: Element };
            label: Partial<LabelProps>;
            icon: Partial<IconProps>;
        }
    }
}
