import { wuira } from "../wuira";
import type { Cell } from "../ui/Cell";
import type { Anchor } from "../types/Position";

declare const _G: Record<string, unknown>;
declare function InCombatLockdown(this: void): boolean;

/** A presentation adapter around a game-owned frame, not a replacement widget. */
export abstract class NativeSkin {
    private renderer?: (this: void, bar: this) => this | void;
    private renderPending = false;
    private rendering = false;
    private listener?: wuiraNativeFrame;
    private disposed = false;
    private disposing = false;
    private hovered = false;
    private readonly views: wuiraNativeFrame[] = [];
    private readonly hoverListeners = new Set<(this: void, hovered: boolean) => void>();
    private readonly hooked = new Set<wuiraNativeFrame>();

    protected constructor(private readonly name: string) {}

    public get Frame(): wuiraNativeFrame | undefined { return _G[this.name] as wuiraNativeFrame | undefined; }

    /** Runs once the native frame exists. The callback receives this adapter, including mount(). */
    public render(renderer: (this: void, bar: this) => this | void): this {
        if (this.disposed || this.disposing) error("Skin is disposed");
        for (const view of this.views) wuira.Unmount(view);
        this.views.length = 0;
        this.renderer = renderer;
        this.renderPending = true;
        this.watch();
        return this;
    }

    public mount(view: Cell | (() => Cell | void) | void, anchor?: Anchor): wuiraNativeFrame | undefined {
        if (this.disposed || this.disposing) error("Skin is disposed");
        if (InCombatLockdown()) error("Skin: mount native children outside combat");
        const parent = this.Frame;
        if (parent === undefined) error("Skin: mount inside render() after the native frame is ready");
        const mounted = wuira.Mount(view, anchor, parent);
        if (mounted !== undefined) this.views.push(mounted);
        return mounted;
    }

    /** Observe pointer presence over the frame and its descendants without replacing native scripts. */
    public OnHover(callback: (this: void, hovered: boolean) => void): () => void {
        if (this.disposed || this.disposing) error("Skin is disposed");
        this.hoverListeners.add(callback);
        this.watch();
        return () => { this.hoverListeners.delete(callback); };
    }

    private watch(): void {
        if (this.listener === undefined) {
            this.listener = CreateFrame("Frame", undefined, UIParent);
            this.listener.RegisterEvent("ADDON_LOADED");
            this.listener.RegisterEvent("PLAYER_ENTERING_WORLD");
            this.listener.RegisterEvent("PLAYER_REGEN_ENABLED");
            this.listener.SetScript("OnEvent", () => this.apply());
        }
        this.apply();
    }

    private apply(): void {
        if (this.disposing) { if (!InCombatLockdown()) this.Dispose(); return; }
        if (this.disposed || this.rendering || InCombatLockdown()) return;
        const frame = this.Frame;
        if (frame === undefined) return;
        if (this.renderPending && this.renderer !== undefined) {
            this.renderPending = false;
            this.rendering = true;
            try { this.renderer(this); }
            finally { this.rendering = false; }
        }
        if (this.hoverListeners.size === 0) return;
        const notify = () => {
            if (this.disposed || this.hoverListeners.size === 0) return;
            const hovered = frame.IsMouseOver();
            if (hovered === this.hovered) return;
            this.hovered = hovered;
            for (const callback of this.hoverListeners) callback(hovered);
        };
        const visit = (target: wuiraNativeFrame) => {
            if (!this.hooked.has(target)) {
                this.hooked.add(target);
                target.HookScript("OnEnter", notify);
                target.HookScript("OnLeave", notify);
            }
            for (const child of [...target.GetChildren()]) visit(child);
        };
        visit(frame);
    }

    public Dispose(): void {
        if (this.disposed) return;
        if (InCombatLockdown()) { this.disposing = true; this.watch(); return; }
        this.disposed = true;
        this.hoverListeners.clear();
        this.listener?.UnregisterAllEvents();
        this.listener?.SetScript("OnEvent", undefined);
        for (const view of this.views) wuira.Unmount(view);
        this.views.length = 0;
    }
}
