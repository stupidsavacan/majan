> 警告: この文書は過去資料です。現在仕様の正本は root README.md と docs/INDEX.md を参照してください。

# Phase 14.2C Rules Correctness and CI Hardening Report

## 邨先棡

Phase 14.2C縺ｮ蠢・医ヶ繝ｭ繝・き繝ｼ8鬆・岼繧貞ｮ溘ご繝ｼ繝邨瑚ｷｯ縺ｧ菫ｮ豁｣縺励∵ｱｺ螳夂噪蝗槫ｸｰ繝・せ繝医ｒ荳ｭ螟ｮ繝・せ繝医Λ繝ｳ繝翫・縺ｸ逋ｻ骭ｲ縺励◆縲・
## 菫ｮ豁｣縺ｨ繝・せ繝郁ｨｼ諡

| 鬆・岼 | 螳溯｣・| 豎ｺ螳夂噪繝・せ繝・|
| --- | --- | --- |
| 隍・焚蠕・■繝輔Μ繝・Φ | `FuritenManager`縺檎樟蝨ｨ縺ｮ蜈ｨ蠕・■繧定ｨ育ｮ励＠縲∬・豐ｳ縺ｫ蠕・■迚後′1遞ｮ縺ｧ繧ゅ≠繧後・莠ｺ髢薙・CPU繝ｻ讒肴ｧ薙・繝ｭ繝ｳ繧呈拠蜷ｦ縺吶ｋ縲ゅヤ繝｢縺ｯ諡貞凄縺励↑縺・・| `tests/multi-wait-furiten.test.js` |
| 繧｢繧ｷ繧ｹ繝医→螟ｩ蜥後・蝨ｰ蜥・| 髢句ｧ区焔迚後∪縺溘・蛻晏屓繝・Δ縺ｮ繧｢繧ｷ繧ｹ繝磯←逕ｨ譎ゅ↓髢句ｧ句ｽｹ貅譁・ц繧堤┌蜉ｹ蛹悶☆繧九り・辟ｶ縺ｪ螟ｩ蜥後・蝨ｰ蜥後・邯ｭ謖√☆繧九・| `tests/opening-yaku-assist-guard.test.js` |
| 繝ｪ繝ｼ繝∝ｾ梧囓讒・| 繝ｪ繝ｼ繝∝ｾ梧囓讒薙・迴ｾ蝨ｨ縺ｮ`lastDraw`繧貞性縺ｿ縲∝崋螳夐擇蟄舌ｒ菫晄戟縺励◆隗｣譫舌〒蠕・■縺御ｸ榊､峨・蝣ｴ蜷医□縺題ｨｱ蜿ｯ縺吶ｋ縲・| `tests/riichi-ankan-current-draw.test.js` |
| 繝繝悶Ο繝ｳ譁ｹ驥・| `doubleRonPolicy.allowed`繧蛋false`縺ｫ蝗ｺ螳壹＠縲∬､・焚蛟呵｣懊・莠ｺ髢馴∈謚槫━蜈亥ｾ後∫樟蝨ｨ縺ｮ鬆・ｺ剰ｦ丞援縺ｧ1莠ｺ縺ｸ豎ｺ螳壹☆繧九・| `tests/no-double-ron-policy.test.js` |
| 迚瑚ｭ廬D讀懆ｨｼ | 迚瑚ｭ廬D繧堤ｩｺ縺ｧ縺ｪ縺・枚蟄怜・縺ｫ髯仙ｮ壹＠縲√・繝ｬ繧､繝､繝ｼID `0`繝ｻ`1`繝ｻ`2`繧帝㍾隍・↑縺励〒隕∵ｱゅ☆繧九ゆｸ肴ｭ｣菫晏ｭ倡煙隴懊・邏｢蠑輔°繧蛾勁螟悶☆繧九・| `tests/record-id-validation.test.js` |
| 蠖ｹ貅蛟咲紫縺ｮ菫晏ｭ・| 繧ｳ繝ｳ繝代け繝育煙隴懊↓`yakumanCount`縺ｨ`basePoints`繧剃ｿ晏ｭ倥＠縲∫ｴ｢蠑輔→譛鬮俶遠轤ｹ驕ｸ謚槭〒蛟咲紫繧貞━蜈医☆繧九よ立迚瑚ｭ懊ｂ螳牙・縺ｫ隱ｭ繧縲・| `tests/yakuman-record-index.test.js` |
| 險ｭ螳壼ｾｩ譌ｧ | 荳肴ｭ｣險ｭ螳壹・騾驕ｿ螟ｱ謨励ｒ險ｺ譁ｭ縺ｸ險倬鹸縺励・驕ｿ謌仙凄縺ｨ迢ｬ遶九＠縺ｦ譌｢螳夊ｨｭ螳壹∈縺ｮ蠕ｩ譌ｧ繧堤ｶ咏ｶ壹☆繧九・| `tests/settings-recovery-backup-failure.test.js` |
| GitHub Actions | pull request縺ｨ`main`縺ｸ縺ｮpush縺ｧNode.js 22繧剃ｽｿ縺・∽ｸｭ螟ｮ繝・せ繝医Λ繝ｳ繝翫・繧貞ｮ溯｡後☆繧九・| `tests/github-actions-test-workflow.test.js` |

## 荳ｭ螟ｮ繝・せ繝・
root縺ｨcanonical蜿梧婿縺ｮ`tests/run-all-tests.js`縺ｸPhase 14.2C縺ｮ8繝・せ繝医ｒ逋ｻ骭ｲ縺励◆縲・
```text
node tests/run-all-tests.js
```

## CI

`.github/workflows/test.yml`縺ｯpull request縺ｨ`main`縺ｸ縺ｮpush縺ｧ`node tests/run-all-tests.js`繧貞ｮ溯｡後☆繧九Ａcontinue-on-error`繧・・蜉溘ｒ蛛ｽ陬・☆繧九さ繝槭Φ繝峨・菴ｿ逕ｨ縺励↑縺・・
## 繝峨く繝･繝｡繝ｳ繝井ｸ翫・譁ｹ驥・
- 繝繝悶Ο繝ｳ縺ｯ譛ｪ螳溯｣・〒縺ゅｊ縲∫樟蝨ｨ縺ｯ豎ｺ螳夂噪縺ｪ蜊倡峡繝ｭ繝ｳ繧呈治逕ｨ縺吶ｋ縲・- `doubleRonPolicy.allowed`縺ｯ`false`縺ｧ縺ゅｋ縲・- CPU繝昴Φ繝ｻ繝√・繝ｻ譏取ｧ薙・譛ｪ螳溯｣・〒縺ゅｋ縲・- CPU騾壼ｸｸ繝ｭ繝ｳ縺ｯ蠕捺擂縺ｩ縺翫ｊ螳溯｣・ｸ医∩縺ｧ縺ゅｋ縲・
## 谿九ｋ險ｱ蜿ｯ貂医∩遽・峇

- CPU繝昴Φ繝ｻ繝√・繝ｻ譏取ｧ薙・譛ｪ螳溯｣・・- 繝繝悶Ο繝ｳ縺ｯ譛ｪ螳溯｣・・- CPU謌ｦ逡･縺ｯ蜊倡ｴ斐〒縲∵款縺怜ｼ輔″繝ｻ螳牙・迚悟愛譁ｭ繝ｻ謇鍋せ譛溷ｾ・､AI縺ｯ譛ｪ螳溯｣・・- 繝弱・繝・Φ鄂ｰ隨ｦ繝ｻ蝗帶ｧ捺ｵ√ｌ繝ｻ蜊怜・繝ｻ隘ｿ蜈･縺ｯ譛ｪ螳梧・縲・- ZIP workflow hardening pending縲・
