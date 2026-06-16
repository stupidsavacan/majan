# Phase 16 GameEngine Responsibility Split

## Goal

Phase 16 splits the oversized `GameEngine.js` into focused modules without intended gameplay behavior changes.

## Problem Before Split

`GameEngine.js` held round lifecycle, dealing, CPU turn progression, human actions, ron, calls, kan, chankan, exhaustive draw, record events, recovery bridges, state synchronization, and draw-context construction in one file. That made later bug fixes risky because unrelated behavior lived in the same method cluster.

## Module List

- `src/game/DrawContext.js`: normal draw context, initial dealer draw context, rinshan/houtei context, tenho/chiho guard.
- `src/game/RecordFlow.js`: game record events, tile snapshots, assist event recording, score_settlement debug log bridge.
- `src/game/RoundLifecycle.js`: `startRound`, `startNextRound`, `dealInitialHands`, game record finishing, exhaustive draw tenpai bridge.
- `src/game/TurnFlow.js`: human discard, CPU automation, discard continuation, empty-wall transition, turn progression.
- `src/game/WinFlow.js`: tsumo, ron candidate collection, head-bump policy, ron resolution, human win analysis.
- `src/game/CallFlow.js`: call-window handling, human call claim, skip path, call cleanup.
- `src/game/KanFlow.js`: human kan, CPU kan, multiple kan choice, chankan, pending kan finalization, rinshan handoff.
- `src/game/RecoveryFlow.js`: bridge helpers from recovery paths into normal Call/Kan/Round/Win flows.
- `src/game/GameEngine.js`: constructor, state ownership, public API wrappers, state snapshot, logging, change emission.

## Behavior Preservation Tests

Phase 16 added:

- `tests/game-engine-public-api.test.js`
- `tests/game-engine-module-load-order.test.js`
- `tests/game-engine-behavior-preservation.test.js`
- `tests/flow-module-boundaries.test.js`
- `tests/draw-context-flow-preservation.test.js`
- `tests/record-flow-preservation.test.js`
- `tests/recovery-flow-preservation.test.js`

All Phase 14.1, Phase 14.2, Phase 14.2C, Phase 14.2D, and Phase 15 regression tests remain registered in `tests/run-all-tests.js`.

## Known Refactor Risks

- Flow modules still mutate the shared `GameEngine` instance directly. This preserves behavior, but future phases should keep new logic inside the matching Flow module.
- The public `GameEngine` wrappers intentionally remain for UI compatibility and older tests.
- Recovery still delegates to existing normal flow methods; Phase 16.1 bug fixes should add a focused regression before changing recovery behavior.

## Phase 16.1 Bug Report Format

Use `docs/PHASE16_1_BUG_INTAKE.md` for reports. Include reproduction steps, expected result, actual result, suspected Flow module, relevant record/debug events, and priority.
