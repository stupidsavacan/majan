# Offline Sanma Mahjong - Phase 9

完全オフライン動作の三人麻雀ブラウザゲーム土台版です。Phase 9では初回リリース前の統合監査、保存機能、エラー復旧、オフライン完成度向上を実施しています。

## 起動方法

一番簡単な方法:

- `index.html` をブラウザで開く

ローカルサーバーで開く場合:

- このフォルダで `python -m http.server 8000`
- ブラウザで `http://localhost:8000` を開く

## ソース保守方針

- `src/game` 配下のJavaScriptはminify・圧縮せず、関数単位で通常の改行・インデントを維持します。
- 生成済みHTMLや埋め込みフォントCSSは圧縮を許容します。
- `tests/source-format.test.js` で、ゲームソースが少数行へ圧縮されていないことを確認します。

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

## 操作方法

- 自分の手牌をクリック / タップすると打牌します。
- 自分が切ると、CPU2人が簡易戦略で打牌します。
- CPUの捨て牌にロン・ポン・チー・明槓候補がある場合は呼び出し窓が開きます。
- 呼び出し窓で鳴くか、スキップして進行できます。
- 門前聴牌時は `リーチ`、北抜きルールで北がある場合は `北抜き` を操作できます。
- その後、自分が自動でツモり、再び打牌できます。
- `新しい局` で最初から配牌し直します。
- `設定` で Phase 1 時点のRuleConfigを変更できます。
- `デバッグ` でseed固定や内部状態を確認できます。

## Phase 8・9で実装済み

- 牌譜・履歴・ローカル成績、設定JSON入出力
- localStorage破損復旧、保存上限、Phase 9診断
- 最終テストランナー、ブラウザチェックリスト、モバイルダイアログ補強
- 実行: `node tests/run-all-tests.js`

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
- カンは候補検出とデバッグ表示のみで、実行は未実装です。
- 副露を含む役・符計算は既存判定へ副露牌を合成する基礎対応で、詳細精度はPhase 6以降の監査対象です。

## 次のPhaseでやるべきこと

初回リリース後は以下を追加する候補です。

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
- `src/game/CallWindow.js`
- `src/game/Wall.js`
- `src/game/Player.js`
- `src/game/GameEngine.js`
- `src/ui/renderTiles.js`
- `src/ui/renderTable.js`
- `src/ui/settingsPanel.js`
- `src/storage/settingsStorage.js`
- `src/styles/main.css`
- `src/styles/phase4.css`
- `src/styles/phase5.css`
- `src/styles/yuji-mai-embedded.css`
