import type { Cell } from "./ui/Cell";
import type { Anchor } from "./types/Position";
import { mount, unmount } from "./ui/mount";

/** Public entry point for mounting JSX UI trees. */
export class wuira {
    private constructor() {}

    public static Mount(frame: Cell | void | (() => Cell | void), anchor?: Anchor, parent?: wuiraNativeFrame): wuiraNativeFrame | undefined {
        const view = typeof frame === "function" ? frame() : frame;
        if (view === undefined || view.kind === "empty") return undefined;
        return mount(view, parent, anchor);
    }

    public static Unmount(frame: wuiraNativeFrame): void {
        unmount(frame);
    }
}
