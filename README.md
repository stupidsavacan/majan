# Offline Sanma Mahjong - Phase 9.1

完全オフライン動作の三人麻雀ブラウザゲームです。Phase 9.1ではPhase 8/9相当機能の保存監査、起動堅牢化、UI配線、文書・テスト完全性を検証しています。

## 起動方法

一番簡単な方法:

- `index.html` をブラウザで開く

ローカルサーバーで開く場合:

- このフォルダで `python -m http.server 8000`
- ブラウザで `http://localhost:8000` を開く

## ソース保守方針

- `src/game`、`src/storage`、`src/ui`、`tests` 配下のJavaScriptはminify・圧縮せず、レビュー可能な改行・インデントを維持します。
- 生成済みHTMLや埋め込みフォントCSSは圧縮を許容します。
- `tests/source-format.test.js` で、上記JavaScript全体が少数行へ圧縮されていないことを確認します。

## Phase 1で実装済み

- 牌定義
- RuleConfig 定義
- 三麻用の山生成
- 北抜き / 北通常牌 / 北なし に応じた山構成の切り替え
- 赤ドラ標準構成
  - 赤五筒 1枚
  - 赤五索 1枚
  - 赤五萬なし
- 高打点モード
  - 五筒が全赤
  - 五索が全赤
  - RuleConfig上で `highScoreMode` 管理
- シャッフル
- seed固定シャッフル
- 配牌
- ツモ
- 打牌
- 河表示
- プレイヤー1人 + CPU2人
- CPU手番と打牌の基礎進行
- 最低限の2D卓UI
- PCクリック操作
- スマホタップ操作
- localStorageへのルール設定保存
- デバッグパネル
  - RuleConfig表示
  - CPU思考ログ表示
  - 牌枚数確認用 `totalKnownTileCount`
  - localStorageリセット

## Phase 2で実装済み

- 4面子1雀頭の和了形判定
- 七対子判定
- 国士無双判定
- 13枚手牌の聴牌・待ち牌判定
- 14枚手牌の和了形・打牌後聴牌候補判定
- 赤五筒・赤五索の通常牌への正規化
- デバッグパネルへの判定結果表示
- 和了形検出時の「形だけ和了可能」表示

## Phase 3で実装済み

- 門前清自摸和、断么九、役牌、平和、一盃口、七対子、対々和、混老頭、国士無双の役判定
- 和了形だが役がない場合の明示
- デバッグパネルへの役判定結果表示
- SVGによる萬子・筒子・索子・字牌・赤牌の最終デザイン
- 黄橙色のCPU背面牌
- Yuji Maiのbase64 `@font-face` 完全オフライン埋め込み

## Phase 4で実装済み

- 符・飜・打点区分の点数計算
- 親・子ロンと三麻ツモ損あり・なしの支払い計算
- 本場・供託の反映
- 役あり和了形でのツモ和了ボタン
- 最小点棒移動と和了終了表示
- デバッグパネルへの点数計算・和了結果表示

## Phase 5で実装済み

- `ActionResolver` による打牌・ツモ・ロン・ポン・チー・カン・リーチ・北抜きの利用可否判定
- CPU捨て牌後の人間用呼び出し窓
- ロン和了と点棒移動
- ポン・チー実行と明示的な副露構造
- 門前聴牌・1000点以上でのリーチ宣言と供託
- 北抜きと補充牌
- 暗槓・明槓・加槓の候補検出
- 副露・抜き北・利用可能操作のUI / デバッグ表示

## Phase 6で実装済み

- root・オフライン・牌表示・牌枚数・進行・点数移動・localStorageの総合回帰監査
- null牌描画、山切れツモ、古い鳴き操作、壊れた精算データ、localStorage失敗時の安全処理
- `tests/smoke.test.js` と `tests/regression.test.js`
- 全テストを非ゼロ終了で集約する `tests/run-all-tests.js`
- ブラウザ手動チェックリストとPhase 6監査報告

## Phase 7で実装済み

- `CpuStrategy` による候補打牌のスコアリングと固定seed再現
- 孤立字牌・端牌、対子、筋牌形、推定シャンテン、聴牌維持を使うCPU打牌判断
- CPUのツモ和了、条件成立時のリーチ、安全な上限付き抜き北
- CPU思考の候補順位・選択理由・シャンテン・聴牌ログ
- `AssistManager` による補助設定の集約と非破壊の牌数・重複監査イベント
- `tests/cpu-strategy.test.js` とPhase 7回帰テスト

## Phase 8で実装済み

