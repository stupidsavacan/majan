# Issue #26 Acceptance Matrix

This document tracks the integrated Issue #26 scope after F Integrator merge. Rows marked `existing-pass` are backed by deterministic tests registered in `tests/run-all-tests.js`; `foundation-pass` rows are covered by the matrix synchronization test itself.

Do not convert TODO rows to failing tests before the implementation PR supplies the implementation, deterministic test, runner registration, and local verification.

## Status policy

- `foundation-pass`: covered by the foundation/matrix test itself.
- `existing-pass`: covered by an executable deterministic test or an already-registered regression test.
- `todo`: required behavior that is still deferred.

## Matrix

### chi-off

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| CHI-001 | existing-pass | New RuleConfig default has allowChi=false for new games. | Promote CHI-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| CHI-002 | existing-pass | Existing imported/saved explicit allowChi settings keep their requested value. | Promote CHI-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| CHI-003 | existing-pass | Human chi call candidates are hidden when allowChi=false. | Promote CHI-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| CHI-004 | existing-pass | CPU chi candidates/reactions are suppressed when allowChi=false. | Promote CHI-004 only after implementation, deterministic test, runner registration, and local verification are present. |

### priority-a-yaku

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| YAKU-A-001 | existing-pass | Honitsu is detected with correct open/closed han. | Promote YAKU-A-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-002 | existing-pass | Chinitsu is detected with correct open/closed han. | Promote YAKU-A-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-003 | existing-pass | Suuankou is detected as yakuman and tanki double-yakuman rules are explicit. | Promote YAKU-A-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-004 | existing-pass | Daisangen is detected as yakuman. | Promote YAKU-A-004 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-005 | existing-pass | Tsuuiisou is detected as yakuman. | Promote YAKU-A-005 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-006 | existing-pass | Shousuushi is detected as yakuman. | Promote YAKU-A-006 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-A-007 | existing-pass | Daisuushi is detected as yakuman and double-yakuman policy is explicit. | Promote YAKU-A-007 only after implementation, deterministic test, runner registration, and local verification are present. |

### priority-bc-yaku

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| YAKU-BC-001 | existing-pass | Ittsuu is detected in sanma-valid suits with open/closed han. | Promote YAKU-BC-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-002 | existing-pass | Sanankou counts only concealed triplets/quads correctly. | Promote YAKU-BC-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-003 | existing-pass | Shousangen is detected with two dragon triplets and a dragon pair. | Promote YAKU-BC-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-004 | existing-pass | Chanta requires every set to contain terminal/honor and at least one sequence. | Promote YAKU-BC-004 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-005 | existing-pass | Junchan requires every set to contain terminal and no honors. | Promote YAKU-BC-005 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-006 | existing-pass | Ryanpeikou is detected only for closed hands and suppresses duplicate iipeikou scoring. | Promote YAKU-BC-006 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-007 | existing-pass | Chinroutou is detected as all-terminal yakuman. | Promote YAKU-BC-007 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-008 | existing-pass | Ryuuiisou is detected with the allowed green tile set only. | Promote YAKU-BC-008 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-009 | existing-pass | Chuuren poutou is detected in sanma-valid suits and pure nine-gates policy is explicit. | Promote YAKU-BC-009 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-010 | existing-pass | Sankantsu is detected from three quads. | Promote YAKU-BC-010 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-011 | existing-pass | Suukantsu is detected as yakuman from four quads. | Promote YAKU-BC-011 only after implementation, deterministic test, runner registration, and local verification are present. |
| YAKU-BC-012 | existing-pass | Sanshoku doukou is detected across sanma-valid suits/honor exclusions. | Promote YAKU-BC-012 only after implementation, deterministic test, runner registration, and local verification are present. |

### ryuukyoku-settlement

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| RYU-001 | existing-pass | Exhaustive draw with 0 tenpai players produces no tenpai payment. | Promote RYU-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-002 | existing-pass | Exhaustive draw with 1 tenpai player pays the single tenpai player correctly. | Promote RYU-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-003 | existing-pass | Exhaustive draw with 2 tenpai players splits payment correctly. | Promote RYU-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-004 | existing-pass | Exhaustive draw with 3 tenpai players produces no net payment. | Promote RYU-004 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-005 | existing-pass | Dealer tenpai draw follows renchan policy. | Promote RYU-005 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-006 | existing-pass | Dealer noten draw follows rotation policy. | Promote RYU-006 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-007 | existing-pass | Point deltas are conserved and match sanma noten-bappu totals. | Promote RYU-007 only after implementation, deterministic test, runner registration, and local verification are present. |
| RYU-008 | existing-pass | Draw settlement is saved into record/debug events for replay and stats. | Promote RYU-008 only after implementation, deterministic test, runner registration, and local verification are present. |

### daburon

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| DABU-001 | existing-pass | When double ron is OFF, head-bump resolves only the nearest winner. | Promote DABU-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| DABU-002 | existing-pass | When double ron is ON, two ron winners are resolved in the same discard. | Promote DABU-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| DABU-003 | existing-pass | The discarder pays both winners with correct parent/child values. | Promote DABU-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| DABU-004 | existing-pass | Riichi sticks, honba, dealer continuation, and winner ordering are deterministic. | Promote DABU-004 only after implementation, deterministic test, runner registration, and local verification are present. |
| DABU-005 | existing-pass | Record, replay, stats, and result UI represent multiple ron winners. | Promote DABU-005 only after implementation, deterministic test, runner registration, and local verification are present. |

### regression

| ID | Status | Acceptance | Promotion trigger |
| --- | --- | --- | --- |
| REG-001 | existing-pass | Phase 16.1 runtime and storage/replay regression tests stay registered. | Promote REG-001 only after implementation, deterministic test, runner registration, and local verification are present. |
| REG-002 | existing-pass | Root/canonical entry point documentation stays synchronized. | Promote REG-002 only after implementation, deterministic test, runner registration, and local verification are present. |
| REG-003 | foundation-pass | No implementation TODO row is silently treated as executable acceptance before its feature PR. | Promote REG-003 only after implementation, deterministic test, runner registration, and local verification are present. |
| REG-004 | foundation-pass | Issue #26 matrix, helper rows, docs index, and runner registration stay synchronized. | Promote REG-004 only after implementation, deterministic test, runner registration, and local verification are present. |
| REG-005 | foundation-pass | Changed JavaScript files remain parseable with node --check. | Promote REG-005 only after implementation, deterministic test, runner registration, and local verification are present. |
| REG-006 | todo | Renhou and nagashi mangan stay documented local-rule decisions until a dedicated implementation PR adds deterministic tests. | Promote REG-006 only after implementation, deterministic test, runner registration, and local verification are present. |

## Executable coverage

- `tests/issue26-priority-a-yaku.test.js`
- `tests/issue26-priority-bc-yaku.test.js`
- `tests/issue26-chi-default-and-ryuukyoku.test.js`
- `tests/issue26-daburon.test.js`
- `tests/issue26-record-replay-stats-ui.test.js`
- `tests/issue26-acceptance-matrix.test.js`
