import type { CellProps } from "./Cell";
import type { TextureSource } from "../datasources/TextureSource";
import { UI } from "./primitives/jsx";
export type IconProps = CellProps & {
    texture?: string | number;
    textureSource?: TextureSource;
    texCoords?: readonly [number, number, number, number];
};
export function Icon(props: Partial<IconProps>) { return UI.createElement("icon", props); }
