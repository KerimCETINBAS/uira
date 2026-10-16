declare const _G: Record<string, unknown>;
declare const C_AddOns: { IsAddOnLoaded?: (this: void, name: string) => wuiraNativeReturns<[boolean, boolean]> } | undefined;
declare const string: { match(this: void, value: string, pattern: string): string | undefined };
declare function print(this: void, message: string): void;

/** Extend with data fields and defaults. A stable static Token opts into persistence. */
export abstract class Store {}

export interface StoreClass<T extends Store> {
    new(): T;
    readonly Token?: string;
}

export type ReadonlyData<T> = T extends object ? { readonly [K in keyof T]: ReadonlyData<T[K]> } : T;
export interface SavedStoreOptions { addon: string; variable: string; }
type Observer = (value: unknown) => void;

function copy(value: unknown, seen = new Set<object>()): unknown {
    if (issecretvalue(value)) throw "Secret values cannot be stored";
    if (value === undefined || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value === null || typeof value !== "object") throw "Store supports only finite numbers, strings, booleans, arrays and data objects";
    if (seen.has(value)) throw "Store does not support cyclic data";
    seen.add(value);
    // Lua persists objects and arrays as tables. Copy keys directly, preserving
    // numeric array indices without relying on JavaScript array identity.
    const fields: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) fields[key] = copy(field, seen);
    seen.delete(value);
    return fields;
}

/** Fill new fields and reject incompatible saved field types using current defaults. */
function restore(defaults: unknown, saved: unknown): unknown {
    if (saved === undefined || typeof saved !== typeof defaults || saved === null) return copy(defaults);
    // Empty Lua tables carry no array/object shape. Treat an empty default as
    // an open data table so saved string-keyed records survive a new registry.
    if (typeof defaults === "object" && defaults !== null && Object.keys(defaults).length === 0) return copy(saved);
    if (Array.isArray(defaults)) return Array.isArray(saved) ? copy(saved) : copy(defaults);
    if (typeof defaults === "object" && defaults !== null) {
        if (Array.isArray(saved)) return copy(defaults);
        const result = copy(saved) as Record<string, unknown>;
        for (const [key, value] of Object.entries(defaults)) result[key] = restore(value, result[key]);
        return result;
    }
    return copy(saved);
}

export class StoreRegistry {
    private readonly memory = new Map<StoreClass<Store>, unknown>();
    private readonly observers = new Map<StoreClass<Store>, Set<Observer>>();
    private readonly tokens = new Map<string, StoreClass<Store>>();
    private readonly updating = new Set<StoreClass<Store>>();
    private saved?: Record<string, unknown>;
    private listener?: wuiraNativeFrame;
    private readyCallbacks: (() => void)[] = [];

    public constructor(private readonly options?: SavedStoreOptions) {
        if (options === undefined) return;
        if (string.match(options.variable, "^[%a_][%w_]*$") === undefined) throw "Invalid SavedVariables name";
        // The first return value is also true while scripts are still loading.
        // SavedVariables are ready only when the second return value is true.
        if (C_AddOns?.IsAddOnLoaded !== undefined) {
            const [, loaded] = C_AddOns.IsAddOnLoaded(options.addon);
            if (loaded) { this.Load(); return; }
        }
        this.listener = CreateFrame("Frame", undefined, UIParent);
        this.listener.RegisterEvent("ADDON_LOADED");
        this.listener.SetScript("OnEvent", (_frame, _event, addon) => {
            if (addon !== options.addon) return;
            this.Load();
            this.listener?.UnregisterAllEvents();
            this.listener?.SetScript("OnEvent", undefined);
            this.listener?.Hide();
            this.listener = undefined;
            const callbacks = this.readyCallbacks;
            this.readyCallbacks = [];
            for (const callback of callbacks) callback();
        });
    }

    private Load(): void {
        const name = this.options!.variable;
        const saved = _G[name];
        this.saved = saved !== null && typeof saved === "object"
            ? saved as Record<string, unknown> : {};
        _G[name] = this.saved;
    }

    public get IsReady(): boolean { return this.options === undefined || this.saved !== undefined; }
    public onReady(callback: () => void): void {
        if (this.IsReady) callback();
        else this.readyCallbacks.push(callback);
    }

    private Read<T extends Store>(schema: StoreClass<T>): unknown {
        const token = schema.Token;
        if (token === undefined) {
            if (!this.memory.has(schema)) this.memory.set(schema, copy(new schema()));
            return this.memory.get(schema);
        }
        if (typeof token !== "string" || token.trim() === "") throw "Store Token must be a nonempty stable string";
        if (this.options === undefined) throw "Persistent stores require SavedVariables configuration";
        if (this.saved === undefined) throw "SavedVariables are not loaded; use registry.onReady()";
        const owner = this.tokens.get(token);
        if (owner !== undefined && owner !== schema) throw "Different Store classes cannot share a Token";
        if (owner === undefined) {
            const defaults = copy(new schema());
            let value: unknown;
            try { value = restore(defaults, this.saved[token]); }
            catch { value = defaults; }
            this.saved[token] = value;
            this.tokens.set(token, schema);
        }
        return this.saved[token];
    }

    /** One-time detached snapshot, with no subscription or mutable access to stored data. */
    public get<T extends Store>(schema: StoreClass<T>): ReadonlyData<T> {
        return copy(this.Read(schema)) as ReadonlyData<T>;
    }

    /** Commit only after the updater succeeds; observers receive detached snapshots. */
    public set<T extends Store>(schema: StoreClass<T>, update: (settings: T) => T): void {
        if (this.updating.has(schema)) throw "Reentrant updates of the same Store are not allowed";
        const draft = copy(this.Read(schema)) as T;
        this.updating.add(schema);
        let committed: unknown;
        try {
            const next = update(draft);
            if (next === null || typeof next !== "object") throw "Store updater must return settings";
            committed = copy(next);
        } finally { this.updating.delete(schema); }
        if (schema.Token === undefined) this.memory.set(schema, committed);
        else this.saved![schema.Token] = committed;
        const listeners = [...(this.observers.get(schema) ?? [])];
        for (const observer of listeners) {
            try { observer(copy(committed)); }
            catch { print("|cffff5555[wuira] Store observer failed after commit|r"); }
        }
    }

    /** Observe future commits. Call get() separately for the initial snapshot. */
    public subscribe<T extends Store>(schema: StoreClass<T>, observer: (settings: ReadonlyData<T>) => void): () => void {
        this.Read(schema);
        let listeners = this.observers.get(schema);
        if (listeners === undefined) { listeners = new Set(); this.observers.set(schema, listeners); }
        const listener: Observer = value => observer(value as ReadonlyData<T>);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }

    public Dispose(): void {
        this.listener?.UnregisterAllEvents();
        this.listener?.SetScript("OnEvent", undefined);
        this.listener?.Hide();
        this.listener = undefined;
        this.observers.clear();
        this.readyCallbacks = [];
    }
}
