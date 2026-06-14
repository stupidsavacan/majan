# Phase 9.2 Rules / Scoring / Log / Source Format Audit

## Summary

- Overall status: PASS
- Canonical app path: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- User entry point: root `index.html`
- Tests: canonical・root・ZIPの全テスト、全非生成JavaScript構文検査、root・ZIPブラウザ確認を実施
- Commit: `Phase 9.2 rules scoring and source format fixes`

## Baseline State

- git status before: clean (`main...origin/main`)
- recent commit context: `1d0e22d Phase 9.1 cleanup storage audit`
- Phase 9.1 report found: rootとcanonicalの `PHASE9_1_CLEANUP_STORAGE_AUDIT.md`
- canonical source root: `extracted-zips/offline-sanma-mahjong-phase1/src`
- test runner: `extracted-zips/offline-sanma-mahjong-phase1/tests/run-all-tests.js`
- duplicated app copies: root entry point・root tests・canonical app・配布ZIP。root entry pointとroot tests、ZIPも同期対象

## Implemented Fixes Matrix

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Riichi yaku | PASS | `YakuAnalysis.js`, `rules-scoring-regression.test.js` | 門前かつ立直時に1飜。立直のみでも有効 |
| Ippatsu | PASS | `Player.js`, `RiichiManager.js`, `GameEngine.js` | 宣言時開始、本人の打牌・成立した鳴きで解除 |
| winningTile context | PASS | `ActionResolver.js` | ロンは捨て牌、ツモは `lastDraw` |
| waitType / practical pinfu | PASS | `ActionResolver.waitTypeForPattern` | 両面・嵌張・辺張・単騎・双碰を保守的に判定 |
| red dora | PASS | `DoraCalculator.js` | 赤ドラなし設定を尊重 |
| normal dora | PASS | `DoraCalculator.js` | 数牌・三麻萬子・風牌・三元牌の循環対応 |
| kita dora | PASS | `DoraCalculator.js` | `northMode === "kita-dora"` のみ加算 |
| high score mode dora multiplier | PASS | `DoraCalculator.js` | 赤いドラ表示牌の対象牌を1枚2飜として計算 |
| dora-only no-yaku block | PASS | `YakuAnalysis.js`, `ScoreCalculator.js` | 通常役がない場合はドラを適用せず和了無効 |
| riichi discard lock | PASS | `GameEngine.js`, `renderTable.js` | 人間・CPUともツモ切りのみ。異常時は安全終了 |
| basic furiten | PASS | `ActionResolver.ronAvailability` | 和了牌と同種牌が自分の河にあればロン不可 |
| record log capture direction | PASS / already fixed | `GameEngine.recordGameEvent`, `GameRecord.addEvent` | UIログの逆順コピーはなく、構造化イベントを直接時系列追加 |
| JS source formatting | PASS | `source-format.test.js` | `src/game`, `src/storage`, `src/ui`, `tests` を監査 |
| CSS source formatting | PASS | `source-format.test.js` | 非生成CSSを監査し、圧縮状態の3ファイルを整形 |

## Tests Added or Updated

| Test file | Coverage | Notes |
|---|---|---|
| `tests/rules-scoring-regression.test.js` | 立直・一発・待ち形・ドラ・立直制約・フリテン・牌譜順序 | Phase 9.2専用回帰スイート |
| `tests/yaku-analysis.test.js` | `DoraCalculator` 読み込み | 既存役判定を維持 |
| `tests/score-calculator.test.js` | `DoraCalculator` 読み込み | 既存点数計算を維持 |
| `tests/action-resolver.test.js` | `DoraCalculator` 読み込み | 既存操作判定を維持 |
| `tests/smoke.test.js` | Phase 9.2・モジュール・script順 | `DoraCalculator` を必須化 |
| `tests/source-format.test.js` | JSとCSSの整形監査 | `yuji-mai-embedded.css` のみ明示除外 |
| `tests/storage-records.test.js` | イベント時系列・重複・上限 | 既存回帰が引き続き通過 |

## Source Format Audit

- JS paths checked: `src/game/**/*.js`, `src/storage/**/*.js`, `src/ui/**/*.js`, `tests/**/*.js`
- CSS paths checked: `src/styles/**/*.css`
- Exceptions: `src/styles/yuji-mai-embedded.css`（base64埋め込みフォント生成物）
- Reformatted files: `src/styles/main.css`, `src/styles/phase4.css`, `src/styles/phase8.css`
- Visual policy: 値・セレクタ・牌デザインは変更せず、改行とインデントのみ整形

## Record Log Audit

`GameEngine.addLog()` はUI用ログを `unshift()` しますが、牌譜はUIログ配列を読み取っていません。各ゲーム操作が `GameEngine.recordGameEvent()` から `GameRecord.addEvent()` を直接呼び、イベントを末尾へ時系列追加しています。連続イベントの順序・一意なindex・300件上限は回帰テストで確認しました。

## 軽量バグチェック

- root `index.html` とcanonical `index.html` が `DoraCalculator.js` を `YakuAnalysis.js` より先に読み込むことを確認
- 必須 `Sanma.*` モジュールとscript順をsmoke testで確認
- root `index.html` の直接 `file://` 起動方針を維持
- CDN、Google Fonts、`fetch()`、外部script、外部フォント要求を追加していない
- 人間打牌、新しい局、デバッグパネル、牌譜・設定UIのブラウザ操作を確認
- 立直後に直接北抜き・カン確認へ到達しないようmanager側にも防御を追加

## Deferred Items

- full match flow
- East/South round progression
- dealer continuation and full honba progression
- full furiten, missed-ron furiten, same-turn furiten
- kan execution, rinshan, kan dora, kan ura, chankan
- ura dora
- CPU ron and CPU calls
- full replay viewer

## Test Results

```text
canonical: node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

root: node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

ZIP展開後: node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

root/canonical/ZIP syntax:
JavaScript syntax checks passed.

root・ZIPブラウザ監査:
modulesDefined=true, clickDiscardWorked=true, touchDiscardWorked=true,
debugSectionsPresent=true, settingsRoundTrip=true, recordsPanelWorked=true,
externalRequests=[], consoleErrors=[], pageErrors=[]
```

## Acceptance Decision

PASS: Phase 9.2 complete enough to proceed toward Phase 10.
