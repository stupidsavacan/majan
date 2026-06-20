# Fix Agent A - Call Legality Hardening

## Summary

- Harden non-winning call availability against riichi lock states, including `riichi.pending` and `riichi.declared`.
- Make `CallResolver.selectCpuCallCandidate()` fall back to the deterministic first legal candidate when `CpuStrategy.chooseCall` is absent.
- Revalidate `applyOpenCall()` / `applyCpuCall()` pon and chi options against current legal `CallResolver` options before mutating hand, river, meld, turn, or call-window state.
- Add focused regressions for forged direct CPU pon/chi calls and register the new hardening test in both central test runners.

## Validation

- `node --check` was run locally on generated copies of the changed JS/test files.
- Full `node tests/run-all-tests.js` was not run from this environment because there is no complete local checkout available here.

## Notes

- Final PR diff intentionally contains only code/test changes. A temporary connector write check file was created and removed on this branch; it does not exist in the final tree.
