# Phase 3 完了報告

## 実装内容

- `Sanma.YakuAnalysis.analyzeYaku` を追加
- 門前清自摸和、断么九、役牌、平和、一盃口、七対子、対々和、混老頭、国士無双を判定
- 和了形に役がない場合は「和了形ですが役がありません。」と報告
- デバッグ画面へ役名、翻数、役満、理由、使用contextを追加
- 萬子・筒子・索子・字牌をSVGで描画
- CPU手牌を黄橙色の背面牌へ変更
- 赤五筒・赤五索に赤い中心印と赤枠を追加
- Yuji Maiをbase64化し、`@font-face` のdata URLとして完全オフライン埋め込み

## 仕様と制限

- 赤牌は通常の五筒・五索と同じ牌種として判定します。
- 自風と場風が同じ連風牌は別々に1翻ずつ数えます。
- 平和は `context.waitType === "ryanmen"` の場合のみ成立させます。
- 国士無双は役満メタデータとして返し、点数計算はまだ行いません。

## テスト

```powershell
node tests/hand-analysis.test.js
node tests/yaku-analysis.test.js
```

直接ファイル起動、SVG牌表示、Yuji Mai読み込み、打牌、デバッグ役判定、コンソールエラーなしをChromeで確認済みです。
