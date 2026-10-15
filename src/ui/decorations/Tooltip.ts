import type { Color } from "../../types/Color";
import { Decoration } from "./Decoration";

export type TooltipAnchor = "ANCHOR_RIGHT" | "ANCHOR_LEFT" | "ANCHOR_TOP" | "ANCHOR_BOTTOM" | "ANCHOR_CURSOR" | "ANCHOR_NONE";
/** Native GameTooltip surface passed to callbacks; no custom tooltip renderer. */
export interface NativeTooltip {
    SetOwner(owner: wuiraNativeFrame, anchor: TooltipAnchor): void;
    IsOwned(owner: wuiraNativeFrame): boolean;
    ClearLines(): void;
    SetText(text: string, r?: number, g?: number, b?: number, alpha?: number, wrap?: boolean): void;
    AddLine(text: string, r?: number, g?: number, b?: number, wrap?: boolean): void;
    SetSpellByID(id: number): void;
    SetItemByID(id: number): void;
    SetUnit(unit: string): void;
    SetHyperlink(link: string): void;
    SetAction(slot: number): void;
    Show(): void;
    Hide(): void;
}
declare const GameTooltip: NativeTooltip | undefined;

export interface TooltipLine { text: string; color?: Color; wrap?: boolean; }
interface TooltipOptions {
    anchor?: TooltipAnchor;
    /** Defaults to the game's shared GameTooltip; resolved on hover. */
    target?: NativeTooltip | (() => NativeTooltip | undefined);
    lines?: readonly TooltipLine[];
}
export type TooltipProps = TooltipOptions & (
    | { text: string | (() => string | undefined); color?: Color; wrap?: boolean; show?: never }
    | { show: (tooltip: NativeTooltip, owner: wuiraNativeFrame) => void | false; text?: never }
);
interface TooltipBinding {
    frame: wuiraNativeFrame;
    motion: boolean;
    enter?: () => void;
    leave?: () => void;
}

/** Attaches hover routing to a Cell. Creates no frames, textures or update loop. */
export class Tooltip extends Decoration {
    private binding?: TooltipBinding;
    private shown?: { tooltip: NativeTooltip; owner: wuiraNativeFrame };
    public constructor(public readonly props: TooltipProps) { super(); }

    protected draw(frame: wuiraNativeFrame): void {
        const binding: TooltipBinding = { frame, motion: frame.IsMouseMotionEnabled() };
        this.binding = binding;
        binding.enter = () => this.Show(frame);
        binding.leave = () => this.Hide();
        // Hooks preserve template scripts. Cleared callbacks release the decoration on disposal.
        frame.HookScript("OnEnter", () => binding.enter?.());
        frame.HookScript("OnLeave", () => binding.leave?.());
        frame.HookScript("OnHide", () => binding.leave?.());
        if (!binding.motion) frame.EnableMouseMotion(true);
    }

    private Show(owner: wuiraNativeFrame): void {
        this.Hide();
        const target = this.props.target;
        const tooltip = typeof target === "function" ? target() : target ?? GameTooltip;
        if (tooltip === undefined) return;
        tooltip.SetOwner(owner, this.props.anchor ?? "ANCHOR_RIGHT");
        this.shown = { tooltip, owner };
        try {
            tooltip.ClearLines();
            if (this.props.show !== undefined) {
                if (this.props.show(tooltip, owner) === false) { this.Hide(); return; }
            } else {
                const text = typeof this.props.text === "function" ? this.props.text() : this.props.text;
                if (text === undefined) { this.Hide(); return; }
                const color = this.props.color ?? { r: 1, g: 1, b: 1 };
                tooltip.SetText(text, color.r, color.g, color.b, color.a ?? 1, this.props.wrap ?? true);
            }
            for (const line of this.props.lines ?? []) {
                const color = line.color ?? { r: 1, g: 1, b: 1 };
                tooltip.AddLine(line.text, color.r, color.g, color.b, line.wrap ?? true);
            }
            tooltip.Show();
        } catch (failure) { this.Hide(); throw failure; }
    }

    private Hide(): void {
        const shown = this.shown; this.shown = undefined;
        // A late leave/unmount must never hide another frame's tooltip.
        if (shown !== undefined && shown.tooltip.IsOwned(shown.owner)) shown.tooltip.Hide();
    }

    public override dispose(): void {
        const binding = this.binding; this.binding = undefined;
        if (binding !== undefined) {
            binding.enter = undefined; binding.leave = undefined;
            if (!binding.motion && !(InCombatLockdown() && binding.frame.IsProtected?.() === true)) binding.frame.EnableMouseMotion(false);
        }
        this.Hide(); super.dispose();
    }
}
