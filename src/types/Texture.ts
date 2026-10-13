import type { Color } from "./Color";

export type BlendMode = "BLEND" | "ADD" | "MOD" | "ALPHAKEY" | "DISABLE";

export interface TextureOptions<TTexture = string> {
    texture?: TTexture;
    color?: Color;
    tileX?: boolean;
    tileY?: boolean;
    /** left, right, top, bottom UV coordinates. */
    texCoords?: readonly [number, number, number, number];
    blendMode?: BlendMode;
}
