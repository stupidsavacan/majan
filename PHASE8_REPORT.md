# Phase 8 完了報告

## Record model

`Sanma.GameRecord` を追加し、seed、ルール、プレイヤー、局、最終点数を保持する牌譜を実装しました。局イベントには配牌、ツモ、打牌、鳴き、抜き北、リーチ、和了、流局、点数精算を時系列で記録します。牌譜は1局300イベントを上限とし、古いイベントから削除します。

## Storage keys

- `offlineSanma.phase1.settings`: ルール設定
- `offlineSanma.phase8.records`: 最新20件の牌譜
- `offlineSanma.phase8.stats`: ローカル成績

設定、牌譜、成績は個別に読み込み・復旧・リセットできます。破損JSONは対象キーだけを削除し、ゲーム起動を継続します。

## Export/import behavior

- 設定画面で現在設定をJSON表示できます。
- JSONインポート時は既知のRuleConfigキーと既定値と同じ型だけを採用します。
- 牌譜・成績画面で最新牌譜のイベント一覧とJSONを表示し、Clipboard APIが利用可能な場合はコピーできます。
- コピーできないfile環境では、表示したJSONを手動コピーできます。

## Local statistics

終了済み牌譜を初回保存した時だけ、対局数、局数、和了、敗北、役満、最高打点、点数収支、最終プレイ日時を更新します。同一牌譜IDの再保存では成績を重複加算しません。

## Diagnostics

デバッグ画面へPhase番号、必須モジュール、localStorage読書き状態、破損復旧状態、牌譜数、保存上限方針、最終エラー、オフラインフォント状態、外部通信不要フラグを追加しました。

## Known limitations

- 現在は簡易1局進行のため、終了した1局を1対局として成績集計します。
- 牌譜はJSONイベント一覧で、アニメーション再生は未実装です。
- 進行途中で「新しい局」を押した未完了牌譜は保存しません。
- Clipboard APIがfile URLで拒否された場合は、textareaから手動コピーします。

## Tests

`tests/storage-records.test.js` で設定JSON往復、壊れた設定・牌譜の復旧、牌譜作成・直列化・保存・読込、GameEngine和了イベント、和了成績更新、重複保存防止、牌譜・成績リセット、イベント上限を確認しました。

展開版とroot入口から `node tests/run-all-tests.js` を実行し、Phase 2〜8、smoke、regression、source-formatの全テストが成功しました。

## Manual validation

- rootと展開版の `index.html` を直接起動
- 人間打牌、新しい局、固定seed、クリック・タッチ操作を確認
- 設定JSONの表示・インポートと即時再エクスポートを確認
- 牌譜保存、イベント履歴、成績、牌譜JSONエクスポートを確認
- デバッグ診断、Yuji Mai、牌デザイン、外部通信・コンソールエラー0件を確認

## 軽量バグチェック

- rootと展開版のindexへ新規JS・CSSを正しい順序で追加
- 必須 `Sanma.*` モジュール定義とroot直接起動を確認
- CDN、Google Fonts、`fetch()`、外部script、外部フォント要求を追加していないことを確認
- 人間打牌、新しい局、デバッグ、牌譜・成績、設定画面のsoft-lockがないことを確認
- JSON破損をlocalStorage読取不能と誤診断する問題と、インポート直後の再エクスポートが旧設定になる問題を修正
- 持ち点0点を初期点として扱う収支集計の境界値バグを修正
- root、展開版、再構築ZIPの全テストとブラウザ監査を実施

## Notes for Phase 9 final regression

- 既存保存データからの移行方針とversion更新を最終確認する
- 実際の複数局進行を追加する場合、gamesPlayedとroundsPlayedの更新境界を分離する
- 牌譜イベントと点数・牌枚数の統合整合性を最終監査する
- 全ダイアログ、スマホ表示、オフライン起動、ZIP展開を最終確認する
