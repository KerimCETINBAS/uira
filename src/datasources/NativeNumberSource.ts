import { DataSource } from "./DataSource";

/** Read-only API value; no cached assignment or game-state mutation. */
export class NativeNumberSource extends DataSource<number> {
    public constructor(private readonly read: () => number) { super(0); }
    protected override GetValue(): number { return this.read(); }
}
