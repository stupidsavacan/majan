# ARCHITECTURE

## Phase 16 Flow modules

`GameEngine` delegates behavior-preserving responsibilities to dedicated Flow modules while keeping the browser-facing public API stable.

- `DrawContext`: normal draw, dealer opening draw, rinshan, houtei/haitei context, tenho/chiho guards.
- `RoundLifecycle`: start round, next round, exhaustive draw, tenpai detection, ryuukyoku settlement handoff.
- `TurnFlow`: human discard, CPU auto flow, after-discard flow, empty-wall transition.
- `WinFlow`: tsumo, ron candidates, head-bump, optional daburon, settlement, record handoff.
- `CallFlow`: call windows, call selection, skip handling.
- `KanFlow`: human/CPU kan, chankan, rinshan handoff.
- `RecordFlow`: game-record events and score settlement debug linkage.
- `RecoveryFlow`: RecoveryManager bridge back into normal Flow execution.

## Script Load Order

The canonical runtime is `extracted-zips/offline-sanma-mahjong-phase1/index.html`. Root `index.html` mirrors that runtime and must load core modules before `GameEngine.js`, with `RuleConfig`, managers, record/replay/stats modules, Flow modules, then UI startup.

## Issue #26 record/replay/stats compatibility

`GameRecord` remains backward compatible with historical single-winner fields:

```txt
winnerIndex
winType
yaku
yakuman
score
changes
```

For daburon and future multi-winner results, records also normalize:

```txt
winners[]
  winnerIndex
  winType
  fromPlayerIndex
  yaku
  yakuman
  score
  pointTransfers[]
```

Exhaustive draws are represented as:

```txt
type: exhaustive_draw
tenpaiPlayers[]
notenPlayers[]
tenpaiStatus[]
drawSettlement
changes[]
```

`ReplayViewer` applies point movements from `score_settlement`, `double_ron`, `win`, and `round_result` events. Unknown event types remain non-fatal.

`AdvancedStats` and `RecordIndex` use `winners[]` when present and fall back to the legacy `winnerIndex` model for older records.
