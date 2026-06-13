(function attachRuleConfig(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  /**
   * RuleConfig is intentionally centralized so later phases can add scoring,
   * calls, furiten, assist, and replay behavior without scattering rule checks.
   */
  const defaultRuleConfig = Object.freeze({
    playerCount: 3,
    gameLength: "hanchan",
    initialPoints: 35000,

    northMode: "kita-dora",
    allowChi: true,
    tsumoLoss: false,

    kuitan: true,
    atozuke: true,

    redDoraMode: "standard",
    highScoreMode: false,
    uraDora: true,
    kanDora: true,
    kanUraDora: true,
    kitaDora: true,

    doubleYakuman: true,
    countedYakuman: true,
    countedDoubleYakuman: false,
    localYaku: false,

    dramaticLuckAssist: true,
    dramaticOpeningHandRate: 0.08,
    dramaticDrawAssist: true,
    dramaticDrawAssistRate: 0.06,
    cpuDramaticDrawAssistRate: 0.025,
    maxAssistDrawsPerRoundForHuman: 2,
    maxAssistDrawsPerRoundForCpu: 1,
    assistAfterTenpaiMultiplier: 0.35,
    assistAfterRiichiMultiplier: 0.15,
    assistYakumanTenpaiMultiplier: 0.05,
  });

  const normalSettings = [
    {
      key: "gameLength",
      label: "対局形式",
      type: "select",
      options: [
        { value: "hanchan", label: "半荘" },
        { value: "tonpuu", label: "東風" },
      ],
    },
    {
      key: "northMode",
      label: "北の扱い",
      type: "select",
      options: [
        { value: "kita-dora", label: "北抜きあり" },
        { value: "normal-tile", label: "北を通常牌にする" },
        { value: "disabled", label: "北なし" },
      ],
    },
    { key: "allowChi", label: "チーあり", type: "checkbox" },
    { key: "tsumoLoss", label: "ツモ損あり", type: "checkbox" },
    { key: "highScoreMode", label: "高打点モード", type: "checkbox", help: "五筒・五索を全赤化。赤ドラ表示牌から決まるドラ価値は2倍。" },
    { key: "uraDora", label: "裏ドラ", type: "checkbox" },
    { key: "kanDora", label: "槓ドラ", type: "checkbox" },
    { key: "kanUraDora", label: "槓裏ドラ", type: "checkbox" },
    {
      key: "redDoraMode",
      label: "赤ドラ",
      type: "select",
      options: [
        { value: "standard", label: "あり" },
        { value: "none", label: "なし" },
        { value: "custom", label: "カスタム扱い" },
      ],
    },
    { key: "kuitan", label: "喰いタン", type: "checkbox" },
    { key: "atozuke", label: "後付け", type: "checkbox" },
  ];

  function createRuleConfig(overrides) {
    const merged = Object.assign({}, defaultRuleConfig, overrides || {});
    merged.playerCount = 3;
    merged.localYaku = false;
    merged.countedDoubleYakuman = false;
    if (merged.highScoreMode) {
      merged.redDoraMode = "custom";
    }
    return merged;
  }

  function describeRuleConfig(config) {
    const northLabel = {
      "kita-dora": "北抜き",
      "normal-tile": "北通常牌",
      disabled: "北なし",
    }[config.northMode];

    return [
      config.gameLength === "hanchan" ? "半荘" : "東風",
      northLabel,
      config.allowChi ? "チーあり" : "チーなし",
      config.tsumoLoss ? "ツモ損あり" : "ツモ損なし",
      config.highScoreMode ? "高打点ON" : "高打点OFF",
    ].join(" / ");
  }

  Sanma.RuleConfig = {
    defaultRuleConfig,
    normalSettings,
    createRuleConfig,
    describeRuleConfig,
  };
})(window);
