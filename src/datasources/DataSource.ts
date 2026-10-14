/** A value-producing source. Secrecy describes data, not native frame protection. */
export abstract class DataSource<T> {
    private conditions?: ((value: T) => boolean)[];
    protected constructor(private value: T, private secret: boolean = false) {}

    /** Checked when consumed, rather than inferred from combat state. */
    public IsSecret(): boolean {
        return this.IsValueSecret(this.GetValue());
    }

    public get Value(): T {
        const value = this.GetValue();
        this.AssertReadable(value);
        return value;
    }

    public Compute<TResult>(compute: (value: T) => TResult): TResult {
        const value = this.GetValue();
        this.AssertReadable(value);
        return compute(value);
    }

    protected GetValue(): T { return this.value; }

    /** Filters native binding emissions; Value remains a checked, fresh snapshot. */
    public When(condition: (value: T) => boolean): this {
        (this.conditions ??= []).push(condition);
        return this;
    }

    protected CanEmit(value: T): boolean {
        if (this.conditions === undefined) return true;
        // Restricted values must never reach user callbacks or Lua comparisons.
        if (this.IsValueSecret(value)) return false;
        for (const condition of this.conditions) {
            const result = condition(value);
            if (issecretvalue(result) || !result) return false;
        }
        return true;
    }

    private IsValueSecret(value: T): boolean {
        return issecretvalue(value) || this.secret || this.HasSecretFields(value);
    }

    /** Replace the value and its explicit restriction together, clearing stale flags. */
    protected SetValue(value: T, secret: boolean = false): void {
        this.value = value;
        this.secret = secret;
    }

    /** Aggregate sources override this to check known fields without comparing them. */
    protected HasSecretFields(_value: T): boolean {
        return false;
    }

    private AssertReadable(value: T): void {
        if (this.IsValueSecret(value)) error("DataSource: secret data cannot be read or used in computations");
    }
}
