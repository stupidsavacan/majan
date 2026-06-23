# Offline Sanma Mahjong - Phase 16

完全オフラインで動作する三人麻雀ブラウザゲームです。ユーザー向けの入口は root `index.html` です。ビルド、サーバー、CDN、外部フォント取得、ネットワーク通信は不要です。

## 現在の状態

Phase 16 では `GameEngine.js` に集中していた処理を Flow モジュールへ分割し、既存の public API を維持しています。

- `DrawContext.js`: 通常ツモ、親初手、嶺上、河底、天和/地和ガードの文脈生成
- `RecordFlow.js`: 牌譜イベント、牌スナップショット、debug 連携
- `RoundLifecycle.js`: 局開始、次局、配牌、流局判定、牌譜完了
- `TurnFlow.js`: 人間打牌、CPU自動進行、打牌後進行、山0枚遷移
- `WinFlow.js`: ツモ、ロン候補、頭ハネ/ダブロン、ロン解決
- `CallFlow.js`: 鳴き窓、鳴き選択、スキップ
- `KanFlow.js`: 人間/CPU槓、槍槓、嶺上処理
- `RecoveryFlow.js`: RecoveryManager から通常 Flow へ戻す橋渡し

## 実装済みの主な挙動

- 実親ローテーションを維持し、CPU 1 / CPU 2 も親になります。
- CPU親は局開始時に自動進行し、初打牌で余分な通常ツモを行いません。
- CPU通常ロン、CPU槍槓、頭ハネ優先、フリテン判定、ロン優先を維持しています。
- CPUのポン/チー/明槓は実装済みです。ポン/チー後は消費牌だけを手牌から取り除き、呼ばれた牌を打牌者の河から取り除き、open meld を作成します。
- CPUの明槓は既存の `KanFlow` / `KanRules` に委譲し、嶺上・カンドラ・槍槓の既存処理を通ります。
- CPUは可視牌だけから残り枚数を推定し、簡易リスク分析、押し引きモード、明槓判断を使います。
- ダブロンは `RuleConfig.doubleRonPolicy.allowed` で切り替え可能です。既定は頭ハネで、ON 時は同一打牌の複数ロンを複数勝者として精算します。
- `GameEngine.getState()` は通常 UI 用に CPU 手牌、内部 tileLedger、壁/王牌の隠し情報、未完了牌譜本文を公開しません。
- ロン成立時は勝者の手牌だけを `winResult.revealedHand` で公開し、非勝者 CPU の手牌は隠したままです。
- 牌譜/Replay/Stats/UI は複数勝者、鳴き、流局精算、リーチ供託を扱います。

## エントリポイント

- User entry: `index.html`
- Canonical app copy: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- Canonical source: `extracted-zips/offline-sanma-mahjong-phase1/src`
- Central test runner: `node tests/run-all-tests.js`

Root `index.html` が canonical runtime を読み込みます。Root `src/main.js` は実行入口ではありません。

## 現在の制限

- CPU戦略は簡易です。専門的な押し引き、完全な安全牌判断、打点期待値AIではありません。
- 半荘/西入、ZIP入出力そのものの完全検証UI、人和・流し満貫・ローカル採用差の大きい特殊ルールは未実装または採用未定です。

## ドキュメント

- `docs/INDEX.md`: 現行ドキュメント索引
- `docs/ARCHITECTURE.md`: Phase 16 後の構成
- `docs/PHASE16_GAME_ENGINE_SPLIT.md`: Phase 16 責務分割レポート
- `docs/PHASE16_1_BUG_INTAKE.md`: Phase 16.1 バグ受付形式
- `docs/ISSUE26_ACCEPTANCE_MATRIX.md`: Issue #26 受け入れ表
- `docs/ISSUE26_YAKU_BC_STATUS.md`: Priority B/C 役の実装・保留判断
- `docs/TESTING.md`: ローカル/CI 検証手順
- `docs/BUGS.md`: 現在確認済みの未解決事項
- `docs/ROADMAP.md`: 今後の作業
- `CHANGELOG.md`: Phase 16 までの履歴

過去の `PHASE*.md` は `docs/archive/` 配下の履歴資料です。現在仕様はこの README と `docs/` を優先してください。
