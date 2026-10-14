import type { Cell, CellProps, ICell } from "./Cell";
import { UI } from "./primitives/jsx";
import type { Element } from "./primitives/jsx";
import type { TimerSource } from "../datasources/TimerSource";

export type SecureAction =
    | { type: "spell"; spell: number | string; unit?: string }
    | { type: "item"; item: number | string; unit?: string }
    | { type: "macro"; macro: number | string }
    | { type: "action"; slot: number; unit?: string }
    | { type: "target"; unit: string };

export type MouseButton = "LeftButton" | "RightButton" | "MiddleButton" | "Button4" | "Button5";
export type SecureButtonProps = CellProps & {
    /** Static secure attributes, configured before combat. No action means an inert button. */
    action?: SecureAction;
    /** Defaults to LeftButton; actions execute on release. */
    button?: MouseButton;
    /** Temporary override while mounted; never saved to the user's binding configuration. */
    binding?: string;
    showHotkey?: boolean;
    cooldown?: TimerSource;
    /** Native short completion flash; requires cooldown. */
    finishGlow?: boolean;
    clickThrough?: false;
};
export interface ISecureButton extends ICell {
    kind: "secureButton";
    props: SecureButtonProps;
}

/** A Cell rendered as a native SecureActionButtonTemplate, with one presentation child. */
export function SecureButton(props: Partial<SecureButtonProps> & { child?: Element }, child?: Element): Cell {
    return UI.createElement("secureButton", props, props.child ?? child ?? []);
}
