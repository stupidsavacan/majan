# Phase 14.2C Rules Correctness and CI Hardening Report

## 結果

Phase 14.2Cの必須ブロッカー8項目を実ゲーム経路で修正し、決定的回帰テストを中央テストランナーへ登録した。

## 修正とテスト証拠

| 項目 | 実装 | 決定的テスト |
| --- | --- | --- |
| 複数待ちフリテン | `FuritenManager`が現在の全待ちを計算し、自河に待ち牌が1種でもあれば人間・CPU・槍槓のロンを拒否する。ツモは拒否しない。 | `tests/multi-wait-furiten.test.js` |
| アシストと天和・地和 | 開始手牌または初回ツモのアシスト適用時に開始役満文脈を無効化する。自然な天和・地和は維持する。 | `tests/opening-yaku-assist-guard.test.js` |
| リーチ後暗槓 | リーチ後暗槓は現在の`lastDraw`を含み、固定面子を保持した解析で待ちが不変の場合だけ許可する。 | `tests/riichi-ankan-current-draw.test.js` |
| ダブロン方針 | `doubleRonPolicy.allowed`を`false`に固定し、複数候補は人間選択優先後、現在の順序規則で1人へ決定する。 | `tests/no-double-ron-policy.test.js` |
| 牌譜ID検証 | 牌譜IDを空でない文字列に限定し、プレイヤーID `0`・`1`・`2`を重複なしで要求する。不正保存牌譜は索引から除外する。 | `tests/record-id-validation.test.js` |
| 役満倍率の保存 | コンパクト牌譜に`yakumanCount`と`basePoints`を保存し、索引と最高打点選択で倍率を優先する。旧牌譜も安全に読む。 | `tests/yakuman-record-index.test.js` |
| 設定復旧 | 不正設定の退避失敗を診断へ記録し、退避成否と独立して既定設定への復旧を継続する。 | `tests/settings-recovery-backup-failure.test.js` |
| GitHub Actions | pull requestと`main`へのpushでNode.js 22を使い、中央テストランナーを実行する。 | `tests/github-actions-test-workflow.test.js` |

## 中央テスト

canonicalとroot双方の`tests/run-all-tests.js`へPhase 14.2Cの8テストを登録した。

```text
node tests/run-all-tests.js
```

## CI

rootの`.github/workflows/test.yml`はpull requestと`main`へのpushで`node tests/run-all-tests.js`を実行する。`continue-on-error`や成功を偽装するコマンドは使用しない。

## ドキュメント上の方針

- ダブロンは未実装であり、現在は決定的な単独ロンを採用する。
- `doubleRonPolicy.allowed`は`false`である。
- CPUポン・チー・明槓は未実装である。
- CPU通常ロンは従来どおり実装済みである。

## 残る許可済み範囲

- CPUポン・チー・明槓は未実装。
- ダブロンは未実装。
- CPU戦略は単純で、押し引き・安全牌判断・打点期待値AIは未実装。
- ノーテン罰符・四槓流れ・南入・西入は未完成。
- ZIP workflow hardening pending。
