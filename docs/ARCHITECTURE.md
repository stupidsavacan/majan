# Architecture

## Runtime

- root `index.html` がユーザー向けオフライン入口です。
- canonical runtimeは `extracted-zips/offline-sanma-mahjong-phase1/` 配下です。
- ブラウザJSはglobal `window.Sanma` 名前空間へclassic scriptとして読み込まれます。
- ビルド、サーバー、CDN、fetch、外部フォント要求は不要です。

## Phase 16 GameEngine Split

`GameEngine.js` は状態所有とpublic API互換を担う薄い司令塔です。詳細処理は次のモジュールへ分割しました。

- `DrawContext`: 通常ツモ、親初期ツモ、嶺上、河底、天和/地和文脈。
- `RecordFlow`: 牌譜イベント、牌スナップショット、score_settlement debug連携。
- `RoundLifecycle`: `startRound`, `startNextRound`, 配牌、局終了牌譜、流局テンパイ橋渡し。
- `TurnFlow`: 人間打牌、CPU自動進行、打牌後進行、山0枚遷移、ターン移動。
- `WinFlow`: ツモ、ロン候補収集、頭ハネ、ロン解決、和了文脈引き渡し。
- `CallFlow`: 鳴き窓作成、鳴き実行、スキップ、鳴き窓掃除。
- `KanFlow`: 人間/CPU槓、複数槓選択、槍槓、保留槓確定、嶺上引き渡し。
- `RecoveryFlow`: RecoveryManagerから通常Flowへ戻るための橋渡し。

## Script Load Order

Flowモジュールは既存のルール/状態/牌譜/復旧モジュールの後、`GameEngine.js` の前に読み込みます。

```text
DrawContext.js
RecordFlow.js
RoundLifecycle.js
TurnFlow.js
WinFlow.js
CallFlow.js
KanFlow.js
RecoveryFlow.js
GameEngine.js
```

この順序はroot `index.html`、canonical `index.html`、Nodeテストの `test-helpers.js` で維持します。diagnosticsは新規Flowモジュールも必須moduleとして確認します。

## Public API Policy

UIから呼ばれるGameEngine method名、引数、戻り値の意味は維持します。`GameEngine` は同名methodを持ち続け、内部でFlowモジュールへ委譲します。

## State Ownership

`GameEngine` が `players`, `wall`, `round`, `phase`, `turnIndex`, `gameRecord`, `callWindow`, `pendingKanAttempt`, `lastDrawContext` を所有します。Flowモジュールは同じengine instanceを `this` として受け取り、従来と同じ副作用を行います。

## Phase 16.1 Bug-Fix Flow

Phase 16.1では分割後に発見されたバグだけを扱います。バグ報告は `docs/PHASE16_1_BUG_INTAKE.md` の形式で集約し、関連Flowモジュールと回帰テストを明記します。
