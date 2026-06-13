# Offline Sanma Mahjong - Phase 4

完全オフラインで動作する三人麻雀ブラウザゲーム土台版です。ルート `index.html` を直接開いて起動できます。

## Phase 4で実装済み

- `Sanma.ScoreCalculator` による符・飜・満貫以上の点数計算
- `Sanma.Settlement` による点棒移動
- 親・子ロン、三麻ツモ損あり・なし、本場、供託
- 役あり和了形での最小ツモ和了
- 和了結果と点数デバッグ表示
- Phase 3のSVG牌とYuji Mai完全オフライン埋め込みを維持

## テスト

```powershell
node tests/hand-analysis.test.js
node tests/yaku-analysis.test.js
node tests/score-calculator.test.js
```

詳細と軽量バグチェックは `PHASE4_REPORT.md` を参照してください。
