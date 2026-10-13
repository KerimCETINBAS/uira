import type { GridLayoutProps } from "../GridLayout";

/** Row-major placement into uniform slots; children keep their own sizes. */
export function calculateGrid(props: GridLayoutProps, children: readonly {width: number; height: number}[]): { x: number; y: number }[] {
    if (!Number.isFinite(props.columns) || props.columns < 1 || Math.floor(props.columns) !== props.columns) {
        error("GridLayout columns must be a positive integer");
    }
    const rowGap = props.rowGap ?? props.gap ?? 0;
    const columnGap = props.columnGap ?? props.gap ?? 0;
    if (rowGap < 0 || columnGap < 0) error("GridLayout gaps must be non-negative");
    let width = props.cellWidth ?? 0;
    let height = props.cellHeight ?? 0;
    for (const child of children) {
        if (props.cellWidth === undefined) width = Math.max(width, child.width);
        if (props.cellHeight === undefined) height = Math.max(height, child.height);
    }
    if (width < 0 || height < 0) error("GridLayout cell sizes must be non-negative");
    return children.map((_, index) => ({
        x: (index % props.columns) * (width + columnGap),
        y: Math.floor(index / props.columns) * (height + rowGap),
    }));
}
