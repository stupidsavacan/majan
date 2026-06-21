# Offline Sanma Mahjong - Phase 16

完全オフラインで動作する三人麻雀ブラウザゲームです。現在のユーザー向け入口は root `index.html` です。ビルド、サーバー、CDN、外部フォント取得、ネットワーク通信は不要です。

## Phase 16 Current Status

Phase 16は挙動保存リファクタです。`GameEngine` のpublic APIは維持しています。

Issue #26の普通三麻差分として、初期チーOFF、未実装役の追加、流局時テンパイ料/ノーテン罰符、ダブロン解決、牌譜/Replay/Stats/UI互換層を統合しました。

`GameEngine.js` に集中していた局開始、ターン進行、ロン、鳴き、槓、牌譜、復旧、ツモ文脈の処理を、次のFlowモジュールへ分割しています。

- `DrawContext.js`: 通常ツモ、配牌親ツモ、嶺上、河底、天和/地和ガードの文脈生成
- `RecordFlow.js`: 牌譜イベント、牌スナップショット、score_settlementデバッグ連携
- `RoundLifecycle.js`: 局開始、次局、配牌、流局時テンパイ判定、流局精算、牌譜終了
- `TurnFlow.js`: 人間打牌、CPU自動進行、打牌後進行、山0枚遷移
- `WinFlow.js`: ツモ、ロン候補、頭ハネ/ダブロン、ロン解決
- `CallFlow.js`: 鳴き窓、鳴き選択、スキップ
- `KanFlow.js`: 人間/CPU槓、槍槓、嶺上ハンドオフ
- `RecoveryFlow.js`: RecoveryManagerから通常Flowへ戻す橋渡し

`GameEngine` のpublic APIは維持しています。UIから呼ばれる `startRound`, `startNextRound`, `discardHumanTile`, `claimHumanTsumo`, `declareHumanRiichi`, `extractHumanKita`, `requestHumanKan`, `selectHumanKan`, `cancelHumanKanChoice`, `claimHumanCall`, `skipHumanCall`, `drawForHumanManually`, `getState` は同じ名前で利用できます。

## Issue #26 Integrated Scope

- 新規対局の `allowChi` 既定値は `false` です。設定画面またはインポートで明示された `allowChi: true` は尊重します。
- 追加役: 混一色、清一色、一気通貫、三暗刻、小三元、混全帯么九、純全帯么九、二盃口、三槓子、三色同刻。
- 追加役満: 四暗刻/四暗刻単騎、大三元、字一色、小四喜、大四喜、清老頭、緑一色、九蓮宝燈/純正九蓮宝燈、四槓子。
- 流局精算は三麻3人・合計3000点方式です。1人テンパイは +3000 / 各ノーテン -1500、2人テンパイは各 +1500 / ノーテン -3000、全員テンパイ/全員ノーテンは点棒移動なしです。
- ダブロンは `RuleConfig.doubleRonPolicy.allowed` で切り替え可能です。既定は頭ハネで、ON時は同一打牌の複数ロンを複数勝者として精算します。
- 牌譜は従来の `winnerIndex` を維持しつつ、複数勝者用の `winners[]`、流局精算、`double_ron`、`score_settlement` を保存/Replay/Statsへ渡せます。

## Phase 16.1 Issue Bug Sweep

Issue reports after the Phase 16 split were reproduced with deterministic tests and fixed in the Flow modules.

Regression coverage:

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`

## Preserved Behavior

- 実親ローテーションを維持し、CPU 1 / CPU 2 も親になります。
- CPU親は局開始時に自動進行し、初打牌で余分な通常ツモを行いません。
- CPU通常ロン、CPU槍槓、頭ハネ優先、フリテン判定、ロン優先は既存フローを維持しています。
- 山0枚ではロン以外のポン/チー/明槓窓を開かず、ロンなしなら流局します。
- 河底は最後の通常ツモ後の打牌だけに付与され、嶺上後や鳴き後打牌には付与されません。
- 牌譜イベント剪定は `deal` / `round_start` / `win` / `score_settlement` / `double_ron` を保持します。
- 保存失敗した終了牌譜は本体を保持し、明示的な再試行で保存できます。
- RecoveryManagerは pending CPUロン/槍槓、保留槓確定、局リセット牌譜整合性を維持します。

## Entry Points

- User entry: `index.html`
- Canonical app copy: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- Canonical source: `extracted-zips/offline-sanma-mahjong-phase1/src`
- Central test runner: `node tests/run-all-tests.js`

Root `index.html` がcanonical runtimeを読み込みます。root `src/main.js` は実行入口ではありません。

## Current Limitations

- CPUのポン/チー/明槓、CPU通常ロン、CPU槍槓は実装済みです。
- CPU戦略は簡易です。押し引き、安全牌判断、打点期待値AIは未実装です。
- 南入/西入、ZIP入力そのものの完全検証UIは未実装です。
- 人和、流し満貫、白ポッチなど採用差が大きい特殊ルールは未実装/採用未定です。

## Documentation

- `docs/INDEX.md`: 現行ドキュメント索引
- `docs/ARCHITECTURE.md`: Phase 16後の構成
- `docs/PHASE16_GAME_ENGINE_SPLIT.md`: Phase 16責務分割レポート
- `docs/PHASE16_1_BUG_INTAKE.md`: Phase 16.1バグ受付形式
- `docs/ISSUE26_ACCEPTANCE_MATRIX.md`: Issue #26受け入れ行列
- `docs/ISSUE26_YAKU_BC_STATUS.md`: Priority B/C役の実装/保留判断
- `docs/TESTING.md`: ローカル/CI検証手順
- `docs/BUGS.md`: 現在確認済みの未解決事項
- `docs/ROADMAP.md`: 今後の作業
- `CHANGELOG.md`: Phase 16までの履歴

過去の `PHASE*.md` は `docs/archive/` 配下の履歴資料です。現在仕様はこのREADMEと `docs/` を優先してください。
