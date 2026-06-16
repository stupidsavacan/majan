> 警告: この文書は過去資料です。現在仕様の正本は root README.md と docs/INDEX.md を参照してください。

# Phase 9.2 Rules / Scoring / Log / Source Format Audit

## Summary

- Overall status: PASS
- Canonical app path: `extracted-zips/offline-sanma-mahjong-phase1/index.html`
- User entry point: root `index.html`
- Tests: canonical繝ｻroot繝ｻZIP縺ｮ蜈ｨ繝・せ繝医∝・髱樒函謌辱avaScript讒区枚讀懈渊縲〉oot繝ｻZIP繝悶Λ繧ｦ繧ｶ遒ｺ隱阪ｒ螳滓命
- Commit: `Phase 9.2 rules scoring and source format fixes`

## Baseline State

- git status before: clean (`main...origin/main`)
- recent commit context: `1d0e22d Phase 9.1 cleanup storage audit`
- Phase 9.1 report found: root縺ｨcanonical縺ｮ `PHASE9_1_CLEANUP_STORAGE_AUDIT.md`
- canonical source root: `extracted-zips/offline-sanma-mahjong-phase1/src`
- test runner: `extracted-zips/offline-sanma-mahjong-phase1/tests/run-all-tests.js`
- duplicated app copies: root entry point繝ｻroot tests繝ｻcanonical app繝ｻ驟榊ｸセIP縲Ｓoot entry point縺ｨroot tests縲〇IP繧ょ酔譛溷ｯｾ雎｡

## Implemented Fixes Matrix

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Riichi yaku | PASS | `YakuAnalysis.js`, `rules-scoring-regression.test.js` | 髢蜑阪°縺､遶狗峩譎ゅ↓1鬟懊らｫ狗峩縺ｮ縺ｿ縺ｧ繧よ怏蜉ｹ |
| Ippatsu | PASS | `Player.js`, `RiichiManager.js`, `GameEngine.js` | 螳｣險譎る幕蟋九∵悽莠ｺ縺ｮ謇鍋煙繝ｻ謌千ｫ九＠縺滄ｳｴ縺阪〒隗｣髯､ |
| winningTile context | PASS | `ActionResolver.js` | 繝ｭ繝ｳ縺ｯ謐ｨ縺ｦ迚後√ヤ繝｢縺ｯ `lastDraw` |
| waitType / practical pinfu | PASS | `ActionResolver.waitTypeForPattern` | 荳｡髱｢繝ｻ蠏悟ｼｵ繝ｻ霎ｺ蠑ｵ繝ｻ蜊倬ｨ弱・蜿檎｢ｰ繧剃ｿ晏ｮ育噪縺ｫ蛻､螳・|
| red dora | PASS | `DoraCalculator.js` | 襍､繝峨Λ縺ｪ縺苓ｨｭ螳壹ｒ蟆企㍾ |
| normal dora | PASS | `DoraCalculator.js` | 謨ｰ迚後・荳蛾ｺｻ關ｬ蟄舌・鬚ｨ迚後・荳牙・迚後・蠕ｪ迺ｰ蟇ｾ蠢・|
| kita dora | PASS | `DoraCalculator.js` | `northMode === "kita-dora"` 縺ｮ縺ｿ蜉邂・|
| high score mode dora multiplier | PASS | `DoraCalculator.js` | 襍､縺・ラ繝ｩ陦ｨ遉ｺ迚後・蟇ｾ雎｡迚後ｒ1譫・鬟懊→縺励※險育ｮ・|
| dora-only no-yaku block | PASS | `YakuAnalysis.js`, `ScoreCalculator.js` | 騾壼ｸｸ蠖ｹ縺後↑縺・ｴ蜷医・繝峨Λ繧帝←逕ｨ縺帙★蜥御ｺ・┌蜉ｹ |
| riichi discard lock | PASS | `GameEngine.js`, `renderTable.js` | 莠ｺ髢薙・CPU縺ｨ繧ゅヤ繝｢蛻・ｊ縺ｮ縺ｿ縲ら焚蟶ｸ譎ゅ・螳牙・邨ゆｺ・|
| basic furiten | PASS | `ActionResolver.ronAvailability` | 蜥御ｺ・煙縺ｨ蜷檎ｨｮ迚後′閾ｪ蛻・・豐ｳ縺ｫ縺ゅｌ縺ｰ繝ｭ繝ｳ荳榊庄 |
| record log capture direction | PASS / already fixed | `GameEngine.recordGameEvent`, `GameRecord.addEvent` | UI繝ｭ繧ｰ縺ｮ騾・・さ繝斐・縺ｯ縺ｪ縺上∵ｧ矩蛹悶う繝吶Φ繝医ｒ逶ｴ謗･譎らｳｻ蛻苓ｿｽ蜉 |
| JS source formatting | PASS | `source-format.test.js` | `src/game`, `src/storage`, `src/ui`, `tests` 繧堤屮譟ｻ |
| CSS source formatting | PASS | `source-format.test.js` | 髱樒函謌燭SS繧堤屮譟ｻ縺励∝悸邵ｮ迥ｶ諷九・3繝輔ぃ繧､繝ｫ繧呈紛蠖｢ |

