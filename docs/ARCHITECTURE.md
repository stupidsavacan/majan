# Architecture

## Runtime

- `index.html` is the user-facing offline entry point.
- Browser JavaScript uses the global `window.Sanma` namespace.
- There is no build step, server requirement, CDN, fetch dependency, or network font request.

## Main Areas

- `src/game`: rules, state, scoring, match flow, recovery, records
- `src/storage`: settings, records, migrations, record index
- `src/stats`: derived statistics
- `src/ui`: table rendering, settings, records, replay
- `src/debug`: debug event ring buffer
- `tests`: deterministic regression tests using the simple Node runner

## Phase 15 Integrity Points

- Dealer rotation remains real; CPU dealers can start rounds.
- Call and ron priority are resolved in `GameEngine` before UI call windows.
- `GameRecord` preserves initial and terminal replay context while pruning long logs.
- `RecoveryManager` uses the normal skip/finalize paths for pending ron and chankan windows.
- Storage import and retry logic separates imported record IDs from the active game record.
