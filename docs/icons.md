# Forever icon catalog

`Icons` contains native texture **FileDataIDs** from the same verified Forever build as the spell enums. Icon identity is independent of spell or item actions.

```ts
import { UI } from "wuira";
import { Icons } from "wuira/icons";
import { Icon } from "wuira/ui";

const image = <Icon width={24} height={24} texture={Icons.BlessingOfFreedom_135968} />;
```

Every icon has an explicit ID-suffixed member. A readable short alias is generated only when that name maps to one icon. Multiple spells or items may share the same texture; they produce one catalog entry with searchable aliases.

The snapshot combines SpellMisc spell/active icon fields with Item icon fields and ItemSparse names from the pinned client build. It covers every positive icon ID referenced by these tables, including unused records and entries without a readable name; it does not claim to list every texture or atlas in the game. No other client branch is merged into it. The names describe associated spells or items, rather than guessing asset filenames. Unnamed records receive a `Spell <id>` or `Item <id>` label.

The generated enum is erased to numeric literals by TypeScriptToLua. Editor tools can read the packaged `data/icons/forever.json` to create a searchable catalog without constructing every icon in game. A selected texture is saved as a FileDataID, not a spell ID.

Game data belongs to Blizzard Entertainment. Source URLs, row counts, build and SHA-256 hashes are recorded in the snapshot.

## Update

```sh
npm run icons:update -- --build 1.60.1.70374
npm run icons:generate
```

Use `--cached` to regenerate the snapshot from downloaded CSVs. Updating requires the build to match `data/spells/forever.json`. Normal consumers use the committed snapshot and do not download game data during a build.
