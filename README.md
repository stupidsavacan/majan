# Offline Sanma Mahjong - Phase 16

完全オフラインで動作する三人麻雀ブラウザゲームです。現在のユーザー向け入口は root `index.html` です。ビルド、サーバー、CDN、外部フォント取得、ネットワーク通信は不要です。

## Phase 16 Current Status

Phase 16は挙動保存リファクタです。新しい役、点数仕様、CPU戦略、UI操作は追加していません。

`GameEngine.js` に集中していた局開始、ターン進行、ロン、鳴き、槓、牌譜、復旧、ツモ文脈の処理を、次のFlowモジュールへ分割しました。

- `DrawContext.js`: 通常ツモ、配牌親ツモ、嶺上、河底、天和/地和ガードの文脈生成
- `RecordFlow.js`: 牌譜イベント、牌スナップショット、score_settlementデバッグ連携
- `RoundLifecycle.js`: 局開始、次局、配牌、流局時テンパイ判定、牌譜終了
- `TurnFlow.js`: 人間打牌、CPU自動進行、打牌後進行、山0枚遷移
- `WinFlow.js`: ツモ、ロン候補、頭ハネ、ロン解決
- `CallFlow.js`: 鳴き窓、鳴き選択、スキップ
- `KanFlow.js`: 人間/CPU槓、槍槓、嶺上ハンドオフ
- `RecoveryFlow.js`: RecoveryManagerから通常Flowへ戻す橋渡し

`GameEngine` のpublic APIは維持しています。UIから呼ばれる `startRound`, `startNextRound`, `discardHumanTile`, `claimHumanTsumo`, `declareHumanRiichi`, `extractHumanKita`, `requestHumanKan`, `selectHumanKan`, `cancelHumanKanChoice`, `claimHumanCall`, `skipHumanCall`, `drawForHumanManually`, `getState` は同じ名前で利用できます。

## Preserved Behavior

- 実親ローテーションを維持し、CPU 1 / CPU 2 も親になります。
- CPU親は局開始時に自動進行し、初打牌で余分な通常ツモを行いません。
- CPU通常ロン、CPU槍槓、頭ハネ優先、フリテン判定、ロン優先は既存フローを維持しています。
- 山0枚ではロン以外のポン/チー/明槓窓を開かず、ロンなしなら流局します。
- 河底は最後の通常ツモ後の打牌だけに付与され、嶺上後や鳴き後打牌には付与されません。
- 牌譜イベント剪定は `deal` / `win` / `score_settlement` を保持します。
- 保存失敗した終了牌譜は本体を保持し、明示的な再試行で保存できます。
- RecoveryManagerは pending CPUロン/槍槓、保留槓確定、局リセット牌譜整合性を維持します。

## Entry Points

- User entry: `index.html`
- Canonical app copy: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- Canonical source: `extracted-zips/offline-sanma-mahjong-phase1/src`
- Central test runner: `node tests/run-all-tests.js`

Root `index.html` がcanonical runtimeを読み込みます。root `src/main.js` は実行入口ではありません。

## Current Limitations

- ダブロンは未実装です。ロン候補が複数ある場合は頭ハネで最寄り1名を勝者にします。
- CPUのポン/チー/明槓は未実装です。CPU通常ロンとCPU槍槓は実装済みです。
- CPU戦略は簡易です。押し引き、安全牌判断、打点期待値AIは未実装です。
- 南入/西入、ZIP入力そのものの完全検証UIは未実装です。

## Documentation

- `docs/INDEX.md`: 現行ドキュメント索引
- `docs/ARCHITECTURE.md`: Phase 16後の構成
- `docs/PHASE16_GAME_ENGINE_SPLIT.md`: GameEngine責務分割レポート
- `docs/PHASE16_1_BUG_INTAKE.md`: Phase 16.1バグ受付形式
- `docs/TESTING.md`: ローカル/CI検証手順
- `docs/BUGS.md`: 現在確認済みの未解決事項
- `docs/ROADMAP.md`: 今後の作業
- `CHANGELOG.md`: 変更履歴

過去の `PHASE*.md` は `docs/archive/` 配下の履歴資料です。現在仕様はこのREADMEと `docs/` を優先してください。
