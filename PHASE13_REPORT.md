# Phase 13 牌譜再生・成績強化レポート

canonical実装の詳細は `extracted-zips/offline-sanma-mahjong-phase1/PHASE13_REPORT.md` と同一です。

## Summary
- 検索・絞り込み・詳細・入出力・個別削除に対応する牌譜一覧を追加した。
- 前後移動、先頭末尾移動、自動再生、旧形式部分再生に対応する `ReplayViewer` を追加した。
- 順位、最終点、和了種別、放銃、最高得点、役頻度、役満名、モード別の詳細成績を追加した。
- `RecordIndex` と牌譜サイズ診断を追加した。
- canonical、repository root、配布ZIP展開後の全テストが成功した。

## Storage key
- `offlineSanma.phase13.recordIndex`

## 軽量バグチェック
- root/canonicalの読み込み順、必須 `Sanma.*`、直接オフライン起動方針、外部通信なしを確認した。
- human discard、新しい対局、呼び出し窓、debug panel、保存読込の全回帰テストが成功した。
- 旧形式牌譜の欠損イベントと範囲外プレイヤー番号を安全に読み飛ばすよう修正した。
- 牌譜本文とインデックスのID不一致を検出して再構築するよう修正した。
- root `index.html` のブラウザ自動確認でコンソールエラー、失敗request、外部HTTP requestが0件だった。
