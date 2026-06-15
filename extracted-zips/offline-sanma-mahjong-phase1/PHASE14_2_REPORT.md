# Phase 14.2 Follow-up Strict Blockers Report

## 結果

Phase 14.2 follow-upの必須ブロッカーを実装し、中央テストランナーへ決定論的回帰テストを登録しました。Phase 14.1、Phase 14.2、CPU親開始修正のテストも維持しています。

## Follow-up修正内容

| 項目 | 実装 | 決定論的テスト |
| --- | --- | --- |
| SeedPolicy依存 | `SeedPolicy.js`を独立モジュール化し、Wall・GameEngine・mainより前にロード | `tests/seed-policy-module.test.js` |
| 通常ロン優先 | 全ロン候補を収集し、人間ロン窓をCPU自動ロンより先に開く。人間見逃し後は最寄りの合法CPUロンを解決 | `tests/ron-priority-human-window.test.js` |
| 槍槓優先 | 全槍槓候補を収集し、人間槍槓窓をCPU自動槍槓より先に開く。国士無双の暗槓槍槓例外を維持 | `tests/chankan-priority-human-window.test.js`, `tests/phase14-1-chankan.test.js` |
| 天和・地和 | 開始手牌と初回無割り込みツモの実GameEngine文脈から和了解析・得点計算へ接続 | `tests/tenho-chiho-context.test.js` |
| 設定保存検証 | JSONインポートとlocalStorage読込を共通の公開UI設定スキーマで全体検証 | `tests/settings-storage-hardening.test.js`, `tests/settings-import-hardening.test.js` |
| 保存牌譜検証 | 保存済みlocalStorage牌譜もインポート同等の上限・型検証後に読込 | `tests/saved-records-hardening.test.js`, `tests/record-import-hardening.test.js` |
| 北抜きアシスト | 人間とCPUの北抜き補充ツモを同じAssistManager経路で評価し、assistイベントとlastDrawを維持 | `tests/kita-assist-consistency.test.js` |
| 完了牌譜再試行 | 保存失敗を描画から隔離し、牌譜削除・保存領域リセット後の明示再試行経路を追加 | `tests/record-save-retry.test.js`, `tests/storage-render-failure.test.js` |

## 修正内容

| 項目 | 実装 | 回帰テスト |
| --- | --- | --- |
| 設定JSONインポート | `RuleConfig.normalSettings`と一致する公開UI設定だけを明示allowlistで受理し、`startingPoints`を含む未知キー・内部設定・不正enum・不正数値を入力全体として拒否 | `tests/settings-import-hardening.test.js` |
| seed長 | 最大128文字。129文字以上はエンジン・Wallへ渡す前に拒否 | `tests/settings-import-hardening.test.js`, `tests/smoke.test.js` |
| 牌譜インポート | JSON解析前の文字数制限と、players・rounds・events・文字列長・result型の検証を実施 | `tests/record-import-hardening.test.js` |
| AdvancedStats防御 | `yaku`・`yakuman`などの型を確認し、不正値を空配列として扱う | `tests/record-import-hardening.test.js` |
| 保存失敗時の描画 | 完了牌譜保存失敗を警告・診断に記録し、例外を描画外へ出さず、同一牌譜の連続再試行を抑止 | `tests/storage-render-failure.test.js` |
| 開局アシスト | 交換対象が親の`lastDraw`の場合、交換後の牌へ更新 | `tests/assist-lastdraw-integrity.test.js` |
| CPU槓後の嶺上ツモ | 嶺上牌取得直後、立直・打牌より先にツモ和了を判定して決済 | `tests/cpu-kan-rinshan-win.test.js` |
| RecoveryManager | 人間手番は自動ツモ後の`human-discard`、CPU手番はCPU自動進行を再開し、変更通知を送出 | `tests/recovery-manager.test.js` |
| 役満倍率 | 天和・地和・国士無双十三面待ちを検出し、役満配列長ではなく倍率合計で得点計算 | `tests/yakuman-multiplicity.test.js` |
| CPU通常ロン | 捨牌後、鳴きより先にフリテンを含むロン可否を判定し、最も近い合法CPU一人を決定的に選択 | `tests/cpu-ron-reaction.test.js` |
| 対象状態の不変条件 | CPU親初打牌、嶺上牌、CPUロン後、復旧後のphase/turnを検査 | `tests/cpu-dealer-start-round.test.js`と各Phase 14.2テスト |
| Wall smoke seed | `{ seed: ... }`形式へ修正し、同seed同順・異seed異順を検証 | `tests/smoke.test.js` |

