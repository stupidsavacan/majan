# Phase 12 状態管理・データ整合性強化レポート

canonical実装の詳細は `extracted-zips/offline-sanma-mahjong-phase1/PHASE12_REPORT.md` と同一です。

## Summary
- 状態機械、牌台帳、整合性検査、復旧処理、保存version 2移行、デバッグイベントログを追加した。
- root `index.html` はcanonicalのPhase 12ファイルを読み込む。
- canonicalとrepository rootの全テストが成功した。
- 配布ZIPを再生成し、展開後の全テストも成功した。

## Storage keys
- `offlineSanma.phase1.settings`
- `offlineSanma.phase8.records`
- `offlineSanma.phase8.stats`
- `offlineSanma.phase12.backup.*`

## 軽量バグチェック
- root/canonicalの読み込み順、必須 `Sanma.*`、直接オフライン起動方針、外部通信なしを確認した。
- human discard、新しい局、呼び出し窓、debug panel、保存読込の回帰テストが成功した。
- Chrome headlessでroot `index.html`の `file://` 起動、打牌、新しい対局、デバッグ診断を確認した。
- コンソールエラー、失敗request、外部HTTP requestはいずれも0件だった。
