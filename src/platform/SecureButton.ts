import type { SecureButtonProps } from "../ui/SecureButton";
declare const _G: Record<string, unknown>;

export function createSecureButton(parent: wuiraNativeFrame, props: SecureButtonProps): wuiraNativeSecureButton {
    let name: string | undefined;
    if (props.binding !== undefined) {
        let id = typeof _G.__wuiraButtonSequence === "number" ? _G.__wuiraButtonSequence as number : 0;
        do { id += 1; name = "WuiraSecureButton" + id; } while (_G[name] !== undefined);
        _G.__wuiraButtonSequence = id;
    }
    return CreateFrame("Button", name, parent, "SecureActionButtonTemplate");
}

const buttons = ["LeftButton", "RightButton", "MiddleButton", "Button4", "Button5"];

/** Validate the whole tree before allocating any protected widgets. */
export function validateSecureButton(props: SecureButtonProps): void {
    if (props.clickThrough !== undefined && props.clickThrough !== false) error("SecureButton cannot be click-through");
    if (!buttons.includes(props.button ?? "LeftButton")) error("SecureButton: unsupported mouse button");
    if (props.binding !== undefined && (issecretvalue(props.binding) || typeof props.binding !== "string" || props.binding.trim().length === 0)) error("SecureButton: binding must be a non-empty key string");
    const reference = (value: unknown) => {
        if (issecretvalue(value)) error("SecureButton: action attributes cannot be secret");
        if (typeof value === "number" && Number.isInteger(value) && value > 0) return;
        if (typeof value === "string" && value.trim().length > 0) return;
        error("SecureButton: action reference must be a positive integer or non-empty string");
    };
    const action = props.action;
    if (action === undefined) return;
    if (issecretvalue(action) || typeof action !== "object") error("SecureButton: invalid action");
    switch (action.type) {
        case "spell": reference(action.spell); break;
        case "item": reference(action.item); break;
        case "macro": reference(action.macro); break;
        case "action":
            if (issecretvalue(action.slot) || !Number.isInteger(action.slot) || action.slot <= 0) error("SecureButton: slot must be a positive integer");
            break;
        case "target":
            if (action.unit === undefined) error("SecureButton: target action requires a unit");
            break;
        default: error("SecureButton: unsupported action type");
    }
    if ("unit" in action && action.unit !== undefined) {
        if (issecretvalue(action.unit) || typeof action.unit !== "string" || action.unit.trim().length === 0) error("SecureButton: unit must be a static unit token");
    }
}

export function configureSecureButton(frame: wuiraNativeSecureButton, props: SecureButtonProps): () => void {
    const button = props.button ?? "LeftButton";
    const suffix = String(buttons.indexOf(button) + 1);
    frame.RegisterForClicks((button + "Up") as wuiraMouseClick);
    frame.SetAttribute("useOnKeyDown", false);
    // A zero ID makes action-slot buttons use the explicit action attribute, not bar paging.
    frame.SetID(0);
    const action = props.action;
    if (action !== undefined) {
        if (action.type === "spell") frame.SetAttribute("spell" + suffix, action.spell);
        else if (action.type === "item") frame.SetAttribute("item" + suffix, typeof action.item === "number" ? "item:" + action.item : action.item);
        else if (action.type === "macro") frame.SetAttribute("macro" + suffix, action.macro);
        else if (action.type === "action") frame.SetAttribute("action" + suffix, action.slot);
        if ("unit" in action) frame.SetAttribute("unit" + suffix, action.unit);
        frame.SetAttribute("type" + suffix, action.type);
    }
    if (props.binding !== undefined) SetOverrideBindingClick(frame, false, props.binding, frame.GetName()!, button);
    return () => {
        if (props.binding !== undefined) ClearOverrideBindings(frame);
        frame.SetAttribute("type" + suffix, undefined);
        frame.EnableMouse(false);
    };
}
