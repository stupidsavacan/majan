# Phase 11 詳細ルール実装レポート

## Advanced rules implemented
- `FuritenManager` を追加し、現物フリテン・同巡フリテン・リーチ後見逃しフリテンをロン可否へ反映した。
- `RiichiRules` を追加し、門前・1000点・残り自摸牌・供託・一発状態・打牌固定用状態を管理した。
- `KanRules` を追加し、暗槓・明槓・加槓、嶺上牌、カンドラ、リーチ後暗槓の待ち不変判定を実装した。
- `EndTurnYakuResolver` を追加し、海底摸月・河底撈魚・嶺上開花・槍槓・一発・裏ドラの得点文脈を生成した。
- `SanmaRuleDetails` を追加し、北抜きと萬子順子の三麻固有方針を集約した。

## RuleConfig fields added
- `advancedRules.furiten`
- `advancedRules.riichi`
- `advancedRules.kan`
- `advancedRules.endTurnYaku`
- `advancedRules.sanma`
- 既存の `uraDora`、`kanDora`、`kanUraDora`、`kitaDora` 設定と互換になるよう安全にマージする。

## Furiten behavior
- 自分の河に和了牌と同種牌がある場合は現物フリテンとしてロン不可。
- ロン可能牌を見逃した場合は次の自摸まで同巡フリテン。
- リーチ後の見逃しは局終了までロン不可。
- フリテン中でもツモ和了は可能。

## Riichi behavior
- 門前、1000点以上、聴牌、次の自摸牌が残っている場合のみ宣言可能。
- 宣言時に1000点を即時供託し、`player.riichi` と既存互換フィールドを更新する。
- 鳴き・カンで全員の一発状態を解除する。
- 裏ドラはリーチ和了時のみ数える。

## Kan behavior
- 暗槓・明槓・加槓で牌を手牌・河・副露間に移動し、牌総数を維持する。
- カン後はカンドラを追加し、王牌から嶺上牌を取得する。
- リーチ後暗槓は待ちが変わらないと証明できる場合のみ許可する。
- 加槓時は槍槓判定用コンテキストを返す。

## Sanma / kita behavior
- 北抜きは既存方針どおりリーチ後不可、北ドラ扱い、通常山から補充牌を取得する。
- 北抜き後も牌総数を維持する。
- チーは `allowChi` が true の場合のみ許可する。
- 萬子は1m・9mのみ有効で、萬子順子は常に不成立。
- ツモ損と三人払いの丸めは既存 `ScoreCalculator` の挙動を維持した。

## Ambiguous rules and chosen policy
- 北抜きに対するロンは不許可とし、`ronOnKitaPolicy: "disallow"` を既定値にした。
- 北抜き補充牌は既存実装との互換性を優先して通常山から取得する。
- 槍槓コンテキストと役判定は実装したが、加槓前に他家のロン割り込み窓を開く完全な対局フローは未実装。
- 四槓散了は安全な局終了統合が未確定のため実装せず、牌数を壊さないことを優先した。
- 複数の自己カン候補がある場合、現 UI のカンボタンは先頭候補を実行する。

## Tests
- `tests/advanced-rules.test.js` を追加した。
- 現物・同巡フリテン、フリテン中ツモ、リーチ条件、一発解除、裏ドラ、暗槓・明槓・加槓、カンドラ、嶺上・槍槓文脈、北抜き牌数保存、萬子順子禁止、ActionResolver 統合を確認した。
- canonical: `node tests/run-all-tests.js` 相当を実行し、全テスト成功。
- repository root: `node tests/run-all-tests.js` 相当を実行し、全テスト成功。
- 配布 ZIP を展開し、ZIP 内の `tests/run-all-tests.js` も全テスト成功。
- 実際には Codex 同梱 Node.js 実体を使用した。

## 軽量バグチェック
- root `index.html` と canonical `index.html` が Phase 11 の5モジュールを正しい順序で読み込むことを確認した。
- smoke test で必須 `Sanma.*` モジュールがすべて存在することを確認した。
- `file://` 直接起動を維持し、ビルド・サーバー・外部依存を追加していない。
- CDN、Google Fonts、`fetch()`、外部スクリプト、ネットワークフォント要求を追加していない。
- human discard、新局、debug panel の既存回帰テストが成功した。
- カンが「判定のみ」のまま実行できない不具合と、明槓が呼び出し窓へ出ない不具合を修正した。
- 2回目以降の嶺上牌が補充直後の山牌になる問題を修正し、王牌末尾の4枚を順に取得するようにした。
- 自動ブラウザによる直接表示確認は Windows サンドボックスの `CreateProcessAsUserW failed: 5` により実行できなかった。

## Notes for Phase 12
- 槍槓の割り込みロン窓、四槓散了、複数自己カン候補の選択 UI を最終対局フローへ統合する余地がある。
- 一発の厳密な巡目管理は既存の打牌時解除仕様との互換性を保っているため、最終ルール監査で再確認する。
