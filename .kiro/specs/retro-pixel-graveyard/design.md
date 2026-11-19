# Design: Retro Pixel Graveyard

Follows `.kiro/steering/tech.md` and `structure.md`. IDs (R1..R9) refer to `requirements.md`.

## 1. Where things go
```
src/
  domain/pixelState.ts       pixelStateFor(grave, now) -> PixelState (R3)
  domain/xp.ts               XP ledger math, levels, unlocks, daily quest (R6)
  domain/arbitraries.ts      arbXpEntry, arbXpLedger for property tests
  state/storage.ts           ProgressState { ledger, styleId }, optional `progress` field (R6.8)
  state/store.ts             reviewGrave, selectStyle, XP earned in add/cancel/exorcise/undo
  design/tokens.css, fonts.ts  Palette, Press Start 2P + Inter (R1)
  features/pixel/            scene, gravestone, HUD, quest, collection (later tasks)
public/pixel/                graveyard-bg.png (384x216), reaper.png (49x56)
```

## 2. Visual state (R3)
`pixelStateFor` calls `getViewState`, then `motionFor`. Mapping by stage:

| Stage | Kind | Badge | Cracks | Sparks | Hand |
|---|---|---|---|---|---|
| sealed, cracked | normal | none | none | no | no |
| churning (<= 72 h) | warning | `Nh left` | orange | yes | no |
| zombie, overdue (<= 48 h) | critical | `Nh left` or `Overdue` | red | no | yes |
| cancelled grave | cancelled | `Cancelled` | none | no | no |
| kept grave | kept | `Kept` | none | no | no |

Thresholds are never repeated; only the stage to kind table lives in the module. Selected is a UI state (focus or selection) layered on top by the component.

## 3. XP and levels (R6)
- Ledger entries `{ kind: add | review | cancel, graveId, at }`. `dedupe` keeps one entry per kind and grave.
- XP: add 10, review 5, cancel 25. Level n needs `100 * n * (n - 1) / 2` XP, capped at level 20 (progress 1 at the cap).
- Unlocks: decorations (lantern 2, pumpkin 3, flower bed 5, raven 8), styles (classic 1, mossy 3, obsidian 6, rose quartz 10).
- Daily quest compares the local date prefix of `at` with today and caps at 1. No streak, no history.
- `xp.ts` imports nothing from `savings` or `stats`. A test reads the source to enforce it.

## 4. Persistence
`PersistedState.progress` is optional, so the schema version stays 1 and old records stay valid. On load, a missing `progress` becomes `{ ledger: [], styleId: 'classic' }`. Malformed progress is rejected like any other corrupt record. Undoing a cancellation inside the undo window removes that grave's `cancel` entry.

## 5. Exorcise (R5.2)
The Exorcise button opens the existing `ExorcismPanel`. Only "It's exorcised" calls `store.exorcise`. Copy before that says "Cancel with the provider", never "cancelled".

## 6. Testing
- Example and fast-check property tests for `pixelState` (monotonic, agrees with `getStage` and `motionFor`) and `xp` (level monotonic, progress in [0, 1], quest capped).
- Property test that savings and stats outputs are identical before and after XP calculations.
- Store tests for earning, undo, style selection, persistence and default loading.
