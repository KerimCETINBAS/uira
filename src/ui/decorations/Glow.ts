import type { Color } from "../../types/Color";
import { Decoration } from "./Decoration";

export interface GlowProps {
    /** A glow sprite with transparent center; not an arbitrary filled image. */
    texture: string;
    color: Color;
    spread?: number;
}

/** Static additive glow; no per-frame update or animation. */
export class Glow extends Decoration {
    public constructor(public readonly props: GlowProps) { super(); }

    protected draw(frame: wuiraNativeFrame, width: number, height: number): void {
        const texture = this.texture(frame, "OVERLAY");
        const spread = Math.max(0, this.props.spread ?? 8);
        const color = this.props.color;
        texture.SetPoint("TOPLEFT", frame, "TOPLEFT", -spread, spread);
        texture.SetSize(width + 2 * spread, height + 2 * spread);
        texture.SetTexture(this.props.texture);
        texture.SetVertexColor(color.r, color.g, color.b, color.a ?? 1);
        texture.SetBlendMode("ADD");
    }
}