## Tests Added or Updated

| Test file | Coverage | Notes |
|---|---|---|
| `tests/rules-scoring-regression.test.js` | 遶狗峩繝ｻ荳逋ｺ繝ｻ蠕・■蠖｢繝ｻ繝峨Λ繝ｻ遶狗峩蛻ｶ邏・・繝輔Μ繝・Φ繝ｻ迚瑚ｭ憺・ｺ・| Phase 9.2蟆ら畑蝗槫ｸｰ繧ｹ繧､繝ｼ繝・|
| `tests/yaku-analysis.test.js` | `DoraCalculator` 隱ｭ縺ｿ霎ｼ縺ｿ | 譌｢蟄伜ｽｹ蛻､螳壹ｒ邯ｭ謖・|
| `tests/score-calculator.test.js` | `DoraCalculator` 隱ｭ縺ｿ霎ｼ縺ｿ | 譌｢蟄倡せ謨ｰ險育ｮ励ｒ邯ｭ謖・|
| `tests/action-resolver.test.js` | `DoraCalculator` 隱ｭ縺ｿ霎ｼ縺ｿ | 譌｢蟄俶桃菴懷愛螳壹ｒ邯ｭ謖・|
| `tests/smoke.test.js` | Phase 9.2繝ｻ繝｢繧ｸ繝･繝ｼ繝ｫ繝ｻscript鬆・| `DoraCalculator` 繧貞ｿ・亥喧 |
| `tests/source-format.test.js` | JS縺ｨCSS縺ｮ謨ｴ蠖｢逶｣譟ｻ | `yuji-mai-embedded.css` 縺ｮ縺ｿ譏守､ｺ髯､螟・|
| `tests/storage-records.test.js` | 繧､繝吶Φ繝域凾邉ｻ蛻励・驥崎､・・荳企剞 | 譌｢蟄伜屓蟶ｰ縺悟ｼ輔″邯壹″騾夐℃ |

## Source Format Audit

- JS paths checked: `src/game/**/*.js`, `src/storage/**/*.js`, `src/ui/**/*.js`, `tests/**/*.js`
- CSS paths checked: `src/styles/**/*.css`
- Exceptions: `src/styles/yuji-mai-embedded.css`・・ase64蝓九ａ霎ｼ縺ｿ繝輔か繝ｳ繝育函謌千黄・・- Reformatted files: `src/styles/main.css`, `src/styles/phase4.css`, `src/styles/phase8.css`
- Visual policy: 蛟､繝ｻ繧ｻ繝ｬ繧ｯ繧ｿ繝ｻ迚後ョ繧ｶ繧､繝ｳ縺ｯ螟画峩縺帙★縲∵隼陦後→繧､繝ｳ繝・Φ繝医・縺ｿ謨ｴ蠖｢

