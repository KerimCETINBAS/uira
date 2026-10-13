import type { Color } from "../../types/Color";
import { Decoration } from "./Decoration";
import { borderTextures, BorderTexture } from "./borderTextures";

export interface BorderProps {
    thickness?: number;
    color: Color;
    texture?: BorderTexture;
    /** Rounded solid borders only. Native textures supply their own corner shape. */
    radius?: number;
}

export class Border extends Decoration {
    public constructor(public readonly props: BorderProps) { super(); }

    protected draw(frame: wuiraNativeFrame, width: number, height: number): void {
        const selected = this.props.texture ?? "solid";
        const style = typeof selected === "string" ? borderTextures[selected] : selected;
        const color = this.props.color;
        const thickness = this.props.thickness ?? style.edgeSize;
        if (thickness <= 0) return;
        if (style.path !== "") {
            if ((this.props.radius ?? 0) > 0) error("Native border textures define their own corners; radius requires solid");
            const border = this.backdrop(frame);
            border.SetBackdrop({ edgeFile: style.path, edgeSize: thickness });
            border.SetBackdropBorderColor(color.r, color.g, color.b, color.a ?? 1);
            return;
        }
        const t = Math.min(thickness, width / 2, height / 2);
        const radius = Math.min(Math.max(0, this.props.radius ?? 0), width / 2, height / 2);
        if (radius > 0) {
            this.rounded(frame, width, height, t, radius);
            return;
        }
        this.strip(frame, 0, 0, width, t);
        this.strip(frame, 0, height - t, width, t);
        this.strip(frame, 0, t, t, height - 2 * t);
        this.strip(frame, width - t, t, t, height - 2 * t);
    }

    /** Bounded scanline approximation, without masks or external image assets. */
    private rounded(frame: wuiraNativeFrame, width: number, height: number, t: number, radius: number): void {
        const extent = Math.max(radius, t);
        const rows = Math.min(32, Math.ceil(extent));
        const step = extent / rows;
        const innerRadius = Math.max(0, radius - t);
        for (let row = 0; row < rows; row += 1) {
            const y = (row + 0.5) * step;
            const distance = Math.max(0, radius - y);
            const outer = y < radius ? radius - Math.sqrt(Math.max(0, radius * radius - distance * distance)) : 0;
            const inner = y < t ? width / 2
                : y < radius ? t + innerRadius - Math.sqrt(Math.max(0, innerRadius * innerRadius - distance * distance)) : t;
            const span = Math.max(0, inner - outer);
            this.strip(frame, outer, row * step, span, step);
            this.strip(frame, width - inner, row * step, span, step);
            this.strip(frame, outer, height - (row + 1) * step, span, step);
            this.strip(frame, width - inner, height - (row + 1) * step, span, step);
        }
        this.strip(frame, 0, extent, t, height - 2 * extent);
        this.strip(frame, width - t, extent, t, height - 2 * extent);
    }

    private strip(frame: wuiraNativeFrame, x: number, y: number, width: number, height: number): void {
        if (width <= 0 || height <= 0) return;
        const texture = this.texture(frame, "OVERLAY");
        const color = this.props.color;
        texture.SetSize(width, height);
        texture.SetPoint("TOPLEFT", frame, "TOPLEFT", x, -y);
        texture.SetColorTexture(color.r, color.g, color.b, color.a ?? 1);
    }
}
