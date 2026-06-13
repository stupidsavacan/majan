# Phase 6 完了報告

## 監査概要

Phase 1〜5の統合状態を対象に、rootロード、完全オフライン動作、牌表示、牌枚数、ゲーム進行、分析・点数・操作モジュール、localStorageを回帰監査しました。大規模な新機能は追加せず、発見した例外・重複・soft-lock要因を最小差分で防御しています。

```yaml
phase6_audit:
  loading:
    - root_index_loads
    - script_order_valid
    - sanma_modules_defined
    - no_reference_error
  offline:
    - no_cdn
    - no_google_fonts
    - no_fetch
    - direct_file_open
  tile_integrity:
    - no_duplicate_tile_instance_ids
    - no_null_tiles
    - red_fives_normalize
  gameplay:
    - new_round
    - human_discard
    - cpu_discard
    - action_window_no_softlock
    - settlement_no_crash
```

## 発見・修正した不具合

- null牌が描画配列へ混入すると `renderTileRow` と人間手牌表示が例外になる問題を、null除外で防御しました。
- 山切れ時のCPUツモ・CPU打牌・人間ツモ・手動ツモでnull牌を扱う可能性を、安全な局終了へ統一しました。
- 古い呼び出し窓から既に河にない牌へポン・チーすると、牌を重複生成できる問題を、河と `lastDiscard` の再検証で修正しました。
- 不正な精算データで一部の点棒だけ更新した後に例外となる問題を、事前検証後の一括更新へ変更しました。
- 精算失敗時にも和了終了へ進む問題を修正し、進行可能な状態を維持しました。
- localStorageの壊れたJSON、保存失敗、リセット失敗を捕捉し、初期設定へ復旧するようにしました。

## テスト追加・更新

- `tests/smoke.test.js`: 必須モジュール、RuleConfig、Wall、GameEngine、和了形、役、点数、ActionResolverのスモークテスト
- `tests/regression.test.js`: 108/104枚、重複ID、null牌、山切れ、古い鳴き、精算原子性、赤五正規化、localStorage復旧
- `tests/run-all-tests.js`: Phase 2〜6テストを順番に実行し、1件でも失敗した場合に非ゼロ終了
- 既存のHandAnalysis、YakuAnalysis、ScoreCalculator、ActionResolverテストも一括実行対象

## テストコマンド

```powershell
node tests/run-all-tests.js
```

## ブラウザ確認

詳細手順は `PHASE6_BROWSER_CHECKLIST.md` に記載しました。root直接起動、新しい局、設定、高打点モード、固定seed、クリック・タッチ打牌、デバッグ、和了・役・点数、操作窓、外部通信なしを確認対象としています。

実測ではローカルroot、GitHub root、展開版、再構築ZIPの再展開版を直接起動し、必須モジュール18個、クリック・タッチ打牌、設定保存、高打点モード、固定seed、デバッグ各節、壊れたlocalStorage復旧を確認しました。全対象で外部通信・コンソールエラー・未処理例外は0件でした。

## 残る既知の問題

- カンは候補検出・表示のみで、嶺上牌・槓ドラを含む実行は未実装です。
- リーチ後の打牌制限、フリテン、一発、裏ドラは未実装です。
- CPUはランダム打牌で、鳴き・ロンを自動スキップします。
- 副露を含む役・符計算は基礎対応で、各面子の開閉を使う詳細精度は未整備です。
- 流局、局進行、成績・牌譜保存は未実装です。

## Phase 7向けメモ

- 副露を含む役・符計算を面子単位の開閉情報で精密化する
- カン実行時の山・王牌・嶺上牌・槓ドラ更新を牌枚数テスト付きで実装する
- リーチ後制約、フリテン、一発、CPU操作判断を段階的に追加する

## 軽量バグチェック

- root `index.html` のCSS・JSロード順と必須 `Sanma.*` 定義を確認
- root直接起動を維持し、CDN、Google Fonts、`fetch()`、`@import url(...)`、外部script・画像・フォント要求がないことを確認
- Yuji Maiのdata URL埋め込み、1m/9m配置、白の枠なし、背面 `#f8b500` 系を確認
- 人間打牌、新しい局、デバッグ画面、呼び出し窓、精算の回帰確認を実施
- `node tests/run-all-tests.js` を実行し、全テスト成功
