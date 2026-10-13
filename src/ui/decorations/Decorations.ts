import type { Background } from "./Background";
import type { Border } from "./Border";
import type { Glow } from "./Glow";

export interface Decorations {
    background?: Background;
    border?: Border;
    glow?: Glow;
}
