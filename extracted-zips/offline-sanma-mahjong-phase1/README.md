# Offline Sanma Mahjong - Canonical App Copy

This directory is the canonical app copy for the offline Sanma Mahjong browser runtime.

For normal play, open the repository root `index.html`. The root entry point mirrors this canonical app copy while using root-relative paths into `extracted-zips/offline-sanma-mahjong-phase1/`.

The detailed project overview is the root `README.md`. This file only records runtime notes that are easy to confuse when working inside the canonical copy.

## Runtime notes

- User-facing entry point: root `index.html`.
- Canonical copy entry point: `extracted-zips/offline-sanma-mahjong-phase1/index.html`.
- Source modules: `src/game/`, `src/ui/`, and `src/storage/`.
- Central test runner from the repository root: `node tests/run-all-tests.js`.
- The runtime is browser JavaScript loaded by script tags. There is no bundler in the current runtime path.
- The app does not require a CDN, external font fetch, server API, account service, or online multiplayer service.
- Some filenames, storage keys, and diagnostics still contain historical `Phase` labels. Treat them as legacy labels.

## Implemented gameplay notes

- CPU normal ron, chankan ron, pon, chi, and minkan/open kan are implemented.
- Human call windows can present ron, pon, chi, minkan/open kan, and skip options when legal.
- Pon and chi create open melds by consuming the caller's hand tiles and removing the called tile from the discarder river.
- Minkan/open kan, ankan, and kakan go through `KanFlow` / `KanRules`.
- Chankan, rinshan replacement draws, kan dora, and kan ura dora are handled only through the implemented kan rule paths and only when the relevant rules are enabled.
- Default ron priority is head-bump. Double ron exists through `RuleConfig.doubleRonPolicy.allowed`, but it is off by default.
- CPU decision-making uses shanten estimation, visible tile counts, simple risk analysis, push/fold mode, and call/minkan heuristics.
- CPU fair-play logic uses visible information: its own hand, discards, open melds, kita tiles, visible dora indicators, and the current last discard. It does not use opponent concealed hands, the live wall, or dead-wall tiles for visible-count/risk decisions.
- `GameEngine.getState()` and `UiStateView` provide GameEngine.getState() masking for UI output. CPU hands, raw wall/dead-wall information, full pending hidden analysis, and raw `tileLedger` internals are not exposed to normal rendering.
- Ron results reveal the winning hand through `winResult.revealedHand`; non-winning CPU concealed hands remain hidden.
- Records, replay, and stats are implemented through `GameRecordStorage`, `RecordPanel`, `ReplayViewer`, `RecordIndex`, and `AdvancedStats`.

## Current limitations

- CPU play is heuristic and should not be described as a strong/full mahjong AI.
- There is no online multiplayer, server-side account system, cloud save, or production-grade anti-cheat.
- Rule support is broad but not exhaustive; local rules and rare variants may be disabled, deferred, or missing.
- Browser `localStorage` limits apply to settings, records, and stats.
- Older or imported records may replay partially if their event data is incomplete or pruned.
