# Testing

中央テストランナーはリポジトリ直下から実行します。

```bash
node tests/run-all-tests.js
```

`.github/workflows/test.yml` は pull request と `main` への push で同じコマンドを実行します。テスト失敗時は workflow も失敗し、生成ファイルやソース変更をコミットしません。

`tests/github-actions-test-workflow.test.js` はworkflowファイルの存在、トリガー、中央テストコマンド、`continue-on-error: true`がないことを静的に検証します。
