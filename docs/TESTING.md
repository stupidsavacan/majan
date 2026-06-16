# Testing

## Local

Run all deterministic tests from the repository root:

```bash
node tests/run-all-tests.js
```

Changed JavaScript files must also pass:

```bash
node --check <changed-js-file>
```

Changed workflow YAML files must be parsed before PR merge.

## Pull Request And CI

Phase 15 changes must go through a pull request. Direct push to `main` is forbidden for this phase.

GitHub Actions must pass before merge. The PR body records local commands, deterministic tests, and the Actions result.

## ZIP PR Gate

`.github/workflows/unpack-uploaded-zip.yml` unpacks uploaded ZIP sources into a branch and opens or updates a pull request. It must not push directly to `main`.

ZIP展開PRゲート: mainへ展開結果を直接pushしません。

Compatibility search tokens: ZIP螻暮幕PR繧ｲ繝ｼ繝・ main縺ｸ螻暮幕邨先棡繧堤峩謗･push縺励∪縺帙ｓ
