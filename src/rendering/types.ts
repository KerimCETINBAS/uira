import type { ICell } from "../ui/Cell";
import type { Decoration } from "../ui/decorations/Decoration";
import type { MeasuredCell } from "../ui/layout/measureLayout";

export interface RenderedCell {
    cell: ICell;
    width: number;
    height: number;
    margin: MeasuredCell["margin"];
    frame: wuiraNativeFrame;
    parent: wuiraNativeFrame;
    placement?: { x: number; y: number };
}

export interface MountedTree {
    frames: wuiraNativeFrame[];
    cells: ICell[];
    decorations: Decoration[];
    bindings: (() => void)[];
    protected: boolean;
    pendingUnmount: boolean;
    visibility: (() => void)[];
    listener?: wuiraNativeFrame;
}
