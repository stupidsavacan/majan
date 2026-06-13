# Phase 1 完了報告

## 実装内容

- プロジェクト土台を作成
- 牌定義を作成
- RuleConfigを作成
- 三麻用の山生成を実装
- 高打点モードに応じた赤ドラ構成を実装
- シャッフルを実装
- seed固定シャッフルを実装
- 配牌を実装
- ツモを実装
- 打牌を実装
- 河表示を実装
- プレイヤー1人 + CPU2人を実装
- CPU仮ランダム打牌を実装
- 最低限のブラウザUIを実装
- PCクリック操作を実装
- スマホタップ操作を実装
- 設定画面を実装
- デバッグパネルを実装

## 追加・変更したファイル

- `index.html`
- `README.md`
- `PHASE1_REPORT.md`
- `src/main.js`
- `src/game/RuleConfig.js`
- `src/game/Tile.js`
- `src/game/Wall.js`
- `src/game/Player.js`
- `src/game/GameEngine.js`
- `src/ui/renderTiles.js`
- `src/ui/renderTable.js`
- `src/ui/settingsPanel.js`
- `src/storage/settingsStorage.js`
- `src/styles/main.css`

## 起動方法

- `index.html` をブラウザで開く

または、ローカルサーバーを使う場合:

- `python -m http.server 8000`
- `http://localhost:8000` を開く

## 動作確認方法

1. `index.html` を開く
2. 自分の手牌が14枚あることを確認する
3. 牌をクリックまたはタップして打牌する
4. CPU 1、CPU 2が自動でツモ打牌することを確認する
5. 自分がツモして再び14枚になることを確認する
6. 河に捨て牌が追加されることを確認する
7. 設定で高打点モードをONにして新しい局を開始する
8. デバッグパネルでRuleConfigと牌枚数を確認する

## 未実装機能

- 和了判定
- 役判定
- 点数計算
- 鳴き
- リーチ
- カン
- 北抜き操作
- フリテン
- 正式な流局処理
- 局進行
- 成績保存
- 牌譜保存
- 内部補正
- CPUの本格思考

## 既知の問題

- CPUはPhase 1仮実装のランダム打牌です。
- 自分が常に東家です。
- ドラ表示牌は点数計算にまだ使いません。
- 北抜き設定は山構成に反映されていますが、北抜き操作はまだありません。

## 次のPhaseでやるべきこと

Phase 2では以下を実装します。

- 4面子1雀頭判定
- 七対子判定
- 国士無双判定
- 聴牌判定
- シャンテン数計算
- ツモ和了
- ロン和了
