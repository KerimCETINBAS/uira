import { DataSource } from "./DataSource";
import type { ReadResult } from "./DataSource";

/** Structural contract: converters can consume a shared source without owning it. */
export interface ValueSource<T> {
    readonly Value: T;
    IsSecret(): boolean;
    TryCompute?<TResult>(compute: (value: T) => TResult): ReadResult<TResult>;
    onChange?(listener: (value: T) => void): () => void;
}

function restricted(value: unknown, seen = new Set<object>(), depth = 0): boolean {
    if (issecretvalue(value) || depth > 32) return true;
    if (typeof value !== "object" || value === null || seen.has(value)) return false;
    seen.add(value);
    for (const child of Object.values(value)) if (restricted(child, seen, depth + 1)) return true;
    return false;
}

/** Checked value transformation. No timers, native widgets or ownership of the input. */
export class SourceConverter<TInput, TOutput> extends DataSource<TOutput> {
    private readonly listeners = new Set<(value: TOutput) => void>();
    private stop?: () => void;
    private disposed = false;
    private blocked = false;
    private previous?: TOutput;
    private readable = false;

    public constructor(private readonly input: ValueSource<TInput>, private readonly convert: (value: TInput) => TOutput) {
        super(undefined as TOutput);
    }

    protected override GetValue(): TOutput {
        if (this.disposed) error("SourceConverter is disposed");
        if (this.input.TryCompute !== undefined) {
            const result = this.input.TryCompute(value => this.Convert(value));
            if (!result.readable) { this.blocked = true; return undefined as TOutput; }
            return result.value;
        }
        this.blocked = this.input.IsSecret();
        if (this.blocked) return undefined as TOutput;
        return this.Convert(this.input.Value);
    }

    private Convert(value: TInput): TOutput {
        this.blocked = restricted(value);
        return this.blocked ? undefined as TOutput : this.convert(value);
    }

    protected override HasSecretFields(value: TOutput): boolean { return this.blocked || restricted(value); }

    /** Future readable changes. The first observer attaches one upstream subscription. */
    public onChange(listener: (value: TOutput) => void): () => void {
        if (this.disposed) error("SourceConverter is disposed");
        if (this.listeners.size === 0) {
            const value = this.GetValue();
            this.readable = !this.HasSecretFields(value);
            this.previous = this.readable ? value : undefined;
        }
        this.listeners.add(listener);
        if (this.listeners.size === 1) {
            try { this.stop = this.input.onChange?.(() => this.Refresh()); }
            catch (failure) { this.listeners.delete(listener); throw failure; }
        }
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0) { this.stop?.(); this.stop = undefined; }
        };
    }

    private Refresh(): void {
        const value = this.GetValue();
        if (this.HasSecretFields(value)) { this.readable = false; return; }
        const same = this.readable && value === this.previous;
        this.previous = value; this.readable = true;
        if (!same && this.CanEmit(value)) for (const listener of this.listeners) listener(value);
    }

    /** One immediate readable value, followed by event-driven changes when supported. */
    public BindTo(apply: (value: TOutput) => void): () => void {
        if (!this.IsSecret()) { const value = this.Value; if (this.CanEmit(value)) apply(value); }
        return this.onChange(apply);
    }

    public Dispose(): void {
        if (this.disposed) return;
        this.disposed = true; this.stop?.(); this.stop = undefined; this.listeners.clear();
    }
}

export type CaseKey = string | number | boolean;
export interface SourceCase<T> { readonly equals: CaseKey; readonly value: T; }

/** Strict equality, first matching case, then the optional default value. */
export class CaseConverter<TInput, TOutput> extends SourceConverter<TInput, TOutput | undefined> {
    public constructor(input: ValueSource<TInput>, cases: readonly SourceCase<TOutput>[], fallback?: TOutput) {
        const entries = cases.map(entry => ({ ...entry }));
        const seen = new Set<CaseKey>();
        for (const entry of entries) {
            const key = entry.equals;
            if (issecretvalue(key) || !["string", "number", "boolean"].includes(typeof key) || typeof key === "number" && !Number.isFinite(key)) error("CaseConverter: invalid match value");
            if (seen.has(key)) error("CaseConverter: duplicate match value");
            seen.add(key);
        }
        super(input, value => {
            for (const entry of entries) if (value === entry.equals as unknown) return entry.value;
            return fallback;
        });
    }
}
