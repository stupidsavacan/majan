(function attachScoreCalculator(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const winds = { east: 1, south: 2, west: 3, north: 4 };

  function roundUp100(value) {
    return Math.ceil(value / 100) * 100;
  }

  function firstTileType(group) {
    return group && Array.isArray(group.tileTypes) ? group.tileTypes[0] || "" : "";
  }

  function parseTileType(tileType) {
    let match = /^z([1-7])$/.exec(tileType || "");
    if (match) return { suit: "z", rank: Number(match[1]) };
    match = /^([1-9])([mps])$/.exec(tileType || "");
    return match ? { suit: match[2], rank: Number(match[1]) } : null;
  }

  function isTerminalOrHonor(tileType) {
    const parsed = parseTileType(tileType);
    return Boolean(parsed && (parsed.suit === "z" || parsed.rank === 1 || parsed.rank === 9));
  }

  function findActualMeld(context, tileType) {
    return (context.melds || []).find((meld) => {
      const tiles = Array.isArray(meld.tiles) ? meld.tiles : [];
      return tiles.length > 0 && tiles.every((tile) => tile && tile.baseId === tileType);
    }) || null;
  }

  function classifyTriplet(group, context) {
    const tileType = firstTileType(group);
    const actualMeld = group && group.sourceMeld ? group.sourceMeld : findActualMeld(context, tileType);
    const completedByRon = !actualMeld
      && context.winType === "ron"
      && context.waitType === "shanpon"
      && context.winningTile
      && context.winningTile.baseId === tileType;
    return {
      isOpen: actualMeld ? actualMeld.open !== false : completedByRon,
      isKan: Boolean(actualMeld
        && (actualMeld.type === "kan" || (actualMeld.tiles || []).length >= 4)),
      isTerminalOrHonor: isTerminalOrHonor(tileType),
    };
  }

  function calculateFu(agariResult, yakuResult, context) {
    const pattern = agariResult.bestPattern;
    const details = [];
    if (pattern.type === "kokushi" || yakuResult.isYakuman) {
      return { fu: null, details: ["役満のため符計算を省略します。"] };
    }
    if (pattern.type === "chiitoitsu") {
      return { fu: 25, details: ["七対子は25符固定です。"] };
    }

    let fu = 20;
    details.push("副底 20符");
    const pinfu = yakuResult.yaku.some((item) => item.id === "pinfu");

    if (context.winType === "ron" && context.isMenzen) {
      fu += 10;
      details.push("門前ロン 10符");
    }
    if (context.winType === "tsumo" && !pinfu) {
      fu += 2;
      details.push("ツモ 2符");
    }

    const pair = parseTileType(firstTileType(pattern.pair));
    if (pair && pair.suit === "z") {
      if (pair.rank >= 5) {
        fu += 2;
        details.push("三元牌の雀頭 2符");
      }
      if (pair.rank === winds[context.seatWind]) {
        fu += 2;
        details.push("自風牌の雀頭 2符");
      }
      if (pair.rank === winds[context.roundWind]) {
        fu += 2;
        details.push("場風牌の雀頭 2符");
      }
    }

    if (["kanchan", "penchan", "tanki"].includes(context.waitType)) {
      fu += 2;
      details.push("待ち形 2符");
    }

    (pattern.melds || []).filter((group) => group.kind === "triplet").forEach((group) => {
      const classification = classifyTriplet(group, context);
      let value = classification.isTerminalOrHonor ? 8 : 4;
      if (classification.isOpen) value /= 2;
      if (classification.isKan) value *= 4;
      fu += value;
      const tileLabel = classification.isTerminalOrHonor ? "么九牌" : "中張牌";
      const groupLabel = classification.isKan
        ? (classification.isOpen ? "明槓" : "暗槓")
        : (classification.isOpen ? "明刻" : "暗刻");
      details.push(`${tileLabel}の${groupLabel} ${value}符`);
    });

    if (pinfu && context.winType === "tsumo") {
      return { fu: 20, details: ["平和ツモは20符です。"] };
    }
    if (fu === 20 && context.winType === "ron") {
      return { fu: 30, details: details.concat("ロン和了の最低符として30符") };
    }

    const roundedFu = Math.ceil(fu / 10) * 10;
    if (roundedFu !== fu) details.push(`${fu}符を${roundedFu}符へ切り上げ`);
    return { fu: roundedFu, details };
  }

  function calculateLimit(han, fu, yakuResult, ruleConfig) {
    const yakumanEntries = Array.isArray(yakuResult.yakuman) ? yakuResult.yakuman : [];
    const yakumanCount = yakuResult.isYakuman
      ? Math.max(1, yakumanEntries.reduce((sum, item) => sum + Math.max(1, Number(item && item.yakuman) || 1), 0))
      : 0;
    if (yakumanCount) {
      return {
        limitName: "役満",
        basePoints: 8000 * yakumanCount,
        isYakuman: true,
        yakumanCount,
      };
    }
    if (han >= 13 && ruleConfig.countedYakuman !== false) {
      return { limitName: "数え役満", basePoints: 8000, isYakuman: true, yakumanCount: 1 };
    }
    if (han >= 11) {
      return { limitName: "三倍満", basePoints: 6000, isYakuman: false, yakumanCount: 0 };
    }
    if (han >= 8) {
      return { limitName: "倍満", basePoints: 4000, isYakuman: false, yakumanCount: 0 };
    }
    if (han >= 6) {
      return { limitName: "跳満", basePoints: 3000, isYakuman: false, yakumanCount: 0 };
    }
    if (han >= 5 || (han === 4 && fu >= 40) || (han === 3 && fu >= 70)) {
      return { limitName: "満貫", basePoints: 2000, isYakuman: false, yakumanCount: 0 };
    }
    return {
      limitName: null,
      basePoints: fu * (2 ** (han + 2)),
      isYakuman: false,
      yakumanCount: 0,
    };
  }

  function calculatePayments(basePoints, context, ruleConfig) {
    const isDealer = context.winnerIndex === context.dealerIndex;
    const honba = Number(context.honba) || 0;
    const riichiSticks = Number(context.riichiSticks) || 0;
    const configuredHonba = ruleConfig && ruleConfig.honbaPoints ? ruleConfig.honbaPoints : {};
    const ronPerHonba = validHonbaPoint(configuredHonba.ron, 300);
    const tsumoTotalPerHonba = validHonbaPoint(configuredHonba.tsumoTotal, 300);
    const ronHonba = honba * ronPerHonba;
    const ronAmount = roundUp100(basePoints * (isDealer ? 6 : 4)) + ronHonba;
    const ron = {
      amount: ronAmount,
      loserIndex: context.loserIndex,
      winnerGain: ronAmount + riichiSticks * 1000,
      honba: ronHonba,
      riichiSticks: riichiSticks * 1000,
    };

    const payerIndexes = [0, 1, 2].filter((playerIndex) => playerIndex !== context.winnerIndex);
    const honbaBonuses = distributeHonbaTotal(honba * tsumoTotalPerHonba, payerIndexes.length);
    const payers = payerIndexes.map((playerIndex, payerOffset) => {
      const payerIsDealer = playerIndex === context.dealerIndex;
      let multiplier;
      if (isDealer) multiplier = ruleConfig.tsumoLoss ? 2 : 3;
      else if (payerIsDealer) multiplier = 2;
      else multiplier = ruleConfig.tsumoLoss ? 1 : 2;
      const honbaBonus = honbaBonuses[payerOffset] || 0;
      return {
        playerIndex,
        role: payerIsDealer ? "dealer" : "non-dealer",
        amount: roundUp100(basePoints * multiplier) + honbaBonus,
        honba: honbaBonus,
      };
    });
    const total = payers.reduce((sum, payer) => sum + payer.amount, 0);
    return {
      ron,
      tsumo: {
        payers,
        total,
        winnerGain: total + riichiSticks * 1000,
        honbaTotal: honba * tsumoTotalPerHonba,
        honbaPerPayer: honbaBonuses.length ? Math.min(...honbaBonuses) : 0,
        riichiSticks: riichiSticks * 1000,
        policy: ruleConfig.tsumoLoss ? "ツモ損あり" : "ツモ損なし",
      },
    };
  }

  function validHonbaPoint(value, fallback) {
    return Number.isFinite(value) && value >= 0 && Number.isInteger(value) && value % 100 === 0
      ? value
      : fallback;
  }

  function distributeHonbaTotal(total, payerCount) {
    if (!payerCount) return [];
    const units = Math.floor(total / 100);
    const baseUnits = Math.floor(units / payerCount);
    const remainder = units % payerCount;
    return Array.from(
      { length: payerCount },
      (_, index) => (baseUnits + (index < remainder ? 1 : 0)) * 100
    );
  }

  function invalidResult(reason) {
    return {
      isValidWin: false,
      han: 0,
      fu: null,
      isYakuman: false,
      yakumanCount: 0,
      limitName: null,
      basePoints: 0,
      payments: null,
      reason,
      details: [],
    };
  }

  function calculateScore(input) {
    const options = input || {};
    const ruleConfig = options.ruleConfig || {};
    const agariResult = options.agariResult || {};
    const yakuResult = options.yakuResult || {};
    const context = Object.assign({
      winType: "debug",
      winnerIndex: 0,
      loserIndex: 1,
      dealerIndex: 0,
      honba: 0,
      riichiSticks: 0,
      seatWind: "east",
      roundWind: "east",
      isMenzen: true,
      melds: [],
    }, options.context || {});

    if (!agariResult.isAgari) return invalidResult("和了形ではありません。");
    if (!yakuResult.hasYaku) return invalidResult("和了形ですが役がありません。");

    const han = Number(yakuResult.totalHan) || 0;
    const fuResult = calculateFu(agariResult, yakuResult, context);
    const limit = calculateLimit(han, fuResult.fu, yakuResult, ruleConfig);
    const payments = calculatePayments(limit.basePoints, context, ruleConfig);
    const summary = limit.limitName || `${han}飜${fuResult.fu}符`;
    return {
      isValidWin: true,
      han,
      fu: fuResult.fu,
      isYakuman: limit.isYakuman,
      yakumanCount: limit.yakumanCount,
      limitName: limit.limitName,
      basePoints: limit.basePoints,
      payments,
      reason: `${summary}として点数計算できます。`,
      details: fuResult.details,
      context,
    };
  }

  Sanma.ScoreCalculator = {
    calculateScore,
    roundUp100,
  };
})(window);
