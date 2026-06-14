# Phase 12 状態管理・データ整合性強化レポート

## State machine design
- `GameStateMachine` に `booting`、`idle`、`dealing`、`waitingForDraw`、`waitingForDiscard`、`waitingForCall`、`resolvingAction`、`resolvingWin`、`roundEnded`、`matchEnded`、`recovering` を定義した。
- 既存の `GameEngine.phase` と高水準状態を同期し、打牌、ツモ、ロン、鳴き、スキップ、リーチ、北抜き、カン、次局を状態検証する。
- CPU処理は再入を拒否し、1回の自動進行を最大12ステップに制限した。
- 状態遷移、操作要求、操作拒否を `DebugEventLog` へ記録する。

## Tile ledger design
- `TileLedger` は山、王牌、手牌、河、副露、抜き北を所有場所として数える。
- ドラ表示牌は王牌への参照として検査し、別所有牌として二重計上しない。
- null牌、instanceId欠落、instanceId重複、不正な赤牌、108枚または北なし時104枚との不一致を報告する。
- 赤5p・赤5sは表示上の赤属性を保持し、既存の `baseId` 正規化を維持する。

## Invariant checks
- `InvariantChecker.checkState` と `InvariantChecker.assertState` を追加した。
- 手番、親、本場、供託、点数、手牌枚数、対局状態と局状態、呼び出し窓、牌台帳を一元検査する。
- ブラウザ動作では非破壊レポートを返し、テストでは `assertState` で例外化できる。

## Recovery behavior
- 停止した呼び出し窓を閉じ、次の手番状態へ戻せる。
- CPU処理中フラグと状態機械の処理中操作を解除できる。
- 牌台帳が復旧不能な場合は現在局だけを再初期化できる。
- 破損保存値は削除前に別キーへ退避できる。
- 復旧結果は日本語理由とデバッグイベントで確認できる。

## Storage migration behavior
- 設定、牌譜、成績をschema version 2として保存する。
- 旧形式は読み込み時にversion 2へ移行し、二回目以降は変更しない。
- 不正JSONと未知の将来versionは元のraw値を退避してから既定値へ戻す。
- 欠落フィールドは既定値で補い、非推奨・未知フィールドは安全に無視する。

## Storage keys
- 設定: `offlineSanma.phase1.settings`
- 牌譜: `offlineSanma.phase8.records`
- 成績: `offlineSanma.phase8.stats`
- 破損値退避: `offlineSanma.phase12.backup.*`

## Debug diagnostics
- デバッグ画面へPhase 12モジュール、現在の高水準状態、整合性結果、牌台帳件数、デバッグイベント、保存移行イベントを追加した。
- イベントログはリングバッファで、状態遷移、操作拒否、牌台帳警告、整合性失敗、復旧、保存移行、CPU判断、精算を保持する。

## Known limitations
- 高水準状態機械は既存 `GameEngine.phase` を保護する互換層であり、全内部処理を独立したイベント駆動Reducerへ置き換えてはいない。
- 呼び出し窓の時間経過による自動タイムアウトはなく、スキップ操作または `RecoveryManager` を復旧経路とする。
- CPUの鳴き・ロン、複数自己カン候補UI、四槓散了、槍槓割り込み窓は既存どおり未実装。

## Tests
- `tests/state-integrity.test.js` を追加した。
- 誤状態操作拒否、二重打牌、重複牌ID、手番欠落、呼び出し窓復旧、破損保存退避、移行冪等性、CPU再入防止、通常局開始、摸打後と北抜き後の牌台帳を確認した。
- canonical `tests/run-all-tests.js`: 成功。
- repository root `tests/run-all-tests.js`: 成功。
- 配布ZIPを再生成し、別フォルダへ展開した `tests/run-all-tests.js`: 成功。
- canonical `src` 全JavaScript構文検査: 成功。
- `tests/source-format.test.js`: 58 JavaScript、4 CSSを確認して成功。

## Manual validation
- rootとcanonicalの `index.html` がPhase 12の6モジュールを依存順に読み込むことを確認した。
- デバッグ診断が `app_phase: 12`、状態機械、整合性、保存移行イベントを出力することを確認した。
- Chrome headlessでroot `index.html`を `file://` 直接起動し、初期14枚、打牌後CPU進行、新しい対局、Phase 12診断表示を確認した。
- コンソールエラー、page error、失敗request、外部HTTP requestはいずれも0件だった。

## 軽量バグチェック
- root `index.html` とcanonical `index.html` に追加ファイルが存在し、smoke testで読み込み順と必須 `Sanma.*` を確認した。
- `file://` 直接起動方針を維持し、ビルド、サーバー、CDN、Google Fonts、`fetch()`、外部スクリプト、ネットワークフォントを追加していない。
- human discard、新しい局、呼び出し窓、対局進行、debug panel、保存読込を全回帰テストで確認した。
- 破損localStorageを削除のみで処理していた問題を修正し、raw値を退避してversion 2既定値へ復旧するようにした。
- CPU処理の二重実行と無制限ループを防止した。
- 牌台帳レポートが全牌オブジェクトをUI状態へ返していた過剰診断を修正し、件数と問題だけを返すようにした。

## Notes for Phase 13
- 状態機械を内部イベント駆動へ段階的に拡張し、呼び出し窓の実時間タイムアウトを検討する。
- 保存backupの一覧表示・選択復元UIを追加する余地がある。
- CPU鳴き・ロン、槍槓割り込み、四槓散了を導入する場合はTileLedgerとInvariantCheckerへ専用検査を追加する。
