# Current Bugs

## Phase 16.1 Issue Sweep

The reported pending-kan, `getState()` live-reference, recovery softlock, ron-window, pending CPU ron, imported-record stats, record import validation, replay diagnostics, kan replay fallback, kita replacement ordering, and haitei-on-kita-replacement bugs have regression coverage in:

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`

## Issue #26 status

Integrated areas:

- default chi off with explicit `allowChi: true` preserved;
- added Priority A/B/C yaku listed in `docs/ISSUE26_ACCEPTANCE_MATRIX.md`;
- exhaustive-draw tenpai/noten point movement;
- optional daburon through `RuleConfig.doubleRonPolicy.allowed`;
- record, replay, stats, and rule-summary compatibility for the new result shapes.

Current known remaining limitations are still larger gameplay scope items: extended CPU strategy, South/West extension flow, ZIP workflow hardening, and optional local-rule adoption such as renhou or nagashi mangan. CPU pon/chi/minkan, CPU normal ron, and CPU chankan are implemented in the current code.

2026-06-21時点で、中央テストランナーで再現する未修正の重大バグはありません。

Phase 16後に分割起因の不具合を確認した場合は、`docs/PHASE16_1_BUG_INTAKE.md` の形式で再現手順、期待結果、実際結果、関連Flowモジュール、関連テスト、優先度を記録します。
