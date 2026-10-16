# Source converters

`SourceConverter` transforms a readable source value. It consumes the input's change notifications, shares one upstream subscription across its observers, and does not create a timer or dispose the shared input. Sources without notifications remain available as checked one-time reads.

```ts
import { ClassSource, SourceConverter, CaseConverter, HP, MathConverter, Unit } from "wuira/datasources";

const characterClass = new ClassSource(Unit.Player);
const token = new SourceConverter(characterClass, info => info?.token);
const color = new CaseConverter(token, [
    { equals: "PALADIN", value: { r: 1, g: 0.5, b: 0.7, a: 1 } },
    { equals: "MAGE", value: { r: 0.4, g: 0.8, b: 1, a: 1 } },
], { r: 0.35, g: 0.4, b: 0.45, a: 1 });

const hp = new HP(Unit.Player);
const doubled = new MathConverter(hp, "2 * input");
const stop = doubled.BindTo(value => console.log(value));
// On removal:
stop();
doubled.Dispose();
color.Dispose();
token.Dispose();
characterClass.Dispose();
```

`Value` and `Compute()` are checked reads. `TryCompute()` performs one checked read and returns `{ readable: false }` for restricted data, without invoking the callback. Converter chains use it to avoid repeated leaf reads. `onChange()` observes future readable output changes; `BindTo()` also applies the current readable value immediately. Scalar outputs with the same value do not emit again. `When()` filters emissions without changing the checked `Value` getter. Call `Dispose()` when the converter is no longer owned by a component.

Cases compare strings, finite numbers and booleans with strict equality; `1` and `"1"` are different keys. Duplicate keys are rejected. Unmatched values return the supplied default, or `undefined` when none was provided. Case outputs can be colors, texture IDs, text or other data.

Math expressions support `input`, finite numeric literals, parentheses, unary signs, `+`, `-`, `*`, `/`, `%`, and exponentiation (`^` or `**`). Exponents associate to the right; `-input^2` means `-(input^2)`. The bounded parser runs once at construction. It does not evaluate JavaScript or Lua, access globals, or call functions. Invalid syntax, division by zero and non-finite results throw errors. `MathConverter.Validate(expression)` checks syntax without reading the input.

Restricted values, including nested secret fields, never reach a conversion callback. Restrictions are checked when values are consumed; combat alone does not mark a value secret. ClassSource subscriptions follow unit identity changes and relevant native events, and release those listeners when the last consumer unsubscribes.

Converters produce data. They do not grant permission to change protected buttons or their actions during combat.
