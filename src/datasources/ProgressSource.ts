import { DataSource } from "./DataSource";
import { NativeNumberSource } from "./NativeNumberSource";

export interface ProgressOverrides {
    min?: number;
    max?: number;
    current?: number;
}

/** Shared contract for health, power, cooldowns, and other progress values. */
export abstract class ProgressSource extends DataSource<number> {
    public readonly Min: DataSource<number>;
    public readonly Max: DataSource<number>;
    public readonly Percent: DataSource<number>;

    protected constructor(private readonly readers: {
        current: () => number; min: () => number; max: () => number; percent: () => number;
    }) {
        super(0);
        this.Min = new NativeNumberSource(readers.min);
        this.Max = new NativeNumberSource(readers.max);
        this.Percent = new NativeNumberSource(readers.percent);
    }

    protected override GetValue(): number { return this.readers.current(); }

    public override IsSecret(): boolean {
        return super.IsSecret() || this.Min.IsSecret() || this.Max.IsSecret() || this.Percent.IsSecret();
    }

    public BindTo(frame: wuiraNativeStatusBar, options: ProgressOverrides = {}): void {
        const refresh = () => {
            // Do not compare or calculate opaque native values in the direct path.
            const current = options.current !== undefined ? options.current : this.readers.current();
            frame.SetMinMaxValues(
                options.min !== undefined ? options.min : this.readers.min(),
                options.max !== undefined ? options.max : this.readers.max(),
            );
            frame.SetValue(current);
        };
        this.Listen(frame, refresh);
        refresh();
    }

    protected abstract Listen(frame: wuiraNativeFrame, refresh: () => void): void;
}
