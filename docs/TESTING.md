# Testing

## Local Required Commands

Run all deterministic tests from the repository root:

```bash
node tests/run-all-tests.js
```

Every changed JavaScript file must also pass:

```bash
node --check <changed-js-file>
```

Changed workflow YAML files must be parsed before PR merge.

## Phase 16 Refactor Verification

Phase 16 adds these behavior-preserving refactor tests:

- `tests/game-engine-public-api.test.js`
- `tests/game-engine-module-load-order.test.js`
- `tests/game-engine-behavior-preservation.test.js`
- `tests/flow-module-boundaries.test.js`
- `tests/draw-context-flow-preservation.test.js`
- `tests/record-flow-preservation.test.js`
- `tests/recovery-flow-preservation.test.js`

These tests verify public API compatibility, script order, Flow module boundaries, representative gameplay preservation, record flow, draw context, and recovery bridges.

## Phase 16.1 Issue Regression Tests

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`
- `tests/issue6-resolution-regressions.test.js`

These tests cover the issue sweep fixes for pending kan recovery, defensive state snapshots, recovery softlocks, ron-window action filtering, pending CPU ron recovery, imported-record stats eligibility, record import semantic guards, replay diagnostics, kan replay fallback, kita replacement event order, and haitei suppression on kita replacement draws.

`issue6-resolution-regressions.test.js` covers the Issue #6 scoring / storage / replay addendum: ambiguous hand score selection, stale call-window cleanup, exhaustive-draw tenpai records, stats reset isolation, malformed record/stat defense, counted and multi-yakuman record summaries, legacy replay point fallback, and stale record-index rebuilds.

## Pull Request And CI

Phase 16 changes must go through a pull request. Direct push to `main` is forbidden for this phase.

GitHub Actions must pass before merge. The PR body records local commands, deterministic tests, and the Actions result.

## ZIP PR Gate

`.github/workflows/unpack-uploaded-zip.yml` unpacks uploaded ZIP sources into a branch and opens or updates a pull request. It must not push directly to `main`.

ZIP展開PRゲート: mainへ展開結果を直接pushしません。
