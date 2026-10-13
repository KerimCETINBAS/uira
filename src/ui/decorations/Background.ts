import type { TextureOptions } from "../../types/Texture";
import { Decoration } from "./Decoration";
import { backgroundTextures } from "./backgroundTextures";
import type { BackgroundTexture } from "./backgroundTextures";

export interface BackgroundProps extends TextureOptions<BackgroundTexture> {}

export class Background extends Decoration {
    public constructor(public readonly props: BackgroundProps) { super(); }

    protected draw(frame: wuiraNativeFrame): void {
        const texture = this.texture(frame, "BACKGROUND");
        const color = this.props.color ?? { r: 1, g: 1, b: 1 };
        texture.SetAllPoints(frame);
        if (this.props.texture !== undefined) {
            const selected = this.props.texture;
            const path = typeof selected === "string" ? backgroundTextures[selected].path : selected.path;
            texture.SetTexture(path);
            texture.SetVertexColor(color.r, color.g, color.b, color.a ?? 1);
        } else {
            texture.SetColorTexture(color.r, color.g, color.b, color.a ?? 1);
        }
        texture.SetHorizTile(this.props.tileX ?? false);
        texture.SetVertTile(this.props.tileY ?? false);
        texture.SetBlendMode(this.props.blendMode ?? "BLEND");
        const uv = this.props.texCoords ?? [0, 1, 0, 1];
        texture.SetTexCoord(uv[0], uv[1], uv[2], uv[3]);
    }
}
