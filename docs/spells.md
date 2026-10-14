# Forever spell catalog

The generated enums cover all 31,863 IDs in both Spell and SpellName for
**wow_classic_beta 1.60.1.70374**, matching the locally verified Forever client.
No Retail, Season of Discovery, TBC or Classic Era tables are merged into it.
The source URLs, row counts and SHA-256 hashes are recorded in
data/spells/forever.json. Game data belongs to Blizzard Entertainment.

    import { PaladinSpells, RacialSpells, GeneralSpells } from "wuira/spells";
    import { MageSpells } from "wuira/spells/MageSpells";

    const heal = PaladinSpells.HolyLight;
    const rankedHeal = PaladinSpells.HolyLightRank1_635;
    const racial = RacialSpells.WillOfTheForsaken;
    const attack = GeneralSpells.Attack;
    const fireball = MageSpells.Fireball;

The nine class enums group spell-family and class-mask metadata. Racial,
profession, pet and general spell enums use the client's skill-line metadata.
Remaining records live in WorldSpells: NPC abilities, world effects, item
effects and records whose ownership cannot be established from these tables.
No heuristic turns every unclassified record into an NPC-only spell.
Class-family membership does not prove that a spell is learnable by a player.
The snapshot includes retired, test and hidden records still present in this
Forever client's tables. Use KnownSpells for a character's learned abilities.

Every ID has an explicit ID-suffixed member. Rank labels come from the client.
Short aliases select the lowest linked rank; ambiguous unranked names require
the explicit member. The legacy Spells enum has been removed; import the
appropriate categorized enum instead, such as PaladinSpells from wuira/spells.

These are const enums: TypeScriptToLua replaces accesses with literal numbers,
so the entire catalog is not allocated as Lua tables. They support static
member access, not runtime iteration or string-based indexing.

## General actions

BindingActions contains 295 native command tokens from the pinned Forever
UI source's Bindings_Camelot.xml. Its source commit and hash are recorded
separately from the DB2 build.

    import { BindingActions } from "wuira/spells";
    const command = BindingActions.MOVEFORWARD; // "MOVEFORWARD"

Binding commands are strings. They are neither spell IDs nor keyboard shortcuts
such as SHIFT-1, and do not automatically become SecureButton spell actions.

## Regeneration

Normal builds use the committed snapshot and generated files without network
access. The updater restricts imports to the Forever 1.60 client branch.
To update deliberately to another Forever build:

    npm run spells:update -- --build 1.60.1.70374
    npm run spells:generate
    npm run check
    npm test

Review the build identity, source hashes, ID coverage and category differences
before committing an updated snapshot.
