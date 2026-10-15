import { UI } from "./primitives/jsx";
import type { Element } from "./primitives/jsx";
import type { CellProps } from "./Cell";
import { wuira } from "../wuira";

export interface ForEachSource<T> {
    readonly Value: readonly T[];
    onChange(listener: (items: readonly T[]) => void): () => void;
}
export interface ForEachProps<T> extends Omit<Partial<CellProps>, "key" | "onMount"> {
    items: readonly T[] | ForEachSource<T>;
    key?: (item: T) => string | number;
    child: (item: T, index: number) => Element;
    /** Called for an existing key. The view and its native widgets are retained. */
    onUpdate?: (view: Element, item: T, previous: T) => void;
    onDispose?: (view: Element, item: T) => void;
    direction?: "horizontal" | "vertical";
    gap?: number;
    lineGap?: number;
    wrapAfter?: number;
    groupBy?: (item: T) => string | number;
}
interface Entry<T> { item: T; view: Element; frame: wuiraNativeFrame; x?: number; y?: number; }

/** Arrays expand once; observable lists keep one mounted tree per stable key. */
export function ForEach<T>(props: ForEachProps<T>): Element {
    const { items, key, child, onUpdate, onDispose, direction = "vertical", gap = 0, lineGap = gap, wrapAfter = Infinity, groupBy, ...position } = props;
    if (typeof child !== "function") error("ForEach requires a render function as its child");
    if (Array.isArray(items)) return { kind: "group", props: {}, children: (items as readonly T[]).map((item, index) => {
        const view = child(item, index);
        if (key !== undefined) (view.props as { key?: string | number }).key = key(item);
        return view;
    }) };
    if (key === undefined) error("An observable ForEach requires a stable key");
    if (wrapAfter !== Infinity && (!Number.isInteger(wrapAfter) || wrapAfter < 1)) error("ForEach wrapAfter must be a positive integer");
    if (gap < 0 || lineGap < 0) error("ForEach gaps must be non-negative");
    const source = items as ForEachSource<T>;
    return UI.createElement("cell", { ...position, width: position.width ?? 0, height: position.height ?? 0, onMount: (host: wuiraNativeFrame) => {
        let entries = new Map<string | number, Entry<T>>();
        let stopped = false, dirty = true;
        let latest: readonly T[] | undefined;
        let lastWidth = -1, lastHeight = -1;
        const events = CreateFrame("Frame", undefined, UIParent);
        const release = (entry: Entry<T>) => {
            try { wuira.Unmount(entry.frame); } finally { onDispose?.(entry.view, entry.item); }
        };
        const reconcile = () => {
            if (stopped || !dirty || InCombatLockdown()) return;
            const values = latest ?? source.Value;
            if (values.length > 1024) error("ForEach list exceeds its safety limit");
            const next = new Map<string | number, Entry<T>>();
            const created: Entry<T>[] = [];
            const ordered: Entry<T>[] = [];
            try {
                const keys = new Set<string | number>();
                const identities: (string | number)[] = [];
                for (const item of values) {
                    const identity = key(item);
                    if (issecretvalue(identity) || (typeof identity !== "string" && typeof identity !== "number") || typeof identity === "number" && !Number.isFinite(identity) || keys.has(identity)) error("ForEach requires unique, public keys");
                    keys.add(identity); identities.push(identity);
                }
                for (let index = 0; index < values.length; index++) {
                    const item = values[index], identity = identities[index];
                    let entry = entries.get(identity);
                    if (entry === undefined) {
                        const view = child(item, index);
                        (view.props as { key?: string | number }).key = identity;
                        let frame: wuiraNativeFrame | undefined;
                        try { frame = wuira.Mount(view, undefined, host); if (frame === undefined) error("Observable ForEach children must return a Cell"); }
                        catch (failure) { onDispose?.(view, item); throw failure; }
                        entry = { item, view, frame }; created.push(entry);
                    } else { onUpdate?.(entry.view, item, entry.item); entry.item = item; }
                    next.set(identity, entry); ordered.push(entry);
                }
            } catch (failure) { for (const entry of created) release(entry); throw failure; }
            for (const [identity, entry] of entries) if (!next.has(identity)) release(entry);
            entries = next;
            const groups = new Map<string | number, Entry<T>[]>();
            for (let index = 0; index < ordered.length; index++) {
                const entry = ordered[index];
                const group = groupBy?.(entry.item) ?? Math.floor(index / wrapAfter);
                let values = groups.get(group); if (values === undefined) { values = []; groups.set(group, values); }
                values.push(entry);
            }
            let cross = 0, width = 0, height = 0;
            for (const group of groups.values()) {
                let cursor = 0, crossSize = 0;
                for (const entry of group) {
                    const w = entry.frame.GetWidth(), h = entry.frame.GetHeight();
                    const x = direction === "vertical" ? cross : cursor, y = direction === "vertical" ? -cursor : -cross;
                    if (x !== entry.x || y !== entry.y) {
                        entry.frame.ClearAllPoints(); entry.frame.SetPoint("TOPLEFT", host, "TOPLEFT", x, y); entry.x = x; entry.y = y;
                    }
                    width = Math.max(width, (direction === "vertical" ? cross : cursor) + w);
                    height = Math.max(height, (direction === "vertical" ? cursor : cross) + h);
                    cursor += (direction === "vertical" ? h : w) + gap;
                    crossSize = Math.max(crossSize, direction === "vertical" ? w : h);
                }
                cross += crossSize + lineGap;
            }
            if (width !== lastWidth || height !== lastHeight) { host.SetSize(width, height); lastWidth = width; lastHeight = height; }
            latest = undefined; dirty = false;
        };
        const refresh = (values: readonly T[]) => { latest = values; dirty = true; reconcile(); };
        events.RegisterEvent("PLAYER_REGEN_ENABLED"); events.SetScript("OnEvent", () => { latest = undefined; reconcile(); });
        const unsubscribe = source.onChange(refresh);
        try { reconcile(); } catch (failure) {
            unsubscribe(); events.UnregisterAllEvents(); events.SetScript("OnEvent", undefined);
            for (const entry of entries.values()) release(entry);
            throw failure;
        }
        return () => {
            stopped = true; unsubscribe(); events.UnregisterAllEvents(); events.SetScript("OnEvent", undefined); events.Hide();
            for (const entry of entries.values()) release(entry); entries.clear();
        };
    } });
}
