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

These tests cover the issue sweep fixes for pending kan recovery, defensive state snapshots, recovery softlocks, ron-window action filtering, pending CPU ron recovery, imported-record stats eligibility, record import semantic guards, replay diagnostics, kan replay fallback, kita replacement event order, and haitei suppression on kita replacement draws.

## Issue #26 Test Foundation

Issue #26 acceptance coverage starts with a green foundation test instead of failing tests for features that are still intentionally unimplemented.

- `tests/issue26-acceptance-matrix.test.js` verifies that the Issue #26 matrix, current limitation docs, runner registration, and promotion policy stay synchronized.
- `tests/issue26-test-helpers.js` exposes matrix rows and deterministic fixture descriptors for later implementation PRs.
- `docs/ISSUE26_ACCEPTANCE_MATRIX.md` is the source-of-truth checklist for promoting TODO rows into executable tests.

Implementation agents should promote a TODO row only after the matching behavior is implemented, a deterministic test is added, and `node tests/run-all-tests.js` plus `node --check` for changed JavaScript files pass locally.

## Pull Request And CI

Phase 16 changes must go through a pull request. Direct push to `main` is forbidden for this phase.

GitHub Actions must pass before merge. The PR body records local commands, deterministic tests, and the Actions result.

## ZIP PR Gate

`.github/workflows/unpack-uploaded-zip.yml` unpacks uploaded ZIP sources into a branch and opens or updates a pull request. It must not push directly to `main`.

ZIP展開PRゲート: mainへ展開結果を直接pushしません。

## Issue #26 Integrated Tests

The F integration package registers these executable tests:

- `tests/issue26-priority-a-yaku.test.js`
- `tests/issue26-priority-bc-yaku.test.js`
- `tests/issue26-chi-default-and-ryuukyoku.test.js`
- `tests/issue26-daburon.test.js`
- `tests/issue26-record-replay-stats-ui.test.js`
- `tests/issue26-acceptance-matrix.test.js`
- `tests/issue26-test-helpers.js`
