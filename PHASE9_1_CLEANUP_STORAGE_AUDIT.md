# Phase 9.1 Cleanup / Storage Audit

## Summary

- Overall status: PASS
- Canonical app path: root `index.html` + `extracted-zips/offline-sanma-mahjong-phase1` source root
- Tests: root、canonical展開版、再構築ZIPで `node tests/run-all-tests.js`
- Commit: `Phase 9.1 cleanup storage audit`

## Baseline State

- git status before: clean (`main...origin/main`)
- recent commit context: `4dee8ce Implement Phase 8 records and persistence`
- Phase 8は存在したが、Phase 9表示・文書・起動堅牢化・広範囲ソース整形検査が不足

## App Location Audit

- canonical index: repository root `index.html`
- source root: `extracted-zips/offline-sanma-mahjong-phase1/src`
- test runner: root `tests/run-all-tests.js` とcanonical `tests/run-all-tests.js`
- duplicate copies: root `src/main.js` は旧ローダーでroot indexから未使用。root testsはcanonical sourceを解決する同期コピー。`uploads/`配下は過去受領物でcanonical配布物ではない
- sync policy: root index、root/canonical docs・reports・共通テスト、配布ZIPを同期。root個別テストのcanonical source解決アダプターだけは意図的に異なる。ゲームソースはcanonical source rootのみ編集

## Phase 8 Completeness Matrix

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Record model | FIXED | `GameRecord.js`, storage tests | 明示的な`addRound()`を追加。イベント上限・直列化・不正形式拒否を確認 |
| Record storage | PASS | `gameRecordStorage.js`, storage tests | 最新20件、個別破損読み飛ばし、JSON復旧、成績、診断、リセットを確認 |
| Record UI | FIXED | `recordPanel.js`, browser audit | 空状態・成績・履歴・JSON・リセットに加え、破損復旧状態を表示 |
| Settings export/import | FIXED | `settingsExportImport.js`, storage/browser tests | versioned JSON、検証、不正JSON日本語エラー、明示UI IDを確認 |
| Main integration | PASS | `GameEngine.js`, `main.js`, storage tests | 構造化イベントを直接時系列記録し、終了牌譜をID単位で一度だけ確定保存 |

## Phase 9 Completeness Matrix

| Area | Status | Evidence | Notes |
|---|---|---|---|
| App identity | FIXED | root/canonical `index.html`, README | Phase 9.1表示へ更新 |
| Offline integrity | PASS | browser audit, source search | 外部通信0件、file直接起動、埋め込みYuji Mai |
| Script order | PASS | smoke static test | 重複scriptなし、GameRecord・storage・UI・main順を検査 |
| Startup hardening | FIXED | `main.js`, browser audit | 初期化・描画・新しい局・主要UI操作を日本語エラー境界で保護 |
| Diagnostics | FIXED | `main.js`, debug browser check | Phase 9.1、module、storage、records、font、offline、last error |
| Documentation | FIXED | Phase 8/9/9.1 reports, checklist, README | root/canonicalを同期 |
| Tests | FIXED | run-all, smoke, storage, source-format | Phase 9.1表示、DOM ID、保存境界、全ソース範囲を追加 |

## Concrete Risk Check Results

| Risk | Status | Evidence | Notes |
|---|---|---|---|
| Record log capture direction | PASS | `GameEngine.recordGameEvent`, storage test | 表示ログの`unshift()`を牌譜へslice再取得せず、操作時に直接append。時系列と重複なしをテスト |
| Source format coverage | FIXED | `source-format.test.js` | `src/game`、`src/storage`、`src/ui`、`tests`の35ファイルを検査 |
| DOM ID reference audit | FIXED | `smoke.test.js` | `main.js`の必須IDをcanonical indexと静的照合 |
| Reset storage scope | PASS | `settingsStorage.js`, main/browser audit | 「全保存データをリセット」は`offlineSanma.*`の設定・牌譜・成績を削除 |
| Records export button behavior | FIXED | `recordPanel.js` | 「牌譜JSON表示」「牌譜JSONをコピー」の正直なラベルへ明確化 |
| Duplicate copy sync | FIXED | root/canonical docs/tests/reports, ZIP | root入口がcanonical sourceを利用する方針を明記し同期 |

## Source Risk Audit

