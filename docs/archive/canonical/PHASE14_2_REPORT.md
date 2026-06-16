> 警告: この文書は過去資料です。現在仕様の正本は root README.md と docs/INDEX.md を参照してください。

# Phase 14.2 Follow-up Strict Blockers Report

## 邨先棡

Phase 14.2 follow-up縺ｮ蠢・医ヶ繝ｭ繝・き繝ｼ繧貞ｮ溯｣・＠縲∽ｸｭ螟ｮ繝・せ繝医Λ繝ｳ繝翫・縺ｸ豎ｺ螳夊ｫ也噪蝗槫ｸｰ繝・せ繝医ｒ逋ｻ骭ｲ縺励∪縺励◆縲１hase 14.1縲￣hase 14.2縲，PU隕ｪ髢句ｧ倶ｿｮ豁｣縺ｮ繝・せ繝医ｂ邯ｭ謖√＠縺ｦ縺・∪縺吶・

## Follow-up菫ｮ豁｣蜀・ｮｹ

| 鬆・岼 | 螳溯｣・| 豎ｺ螳夊ｫ也噪繝・せ繝・|
| --- | --- | --- |
| SeedPolicy萓晏ｭ・| `SeedPolicy.js`繧堤峡遶九Δ繧ｸ繝･繝ｼ繝ｫ蛹悶＠縲仝all繝ｻGameEngine繝ｻmain繧医ｊ蜑阪↓繝ｭ繝ｼ繝・| `tests/seed-policy-module.test.js` |
| 騾壼ｸｸ繝ｭ繝ｳ蜆ｪ蜈・| 蜈ｨ繝ｭ繝ｳ蛟呵｣懊ｒ蜿朱寔縺励∽ｺｺ髢薙Ο繝ｳ遯薙ｒCPU閾ｪ蜍輔Ο繝ｳ繧医ｊ蜈医↓髢九￥縲ゆｺｺ髢楢ｦ矩・＠蠕後・譛蟇・ｊ縺ｮ蜷域ｳ匹PU繝ｭ繝ｳ繧定ｧ｣豎ｺ | `tests/ron-priority-human-window.test.js` |
| 讒肴ｧ灘━蜈・| 蜈ｨ讒肴ｧ灘呵｣懊ｒ蜿朱寔縺励∽ｺｺ髢捺ｧ肴ｧ鍋ｪ薙ｒCPU閾ｪ蜍墓ｧ肴ｧ薙ｈ繧雁・縺ｫ髢九￥縲ょ嵜螢ｫ辟｡蜿後・證玲ｧ捺ｧ肴ｧ謎ｾ句､悶ｒ邯ｭ謖・| `tests/chankan-priority-human-window.test.js`, `tests/phase14-1-chankan.test.js` |
| 螟ｩ蜥後・蝨ｰ蜥・| 髢句ｧ区焔迚後→蛻晏屓辟｡蜑ｲ繧願ｾｼ縺ｿ繝・Δ縺ｮ螳檬ameEngine譁・ц縺九ｉ蜥御ｺ・ｧ｣譫舌・蠕礼せ險育ｮ励∈謗･邯・| `tests/tenho-chiho-context.test.js` |
| 險ｭ螳壻ｿ晏ｭ俶､懆ｨｼ | JSON繧､繝ｳ繝昴・繝医→localStorage隱ｭ霎ｼ繧貞・騾壹・蜈ｬ髢偽I險ｭ螳壹せ繧ｭ繝ｼ繝槭〒蜈ｨ菴捺､懆ｨｼ | `tests/settings-storage-hardening.test.js`, `tests/settings-import-hardening.test.js` |
| 菫晏ｭ倡煙隴懈､懆ｨｼ | 菫晏ｭ俶ｸ医∩localStorage迚瑚ｭ懊ｂ繧､繝ｳ繝昴・繝亥酔遲峨・荳企剞繝ｻ蝙区､懆ｨｼ蠕後↓隱ｭ霎ｼ | `tests/saved-records-hardening.test.js`, `tests/record-import-hardening.test.js` |
| 蛹玲栢縺阪い繧ｷ繧ｹ繝・| 莠ｺ髢薙→CPU縺ｮ蛹玲栢縺崎｣懷・繝・Δ繧貞酔縺連ssistManager邨瑚ｷｯ縺ｧ隧穂ｾ｡縺励∥ssist繧､繝吶Φ繝医→lastDraw繧堤ｶｭ謖・| `tests/kita-assist-consistency.test.js` |
| 螳御ｺ・煙隴懷・隧ｦ陦・| 菫晏ｭ伜､ｱ謨励ｒ謠冗判縺九ｉ髫秘屬縺励∫煙隴懷炎髯､繝ｻ菫晏ｭ倬伜沺繝ｪ繧ｻ繝・ヨ蠕後・譏守､ｺ蜀崎ｩｦ陦檎ｵ瑚ｷｯ繧定ｿｽ蜉 | `tests/record-save-retry.test.js`, `tests/storage-render-failure.test.js` |

