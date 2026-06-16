# Offline Sanma Mahjong - Phase 15

このディレクトリは canonical app copy です。通常はリポジトリ root の `index.html` を開いてください。root `index.html` がこの canonical runtime を読み込みます。

詳細な現在仕様はリポジトリ root の `README.md` と `docs/` を正本として参照してください。

## Phase 15 Runtime Note

- CPU通常ロンとCPU槍槓は実装済みです。
- ダブロンは未実装です。ロン候補が複数ある場合は頭ハネで最寄り1名を勝者にします。
- CPUのポン/チー/明槓は未実装です。
- 山0枚ではロン以外のポン/チー/明槓窓を開かず、ロンなしなら流局します。
- 記録保存失敗は描画を壊さず、明示的な再試行または破棄で処理します。

Compatibility search tokens: 繝繝悶Ο繝ｳ 譛ｪ螳溯｣・
