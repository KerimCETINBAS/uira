# Source converters

`SourceConverter` transforms a readable source with a typed callback. It consumes change notifications, shares one upstream subscription across observers, and does not create a timer or dispose the shared input. Sources without notifications remain available as checked one-time reads.

```ts
import { SourceConverter, HP, ClassSource, Unit } from "wuira/datasources";

const hp = new HP(Unit.Player);
const doubled = new SourceConverter(hp, value => value * 2);
const characterClass = new ClassSource(Unit.Player);
const token = new SourceConverter(characterClass, info => info?.token);
const stop = doubled.BindTo(value => console.log(value));

// On removal:
stop();
doubled.Dispose();
token.Dispose();
characterClass.Dispose();
```

`Value` and `Compute()` are checked reads. `TryCompute()` performs one checked read and returns `{ readable: false }` for restricted data without invoking the callback. Converter chains use it to read their leaf once, including when the data is restricted.

`onChange()` observes future readable output changes; `BindTo()` also applies the current readable value immediately. Identical scalar outputs do not emit again. `When()` filters emissions without changing the checked getter. `Dispose()` releases observers while leaving the input available to other consumers.

Restricted values, including nested secret fields, never reach a conversion callback. Restrictions are checked when consumed; combat alone does not mark a value secret. ClassSource subscriptions follow unit identity changes and native events, releasing listeners when the last consumer unsubscribes.

The SDK accepts TypeScript callbacks. Editable case rules and math formulas are LumaUI builder factories, implemented using this generic source. Converters produce data; protected button actions remain subject to native combat restrictions.
