import type { Cell } from "./ui/Cell";
import type { Anchor } from "./types/Position";
import { mount, unmount } from "./ui/mount";
import { registerCommand } from "./platform/SlashCommands";
import type { CommandCallback } from "./platform/SlashCommands";

/** Public entry point for mounting JSX UI trees. */
export class wuira {
    private constructor() {}

    /** Registers a slash command; the returned function removes this registration. */
    public static registerCommand(command: string, callback: CommandCallback): () => void {
        return registerCommand(command, callback);
    }

    public static Mount(frame: Cell | void | (() => Cell | void), anchor?: Anchor, parent?: wuiraNativeFrame): wuiraNativeFrame | undefined {
        const view = typeof frame === "function" ? frame() : frame;
        if (view === undefined || view.kind === "empty") return undefined;
        return mount(view, parent, anchor);
    }

    public static Unmount(frame: wuiraNativeFrame): void {
        unmount(frame);
    }
}