## CPU親開始修正の維持

- 実際の親ローテーションを維持しています。
- CPU 1・CPU 2が親の局は自動で開始します。
- CPU親の初打牌前に通常ツモを追加しません。
- 配牌後、親以外の`lastDraw`は`null`です。
- `tests/cpu-dealer-start-round.test.js`は中央ランナーで実行されます。

## インポートと保存

- 設定インポートは検証前に`RuleConfig.createRuleConfig`へ渡しません。
- `startingPoints`は公開UI項目ではないため、正しい数値形式でもインポートとエクスポートの対象外です。
- 不正な設定インポートは現在の設定を変更しません。
- 牌譜インポートは無制限データをdeep cloneする前に上限と型を検証します。
- 不正牌譜は保存されません。
- malformed recordをAdvancedStats・ReplayViewer・統計UIへ渡しても例外を発生させません。
- localStorageへの完了牌譜保存が失敗しても卓描画を継続します。

## 和了と得点

- CPU通常ロンは人間捨牌とCPU捨牌の双方で動作し、自己ロンとフリテンロンを拒否します。
- CPUロンはCPUポン候補より優先されます。
- CPU槓後は嶺上牌でツモ和了を判定し、和了後に打牌しません。
- 天和・地和・国士無双・国士無双十三面待ち・複合役満倍率を回帰テストで検証しました。
- 親の単一役満48,000点、三倍役満144,000点を検証しました。
- 役満時にドラを加算しません。

## テスト

中央ランナー:

```text
node tests/run-all-tests.js
```

新規・更新した回帰テスト:

- `tests/settings-import-hardening.test.js`
- `tests/record-import-hardening.test.js`
- `tests/storage-render-failure.test.js`
- `tests/assist-lastdraw-integrity.test.js`
- `tests/cpu-kan-rinshan-win.test.js`
- `tests/recovery-manager.test.js`
- `tests/yakuman-multiplicity.test.js`
- `tests/cpu-ron-reaction.test.js`
- `tests/smoke.test.js`
- `tests/state-integrity.test.js`
- `tests/seed-policy-module.test.js`
- `tests/ron-priority-human-window.test.js`
- `tests/chankan-priority-human-window.test.js`
- `tests/tenho-chiho-context.test.js`
- `tests/settings-storage-hardening.test.js`
- `tests/saved-records-hardening.test.js`
- `tests/kita-assist-consistency.test.js`
- `tests/record-save-retry.test.js`

## 軽量バグチェック

- root `index.html`とcanonical `index.html`のseed入力に`maxlength="128"`があることをsmoke testで確認します。
- `Sanma.SeedPolicy`をsmokeと診断の必須モジュールへ追加しました。
- root `index.html`をChromeで直接オフライン起動し、ページ例外と外部リクエストが0件であることを確認しました。
- CDN、Google Fonts、`fetch()`、外部script、ネットワークフォントを追加していません。
- 人間打牌・新局・デバッグ画面・129文字seed拒否をブラウザで確認しました。
- 全中央テストと変更JavaScriptの`node --check`が成功しました。

## 残る範囲

- CPUポン・チー・明槓は未実装です。
- CPU戦略は単純です。
- 押し引き・安全牌判断・打点期待値AIは未実装です。
- ダブロンは未実装です。
- ノーテン罰符・四槓流れ・南入・西入は未実装または未完成です。
- ZIP workflow hardening pending。
