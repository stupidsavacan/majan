# Roadmap

今後の作業です。Phase 15で修正済みの報告済みバグと、Phase 16の責務分割そのものはここへ残しません。

- Phase 16.1: GameEngine分割後に報告されたバグの修正専用PR
- Issue #26の残作業: 未実装役の追加、ダブロン、Record/Replay/Stats/UI/docsの統合確認
- CPUポン/チー/明槓の実装と検証
- CPUの押し引き、安全牌判断、打点期待値AI
- 南入/西入
- ZIP入力UIとアップロード前検証の強化
- より網羅的なphase-aware invariant coverage

完了済みとして扱うIssue #26部分:

- 新規対局の初期チーOFF
- `allowChi: true` 明示設定の尊重
- 流局時テンパイ料/ノーテン罰符の合計3000点分配
- 流局精算結果の牌譜保存