| Check | Status | Notes |
|---|---|---|
| Conflict markers | PASS | `<<<<<<<` / `=======` / `>>>>>>>`なし |
| Stale Phase 7 user-facing text | PASS | current phase表示は9.1。`Phase 7 CPU思考`はCPUログの実装由来ラベルとして意図的に維持 |
| Duplicate event listeners/functions | PASS | `main.js`のlistenerと主要関数を監査し、重複なし |
| Unsafe localStorage parse | PASS | settings・records・statsは例外を捕捉し対象データだけ復旧 |
| Unguarded JSON import | PASS | 不正JSONは日本語理由を返し、現在設定を変更しない |
| `Sanma.*` order risk | PASS | smokeでscript存在・重複・順序を静的検査 |

## Storage Keys and Compatibility

- records key: `offlineSanma.phase8.records`
- stats key: `offlineSanma.phase8.stats`
- settings key: `offlineSanma.phase1.settings`
- migration needed now: no
- reason: 既存オフライン保存との互換性を優先し、Phase 9.1ではキー名を意図的に維持

## UI Wiring Audit

| Element | Status | Notes |
|---|---|---|
| Top bar | PASS | 新しい局、設定、牌譜・成績、デバッグ |
| Settings dialog | PASS | 設定描画・保存、JSON表示/読込、設定初期化。不正JSONは非破壊 |
| Records dialog | PASS | 空状態、履歴、成績、JSON表示/コピー、牌譜/成績個別リセット |
| Debug dialog | PASS | seed、全保存データリセット、Phase 9.1診断 |

## DOM ID Static Audit

| ID | Status | Notes |
|---|---|---|
| `tableRoot`, `messagePanel` | PASS | canonical indexに存在 |
| `settingsDialog`, `settingsRoot`, `settingsTransferRoot`, `saveSettingsButton` | PASS | canonical indexに存在 |
| `recordsDialog`, `recordsRoot` | PASS | canonical indexに存在 |
| `debugDialog`, `debugRoot`, `seedInput`, `applySeedButton`, `resetStorageButton` | PASS | canonical indexに存在 |
| generated settings/records IDs | PASS | UI module sourceとsmokeで確認 |

## Corruption Recovery Audit

| Case | Status | Notes |
|---|---|---|
| Empty records/stats | PASS | 空配列・既定成績・診断をテスト |
| Corrupted settings JSON | PASS | 対象キーを除去し既定設定で継続 |
| Corrupted records JSON | PASS | 対象キーを除去し空配列で継続 |
| Invalid individual record | PASS | 正常牌譜を残して不正牌譜のみ読み飛ばす |
| Invalid stats fields | PASS | フィールド単位で安全に既定値へ正規化 |

## Offline Audit

- external scripts: none
- external fonts: none。Yuji Maiはdata URL埋め込み
- fetch/network: none。ブラウザ監査でexternal requests 0件
- file:// direct open assumption: root/canonical/ZIP展開版で確認

## Source Format Audit

- checked paths: `src/game/**/*.js`, `src/storage/**/*.js`, `src/ui/**/*.js`, `tests/**/*.js`
- reformatted files: `src/ui/renderTiles.js`, `tests/score-calculator.test.js`
- source-format test coverage: 35 JavaScript files、少数行圧縮と240文字超行を失敗扱い

## Test Results

- `node tests/run-all-tests.js`: PASS、全Phase 9.1テスト成功
- root個別解析/役/点数/操作テスト直接実行: PASS。root固有パス解決アダプターも確認
- canonical source/testsの全JavaScript `node --check`: PASS、36ファイル、失敗0
- root/canonical/ZIP `file://` browser audit: PASS、外部通信・console error・page error 0件

## Fixes Made

- `src/main.js`: Phase 9.1診断、起動・描画・操作エラー境界、保存失敗表示
- `src/game/GameRecord.js`: `addRound()`追加
- `src/ui/recordPanel.js`: 破損復旧表示、正直なJSONボタン名、明示ID
- `src/ui/settingsExportImport.js`: 明示ID
- `src/ui/renderTiles.js`: 動作・牌デザインを変えずレビュー可能に整形
- `tests/*`: 保存境界、時系列/重複、DOM/script順、全ソース整形範囲
- root個別テスト: canonical source解決アダプターを復元し、直接実行失敗を修正
- root/canonical index・README・reports・ZIP: Phase 9.1へ同期

## Deferred Items

- 複数局・対局進行と、それに伴う`gamesPlayed`境界の再定義
- カン実行、フリテン、ippatsu、ドラ点数計算、リーチ後打牌制限
- フルアニメーション牌譜再生

現在の簡易1局進行では、終了した1局を1対局として`gamesPlayed`へ記録します。

## Acceptance Decision

PASS: Phase 8/9 complete enough to proceed to Phase 10
