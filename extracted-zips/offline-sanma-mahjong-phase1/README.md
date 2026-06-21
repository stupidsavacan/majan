# Offline Sanma Mahjong - Canonical App Copy

このディレクトリは canonical app copy です。通常はリポジトリ root の `index.html` を開いてください。root `index.html` がこの canonical runtime を読み込みます。

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
- CPU の明槓は既存の KanFlow/KanRules に委譲し、嶺上・カンドラ・槍槓の既存処理を通ります。
- 牌譜/Replay/Stats/UI は複数勝者、鳴き、流局精算、リーチ供託を扱います。

## Current Limitations

- CPU 戦略は簡易です。押し引き、安全牌判断、打点期待値 AI は未実装です。
- 南入/西入、ZIP 入力そのものの完全検証 UI は未実装です。
- 人和、流し満貫、白ポッチなど採用差が大きい特殊ルールは未実装/採用未定です。
