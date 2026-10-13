/** Owns reusable native regions. One instance belongs to one mounted Cell. */
export abstract class Decoration {
    private active = false;
    private textures: wuiraNativeTexture[] = [];
    private frames: wuiraNativeFrame[] = [];
    private textureIndex = 0;
    private frameIndex = 0;

    public mount(frame: wuiraNativeFrame, width: number, height: number): void {
        if (this.active) error("Decoration is already mounted; create a separate instance per Cell");
        this.active = true;
        this.textureIndex = 0;
        this.frameIndex = 0;
        try {
            this.draw(frame, width, height);
        } catch (failure) {
            this.dispose();
            throw failure;
        }
    }

    public dispose(): void {
        for (const texture of this.textures) texture.Hide();
        for (const frame of this.frames) frame.Hide();
        this.active = false;
    }

    protected texture(parent: wuiraNativeFrame, layer: wuiraDrawLayer): wuiraNativeTexture {
        let texture = this.textures[this.textureIndex];
        if (texture === undefined) {
            texture = parent.CreateTexture(undefined, layer);
            this.textures.push(texture);
        } else {
            texture.SetParent(parent);
            texture.ClearAllPoints();
        }
        this.textureIndex += 1;
        texture.Show();
        return texture;
    }

    protected backdrop(parent: wuiraNativeFrame): wuiraNativeFrame {
        let frame = this.frames[this.frameIndex];
        if (frame === undefined) {
            frame = CreateFrame("Frame", undefined, parent, "BackdropTemplate");
            this.frames.push(frame);
        } else {
            frame.SetParent(parent);
            frame.ClearAllPoints();
        }
        this.frameIndex += 1;
        frame.EnableMouse(false);
        frame.SetAllPoints(parent);
        frame.Show();
        return frame;
    }

    protected abstract draw(frame: wuiraNativeFrame, width: number, height: number): void;
}
