import type { CellProps, ICell } from "../ui/Cell";
import type { Element } from "../ui/primitives/jsx";
import type { Anchor } from "../types/Position";
import type { SecureButtonProps } from "../ui/SecureButton";
import { validateSecureButton } from "../platform/SecureButton";
import { measureLayout, MeasuredCell } from "../ui/layout/measureLayout";
import { createWidget } from "./widgets";
import type { RenderedCell } from "./types";

export function prepareLayout(element: Element, parent: wuiraNativeFrame, mountedFrames: ReadonlyMap<CellProps, wuiraNativeFrame>) {
    const rootProps = (element as ICell).props;
    const measured = measureLayout(element, {
        width: rootProps.width === "inherit" ? parent.GetWidth() : undefined,
        height: rootProps.height === "inherit" ? parent.GetHeight() : undefined,
    });
    // UIParent itself can be protected without restricting ordinary addon widgets.
    let protectedTree = parent !== UIParent && (parent.IsProtected?.() ?? false);
    const seen = new Set<CellProps>();
    function validate(item: MeasuredCell): void {
        if (seen.has(item.cell.props) || mountedFrames.has(item.cell.props)) error("A Cell can only be mounted once at a time");
        seen.add(item.cell.props);
        if (item.cell.kind === "secureButton") {
            protectedTree = true;
            validateSecureButton(item.cell.props as SecureButtonProps);
        }
        for (const child of item.children) validate(child);
    }
    validate(measured);
    if (protectedTree && InCombatLockdown()) error("SecureButton: mount protected UI outside combat");
    return { measured, protectedTree };
}

export function createFrames(measured: MeasuredCell, parent: wuiraNativeFrame, mountedFrames: ReadonlyMap<CellProps, wuiraNativeFrame>) {
    const frames = new Map<CellProps, wuiraNativeFrame>();
    const pending: RenderedCell[] = [];
    function create(measured: MeasuredCell, parent: wuiraNativeFrame, placement?: { x: number; y: number }): wuiraNativeFrame {
        const { cell, width, height } = measured;
        if (frames.has(cell.props) || mountedFrames.has(cell.props)) error("A Cell can only be mounted once at a time");
        const frame = createWidget(cell, parent);
        frames.set(cell.props, frame);
        pending.push({ cell, width, height, margin: measured.margin, frame, parent, placement });
        frame.SetSize(width, height);
        for (let index = 0; index < measured.children.length; index += 1) {
            create(measured.children[index], frame, measured.placements?.[index]);
        }
        return frame;
    }
    const root = create(measured, parent);
    return { root, pending, frames };
}

export function resolveAnchors(pending: RenderedCell[], frames: ReadonlyMap<CellProps, wuiraNativeFrame>) {
    const anchors = new Map<wuiraNativeFrame, wuiraNativeFrame>();
    for (const item of pending) {
        const position = item.cell.props;
        if (item.placement !== undefined) {
            anchors.set(item.frame, item.parent);
        } else if (position.mode === "absolute") {
            anchors.set(item.frame, UIParent);
        } else {
            const target = position.relativeTo === undefined
                ? item.parent
                : frames.get(position.relativeTo.props);
            if (target === undefined) error("relativeTo must reference a Cell in the same mounted tree");
            if (target === item.frame) error("A Cell cannot anchor to itself");
            anchors.set(item.frame, target);
        }
    }
    // Reject indirect anchor cycles before asking the client to apply them.
    for (const item of pending) {
        let target = anchors.get(item.frame);
        while (target !== undefined) {
            if (target === item.frame) error("Cell positioning contains an anchor cycle");
            target = anchors.get(target);
        }
    }

    return anchors;
}

export function applyPosition(item: RenderedCell, anchors: ReadonlyMap<wuiraNativeFrame, wuiraNativeFrame>, root: wuiraNativeFrame, rootAnchor?: Anchor): void {
    const position = item.cell.props;
    const target = anchors.get(item.frame)!;
    const x = item.placement?.x ?? (position.mode === "absolute" ? position.x : position.offset.x);
    const y = item.placement?.y ?? (position.mode === "absolute" ? position.y : position.offset.y);
    const overrideAnchor = item.frame === root ? rootAnchor : undefined;
    const anchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.anchor ?? "TOPLEFT");
    const relativeAnchor = overrideAnchor ?? (item.placement !== undefined ? "TOPLEFT" : position.relativeAnchor ?? anchor);
    item.frame.SetPoint(anchor, target, relativeAnchor, x + item.margin.left, -(y + item.margin.top));
}