## Record Log Audit

`GameEngine.addLog()` 縺ｯUI逕ｨ繝ｭ繧ｰ繧・`unshift()` 縺励∪縺吶′縲∫煙隴懊・UI繝ｭ繧ｰ驟榊・繧定ｪｭ縺ｿ蜿悶▲縺ｦ縺・∪縺帙ｓ縲ょ推繧ｲ繝ｼ繝謫堺ｽ懊′ `GameEngine.recordGameEvent()` 縺九ｉ `GameRecord.addEvent()` 繧堤峩謗･蜻ｼ縺ｳ縲√う繝吶Φ繝医ｒ譛ｫ蟆ｾ縺ｸ譎らｳｻ蛻苓ｿｽ蜉縺励※縺・∪縺吶る｣邯壹う繝吶Φ繝医・鬆・ｺ上・荳諢上↑index繝ｻ300莉ｶ荳企剞縺ｯ蝗槫ｸｰ繝・せ繝医〒遒ｺ隱阪＠縺ｾ縺励◆縲・
## 霆ｽ驥上ヰ繧ｰ繝√ぉ繝・け

- root `index.html` 縺ｨcanonical `index.html` 縺・`DoraCalculator.js` 繧・`YakuAnalysis.js` 繧医ｊ蜈医↓隱ｭ縺ｿ霎ｼ繧縺薙→繧堤｢ｺ隱・- 蠢・・`Sanma.*` 繝｢繧ｸ繝･繝ｼ繝ｫ縺ｨscript鬆・ｒsmoke test縺ｧ遒ｺ隱・- root `index.html` 縺ｮ逶ｴ謗･ `file://` 襍ｷ蜍墓婿驥昴ｒ邯ｭ謖・- CDN縲；oogle Fonts縲～fetch()`縲∝､夜Κscript縲∝､夜Κ繝輔か繝ｳ繝郁ｦ∵ｱゅｒ霑ｽ蜉縺励※縺・↑縺・- 莠ｺ髢捺遠迚後∵眠縺励＞螻縲√ョ繝舌ャ繧ｰ繝代ロ繝ｫ縲∫煙隴懊・險ｭ螳啅I縺ｮ繝悶Λ繧ｦ繧ｶ謫堺ｽ懊ｒ遒ｺ隱・- 遶狗峩蠕後↓逶ｴ謗･蛹玲栢縺阪・繧ｫ繝ｳ遒ｺ隱阪∈蛻ｰ驕斐＠縺ｪ縺・ｈ縺・anager蛛ｴ縺ｫ繧る亟蠕｡繧定ｿｽ蜉

## Deferred Items

- full match flow
- East/South round progression
- dealer continuation and full honba progression
- full furiten, missed-ron furiten, same-turn furiten
- kan execution, rinshan, kan dora, kan ura, chankan
- ura dora
- CPU ron and CPU calls
- full replay viewer

## Test Results

```text
canonical: node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

root: node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

ZIP螻暮幕蠕・ node tests/run-all-tests.js
Source formatting checks passed for 37 JavaScript and 4 CSS files.
All Phase 9.2 tests passed.

root/canonical/ZIP syntax:
JavaScript syntax checks passed.

root繝ｻZIP繝悶Λ繧ｦ繧ｶ逶｣譟ｻ:
modulesDefined=true, clickDiscardWorked=true, touchDiscardWorked=true,
debugSectionsPresent=true, settingsRoundTrip=true, recordsPanelWorked=true,
externalRequests=[], consoleErrors=[], pageErrors=[]
```

## Acceptance Decision

PASS: Phase 9.2 complete enough to proceed toward Phase 10.
