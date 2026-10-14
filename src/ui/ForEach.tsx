import type { Element } from "./primitives/jsx";

export interface ForEachProps<T> {
    items: readonly T[];
    child: (item: T, index: number) => Element;
}

/** Expands a snapshot into siblings. It creates no native frame or subscription. */
export function ForEach<T>({ items, child }: ForEachProps<T>): Element {
    if (typeof child !== "function") error("ForEach requires a render function as its child");
    return { kind: "group", props: {}, children: items.map((item, index) => child(item, index)) };
}
