# Phase 14.1 Settling old scores 実装レポート

## Status

`overall_status: passed`

## Claim-to-evidence matrix

| Feature | Old claim/status | Old actual code path | Old problem | New implementation | Deterministic test evidence | Files changed |
|---|---|---|---|---|---|---|
| stale root loader | root `index.html` が入口 | root `src/main.js` に古い動的ローダー | 現行モジュールを欠く別入口に見えた | root `src/main.js` を警告だけを出す明示的な非入口へ変更し、READMEに唯一の入口を明記 | `phase14-1-runtime.test.js` | root `src/main.js`, `README.md` |
| multiple kan choice | 自己カン候補検出あり | `requestHumanKan()` が先頭候補を即実行 | 複数候補を選択・取消できなかった | 専用フェーズ、全候補UI、選択、取消、無変更取消を実装 | `phase14-1-kan-choice.test.js` | `GameEngine.js`, `GameStateMachine.js`, `renderTable.js`, `main.js` |
| chankan flow | 槍槓の得点文脈あり | カン確定・嶺上・ドラ表示後にcontextを返した | 実ゲームのロン割り込みではなかった | カン宣言をprepare/finalizeに分離し、確定前にロン割り込み・精算・牌譜記録を実行 | `phase14-1-chankan.test.js` | `KanRules.js`, `GameEngine.js` |
| kokushi ankan chankan | 国士・暗槓は個別に存在 | 暗槓前の国士ロン判定なし | 国士無双だけの暗槓槍槓例外がなかった | 暗槓宣言牌で国士無双が完成する場合だけロンを許可 | `phase14-1-chankan.test.js` | `GameEngine.js`, `KanRules.js` |
| fixed meld/open scoring | 副露牌を匿名合成 | 副露牌3枚をconcealed牌へ追加 | open・kan・固定面子情報が和了分解から失われた | 固定面子を構造付きで和了形へ統合し、役・符計算まで保持 | `phase14-1-fixed-meld-scoring.test.js` | `HandAnalysis.js`, `ActionResolver.js`, `ScoreCalculator.js` |
| AssistManager actual behavior | 設定判定と監査イベント | 条件成立時も`applied: false` | 設定が実ゲームへ作用しなかった | シャンテン推定が改善する交換だけを実行し、回数上限・TileLedger・牌譜を維持 | `phase14-1-assist-replay.test.js` | `AssistManager.js`, `GameEngine.js` |
| replay exactness for new records | 短縮牌名による簡易再生 | 同種牌を文字列の末尾一致で削除 | 個体、加槓、補助交換を正確に戻せなかった | 新規牌譜にinstance ID付き牌トークンを保存し、個体単位で前後再生 | `phase14-1-assist-replay.test.js` | `GameRecord.js`, `GameEngine.js`, `ReplayViewer.js` |
| README/report truthfulness | 未接続機能を未実装欄へ記載 | 実装事実とREADMEが不一致 | 利用可能範囲を誤解させた | 実装済み・未実装・既知の問題を現行コードに合わせて更新 | `phase14-1-runtime.test.js` | root/canonical `README.md`, 本レポート |

## 実装証拠

### Runtime

- root `index.html` が現行canonicalモジュールを直接読み込みます。
- root `src/main.js` は動的ロードを行わず、非入口であることを明示します。
- 静的テストは古い動的ローダーが復活した場合に失敗します。

### カン選択・槍槓

- 複数自己カン候補は牌・副露・山・ドラ・フェーズを変更せず選択窓を開きます。
- 加槓と暗槓は確定前の`pendingKanAttempt`として保持されます。
- 加槓は通常槍槓、暗槓は国士無双だけをロン判定へ通します。
- フリテンは通常ロンと同じ`FuritenManager`で拒否します。
- 人間の見逃しは通常ロンと同じフリテン状態を設定します。
- CPU槍槓ロンは自動でロン精算し、カン・嶺上・カンドラを確定しません。
- 槍槓成立前の有効な一発状態は得点計算まで保持されます。
- 大明槓は槍槓判定へ入りません。

### 固定面子得点

- concealed牌とfixed meldを別データとして和了解析へ渡します。
- 固定順子・刻子・槓子に`fixed`、`open`、`isKan`、`sourceMeld`を保持します。
- 副露断么九・役牌・対々和を判定します。
- 副露手へリーチ・門前清自摸和・平和・一盃口・七対子を誤付与しません。
- 明刻・明槓・暗槓の符を固定面子メタデータから計算します。

### Assist・牌譜再生

- AssistManagerは条件成立時も、シャンテン推定が改善しない交換を行いません。
- 適用時は手牌と山牌を交換し、instance ID総数と重複なしを維持します。
- 人間・CPU別の局内上限を適用します。
- 新規牌譜は`eventSchemaVersion: 2`でinstance ID、牌種、表示名、赤牌情報を保存します。
- 再生は同種牌の個体、鳴き元牌、暗槓・明槓・加槓、補助交換を区別します。
- 旧文字列形式の牌譜も従来どおり読み込みます。

## Test results

実行コマンド:

```text
node tests/run-all-tests.js
```

結果:

- 中央ランナーの全21スイートが成功
- `source-format.test.js` 成功
- `node --check` による変更JavaScriptの構文確認成功
- 中央ランナーは失敗時に非0終了

## 軽量バグチェック

- root `index.html` が追加・変更したcanonicalファイルを読み込むことを静的テストで確認しました。
- `Sanma.*`必須モジュールはsmoke testで確認しました。
- root `index.html`の直接オフライン起動をブラウザで確認しました。
- CDN、Google Fonts、`fetch()`、外部script、外部フォント要求の追加がないことを検索確認しました。
- 人間打牌、新局、デバッグ画面が表示され、初期局面が操作可能であることをブラウザで確認しました。
- 全中央テストを実行し、すべて成功しました。

## Out of scope

- 四槓散了
- ダブロン、アガリ止め、南入・西入
- 未収録の任意ローカル役
