import type { Decoration } from "../ui/decorations/Decoration";
import { Background } from "../ui/decorations/Background";
import { Border } from "../ui/decorations/Border";
import type { IProgressBar } from "../ui/ProgressBar";
import type { MountedTree, RenderedCell } from "./types";

export function renderDecorations(item: RenderedCell, tree: MountedTree): void {
    const decorations = item.cell.props.decorations;
    // Explicit slots: Lua arrays with nil entries cannot be iterated safely.
    function attach(decoration: Decoration | undefined): void {
        if (decoration !== undefined) {
            decoration.mount(item.frame, item.width, item.height);
            tree.decorations.push(decoration);
        }
    }
    const progress = item.cell.kind === "progress" ? (item.cell as IProgressBar).props : undefined;
    attach(progress?.background === false ? undefined
        : progress?.background !== undefined ? new Background(progress.background) : decorations?.background);
    attach(progress?.backdrop === false ? undefined
        : progress?.backdrop !== undefined ? new Border(progress.backdrop) : decorations?.border);
    attach(decorations?.glow);
    attach(decorations?.tooltip);
}
