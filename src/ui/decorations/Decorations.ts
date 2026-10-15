import type { Background } from "./Background";
import type { Border } from "./Border";
import type { Glow } from "./Glow";
import type { Tooltip } from "./Tooltip";

export interface Decorations {
    background?: Background;
    border?: Border;
    glow?: Glow;
    tooltip?: Tooltip;
}
