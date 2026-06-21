(function attachRuleConfig(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  /**
   * RuleConfig is intentionally centralized so later phases can add scoring,
   * calls, furiten, assist, and replay behavior without scattering rule checks.
   */
  const defaultRuleConfig = Object.freeze({
    playerCount: 3,
    gameLength: "hanchan",
    matchLength: "hanchan",
    initialPoints: 35000,
    startingPoints: 35000,
    returnPoints: 40000,
    allowTobi: true,
    allowSouthRound: true,
    honbaPoints: Object.freeze({ ron: 300, tsumoTotal: 300 }),
    riichiStickValue: 1000,
    renchanPolicy: Object.freeze({
      dealerWin: true,
      dealerTenpaiDraw: true,
      dealerNotenDraw: false,
    }),
    doubleRonPolicy: Object.freeze({
      allowed: false,
      honbaIncrement: 1,
      riichiStickPolicy: "head-bump-first",
    }),
    exhaustiveDrawSettlement: Object.freeze({
      enabled: true,
      mode: "noten-bappu-3000",
      totalPoints: 3000,
    }),
    yakuRules: Object.freeze({
      ryuuiisouRequiresHatsu: false,
      renhou: "disabled",
      nagashiMangan: "deferred",
    }),

    northMode: "kita-dora",
    allowChi: false,
    tsumoLoss: false,

    kuitan: true,
    atozuke: true,

    redDoraMode: "standard",
    highScoreMode: false,
    uraDora: true,
    kanDora: true,
    kanUraDora: true,
    kitaDora: true,
    advancedRules: Object.freeze({
      furiten: Object.freeze({
        genbutsu: true,
        sameTurn: true,
        riichiMissedWin: true,
        tsumoAllowedWhileFuriten: true,
      }),
      riichi: Object.freeze({
        requiresMenzen: true,
        minPoints: 1000,
        forbidIfNoDrawLeft: true,
        ippatsu: true,
        uraDora: true,
      }),
      kan: Object.freeze({
        rinshan: true,
        chankan: true,
        kanDora: true,
        kanUra: true,
        allowAnkanAfterRiichiOnlyIfWaitUnchanged: true,
      }),
      endTurnYaku: Object.freeze({
        haitei: true,
        houtei: true,
        rinshanKaihou: true,
        chankan: true,
      }),
      sanma: Object.freeze({
        kita: true,
        kitaDrawReplacement: true,
        kitaAsDora: true,
        ronOnKitaPolicy: "disallow",
      }),
    }),

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
      key: "matchLength",
      label: "対局形式",
      type: "select",
      options: [
        { value: "single", label: "一局戦" },
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
    { key: "allowChi", label: "チーあり", type: "checkbox", help: "標準三麻寄りの初期値はチーなし。必要な場合だけONにできます。" },
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

  const publicSettingsSchema = Object.freeze({
    matchLength: Object.freeze({ type: "enum", values: Object.freeze(["single", "tonpuu", "hanchan"]) }),
    northMode: Object.freeze({ type: "enum", values: Object.freeze(["kita-dora", "normal-tile", "disabled"]) }),
    allowChi: Object.freeze({ type: "boolean" }),
    tsumoLoss: Object.freeze({ type: "boolean" }),
    highScoreMode: Object.freeze({ type: "boolean" }),
    uraDora: Object.freeze({ type: "boolean" }),
    kanDora: Object.freeze({ type: "boolean" }),
    kanUraDora: Object.freeze({ type: "boolean" }),
    redDoraMode: Object.freeze({ type: "enum", values: Object.freeze(["standard", "none", "custom"]) }),
    kuitan: Object.freeze({ type: "boolean" }),
    atozuke: Object.freeze({ type: "boolean" }),
  });

  function publicSettings(settings) {
    const source = settings || {};
    return Object.keys(publicSettingsSchema).reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
      return result;
    }, {});
  }

  function validatePublicSettings(settings) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return { ok: false, settings: null, reason: "設定JSONはオブジェクトで指定してください。" };
    }
    const keys = Object.keys(settings);
    if (keys.length === 0) return { ok: false, settings: null, reason: "公開設定項目がありません。" };
    const unknown = keys.find((key) => !Object.prototype.hasOwnProperty.call(publicSettingsSchema, key));
    if (unknown) return { ok: false, settings: null, reason: `インポートできない設定項目です: ${unknown}` };
    for (const key of keys) {
      const value = settings[key];
      const rule = publicSettingsSchema[key];
      if (rule.type === "boolean" && typeof value !== "boolean") {
        return { ok: false, settings: null, reason: `${key} は真偽値で指定してください。` };
      }
      if (rule.type === "enum" && !rule.values.includes(value)) {
        return { ok: false, settings: null, reason: `${key} の値が不正です。` };
      }
    }
    return { ok: true, settings: publicSettings(settings), reason: "" };
  }

  function createRuleConfig(overrides) {
    const input = overrides || {};
    const merged = Object.assign({}, defaultRuleConfig, input);
    const requestedLength = input.matchLength || input.gameLength || defaultRuleConfig.matchLength;
    merged.matchLength = ["single", "tonpuu", "hanchan"].includes(requestedLength)
      ? requestedLength
      : defaultRuleConfig.matchLength;
    merged.gameLength = merged.matchLength;
    const requestedPoints = Number.isFinite(input.startingPoints)
      ? input.startingPoints
      : Number.isFinite(input.initialPoints)
        ? input.initialPoints
        : defaultRuleConfig.startingPoints;
    merged.startingPoints = requestedPoints;
    merged.initialPoints = requestedPoints;
    const requestedHonbaPoints = input.honbaPoints && typeof input.honbaPoints === "object"
      ? input.honbaPoints
      : {};
    merged.honbaPoints = {
      ron: normalizeHonbaPoint(requestedHonbaPoints.ron, defaultRuleConfig.honbaPoints.ron),
      tsumoTotal: normalizeHonbaPoint(
        requestedHonbaPoints.tsumoTotal,
        defaultRuleConfig.honbaPoints.tsumoTotal
      ),
    };
    merged.renchanPolicy = Object.assign({}, defaultRuleConfig.renchanPolicy, input.renchanPolicy || {});
    const requestedDoubleRonPolicy = input.doubleRonPolicy && typeof input.doubleRonPolicy === "object"
      ? input.doubleRonPolicy
      : {};
    merged.doubleRonPolicy = {
      allowed: requestedDoubleRonPolicy.allowed === true,
      honbaIncrement: normalizeDoubleRonHonbaIncrement(
        requestedDoubleRonPolicy.honbaIncrement,
        defaultRuleConfig.doubleRonPolicy.honbaIncrement
      ),
      riichiStickPolicy: requestedDoubleRonPolicy.riichiStickPolicy === "head-bump-first"
        ? "head-bump-first"
        : defaultRuleConfig.doubleRonPolicy.riichiStickPolicy,
    };
    const drawSettlementInput = input.exhaustiveDrawSettlement && typeof input.exhaustiveDrawSettlement === "object"
      ? input.exhaustiveDrawSettlement
      : {};
    merged.exhaustiveDrawSettlement = Object.assign(
      {},
      defaultRuleConfig.exhaustiveDrawSettlement,
      drawSettlementInput
    );
    merged.exhaustiveDrawSettlement.enabled = merged.exhaustiveDrawSettlement.enabled !== false;
    merged.exhaustiveDrawSettlement.mode = merged.exhaustiveDrawSettlement.mode === "noten-bappu-3000"
      ? merged.exhaustiveDrawSettlement.mode
      : defaultRuleConfig.exhaustiveDrawSettlement.mode;
    merged.exhaustiveDrawSettlement.totalPoints = normalizeHonbaPoint(
      merged.exhaustiveDrawSettlement.totalPoints,
      defaultRuleConfig.exhaustiveDrawSettlement.totalPoints
    );
    merged.yakuRules = Object.assign({}, defaultRuleConfig.yakuRules, input.yakuRules || {});
    merged.yakuRules.ryuuiisouRequiresHatsu = merged.yakuRules.ryuuiisouRequiresHatsu === true;
    if (!["disabled", "yakuman", "mangan"].includes(merged.yakuRules.renhou)) {
      merged.yakuRules.renhou = defaultRuleConfig.yakuRules.renhou;
    }
    if (!["disabled", "deferred"].includes(merged.yakuRules.nagashiMangan)) {
      merged.yakuRules.nagashiMangan = defaultRuleConfig.yakuRules.nagashiMangan;
    }
    const advancedInput = input.advancedRules || {};
    merged.advancedRules = {};
    Object.keys(defaultRuleConfig.advancedRules).forEach((key) => {
      merged.advancedRules[key] = Object.assign(
        {},
        defaultRuleConfig.advancedRules[key],
        advancedInput[key] || {}
      );
    });
    if (!advancedInput.riichi || advancedInput.riichi.uraDora === undefined) {
      merged.advancedRules.riichi.uraDora = merged.uraDora !== false;
    }
    if (!advancedInput.kan || advancedInput.kan.kanDora === undefined) {
      merged.advancedRules.kan.kanDora = merged.kanDora !== false;
    }
    if (!advancedInput.kan || advancedInput.kan.kanUra === undefined) {
      merged.advancedRules.kan.kanUra = merged.kanUraDora !== false;
    }
    if (!advancedInput.sanma || advancedInput.sanma.kitaAsDora === undefined) {
      merged.advancedRules.sanma.kitaAsDora = merged.kitaDora !== false;
    }
    merged.playerCount = 3;
    merged.localYaku = false;
    merged.countedDoubleYakuman = false;
    if (merged.highScoreMode) {
      merged.redDoraMode = "custom";
    }
    return merged;
  }

  function normalizeHonbaPoint(value, fallback) {
    return Number.isFinite(value) && value >= 0 && Number.isInteger(value) && value % 100 === 0
      ? value
      : fallback;
  }

  function normalizeDoubleRonHonbaIncrement(value, fallback) {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= 2
      ? value
      : fallback;
  }

  function describeRuleConfig(config) {
    const northLabel = {
      "kita-dora": "北抜き",
      "normal-tile": "北通常牌",
      disabled: "北なし",
    }[config.northMode];

    return [
      config.matchLength === "single" ? "一局戦" : config.matchLength === "hanchan" ? "半荘" : "東風",
      northLabel,
      config.allowChi ? "チーあり" : "チーなし",
      config.doubleRonPolicy && config.doubleRonPolicy.allowed ? "ダブロンあり" : "ダブロンなし",
      config.tsumoLoss ? "ツモ損あり" : "ツモ損なし",
      config.highScoreMode ? "高打点ON" : "高打点OFF",
    ].join(" / ");
  }

  Sanma.RuleConfig = {
    defaultRuleConfig,
    normalSettings,
    publicSettingsSchema,
    publicSettings,
    validatePublicSettings,
    createRuleConfig,
    describeRuleConfig,
  };
})(window);