## 菫ｮ豁｣蜀・ｮｹ

| 鬆・岼 | 螳溯｣・| 蝗槫ｸｰ繝・せ繝・|
| --- | --- | --- |
| 險ｭ螳哽SON繧､繝ｳ繝昴・繝・| `RuleConfig.normalSettings`縺ｨ荳閾ｴ縺吶ｋ蜈ｬ髢偽I險ｭ螳壹□縺代ｒ譏守､ｺallowlist縺ｧ蜿礼炊縺励～startingPoints`繧貞性繧譛ｪ遏･繧ｭ繝ｼ繝ｻ蜀・Κ險ｭ螳壹・荳肴ｭ｣enum繝ｻ荳肴ｭ｣謨ｰ蛟､繧貞・蜉帛・菴薙→縺励※諡貞凄 | `tests/settings-import-hardening.test.js` |
| seed髟ｷ | 譛螟ｧ128譁・ｭ励・29譁・ｭ嶺ｻ･荳翫・繧ｨ繝ｳ繧ｸ繝ｳ繝ｻWall縺ｸ貂｡縺吝燕縺ｫ諡貞凄 | `tests/settings-import-hardening.test.js`, `tests/smoke.test.js` |
| 迚瑚ｭ懊う繝ｳ繝昴・繝・| JSON隗｣譫仙燕縺ｮ譁・ｭ玲焚蛻ｶ髯舌→縲｝layers繝ｻrounds繝ｻevents繝ｻ譁・ｭ怜・髟ｷ繝ｻresult蝙九・讀懆ｨｼ繧貞ｮ滓命 | `tests/record-import-hardening.test.js` |
| AdvancedStats髦ｲ蠕｡ | `yaku`繝ｻ`yakuman`縺ｪ縺ｩ縺ｮ蝙九ｒ遒ｺ隱阪＠縲∽ｸ肴ｭ｣蛟､繧堤ｩｺ驟榊・縺ｨ縺励※謇ｱ縺・| `tests/record-import-hardening.test.js` |
| 菫晏ｭ伜､ｱ謨玲凾縺ｮ謠冗判 | 螳御ｺ・煙隴應ｿ晏ｭ伜､ｱ謨励ｒ隴ｦ蜻翫・險ｺ譁ｭ縺ｫ險倬鹸縺励∽ｾ句､悶ｒ謠冗判螟悶∈蜃ｺ縺輔★縲∝酔荳迚瑚ｭ懊・騾｣邯壼・隧ｦ陦後ｒ謚第ｭ｢ | `tests/storage-render-failure.test.js` |
| 髢句ｱ繧｢繧ｷ繧ｹ繝・| 莠､謠帛ｯｾ雎｡縺瑚ｦｪ縺ｮ`lastDraw`縺ｮ蝣ｴ蜷医∽ｺ､謠帛ｾ後・迚後∈譖ｴ譁ｰ | `tests/assist-lastdraw-integrity.test.js` |
| CPU讒灘ｾ後・蠍ｺ荳翫ヤ繝｢ | 蠍ｺ荳顔煙蜿門ｾ礼峩蠕後∫ｫ狗峩繝ｻ謇鍋煙繧医ｊ蜈医↓繝・Δ蜥御ｺ・ｒ蛻､螳壹＠縺ｦ豎ｺ貂・| `tests/cpu-kan-rinshan-win.test.js` |
| RecoveryManager | 莠ｺ髢捺焔逡ｪ縺ｯ閾ｪ蜍輔ヤ繝｢蠕後・`human-discard`縲，PU謇狗分縺ｯCPU閾ｪ蜍暮ｲ陦後ｒ蜀埼幕縺励∝､画峩騾夂衍繧帝∝・ | `tests/recovery-manager.test.js` |
| 蠖ｹ貅蛟咲紫 | 螟ｩ蜥後・蝨ｰ蜥後・蝗ｽ螢ｫ辟｡蜿悟香荳蛾擇蠕・■繧呈､懷・縺励∝ｽｹ貅驟榊・髟ｷ縺ｧ縺ｯ縺ｪ縺丞咲紫蜷郁ｨ医〒蠕礼せ險育ｮ・| `tests/yakuman-multiplicity.test.js` |
| CPU騾壼ｸｸ繝ｭ繝ｳ | 謐ｨ迚悟ｾ後・ｳｴ縺阪ｈ繧雁・縺ｫ繝輔Μ繝・Φ繧貞性繧繝ｭ繝ｳ蜿ｯ蜷ｦ繧貞愛螳壹＠縲∵怙繧りｿ代＞蜷域ｳ匹PU荳莠ｺ繧呈ｱｺ螳夂噪縺ｫ驕ｸ謚・| `tests/cpu-ron-reaction.test.js` |
| 蟇ｾ雎｡迥ｶ諷九・荳榊､画擅莉ｶ | CPU隕ｪ蛻晄遠迚後∝ｶｺ荳顔煙縲，PU繝ｭ繝ｳ蠕後∝ｾｩ譌ｧ蠕後・phase/turn繧呈､懈渊 | `tests/cpu-dealer-start-round.test.js`縺ｨ蜷Пhase 14.2繝・せ繝・|
| Wall smoke seed | `{ seed: ... }`蠖｢蠑上∈菫ｮ豁｣縺励∝酔seed蜷碁・・逡ｰseed逡ｰ鬆・ｒ讀懆ｨｼ | `tests/smoke.test.js` |

## CPU隕ｪ髢句ｧ倶ｿｮ豁｣縺ｮ邯ｭ謖・

- 螳滄圀縺ｮ隕ｪ繝ｭ繝ｼ繝・・繧ｷ繝ｧ繝ｳ繧堤ｶｭ謖√＠縺ｦ縺・∪縺吶・
- CPU 1繝ｻCPU 2縺瑚ｦｪ縺ｮ螻縺ｯ閾ｪ蜍輔〒髢句ｧ九＠縺ｾ縺吶・
- CPU隕ｪ縺ｮ蛻晄遠迚悟燕縺ｫ騾壼ｸｸ繝・Δ繧定ｿｽ蜉縺励∪縺帙ｓ縲・
- 驟咲煙蠕後∬ｦｪ莉･螟悶・`lastDraw`縺ｯ`null`縺ｧ縺吶・
- `tests/cpu-dealer-start-round.test.js`縺ｯ荳ｭ螟ｮ繝ｩ繝ｳ繝翫・縺ｧ螳溯｡後＆繧後∪縺吶・

## 繧､繝ｳ繝昴・繝医→菫晏ｭ・

- 險ｭ螳壹う繝ｳ繝昴・繝医・讀懆ｨｼ蜑阪↓`RuleConfig.createRuleConfig`縺ｸ貂｡縺励∪縺帙ｓ縲・
- `startingPoints`縺ｯ蜈ｬ髢偽I鬆・岼縺ｧ縺ｯ縺ｪ縺・◆繧√∵ｭ｣縺励＞謨ｰ蛟､蠖｢蠑上〒繧ゅう繝ｳ繝昴・繝医→繧ｨ繧ｯ繧ｹ繝昴・繝医・蟇ｾ雎｡螟悶〒縺吶・
- 荳肴ｭ｣縺ｪ險ｭ螳壹う繝ｳ繝昴・繝医・迴ｾ蝨ｨ縺ｮ險ｭ螳壹ｒ螟画峩縺励∪縺帙ｓ縲・
- 迚瑚ｭ懊う繝ｳ繝昴・繝医・辟｡蛻ｶ髯舌ョ繝ｼ繧ｿ繧壇eep clone縺吶ｋ蜑阪↓荳企剞縺ｨ蝙九ｒ讀懆ｨｼ縺励∪縺吶・
- 荳肴ｭ｣迚瑚ｭ懊・菫晏ｭ倥＆繧後∪縺帙ｓ縲・
- malformed record繧但dvancedStats繝ｻReplayViewer繝ｻ邨ｱ險・I縺ｸ貂｡縺励※繧ゆｾ句､悶ｒ逋ｺ逕溘＆縺帙∪縺帙ｓ縲・
- localStorage縺ｸ縺ｮ螳御ｺ・煙隴應ｿ晏ｭ倥′螟ｱ謨励＠縺ｦ繧ょ酷謠冗判繧堤ｶ咏ｶ壹＠縺ｾ縺吶・

## 蜥御ｺ・→蠕礼せ

- CPU騾壼ｸｸ繝ｭ繝ｳ縺ｯ莠ｺ髢捺昏迚後→CPU謐ｨ迚後・蜿梧婿縺ｧ蜍穂ｽ懊＠縲∬・蟾ｱ繝ｭ繝ｳ縺ｨ繝輔Μ繝・Φ繝ｭ繝ｳ繧呈拠蜷ｦ縺励∪縺吶・
- CPU繝ｭ繝ｳ縺ｯCPU繝昴Φ蛟呵｣懊ｈ繧雁━蜈医＆繧後∪縺吶・
- CPU讒灘ｾ後・蠍ｺ荳顔煙縺ｧ繝・Δ蜥御ｺ・ｒ蛻､螳壹＠縲∝柱莠・ｾ後↓謇鍋煙縺励∪縺帙ｓ縲・
- 螟ｩ蜥後・蝨ｰ蜥後・蝗ｽ螢ｫ辟｡蜿後・蝗ｽ螢ｫ辟｡蜿悟香荳蛾擇蠕・■繝ｻ隍・粋蠖ｹ貅蛟咲紫繧貞屓蟶ｰ繝・せ繝医〒讀懆ｨｼ縺励∪縺励◆縲・
- 隕ｪ縺ｮ蜊倅ｸ蠖ｹ貅48,000轤ｹ縲∽ｸ牙榊ｽｹ貅144,000轤ｹ繧呈､懆ｨｼ縺励∪縺励◆縲・
- 蠖ｹ貅譎ゅ↓繝峨Λ繧貞刈邂励＠縺ｾ縺帙ｓ縲・

## 繝・せ繝・

荳ｭ螟ｮ繝ｩ繝ｳ繝翫・:

```text
node tests/run-all-tests.js
```

譁ｰ隕上・譖ｴ譁ｰ縺励◆蝗槫ｸｰ繝・せ繝・

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

## 霆ｽ驥上ヰ繧ｰ繝√ぉ繝・け

- root `index.html`縺ｨcanonical `index.html`縺ｮseed蜈･蜉帙↓`maxlength="128"`縺後≠繧九％縺ｨ繧痴moke test縺ｧ遒ｺ隱阪＠縺ｾ縺吶・
- `Sanma.SeedPolicy`繧痴moke縺ｨ險ｺ譁ｭ縺ｮ蠢・医Δ繧ｸ繝･繝ｼ繝ｫ縺ｸ霑ｽ蜉縺励∪縺励◆縲・
- root `index.html`繧辰hrome縺ｧ逶ｴ謗･繧ｪ繝輔Λ繧､繝ｳ襍ｷ蜍輔＠縲√・繝ｼ繧ｸ萓句､悶→螟夜Κ繝ｪ繧ｯ繧ｨ繧ｹ繝医′0莉ｶ縺ｧ縺ゅｋ縺薙→繧堤｢ｺ隱阪＠縺ｾ縺励◆縲・
- CDN縲；oogle Fonts縲～fetch()`縲∝､夜Κscript縲√ロ繝・ヨ繝ｯ繝ｼ繧ｯ繝輔か繝ｳ繝医ｒ霑ｽ蜉縺励※縺・∪縺帙ｓ縲・
- 莠ｺ髢捺遠迚後・譁ｰ螻繝ｻ繝・ヰ繝・げ逕ｻ髱｢繝ｻ129譁・ｭ耀eed諡貞凄繧偵ヶ繝ｩ繧ｦ繧ｶ縺ｧ遒ｺ隱阪＠縺ｾ縺励◆縲・
- 蜈ｨ荳ｭ螟ｮ繝・せ繝医→螟画峩JavaScript縺ｮ`node --check`縺梧・蜉溘＠縺ｾ縺励◆縲・

## 谿九ｋ遽・峇

- CPU繝昴Φ繝ｻ繝√・繝ｻ譏取ｧ薙・譛ｪ螳溯｣・〒縺吶・
- CPU謌ｦ逡･縺ｯ蜊倡ｴ斐〒縺吶・
- 謚ｼ縺怜ｼ輔″繝ｻ螳牙・迚悟愛譁ｭ繝ｻ謇鍋せ譛溷ｾ・､AI縺ｯ譛ｪ螳溯｣・〒縺吶・
- 繝繝悶Ο繝ｳ縺ｯ譛ｪ螳溯｣・〒縺吶・
- 繝弱・繝・Φ鄂ｰ隨ｦ繝ｻ蝗帶ｧ捺ｵ√ｌ繝ｻ蜊怜・繝ｻ隘ｿ蜈･縺ｯ譛ｪ螳溯｣・∪縺溘・譛ｪ螳梧・縺ｧ縺吶・
- ZIP workflow hardening pending縲・
