import type { Cell, CellProps } from "./ui/Cell";
import type { Anchor } from "./types/Position";
import type { MountedTree } from "./rendering/types";
import { prepareLayout, createFrames, resolveAnchors, applyPosition } from "./rendering/layout";
import { bindVisibility } from "./rendering/visibility";
import { renderWidget } from "./rendering/widgets";
import { renderDecorations } from "./rendering/decorations";
import { startUpdates } from "./rendering/updates";
import { registerCommand } from "./platform/SlashCommands";
import type { CommandCallback } from "./platform/SlashCommands";

/** Owns one application's native UI trees, bindings and cleanup. */
export class WuiraApp {
    private readonly mountedFrames = new Map<CellProps, wuiraNativeFrame>();
    private readonly mountedTrees = new Map<wuiraNativeFrame, MountedTree>();

    public registerCommand(command: string, callback: CommandCallback): () => void {
        return registerCommand(command, callback);
    }

    public Mount(component: Cell | void | (() => Cell | void), anchor?: Anchor, parent: wuiraNativeFrame = UIParent): wuiraNativeFrame | undefined {
        const view = typeof component === "function" ? component() : component;
        if (view === undefined || view.kind === "empty") return undefined;
        const { measured, protectedTree } = prepareLayout(view, parent, this.mountedFrames);
        const { root, pending, frames } = createFrames(measured, parent, this.mountedFrames);
        const tree: MountedTree = { frames: pending.map(item => item.frame), cells: pending.map(item => item.cell),
            decorations: [], bindings: [], protected: protectedTree, pendingUnmount: false, visibility: [] };
        this.mountedTrees.set(root, tree);
        try {
            const anchors = resolveAnchors(pending, frames);
            const updates: (() => void)[] = [];
            this.Protect(root, tree);
            for (const item of pending) {
                const visibility = bindVisibility(item, tree, updates, () => this.Protect(root, tree));
                applyPosition(item, anchors, root, anchor);
                renderWidget(item, tree, updates, visibility.onActiveChange);
                renderDecorations(item, tree);
                this.mountedFrames.set(item.cell.props, item.frame);
                visibility.refresh();
                const cleanup = item.cell.props.onMount?.(item.frame);
                if (cleanup !== undefined) tree.bindings.push(cleanup);
                if (visibility.dynamic) updates.push(visibility.refresh);
            }
            startUpdates(parent, tree, updates);
        } catch (failure) { this.Unmount(root); throw failure; }
        return root;
    }

    public Unmount(frame: wuiraNativeFrame): void {
        const tree = this.mountedTrees.get(frame);
        if (tree === undefined) return;
        if (this.Protect(frame, tree) && InCombatLockdown()) { tree.pendingUnmount = true; return; }
        for (const dispose of tree.bindings) dispose();
        for (const decoration of tree.decorations) decoration.dispose();
        for (const child of tree.frames) {
            child.UnregisterAllEvents();
            child.SetScript("OnEvent", undefined);
            child.SetScript("OnUpdate", undefined);
            child.Hide();
        }
        for (const cell of tree.cells) this.mountedFrames.delete(cell.props);
        this.mountedTrees.delete(frame);
    }

    private Protect(root: wuiraNativeFrame, tree: MountedTree): boolean {
        if (!tree.protected && root.IsProtected?.() !== true) return false;
        tree.protected = true;
        if (tree.listener === undefined) {
            const listener = CreateFrame("Frame", undefined, UIParent);
            tree.listener = listener;
            tree.frames.push(listener);
            listener.RegisterEvent("PLAYER_REGEN_ENABLED");
            listener.SetScript("OnEvent", () => {
                if (tree.pendingUnmount) this.Unmount(root);
                else for (const refresh of tree.visibility) refresh();
            });
        }
        return true;
    }
}
