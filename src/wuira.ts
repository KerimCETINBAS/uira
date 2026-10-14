import type { Cell } from "./ui/Cell";
import type { Anchor } from "./types/Position";
import { WuiraApp } from "./WuiraApp";
import type { CommandCallback } from "./platform/SlashCommands";

/** Static access to the current addon's application. Each addon owns its module instance. */
export class Wuira {
    private constructor() {}
    private static readonly application = new WuiraApp();

    public static get App(): WuiraApp { return Wuira.application; }

    public static registerCommand(command: string, callback: CommandCallback): () => void {
        return Wuira.App.registerCommand(command, callback);
    }

    public static Mount(component: Cell | void | (() => Cell | void), anchor?: Anchor, parent?: wuiraNativeFrame): wuiraNativeFrame | undefined {
        return Wuira.App.Mount(component, anchor, parent);
    }

    public static Unmount(frame: wuiraNativeFrame): void { Wuira.App.Unmount(frame); }
}

/** Compatibility alias for existing addons. */
export { Wuira as wuira };
