# Phase 10 対局進行・局管理

## Match flow summary

- `MatchManager` に対局ID、局、親、本場、供託、点棒、終了状態、順位を集約した。
- `GameEngine` は各局の牌操作を担当し、局終了時に `MatchManager` へ結果を一度だけ渡す。
- `次局へ` 操作で点棒を保持したまま次局を配牌する。
- 一局戦、東風戦、半荘戦を設定から選択できる。

## Round transition rules

- 子の和了: 親を次席へ移し、本場を0へ戻す。
- 親の和了: 同じ局・同じ親で連荘し、本場を1増やす。
- 流局: 既存の聴牌判定で親が聴牌していれば連荘し、本場を1増やす。
- 東風戦は東3局、半荘戦は南3局を親流れで終了する。
- `allowTobi` 有効時は持ち点が0点未満のプレイヤーが出た時点で終了する。

## Dealer / renchan policy

- 親和了の連荘: 有効。
- 親聴牌流局の連荘: 有効。
- 親ノーテン流局の連荘: 無効。
- 同点順位は開始時の席順を優先し、決定的に並べる。

## Honba / riichi stick policy

- 本場・供託の支払いは既存 `ScoreCalculator` と `Settlement` を利用する。
- 和了後は供託を0へ戻し、流局時は次局へ繰り越す。
- 親連荘時は本場を増やし、親流れ時は0へ戻す。

## Ranking / end conditions

- 最終順位は点棒の降順で計算する。
- 返し点との差を `pointDelta` として記録・表示する。
- 一局戦終了、オーラス終了、トビ終了を判定する。

## Records integration

- 牌譜へ `matchId`、`dealerIndex`、`honba`、`riichiSticks`、局ごとの点棒移動、最終順位、終了理由を保存する。
- 古いPhase 8牌譜は不足フィールドへ安全な既定値を補って読み込む。
- 対局終了時だけ牌譜全体を確定保存し、途中局は同一牌譜へ蓄積する。

## Known limitations

- ノーテン罰符の点棒移動は未実装。
- ダブロン、アガリ止め、南入・西入などの詳細ルールは未実装。
- カン実行と完全な流局種別判定は今後のPhaseへ延期した。

## Tests

- `node tests/match-flow.test.js`: PASS
- `node tests/run-all-tests.js`: PASS
- 全JavaScript構文チェック: PASS
- root / canonical / ZIP展開後の `node tests/run-all-tests.js`: PASS
- root / ZIP展開後のChrome `file://` 直接起動監査: PASS
- browser console error / page error / 外部通信: 0件

## 軽量バグチェック

- root `index.html` とcanonical `index.html`へPhase 10モジュールを依存順で追加した。
- 必須 `Sanma.*` モジュール、直接 `file://` 起動方針、オフライン埋め込みフォントを維持した。
- CDN、Google Fonts、`fetch()`、外部script、ネットワークフォント要求は追加していない。
- 人間打牌、新しい対局、次局、デバッグ、設定、牌譜の既存経路を回帰テストした。
- 局終了後は `次局へ` または順位表示が必ず出るため、明確なUIソフトロックはない。
- 設定画面の対局形式が旧 `gameLength` を更新して反映されない問題を検出し、`matchLength` へ統一した。
- ZIP単体テストが外側の無関係な `index.html` をroot入口と誤認する問題を検出し、canonical配置時だけroot入口を検査するよう修正した。

## Notes for Phase 11

- ノーテン罰符、ダブロン、アガリ止め、詳細な延長戦条件を追加する場合は、`MatchManager` と `EndConditionManager` を拡張する。
- カン・嶺上・槓ドラは局内操作として `GameEngine` 側へ接続し、対局進行層とは分離する。
