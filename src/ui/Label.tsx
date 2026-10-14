import type { CellProps } from "./Cell";
import type { Color } from "../types/Color";
import { UI } from "./primitives/jsx";
export type LabelProps = CellProps & {
    text: string | (() => string);
    font?: string;
    fontSize?: number;
    color?: Color;
    align?: "LEFT" | "CENTER" | "RIGHT";
};
export function Label(props: Partial<CellProps> & Omit<LabelProps, keyof CellProps>) {
    return UI.createElement("label", props);
}
