# Offline Sanma Mahjong - Phase 3

完全オフライン動作の三人麻雀ブラウザゲーム土台版です。`index.html` を直接開いて起動できます。

## Phase 3で実装済み

- 門前清自摸和、断么九、役牌、平和、一盃口、七対子、対々和、混老頭、国士無双の役判定
- 和了形だが役がない場合の明示
- デバッグパネルへの役判定結果表示
- SVGによる萬子・筒子・索子・字牌・赤牌の最終デザイン
- 黄橙色のCPU背面牌
- Yuji Maiのbase64 `@font-face` 完全オフライン埋め込み

## テスト

リポジトリルートで次を実行します。

```powershell
node tests/hand-analysis.test.js
node tests/yaku-analysis.test.js
```

点数計算、鳴き、リーチ、カン、フリテン、正式な局進行は未実装です。
