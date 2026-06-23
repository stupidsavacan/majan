# Offline Sanma Mahjong

Offline Sanma Mahjong is an offline, single-player Sanma (three-player Japanese mahjong) browser game. You play against two CPU seats in one local browser page. The current implementation is plain HTML, CSS, and browser JavaScript, and it does not require a server process, account system, CDN, online multiplayer service, or network communication at runtime.

The playable UI is mostly Japanese. Source files, storage keys, diagnostic labels, and some older documents still contain legacy `Phase` names. Treat those labels as historical implementation names, not as a promise that the game is still in an early phase or that old phase plans are current.

## Current status

- Playable local Sanma table: human player + two CPU players.
- The user-facing entry point is root `index.html`.
- The canonical app copy is `extracted-zips/offline-sanma-mahjong-phase1/`; root `index.html` mirrors that copy while prefixing script and asset paths from the repository root.
- The runtime is offline-first and does not fetch external assets during play.
- Game state, records, settings, and stats are stored in browser `localStorage`.
- CPU play is heuristic. It uses shanten estimation, visible tile counts, simple hand-value/risk scoring, and push/fold mode, but it is not a strong or complete mahjong AI.

## How to run

Open the root `index.html` in a browser.

```text
index.html
```

A static local server is optional. For example, from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

No build step is required for the browser game. The app is loaded from script tags in the HTML files.

## How to test

Run the central Node test runner from the repository root:

```bash
node tests/run-all-tests.js
```

The tests are plain Node scripts and cover hand analysis, yaku/scoring, rule regressions, UI masking, CPU strategy/risk, storage/records/replay, call/kan flows, recovery paths, and documentation consistency.

## Main features

- Three-player Sanma round and match flow.
- Human actions for discard, tsumo, ron, riichi, kan, kita, and call-window decisions.
- CPU automation for drawing, discarding, tsumo, ron, riichi, kita, kan, and implemented calls.
- Settings dialog for public rule settings such as match length, north handling, chi, tsumo-loss, red dora, high-score mode, kuitan, atozuke, ura dora, kan dora, and kan ura dora.
- Fixed seed/debug controls for reproducible local investigation.
- Records panel with record list, detail view, replay, stats, JSON export/import, delete, and reset actions.
- SVG tile rendering in the browser; no image tile asset download is required.

## Game rules supported

The implementation is a Sanma rules engine rather than a full ruleset selector for every local variant. Current support includes:

- Three players with default 35,000 starting points.
- Match lengths: single hand, East-only, and hanchan.
- Round progression, honba, riichi sticks, dealer continuation, and match-end handling.
- Sanma tile set behavior through `HandAnalysis` / `TileUtil`, including the usual lack of 2-8 manzu in active play.
- North modes: kita-dora, normal tile, or disabled.
- Kita extraction with replacement draw when enabled, and kita counted as dora when configured.
- Tsumo-loss option.
- Red dora and high-score mode.
- Ura dora, kan dora, and kan ura dora options.
- Riichi, ippatsu, furiten checks, and riichi-after-declaration discard restrictions.
- Exhaustive draw tenpai/noten settlement using the configured noten-bappu style.
- Default head-bump ron priority; double ron is code-configurable through `RuleConfig.doubleRonPolicy.allowed` and is off by default.

Implemented yaku/scoring support includes common closed/open yaku, dora, and several yakuman. The code currently includes checks for riichi, ippatsu, menzen tsumo, tanyao, pinfu, iipeikou, ryanpeikou, yakuhai, chiitoitsu, toitoi, sanankou, sankantsu, shousangen, honroutou, honitsu, chinitsu, ittsuu, chanta/junchan, haitei, houtei, rinshan kaihou, chankan, tenho, chiho, kokushi musou including 13-wait, suuankou including tanki, daisangen, shousuushii, daisuushii, tsuuiisou, ryuuiisou, chinroutou, suukantsu, and chuuren/pure chuuren. Local-yaku-style features such as renhou and nagashi mangan are not generally enabled as normal gameplay yaku.

## Call and kan behavior

- Pon is implemented for human and CPU players.
- Chi is implemented when `allowChi` is enabled. In the current Sanma logic, chi is only from the previous player and only for suited pinzu/souzu sequences; chi is disabled by default.
- Minkan/open kan is implemented as a reaction to another player's discard when a legal minkan option exists.
- Ankan and kakan are implemented for self-turn kan choices.
- CPU normal ron, chankan ron, pon, chi, and minkan/open kan are implemented.
- Human call windows can show ron, pon, chi, minkan/open kan, and skip options when legal.
- Call priority is resolved through `CallResolver` / `CallFlow`, with kan before pon before chi for non-winning calls and ron handled separately.
- Kakan and ankan can be interrupted by chankan when the rule is enabled; ankan interruption is limited to the kokushi exception path implemented by the code.
- Kan finalization can reveal kan dora and draw a rinshan replacement tile when those rules are enabled.
- Riichi players are restricted from open calls; riichi ankan is limited to the current draw and only when the wait does not change.

## CPU behavior

The CPU is intentionally simple and transparent:

- Discard choice uses shanten estimation for standard hands, chiitoitsu, and kokushi.
- Candidate discards are scored with shape heuristics, estimated hand value, visible tile counts, estimated live tiles, simple danger scoring, and push/fold mode.
- Visible information includes the CPU's own hand, all discards, open melds, kita tiles, visible dora indicators, and the current last discard.
- CPU fair-play logic uses visible information only. It does not use opponent concealed hands, the live wall, or dead-wall tiles for its visible-tile counts or danger analysis.
- Risk analysis considers riichi threat, dealer/open-meld pressure, genbutsu, suji, kabe, honors, middle/terminal tiles, visible count, dora-indicator-like tiles, and wall timing.
- Call choice uses simple shanten/value/risk heuristics for pon, chi, and minkan/open kan.
- The CPU can still make weak or non-human-looking decisions. It is not a production-grade mahjong AI, not an EV searcher, and not a complete defense model.

## Architecture

The app uses a single browser global namespace, `window.Sanma`, and script-tag load order from the HTML files. There is no bundler in the runtime path.

High-level structure:

- `GameEngine.js` is the main engine facade. It owns the live round state and delegates most behavior to Flow modules.
- Flow modules split the old engine responsibilities:
  - `RoundLifecycle.js` starts rounds, deals hands, creates records, applies draw settlement, and advances matches.
  - `TurnFlow.js` handles discards, CPU turn progression, CPU discard choice, riichi, and kita.
  - `WinFlow.js` handles tsumo, ron, head-bump/double-ron resolution, scoring settlement, and revealed winner hands.
  - `CallFlow.js` handles human/CPU open calls, call windows, skips, and priority interactions.
  - `KanFlow.js` handles kan choice, kan attempts, chankan windows, and kan finalization.
  - `DrawContext.js`, `RecordFlow.js`, and `RecoveryFlow.js` provide supporting flow behavior.
- Rules and analysis are separated into modules such as `RuleConfig.js`, `ActionResolver.js`, `HandAnalysis.js`, `YakuAnalysis.js`, `ScoreCalculator.js`, `Settlement.js`, `RiichiRules.js`, `KanRules.js`, `FuritenManager.js`, and `KitaManager.js`.
- CPU-specific modules are `CpuStrategy.js`, `CpuVisibleTiles.js`, and `CpuRiskAnalysis.js`.
- UI state masking is centralized through `UiStateView.js` and `GameEngine.getState()`.
- Rendering lives under `src/ui/`, especially `renderTable.js`, `renderTiles.js`, `recordPanel.js`, and `ReplayViewer.js`.
- Storage modules live under `src/storage/` and use `localStorage`.

## Directory structure

```text
.
├── index.html                                      # user-facing root entry point
├── README.md                                      # current project overview
├── tests/                                         # root test runner and wrapper tests
├── docs/                                          # supporting docs and historical notes
└── extracted-zips/offline-sanma-mahjong-phase1/
    ├── index.html                                # canonical app copy entry point
    ├── README.md                                 # canonical copy notes
    ├── src/
    │   ├── game/                                 # engine, rules, analysis, flows, CPU logic
    │   ├── storage/                              # settings, records, migration/recovery
    │   └── ui/                                   # table rendering, tiles, records, replay
    └── tests/                                    # canonical test implementations
```

## Records, storage, replay, and stats

- Settings, records, indexes, and stats are saved in browser `localStorage` under historical `offlineSanma.*` keys.
- The record store keeps the latest 20 records.
- Completed records are committed through `GameRecordStorage`; failed record commits can be retried or discarded by the runtime.
- The Records panel can list, inspect, export, import, delete, and reset saved records.
- `ReplayViewer` rebuilds a replay view from record events and supports stepping, jumping, round selection, and auto playback.
- Stats are calculated from saved records, including match-level stats, hand-level stats, yaku frequencies, yakuman names, and mode breakdowns.
- Imported records are accepted through validation and ID collision handling, but imported records are not automatically treated as new stats-eligible games.

## Debugging notes

- The Debug dialog shows current phase, turn index, wall count, agari/yaku/scoring analysis, available actions, call windows, meld/kita summaries, tenpai analysis, rule config, CPU call logs, CPU thinking logs, assist logs, diagnostics, invariant summary, tileLedger summary, and debug events.
- `GameEngine.getState()` masks hidden information for normal UI/debug consumption: CPU hands are represented as hidden slots, CPU riichi details are reduced, raw wall/dead-wall information is not exposed, and only a tileLedger summary is shown.
- Ron results reveal only the winning hand through `winResult.revealedHand`; non-winning CPU concealed hands remain hidden.
- Fixed seeds can be applied from the Debug dialog for reproducible investigations.
- The reset-storage action clears `offlineSanma.*` localStorage data.

## Known limitations

- No online multiplayer.
- No server-side accounts, cloud saves, ranking service, or production-grade anti-cheat.
- CPU logic is heuristic and intentionally not a strong/full mahjong AI.
- Rule coverage is broad but not exhaustive. Local rules and rare variants may be disabled, deferred, or missing.
- Double ron support exists in code configuration, but it is not part of the public settings schema exposed by the normal Settings dialog.
- Chi exists behind `allowChi`, but default Sanma settings keep chi disabled.
- Browser storage limits apply. Very old, corrupted, imported, or pruned records may replay partially.
- The repository still contains archived phase documents and legacy labels. Prefer this README, `docs/`, and the current source code over older archive notes.

## Development notes

- Keep runtime changes in the canonical app copy under `extracted-zips/offline-sanma-mahjong-phase1/` unless the root entry point or docs specifically need updating.
- Keep root `index.html` and the canonical `index.html` load order aligned when adding or removing browser scripts.
- Avoid describing future plans as current features. Document only what the code implements.
- Run `node tests/run-all-tests.js` after changes when a full checkout is available.
