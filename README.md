# Offline Sanma Mahjong - Phase 3

完全オフラインで動作するブラウザ向け三人麻雀ゲームの土台版です。ルートの `index.html` を直接開いて起動できます。

## Phase 3で実装済み

- `Sanma.YakuAnalysis.analyzeYaku` による役判定
- 門前清自摸和、断么九、役牌、平和、一盃口、七対子、対々和、混老頭、国士無双
- 役なし和了形の明示とデバッグ表示
- SVGによる萬子・筒子・索子・字牌・赤牌デザイン
- 黄橙色のCPU背面牌
- Yuji Maiのbase64 `@font-face` 完全オフライン埋め込み

## テスト

```powershell
node tests/hand-analysis.test.js
node tests/yaku-analysis.test.js
```

詳細は `PHASE3_REPORT.md` を参照してください。
