# Offline Sanma Mahjong - Phase 2

完全オフライン動作の三人麻雀ブラウザゲーム土台版です。Phase 2では和了形・聴牌・待ち牌の内部判定を追加しています。

## 起動方法

一番簡単な方法:

- `index.html` をブラウザで開く

ローカルサーバーで開く場合:

- このフォルダで `python -m http.server 8000`
- ブラウザで `http://localhost:8000` を開く

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
- CPU仮ランダム打牌
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

## 操作方法

- 自分の手牌をクリック / タップすると打牌します。
- 自分が切ると、CPU2人が仮ランダム打牌します。
- その後、自分が自動でツモり、再び打牌できます。
- `新しい局` で最初から配牌し直します。
- `設定` で Phase 1 時点のRuleConfigを変更できます。
- `デバッグ` でseed固定や内部状態を確認できます。

## 未実装

- 役判定
- 点数計算
- 鳴き
- リーチ
- カン
- 北抜き操作
- フリテン
- 流局処理の完全実装
- 局進行
- 成績保存
- 牌譜保存
- 内部補正
- CPUのシャンテンベース思考

## 既知の問題

- CPUはPhase 1仮実装のためランダム打牌です。
- プレイヤーは常に東家スタートです。
- 山が尽きた場合は簡易的に終了ログを出すだけです。
- ドラ表示牌は表示のみで、点数計算にはまだ使いません。
- 北抜きモードでも、Phase 1では北抜き操作は未実装です。

## 次のPhaseでやるべきこと

Phase 3以降では以下を追加する想定です。

- シャンテン数計算
- ツモ和了
- ロン和了
- 役判定
- 点数計算

## ファイル構成

- `index.html`
- `src/main.js`
- `src/game/RuleConfig.js`
- `src/game/Tile.js`
- `src/game/HandAnalysis.js`
- `src/game/Wall.js`
- `src/game/Player.js`
- `src/game/GameEngine.js`
- `src/ui/renderTiles.js`
- `src/ui/renderTable.js`
- `src/ui/settingsPanel.js`
- `src/storage/settingsStorage.js`
- `src/styles/main.css`
