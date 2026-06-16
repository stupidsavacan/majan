# Offline Sanma Mahjong - Phase 16

このディレクトリはcanonical app copyです。通常はリポジトリrootの `index.html` を開いてください。root `index.html` がこのcanonical runtimeを読み込みます。

現在仕様の正本はリポジトリrootの `README.md` と `docs/` です。

## Phase 16 Runtime Note

- GameEngineの責務をFlowモジュールへ分割しました。
- Phase 16は挙動保存リファクタであり、新機能やルール変更はありません。
- CPU通常ロンとCPU槍槓は実装済みです。
- ダブロンは未実装です。ロン候補が複数ある場合は頭ハネで最寄り1名を勝者にします。
- CPUのポン/チー/明槓は未実装です。
