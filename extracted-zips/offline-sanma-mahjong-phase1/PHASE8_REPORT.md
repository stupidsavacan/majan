# Phase 8 保存・牌譜・成績・設定UX

## Record model
`GameRecord` は ID、作成日時、seed、ルール、参加者、局ごとのイベント・結果、最終点を保持します。イベントは各局500件、牌譜は新しい順30件に制限します。

## Storage keys
- `offlineSanma.phase8.records`: 牌譜
- `offlineSanma.phase8.stats`: ローカル成績
- `offlineSanma.phase1.settings`: 従来設定（互換維持）

## Export/import behavior
設定をバージョン付きJSONとしてテキスト欄へ出力し、貼り付けたJSONを検証して取り込みます。不正JSONはゲームを停止させずエラー表示します。

## Known limitations
牌譜は時系列イベント一覧で、アニメーション再生はありません。現在のゲーム進行は一局単位のため、対局数は将来の半荘進行対応時に利用します。

## Tests / Manual validation
`node tests/run-all-tests.js` で保存、破損復旧、設定往復、統計、リセット、大規模ログ制限を確認。ルート `index.html` の読込順とダイアログ操作を確認しました。

## 軽量バグチェック
ルートから追加モジュールが読み込まれ、Sanma参照の欠落がないこと、直接オフライン起動を維持することを確認しました。CDN、Google Fonts、fetch、外部スクリプト・フォント要求は追加していません。打牌、新しい局、デバッグパネルの既存イベント処理を維持しています。破損localStorageは安全に初期値へ復旧します。

## Phase 9 final regression notes
複数局進行を実装する際は一局牌譜を対局牌譜へ統合し、対局終了時に `gamesPlayed` を更新してください。ブラウザごとのクリップボード権限も最終確認対象です。
