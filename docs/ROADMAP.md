# Roadmap

今後の作業です。Phase 15で修正済みの報告済みバグと、Phase 16の責務分割そのものはここへ残しません。

- CPU戦略の簡易性を残しつつ、安全牌判断、押し引き、打点期待値AIの設計
- ダブロンの結果UI詳細表示強化とルールプリセット化
- 人和/流し満貫の採用判断を、初巡ロン文脈・流局精算フロー・牌譜イベント設計と統合する
- CPUの押し引き、安全牌判断、打点期待値AI
- 南入/西入
- ZIP入力UIとアップロード前検証の強化
- より網羅的なphase-aware invariant coverage

完了済みとして扱うIssue #26部分:

- 新規対局の初期チーOFF
- `allowChi: true` 明示設定の尊重
- Priority A/B/C役の主要セット
- 流局時テンパイ料/ノーテン罰符の合計3000点分配
- `RuleConfig.doubleRonPolicy.allowed` によるダブロン解決
- Record / Replay / Stats / UI rule summary compatibility
