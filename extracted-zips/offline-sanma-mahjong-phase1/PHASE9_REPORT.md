# Phase 9 統合・オフライン完成度監査

## 統合監査

root `index.html` を利用者向け入口、`extracted-zips/offline-sanma-mahjong-phase1` をcanonical source rootとして確認しました。root入口はcanonical sourceを相対パスで読み込み、`file://` 直接起動を維持します。Phase 8の牌譜・成績・設定JSON・診断はPhase 9.1監査で配線と保存動作を再確認しました。

## 起動堅牢化

`src/main.js` の初期化、描画、新しい局、設定、牌譜、デバッグ、全保存データリセットをエラー境界で保護しました。回復可能な失敗時は日本語エラーと「新しい局」または保存データリセットによる復旧案内を表示します。重複イベントリスナーや余分な括弧はありません。

## オフライン監査

CDN、Google Fontsネットワーク要求、外部script、外部画像、`fetch()`、WebSocket、server-only importはありません。Yuji Maiは既存のdata URL埋め込みCSSを使用し、牌デザインは変更していません。

## 保存・データ整合性

牌譜イベントは`GameEngine`の各操作から`GameRecord.addEvent()`へ直接、時系列で追加します。表示ログはnewest-firstですが、牌譜用に`logs.slice()`で再取得しないため、方向違い・重複保存の問題を回避しています。localStorage JSON破損と不正な個別牌譜はゲームを停止せず復旧・読み飛ばします。

## 診断

デバッグ画面はPhase 9.1、必須モジュール、localStorage読み書き状態、破損復旧、牌譜件数、保存上限、最終エラー、オフラインフォント、外部通信不要を表示します。`document.fonts`が利用できない場合も停止しません。

## テスト・制限

`tests/run-all-tests.js` は保存、smoke、回帰、ソース形式を含む全スイートを実行します。ソース形式検査はcanonical appの`src/game`、`src/storage`、`src/ui`、`tests`を対象にします。複数局対局進行、カン実行、フリテン、ドラ点数計算などはPhase 10以降の対象です。

## 軽量バグチェック

rootと展開版の直接起動、script順、必須`Sanma.*`、人間打牌、新しい局、設定、牌譜、デバッグ、全保存データリセット、外部通信0件、console/page error 0件を確認しました。
