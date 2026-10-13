export type Anchor = "TOPLEFT" | "TOP" | "TOPRIGHT" | "LEFT" | "CENTER" | "RIGHT" | "BOTTOMLEFT" | "BOTTOM" | "BOTTOMRIGHT";

/** Defaults to TOPLEFT; positive y moves down from the selected anchor. */
export type Position<TReference> = {
    anchor?: Anchor;
    relativeAnchor?: Anchor;
} & (
    | {
          mode: "absolute";
          x: number;
          y: number;
          offset?: never;
          relativeTo?: never;
      }
    | {
          mode: "relative";
          offset: { x: number; y: number };
          relativeTo?: TReference;
          x?: never;
          y?: never;
      });
