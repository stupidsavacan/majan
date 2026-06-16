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

- CPU pon/chi/minkan implementation.
- New yaku or scoring rules.
- UI redesign.
- Storage format breaking changes.
- Direct push to `main`.
