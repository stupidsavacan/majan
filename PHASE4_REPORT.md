# Phase 4 完了報告

## 実装内容

- `Sanma.ScoreCalculator.calculateScore` と `Sanma.Settlement.applySettlement` を追加
- 七対子25符、標準形の符、満貫から役満までの区分を実装
- 親・子ロン、三麻ツモ損あり・なし、本場、供託を実装
- 役あり和了形で人間のツモボタンを有効化
- 点棒移動、`win-ended`、和了結果、点数デバッグ表示を追加

## 三麻ツモ損方針

- `tsumoLoss: true`: 四麻式支払いを残り2人だけが払い、不在者分を補填しません。
- `tsumoLoss: false`: 不在者分を残りの子が補填し、ロン相当総額へ合わせます。
- 本場はロン300点、ツモ各支払者100点。供託は勝者へ加算します。

## テスト

```powershell
node tests/hand-analysis.test.js
node tests/yaku-analysis.test.js
node tests/score-calculator.test.js
```

## 軽量バグチェック

- ルート `index.html` のロード順、直接ファイル起動、必須Sanmaモジュールを確認
- CDN、Google Fonts、`fetch()`、外部script・フォント要求がないことを確認
- 人間の打牌、新しい局、デバッグ、埋め込みフォント、SVG牌を確認
- 固定seed `phase4-win-60146` でツモ決着と点棒移動を確認
- 外部ネットワークリクエスト0件、コンソールエラー0件、全テスト成功

## 既知の制限

ロン操作、ドラ加算、待ち形符、槓子符、鳴き面子詳細、正式な次局進行は未実装です。
