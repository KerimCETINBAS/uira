/** A uniform spacing value or individually specified edges, in UI units. */
export type Spacing = number | { top?: number; right?: number; bottom?: number; left?: number };

export interface Insets { top: number; right: number; bottom: number; left: number; }

export function resolveSpacing(value: Spacing = 0): Insets {
    const result = typeof value === "number"
        ? { top: value, right: value, bottom: value, left: value }
        : { top: value.top ?? 0, right: value.right ?? 0, bottom: value.bottom ?? 0, left: value.left ?? 0 };
    for (const edge of [result.top, result.right, result.bottom, result.left]) {
        if (!Number.isFinite(edge) || edge < 0) error("Spacing must be finite and non-negative");
    }
    return result;
}