- 配牌・ツモ・打牌・鳴き・抜き北・リーチ・和了・精算を記録するコンパクト牌譜
- localStorageへの最新20牌譜保存と、1局300イベント上限
- 対局数・局数・和了・敗北・役満・最高打点・点数収支のローカル成績
- 牌譜・履歴・成績パネルと牌譜JSON表示・コピー
- 設定JSONのエクスポート・検証付きインポート・設定のみ初期化
- 読み書き状態、復旧状態、モジュール、牌譜数、フォントを含むデバッグ診断

## Phase 9・9.1で実装済み

- Phase 9/current phase表示、直接 `file://` 起動、script順、外部通信不要の統合監査
- 初期化・描画・新しい局・主要UI操作の日本語エラー復旧表示
- 保存破損復旧状態、Phase 9.1、最終アプリエラーを含む診断
- DOM ID・UI配線・保存上限・個別破損牌譜・イベント時系列と重複の静的/回帰テスト
- `src/game`、`src/storage`、`src/ui`、`tests` 全JavaScriptのソース整形監査
- `PHASE9_REPORT.md`、`PHASE9_BROWSER_CHECKLIST.md`、`PHASE9_1_CLEANUP_STORAGE_AUDIT.md`

## 操作方法

- 自分の手牌をクリック / タップすると打牌します。
- 自分が切ると、CPU2人が簡易戦略で打牌します。
- CPUの捨て牌にロン・ポン・チー・明槓候補がある場合は呼び出し窓が開きます。
- 呼び出し窓で鳴くか、スキップして進行できます。
- 門前聴牌時は `リーチ`、北抜きルールで北がある場合は `北抜き` を操作できます。
- その後、自分が自動でツモり、再び打牌できます。
- `新しい局` で最初から配牌し直します。
- `設定` で Phase 1 時点のRuleConfigを変更できます。
- `設定` で設定JSONを表示・インポート・初期化できます。
- `牌譜・成績` で最新の履歴、成績、牌譜JSONを確認できます。
- `デバッグ` でseed固定や内部状態を確認できます。

## 未実装

以下はまだ未実装です。

- カンの実行、嶺上牌、槓ドラ
- リーチ後の打牌制限、フリテン、 ippatsu
- 流局処理の完全実装
- 局進行
- 実際に牌を交換する内部補助

## 既知の問題

- プレイヤーは常に東家スタートです。
- 山が尽きた場合は簡易的に終了ログを出すだけです。
- ドラ表示牌は表示のみで、点数計算にはまだ使いません。
- CPUは鳴き・ロンを自動スキップします。
- CPU戦略のシャンテン計算と打牌評価は簡易版で、押し引き・安全牌・打点期待値は未対応です。
- AssistManagerは設定判定と整合性ログのみで、牌交換は行いません。
- 牌譜はイベント一覧で、アニメーション再生には未対応です。
- 対局・成績は現在の簡易1局進行を1対局として集計します。
- カンは候補検出とデバッグ表示のみで、実行は未実装です。
- 副露を含む役・符計算は既存判定へ副露牌を合成する基礎対応で、詳細精度はPhase 6以降の監査対象です。

## 次のPhaseでやるべきこと

Phase 10以降では以下を追加する候補です。

- 複数局・対局進行
- カン実行、リーチ後制約、フリテン
- 副露を含む役・符計算の詳細精度向上
- CPUロン・ポンの安全な割り込み処理と押し引き

## ファイル構成

- `index.html`
- `src/main.js`
- `src/game/RuleConfig.js`
- `src/game/Tile.js`
- `src/game/HandAnalysis.js`
- `src/game/YakuAnalysis.js`
- `src/game/ScoreCalculator.js`
- `src/game/Settlement.js`
- `src/game/RiichiManager.js`
- `src/game/KanManager.js`
- `src/game/KitaManager.js`
- `src/game/ActionResolver.js`
- `src/game/CpuStrategy.js`
- `src/game/AssistManager.js`
- `src/game/GameRecord.js`
- `src/game/CallWindow.js`
- `src/game/Wall.js`
- `src/game/Player.js`
- `src/game/GameEngine.js`
- `src/ui/renderTiles.js`
- `src/ui/renderTable.js`
- `src/ui/settingsPanel.js`
- `src/ui/settingsExportImport.js`
- `src/ui/recordPanel.js`
- `src/storage/settingsStorage.js`
- `src/storage/gameRecordStorage.js`
- `src/styles/main.css`
- `src/styles/phase4.css`
- `src/styles/phase5.css`
- `src/styles/phase8.css`
- `src/styles/yuji-mai-embedded.css`
- `tests/storage-records.test.js`
- `tests/smoke.test.js`
- `tests/regression.test.js`
- `tests/source-format.test.js`
- `PHASE8_REPORT.md`
- `PHASE9_REPORT.md`
- `PHASE9_BROWSER_CHECKLIST.md`
- `PHASE9_1_CLEANUP_STORAGE_AUDIT.md`
