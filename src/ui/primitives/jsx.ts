import type { CellProps } from "../Cell";
import type { FlowLayoutProps } from "../FlowLayout";
import type { GridLayoutProps } from "../GridLayout";
import type { ProgressBarProps } from "../ProgressBar";
import type { ProgressSource } from "../../datasources/ProgressSource";
import type { TimerSource } from "../../datasources/TimerSource";
import type { LabelProps } from "../Label";
import type { IconProps } from "../Icon";
import type { SecureButtonProps } from "../SecureButton";
import type { ButtonProps } from "../Button";

/** Declarative UI description; native frames are created by mount. */
export interface Element {
    kind: string;
    props: object;
    child?: Element;
    children?: Element[];
    source?: ProgressSource | TimerSource;
}

export type Component<P extends object> = (props: P, child?: Element) => Element;
export type Children = Element | readonly Children[];
type RenderChild = (item: never, index: number) => Element;

export namespace UI {
    export function Fragment(): Element {
        return { kind: "empty", props: {} };
    }
    export function createElement<P extends object>(
        component: Component<P> | "cell" | "flow" | "grid" | "progress" | "label" | "icon" | "button" | "secureButton",
        props: P | undefined,
        ...children: (Children | RenderChild)[]
    ): Element {
        const elements: (Element | RenderChild)[] = [];
        const groups = new Set<object>();
        const append = (child: Children | RenderChild) => {
            if (Array.isArray(child)) {
                if (groups.has(child)) error("UI children contain a cycle");
                groups.add(child);
                for (const nested of child) append(nested);
                groups.delete(child);
                return;
            }
            if (typeof child === "function") { elements.push(child); return; }
            const element = child as Element;
            if (element.kind === "empty") return;
            if (element.kind === "group") {
                if (groups.has(element)) error("UI groups contain a cycle");
                groups.add(element);
                for (const nested of element.children ?? []) append(nested);
                groups.delete(element);
            } else elements.push(element);
        };
        for (const child of children) append(child);
        const properties = props ?? ({} as P);
        if (typeof component === "string") {
            for (const child of elements) {
                if (typeof child === "function") error("Render functions must be children of a component such as ForEach");
            }
            const visualChildren = elements as Element[];
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
                return { kind: component, props: resolved, children: visualChildren };
            }
            if (elements.length > 1) throw "Cell accepts at most one child; use FlowLayout for multiple children";
            return {
                kind: component, props: resolved, child: visualChildren[0],
                source: (properties as unknown as { source?: ProgressSource | TimerSource }).source,
            };
        }
        const componentProps = children.length === 0 ? properties
            : { ...properties, child: elements.length === 1 ? elements[0] : elements };
        if (component === Fragment && elements.length !== 0) throw "Only empty fragments are supported for now";
        return component(componentProps, typeof elements[0] === "function" ? undefined : elements[0]);
    }

    // Keep JSX types beside the factory so TSX files only need one import.
    export namespace JSX {
        export type Element = import("./jsx").Element;
        export interface ElementChildrenAttribute { child: {}; }
        export interface IntrinsicElements {
            cell: Partial<CellProps> & { child?: Element };
            flow: Partial<FlowLayoutProps> & { child?: Children };
            grid: Partial<GridLayoutProps> & { child?: Children };
            progress: Partial<ProgressBarProps> & { child?: Element };
            label: Partial<LabelProps>;
            icon: Partial<IconProps>;
            secureButton: Partial<SecureButtonProps> & { child?: Element };
            button: Partial<ButtonProps> & { child?: Element };
        }
    }
}
