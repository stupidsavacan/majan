# Changelog

## Phase 16.1 Issue Bug Sweep

- Fixed pending kan retry/recovery state preservation after failed kan finalization.
- Hardened `GameEngine.getState()` with defensive snapshots for mutable state.
- Fixed recovery edge cases for stale `lastDiscard`, TileLedger corruption, missing pending chankan attempts, and pending CPU ron candidates.
- Restricted human ron windows to ron actions only.
- Marked imported records as stats-ineligible and added semantic record import validation for unsafe points, complete ranking mismatches, and complete settlement deltas.
- Added replay diagnostics for pruned/missing-tile records and kan replay fallback when consumed instance IDs are absent.
- Preserved kita replacement event ordering and blocked haitei on kita replacement draws.
- Added `issue-runtime-flow-regressions.test.js` and `issue-storage-replay-regressions.test.js`.

## Phase 16

- Split `GameEngine.js` responsibilities into focused Flow modules without intended gameplay behavior changes.
- Added `DrawContext`, `RecordFlow`, `RoundLifecycle`, `TurnFlow`, `WinFlow`, `CallFlow`, `KanFlow`, and `RecoveryFlow`.
- Preserved GameEngine public API method names used by the UI.
- Added Phase 16 refactor verification tests for API compatibility, module load order, behavior preservation, module boundaries, draw context, record flow, and recovery flow.
- Updated architecture and testing documentation for the new module structure.

## Phase 15

- Fixed CPU dealer opening Assist 天和 guard.
- Preserved `deal`, `win`, and `score_settlement` during long record event pruning.
- Retained failed record bodies for explicit retry and prevented reset zombie records.
- Added meld-aware exhaustive draw dealer tenpai checks.
- Preserved pending CPU ron/chankan through RecoveryManager.
- Prevented non-ron call windows, houtei leakage, and minkan rinshan on empty wall.
- Reassigned imported record IDs when they collide with the active game.
- Consolidated README and docs as the Phase 15 source of truth.

## Phase 14.2C / 14.2D

- Fixed multi-wait furiten, opening yaku Assist guards, riichi ankan current-draw checks, no-double-ron policy, record ID validation, yakuman record index, settings recovery backup failures, head-bump ron/chankan priority, honbaPoints usage, and workflow hardening.

## Earlier Phases

Earlier `PHASE*.md` files are historical reports. They are useful for implementation history but are not the current source of truth.
