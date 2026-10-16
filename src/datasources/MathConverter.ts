import { SourceConverter } from "./SourceConverter";
import type { ValueSource } from "./SourceConverter";
import { MathExpression } from "./MathExpression";

export class MathConverter extends SourceConverter<number, number> {
    public constructor(input: ValueSource<number>, expression: string) {
        const formula = new MathExpression(expression);
        super(input, value => formula.Evaluate(value));
    }
    public static Validate(expression: string): void { new MathExpression(expression); }
}
