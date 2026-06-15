# Phase 14.2 Critical Bug Sweep Report

## 結果

Phase 14.2の必須項目を実装し、中央テストランナーへ回帰テストを登録しました。Phase 14.1のテストとCPU親開始修正も維持しています。

## 修正内容

| 項目 | 実装 | 回帰テスト |
| --- | --- | --- |
| 設定JSONインポート | 公開UI設定だけを明示allowlistで受理し、未知キー・内部設定・不正enum・不正数値を入力全体として拒否 | `tests/settings-import-hardening.test.js` |
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
- 南入・西入は未実装です。
- ZIP workflow hardening pending。
- 全状態を網羅するphase-aware invariant coverage pending。
