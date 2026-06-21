# Phase 16.1 Bug Intake

Phase 16.1 is reserved for bug fixes found after the GameEngine responsibility split. It should not add new gameplay features or CPU strategy changes.

## Intake Policy

Collect every post-Phase 16 bug report here or in an issue/PR body using this structure:

```yaml
bug_report:
  title: ""
  priority: "P0/P1/P2"
  reproduction_steps:
    - ""
  expected_result: ""
  actual_result: ""
  related_module:
    - "RoundLifecycle | TurnFlow | WinFlow | CallFlow | KanFlow | DrawContext | RecordFlow | RecoveryFlow | GameEngine"
  related_tests:
    - ""
  record_or_debug_events:
    - ""
  browser_or_node_context: ""
```

## Required Fix Flow

- Reproduce the bug with a deterministic test.
- Fix the matching Flow module or the thin `GameEngine` wrapper only when the wrapper boundary is wrong.
- Preserve public API and UI behavior unless the report explicitly proves current behavior is a bug.
- Run `node tests/run-all-tests.js`.
- Run `node --check` for changed JavaScript files.
- Update documentation only after the implementation and regression test are present.

## Out Of Scope For Phase 16.1

- CPU call strategy expansion beyond the currently implemented pon/chi/minkan flow.
- New yaku or scoring rules.
- UI redesign.
- Storage format breaking changes.
- Direct push to `main`.

## Issue Bug Sweep Result

The first Phase 16.1 issue sweep fixed the high-confidence runtime and storage/replay bugs reported after the GameEngine split.

Implemented fixes:

- Pending kan finalization failures preserve `pendingKanAttempt`.
- `GameEngine.getState()` returns defensive snapshots instead of live mutable references.
- Recovery manual draw clears stale `lastDiscard`.
- RecoveryManager handles TileLedger corruption before closing stale call windows.
- Chankan recovery escapes dead human-call states when the pending kan attempt is absent.
- Human ron windows contain only ron actions and stay valid when the wall is empty.
- `RecoveryFlow.resolvePendingCpuRon()` resolves the stored pending CPU ron candidate.
- Imported records are excluded from official advanced stats; local saved records remain eligible.
- Record import validation rejects unsafe final points, complete ranking mismatches, and impossible complete settlement changes.
- Replay records diagnostics and marks pruned or missing-tile records as partial.
- Kan replay can fall back to event tile data when consumed instance IDs are missing.
- Kita replacement draw events are recorded before assist events.
- Haitei is not awarded on kita replacement draws.

Regression tests:

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`

Verification:

- `node tests/run-all-tests.js`
