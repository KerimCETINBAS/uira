import type { ICell, Size } from "../Cell";
import type { IFlowLayout } from "../FlowLayout";
import type { IGridLayout } from "../GridLayout";
import type { Element } from "../primitives/jsx";
import { resolveSpacing, Insets } from "../../types/Spacing";
import { calculateFlow } from "./calculateFlow";
import { calculateGrid } from "./calculateGrid";

export interface MeasuredCell {
    cell: ICell;
    width: number;
    height: number;
    margin: Insets;
    children: MeasuredCell[];
    placements?: ({ x: number; y: number } | undefined)[];
}

function resolveSize(value: Size, available: number | undefined, margin: number): number {
    if (value === "inherit") {
        if (available === undefined) error("Cannot inherit a size from an unconstrained content-sized parent");
        return Math.max(0, available - margin);
    }
    if (!Number.isFinite(value) || value < 0) error("Cell sizes must be finite and non-negative");
    return value;
}

/** Resolve available space top-down and content bounds bottom-up. */
export function measureLayout(
    element: Element,
    available: { width?: number; height?: number } = {},
    ancestors: Element[] = [],
): MeasuredCell {
    if (ancestors.includes(element)) error("Layout children contain a cycle");
    if (!["cell", "flow", "grid", "progress", "label", "icon"].includes(element.kind)) {
        error(`Unsupported UI element: ${element.kind}`);
    }
    const cell = element as ICell;
    const props = cell.props;
    const margin = resolveSpacing(props.margin);
    const padding = resolveSpacing(props.padding);
    let width = resolveSize(props.width, available.width, margin.left + margin.right);
    let height = resolveSize(props.height, available.height, margin.top + margin.bottom);
    const isLayout = element.kind === "flow" || element.kind === "grid";
    const layout = isLayout ? element as IFlowLayout | IGridLayout : undefined;
    const contentSizing = layout?.props.sizing === "content";
    const contentWidth = contentSizing && props.width === 0 ? undefined : Math.max(0, width - padding.left - padding.right);
    const contentHeight = contentSizing && props.height === 0 ? undefined : Math.max(0, height - padding.top - padding.bottom);
    const sourceChildren = layout !== undefined ? layout.children : cell.child === undefined ? [] : [cell.child];
    let childWidth = contentWidth;
    let childHeight = contentHeight;
    if (layout?.kind === "grid") {
        const grid = layout.props;
        if (!Number.isFinite(grid.columns) || grid.columns < 1 || Math.floor(grid.columns) !== grid.columns) error("GridLayout columns must be a positive integer");
        const rows = Math.max(1, Math.ceil(sourceChildren.length / grid.columns));
        childWidth = grid.cellWidth ?? (contentWidth === undefined ? undefined : Math.max(0,
            (contentWidth - (grid.columnGap ?? grid.gap ?? 0) * (grid.columns - 1)) / grid.columns));
        childHeight = grid.cellHeight ?? (contentHeight === undefined ? undefined : Math.max(0,
            (contentHeight - (grid.rowGap ?? grid.gap ?? 0) * (rows - 1)) / rows));
    }
    const path = [...ancestors, element];
    const children = sourceChildren.map(child => measureLayout(child, { width: childWidth, height: childHeight }, path));
    let placements: MeasuredCell["placements"];
    if (layout !== undefined) {
        const sizes = children.map(child => ({
            width: child.width + child.margin.left + child.margin.right,
            height: child.height + child.margin.top + child.margin.bottom,
        }));
        const positions = layout.kind === "flow"
            ? calculateFlow({ ...layout.props, width: contentWidth ?? 0, height: contentHeight ?? 0 }, sizes)
            : calculateGrid(layout.props, sizes);
        placements = positions.map(point => ({ x: point.x + padding.left, y: point.y + padding.top }));
        if (contentSizing) {
            width = padding.left + padding.right;
            height = padding.top + padding.bottom;
            for (let i = 0; i < children.length; i += 1) {
                width = Math.max(width, positions[i].x + sizes[i].width + padding.left + padding.right);
                height = Math.max(height, positions[i].y + sizes[i].height + padding.top + padding.bottom);
            }
        }
    } else if (children.length > 0) {
        const position = children[0].cell.props;
        if (position.mode === "relative" && position.relativeTo === undefined) {
            placements = [{ x: padding.left + position.offset.x, y: padding.top + position.offset.y }];
        }
    }
    return { cell, width, height, margin, children, placements };
}
