# Phase 9.4 Table Layout Feedback

## User Feedback

- ドラ表示と川を逆にしてほしい。

## Inspection

- 変更前は `center.append(tableInfo, doraPanel, renderDiscards(state.players))` だった。
- `.center-board` は `grid-template-columns: 1fr minmax(12rem, .35fr)` のため、変更前はドラ表示牌がメイン列、河がサイド列に配置されていた。
- モバイルでは既存CSSが `.center-board` を1列へ変更していた。

## Change Made

- `center-board` の表示順を変更し、河をドラ表示牌より前に配置した。
- デスクトップでは河がメイン列、ドラ表示牌がサイド列に来る構成にした。
- モバイルでは table info → 河 → ドラ表示牌 の順に縦積みされることを確認した。
- 呼び出し窓と和了結果は、河・ドラ表示牌の後に表示される既存順序を維持した。

## Files Changed

- `src/ui/renderTable.js`
- `tests/table-layout.test.js`
- `tests/run-all-tests.js`

`src/styles/main.css` は既存の2列・モバイル1列指定で要件を満たすため変更していない。

## Safety Notes

- ゲームロジックは変更していない。
- 牌デザインは変更していない。
- 外部依存は追加していない。
- ドラ表示牌と河はいずれも削除していない。

## Test Results

- `node tests/run-all-tests.js`: PASS
- `node --check src/ui/renderTable.js`: PASS
- root・canonical・ZIP展開後のテスト: PASS
- desktop・mobileの実ブラウザ表示順確認: PASS
- desktop実測: 河 約955px、ドラ表示牌 約334px、table infoは全幅
- mobile実測: 1列、`table-info → 河 → ドラ表示牌`
- 後続パネル順: `河 → ドラ表示牌 → 呼び出し窓 → 和了結果`
- page error・外部通信: 0件

## Deferred Items

None.
