# Offline Sanma Mahjong - Canonical App Copy

このディレクトリは canonical app copy です。通常はリポジトリ root の `index.html` を開いてください。Root `index.html` がこの canonical runtime を読み込みます。

現在仕様の正本は root `README.md` と `docs/` です。この README は canonical copy 側の実行入口と、root README と食い違いやすい実装済み項目だけを短くまとめます。

## Current Runtime Notes

- User entry: root `index.html`
- Canonical entry: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- Central test runner: `node tests/run-all-tests.js`
- CDN、外部フォント取得、fetch 前提、サーバー前提はありません。

## Implemented Gameplay Notes

- ダブロンは `RuleConfig.doubleRonPolicy.allowed` で切り替え可能です。既定は頭ハネで、ON 時は同一打牌の複数ロンを複数勝者として精算します。
- CPU の通常ロン、槍槓ロン、ポン、チー、明槓は実装済みです。
- CPU のポン/チー後は手牌から消費牌だけを取り除き、呼ばれた牌を打牌者の河から取り除き、open meld として副露を作成します。
- CPU の明槓は既存の `KanFlow` / `KanRules` に委譲し、嶺上・カンドラ・槍槓の既存処理を通ります。
- CPU は可視牌だけを使って残り枚数を推定し、簡易リスク分析、押し引きモード、明槓判断を使います。
- `GameEngine.getState()` は通常 UI 用に CPU 手牌、内部 tileLedger、壁/王牌の隠し情報、未完了牌譜本文を公開しません。
- ロン成立時は勝者の手牌だけを `winResult.revealedHand` で公開し、非勝者 CPU の手牌は隠したままです。
- 牌譜/Replay/Stats/UI は複数勝者、鳴き、流局精算、リーチ供託を扱います。

## Recent Fix Notes

- `doubleRonPolicy.allowed` が有効な場合、チャンカンでも複数ロン候補を保持し、人間が受理したときは該当する複数勝者をダブロンとして精算します。
- 加槓チャンカン受理時は、加槓牌を宣言者の手牌から河へ移す `chankan_tile_move` イベントを牌譜に記録し、ReplayViewer も同じ移動を再現します。
- 回復処理で CPU がツモ済み牌を持ったまま山0枚になっていても、先にCPU打牌を実行してから合法的な終局状態へ進みます。
- 複数役満はスコア表示で「ダブル役満」「三倍役満」などを表示し、成績では役満和了回数と役満単位を分けて集計します。

## Current Limitations

- CPU 戦略はまだ簡易です。専門的な押し引き、完全な安全牌判断、打点期待値 AI ではありません。
- 半荘/西入、ZIP 入出力そのものの完全検証 UI、人和・流し満貫・ローカル採用差の大きい特殊ルールは未実装または採用未定です。
