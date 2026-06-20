# Current Bugs

## Phase 16.1 Issue Sweep

The reported pending-kan, `getState()` live-reference, recovery softlock, ron-window, pending CPU ron, imported-record stats, record import validation, replay diagnostics, kan replay fallback, kita replacement ordering, and haitei-on-kita-replacement bugs have regression coverage in:

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`

## Phase 16.2 Issue #6 Resolution

Issue #6の scoring / storage / replay addendum は次の回帰テストで修正済みです。

- `tests/issue6-resolution-regressions.test.js`

修正済みの範囲:

- 多面分解和了の候補列挙と最大スコア候補選択
- 失敗した人間の鳴き選択後の stale `callWindow` 解消
- 流局時の全員テンパイ/ノーテン記録
- 復旧済み局結果でも `finishGameRecord()` が対局状態を同期
- 成績リセット後の高度成績集計抑止
- 不正 `winnerIndex` / 無効和了 / 未完了牌譜の集計防御
- 数え役満・複数役満の成績/索引表示
- 古い牌譜の点数移動リプレイ復元
- stale `RecordIndex` の同一ID照合と再構築

Current known remaining limitations are still the documented larger gameplay scope items: double ron, extended CPU strategy, South/West extension flow, and ZIP workflow hardening.

2026-06-16時点で、中央テストランナーで再現する未修正の重大バグはありません。

Phase 16後に分割起因の不具合を確認した場合は、`docs/PHASE16_1_BUG_INTAKE.md` の形式で再現手順、期待結果、実際結果、関連Flowモジュール、関連テスト、優先度を記録します。
