# Phase 9 Browser Checklist

## Desktop

- [x] root `index.html` を `file://` で直接開ける
- [x] Phase 9.1タイトル・見出しが表示される
- [x] 人間打牌、新しい局、固定seedが動作する
- [x] 設定・牌譜・デバッグの各ダイアログが開閉できる

## Mobile / Touch

- [x] タッチ打牌が動作する
- [x] ダイアログ内の操作ボタンが意図せずsubmitしない
- [x] 設定・牌譜パネルがスクロール可能である

## Offline / Network

- [x] 外部通信要求0件
- [x] CDN、Google Fonts、外部画像、外部script、`fetch()`なし
- [x] Yuji Mai埋め込みフォントが読み込まれる

## Records / Stats

- [x] 空状態で牌譜・成績パネルが停止しない
- [x] 保存牌譜、イベント、成績、最高打点を表示できる
- [x] 牌譜JSON表示・コピーと牌譜/成績リセットが動作する
- [x] 破損保存データの復旧状態を表示できる

## Settings / Diagnostics

- [x] 設定JSON表示・インポート・初期化が動作する
- [x] 不正JSONでゲームが停止せず日本語エラーを表示する
- [x] 全保存データリセットが設定・牌譜・成績を削除する
- [x] Phase 9.1、モジュール、localStorage、牌譜数、オフライン状態を診断表示する

## Gameplay Smoke

- [x] クリック・タッチ打牌
- [x] CPU手番
- [x] Phase 2〜7回帰スイート
- [x] 牌デザインと白の枠なしを維持
