import type { MountedTree, RenderedCell } from "./types";

export function bindVisibility(item: RenderedCell, tree: MountedTree, updates: (() => void)[], isProtected: () => boolean) {
    let sourceActive = true;
    let lastVisible: boolean | undefined;
    const visible = item.cell.props.visible;
    const condition = item.cell.props.condition;
    const refreshVisibility = () => {
        if (isProtected() && InCombatLockdown()) return;
        const allowed = sourceActive && (typeof condition === "function" ? condition() : condition ?? true);
        const value = !issecretvalue(allowed) && allowed && (visible?.() ?? true);
        if (value === lastVisible) return;
        lastVisible = value;
        if (value) item.frame.Show(); else item.frame.Hide();
    };
    tree.visibility.push(refreshVisibility);
    const onActiveChange = (active: boolean) => { sourceActive = active; refreshVisibility(); };
    const position = item.cell.props;
    if (position.alpha !== undefined) {
        const alpha = position.alpha;
        let previous: number | undefined;
        const refreshAlpha = () => {
            const value = typeof alpha === "function" ? alpha() : alpha;
            if (issecretvalue(value)) return;
            if (!Number.isFinite(value) || value < 0 || value > 1) error("Cell alpha must be between 0 and 1");
            if (value !== previous) item.frame.SetAlpha(value);
            previous = value;
        };
        refreshAlpha();
        if (typeof alpha === "function") updates.push(refreshAlpha);
    }
    return { refresh: refreshVisibility, onActiveChange, dynamic: visible !== undefined || typeof condition === "function" };
}
