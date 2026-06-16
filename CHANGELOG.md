# Changelog

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
