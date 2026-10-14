import type { FlowLayoutProps } from "../FlowLayout";

/** Pure layout calculation in top-left UI coordinates. */
export function calculateFlow(props: FlowLayoutProps & {width: number; height: number}, children: readonly {width: number; height: number}[]): { x: number; y: number }[] {
    const horizontal = props.direction === "horizontal";
    const requestedLimit = horizontal ? props.width : props.height;
    const limit = props.sizing === "content" && requestedLimit === 0 ? Infinity : requestedLimit;
    const gap = props.gap ?? 0;
    const lineGap = props.lineGap ?? gap;
    if (gap < 0 || lineGap < 0) error("FlowLayout gaps must be non-negative");
    const result: { x: number; y: number }[] = [];
    let cursor = 0;
    let cross = 0;
    let lineSize = 0;
    let count = 0;
    let lineStart = 0;
    const alignLine = () => {
        const free = Number.isFinite(limit) ? Math.max(0, limit - cursor) : 0;
        const offset = props.justify === "center" ? free / 2 : props.justify === "end" ? free : 0;
        for (let index = lineStart; index < result.length; index += 1) {
            if (horizontal) result[index].x += offset;
            else result[index].y += offset;
        }
        lineStart = result.length;
    };
    for (const child of children) {
        const size = horizontal ? child.width : child.height;
        const crossSize = horizontal ? child.height : child.width;
        const next = count === 0 ? 0 : cursor + gap;
        if (props.grow && count > 0 && next + size > limit) {
            alignLine();
            cross += lineSize + lineGap;
            cursor = 0;
            lineSize = 0;
            count = 0;
        }
        const position = count === 0 ? 0 : cursor + gap;
        result.push(horizontal ? { x: position, y: cross } : { x: cross, y: position });
        cursor = position + size;
        lineSize = Math.max(lineSize, crossSize);
        count += 1;
    }
    alignLine();
    return result;
}
