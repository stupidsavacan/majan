# Current Bugs

## Phase 16.1 Issue Sweep

The reported pending-kan, `getState()` live-reference, recovery softlock, ron-window, pending CPU ron, imported-record stats, record import validation, replay diagnostics, kan replay fallback, kita replacement ordering, and haitei-on-kita-replacement bugs have regression coverage in:

- `tests/issue-runtime-flow-regressions.test.js`
- `tests/issue-storage-replay-regressions.test.js`

Current known remaining limitations are still the documented larger gameplay scope items: CPU pon/chi/minkan, double ron, extended CPU strategy, South/West extension flow, and ZIP workflow hardening.

2026-06-16時点で、中央テストランナーで再現する未修正の重大バグはありません。

Phase 16後に分割起因の不具合を確認した場合は、`docs/PHASE16_1_BUG_INTAKE.md` の形式で再現手順、期待結果、実際結果、関連Flowモジュール、関連テスト、優先度を記録します。
