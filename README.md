# Offline Sanma Mahjong - Phase 15

完全オフラインで動く三人麻雀ブラウザゲームです。現在の正本入口は root `index.html` です。ビルド、サーバー、CDN、外部フォント取得、ネットワーク通信は不要です。

## Phase 15 current status

- CPU 1 / CPU 2 を含む実親ローテーションを維持しています。
- CPU親は開局時に自動進行し、初打牌では余分な通常ツモを行いません。
- CPU通常ロン、槍槓、頭ハネ優先、フリテン判定、ロン優先は実フローへ接続済みです。
- 開局Assist後の天和/地和ガード、CPU親の開局Assist天和ガードを維持しています。
- 山0枚ではロン以外のポン/チー/明槓窓を開かず、ロンなしなら流局します。
- 河底は最後の通常ツモ後の最後の打牌だけに付与します。鳴き後打牌や槍槓には付与しません。
- 山0枚で明槓から嶺上牌を引く経路を禁止しています。
- 牌譜イベント剪定は `deal` / `win` / `score_settlement` を保持します。
- 保存失敗牌譜は本体を保持し、明示的な再試行で保存できます。牌譜リセット後のゾンビ復活は防止しています。
- RecoveryManager は pending CPUロン/槍槓、保留カン確定、局リセット牌譜整合性を処理します。
- 流局時の親聴牌判定は副露面子を固定したまま評価します。
- ZIP展開workflowは main へ直接pushせず、PRゲートで検証します。
- `honbaPoints` 設定はロン/ツモ支払いへ反映されます。

## Entry Points

- User entry: `index.html`
- Canonical app copy: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- Canonical source: `extracted-zips/offline-sanma-mahjong-phase1/src`
- Central test runner: `node tests/run-all-tests.js`

The canonical runtime is loaded by root `index.html`; root `src/main.js` is not the runtime loader.

## Current Limitations

- ダブロンは未実装です。ロン候補が複数ある場合は頭ハネで最寄り1名を勝者にします。
- CPUのポン/チー/明槓は未実装です。CPU通常ロンとCPU槍槓は実装済みです。
- CPU戦略は簡易です。押し引き、安全牌判断、打点期待値AIは未実装です。
- 南入/西入、ZIP入力そのものの完全検証UIは未実装です。

## Documentation

- `docs/INDEX.md`: 現在の正本案内
- `docs/BUGS.md`: 現在確認されている未解決バグ
- `docs/ROADMAP.md`: 今後の作業
- `docs/TESTING.md`: ローカルテスト、PR、CI、ZIP展開PRゲート
- `docs/ARCHITECTURE.md`: 主要構成
- `CHANGELOG.md`: Phase 15までの履歴

過去の `PHASE*.md` は履歴資料です。現在仕様は README と `docs/` を優先してください。

Compatibility search tokens: 繝繝悶Ο繝ｳ 譛ｪ螳溯｣・
