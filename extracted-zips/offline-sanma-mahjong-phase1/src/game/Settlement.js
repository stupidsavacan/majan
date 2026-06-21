(function attachSettlement(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function changesFromBefore(players, before) {
    return players.map((player, index) => ({
      playerIndex: index,
      playerName: player.name,
      before: before[index],
      after: player.points,
      delta: player.points - before[index],
    }));
  }

  function validatePlayers(players) {
    return Array.isArray(players) && players.every((player) => player && Number.isFinite(player.points));
  }

  function validateRonEntry(players, entry) {
    const item = entry || {};
    const scoreResult = item.scoreResult || {};
    const context = item.context || {};
    if (!scoreResult.isValidWin) {
      return { ok: false, reason: scoreResult.reason || "有効な和了ではありません。" };
    }
    if (context.winType !== "ron") return { ok: false, reason: "ロン以外は複数和了精算できません。" };
    const winner = players[context.winnerIndex];
    if (!winner) return { ok: false, reason: "和了者が見つかりません。" };
    const loser = players[context.loserIndex];
    if (!loser) return { ok: false, reason: "放銃者が見つかりません。" };
    if (!scoreResult.payments || !scoreResult.payments.ron
      || !Number.isFinite(scoreResult.payments.ron.amount)
      || !Number.isFinite(scoreResult.payments.ron.winnerGain)) {
      return { ok: false, reason: "ロン支払い情報が不正です。" };
    }
    return { ok: true, winner, loser, scoreResult, context };
  }

  function applySettlement(input) {
    const options = input || {};
    const players = options.players || [];
    const scoreResult = options.scoreResult || {};
    const context = options.context || {};
    if (!scoreResult.isValidWin) {
      return { applied: false, changes: [], reason: scoreResult.reason || "有効な和了ではありません。" };
    }

    const winner = players[context.winnerIndex];
    if (!winner) return { applied: false, changes: [], reason: "和了者が見つかりません。" };
    if (!validatePlayers(players)) {
      return { applied: false, changes: [], reason: "点棒を安全に更新できないプレイヤー状態です。" };
    }
    const before = players.map((player) => player.points);

    if (context.winType === "ron") {
      const validation = validateRonEntry(players, { scoreResult, context });
      if (!validation.ok) return { applied: false, changes: [], reason: validation.reason };
      validation.loser.points -= scoreResult.payments.ron.amount;
      winner.points += scoreResult.payments.ron.winnerGain;
    } else if (context.winType === "tsumo") {
      const tsumo = scoreResult.payments && scoreResult.payments.tsumo;
      const payers = tsumo && Array.isArray(tsumo.payers) ? tsumo.payers : [];
      const validPayers = payers.length > 0 && payers.every((payer) => (
        players[payer.playerIndex]
        && payer.playerIndex !== context.winnerIndex
        && Number.isFinite(payer.amount)
      ));
      if (!validPayers || !Number.isFinite(tsumo.winnerGain)) {
        return { applied: false, changes: [], reason: "ツモ支払い情報が不正です。" };
      }
      payers.forEach((payer) => {
        players[payer.playerIndex].points -= payer.amount;
      });
      winner.points += tsumo.winnerGain;
    } else {
      return { applied: false, changes: [], reason: "debug計算は点棒へ反映しません。" };
    }

    return {
      applied: true,
      changes: changesFromBefore(players, before),
      reason: `${winner.name}の${context.winType === "tsumo" ? "ツモ" : "ロン"}和了を反映しました。`,
    };
  }

  function applyMultiRonSettlement(input) {
    const options = input || {};
    const players = options.players || [];
    const entries = Array.isArray(options.entries) ? options.entries : [];
    if (!validatePlayers(players)) {
      return { applied: false, changes: [], reason: "点棒を安全に更新できないプレイヤー状態です。" };
    }
    if (entries.length === 0) return { applied: false, changes: [], reason: "ロン和了者がありません。" };
    if (entries.length > Math.max(1, players.length - 1)) {
      return { applied: false, changes: [], reason: "三麻で処理できるロン和了者数を超えています。" };
    }

    const validations = entries.map((entry) => validateRonEntry(players, entry));
    const failed = validations.find((result) => !result.ok);
    if (failed) return { applied: false, changes: [], reason: failed.reason };
    const loserIndexes = new Set(validations.map((result) => result.context.loserIndex));
    if (loserIndexes.size !== 1) {
      return { applied: false, changes: [], reason: "ダブロンは同一放銃者へのロンだけ処理できます。" };
    }
    const winnerIndexes = validations.map((result) => result.context.winnerIndex);
    if (new Set(winnerIndexes).size !== winnerIndexes.length) {
      return { applied: false, changes: [], reason: "同じ和了者を複数回精算できません。" };
    }

    const before = players.map((player) => player.points);
    const winners = [];
    validations.forEach((result, index) => {
      const ron = result.scoreResult.payments.ron;
      const riichiStickGain = index === 0 ? Number(ron.riichiSticks) || 0 : 0;
      result.loser.points -= ron.amount;
      result.winner.points += ron.amount + riichiStickGain;
      winners.push({
        playerIndex: result.context.winnerIndex,
        playerName: result.winner.name,
        loserIndex: result.context.loserIndex,
        payment: ron.amount,
        riichiStickGain,
        gain: ron.amount + riichiStickGain,
      });
    });

    return {
      applied: true,
      changes: changesFromBefore(players, before),
      winners,
      isMultiRon: winners.length > 1,
      reason: winners.length > 1
        ? `ダブロン精算を反映しました。供託は${winners[0].playerName}へ渡しました。`
        : `${winners[0].playerName}のロン和了を反映しました。`,
    };
  }

  function normalizePlayerIndexes(indexes, playerCount) {
    const seen = Object.create(null);
    return (Array.isArray(indexes) ? indexes : [])
      .filter((index) => Number.isInteger(index) && index >= 0 && index < playerCount)
      .filter((index) => {
        if (seen[index]) return false;
        seen[index] = true;
        return true;
      })
      .sort((left, right) => left - right);
  }

  function buildNoMovement(players, before, tenpaiPlayers, notenPlayers, reason) {
    return {
      applied: true,
      type: "exhaustive_draw",
      mode: "noten-bappu-3000",
      tenpaiPlayers: tenpaiPlayers.slice(),
      notenPlayers: notenPlayers.slice(),
      totalPoints: 0,
      changes: players.map((player, index) => ({
        playerIndex: index,
        playerName: player.name,
        before: before[index],
        after: before[index],
        delta: 0,
      })),
      reason,
    };
  }

  function calculateExhaustiveDrawSettlement(input) {
    const options = input || {};
    const players = Array.isArray(options.players) ? options.players : [];
    if (players.length === 0) return { applied: false, changes: [], reason: "流局精算対象のプレイヤーがありません。" };
    if (!validatePlayers(players)) {
      return { applied: false, changes: [], reason: "点棒を安全に更新できないプレイヤー状態です。" };
    }
    const ruleConfig = options.ruleConfig || {};
    const settlementRule = ruleConfig.exhaustiveDrawSettlement || {};
    if (settlementRule.enabled === false) {
      const beforeDisabled = players.map((player) => player.points);
      return buildNoMovement(players, beforeDisabled, [], [], "流局精算なしルールです。");
    }

    const playerCount = players.length;
    const tenpaiPlayers = normalizePlayerIndexes(options.tenpaiPlayers, playerCount);
    const notenPlayers = players
      .map((player, index) => index)
      .filter((index) => !tenpaiPlayers.includes(index));
    const before = players.map((player) => player.points);
    const totalPoints = Number.isFinite(settlementRule.totalPoints)
      ? settlementRule.totalPoints
      : 3000;

    if (tenpaiPlayers.length === 0) {
      return buildNoMovement(players, before, tenpaiPlayers, notenPlayers, "全員ノーテンのため流局精算の点棒移動はありません。");
    }
    if (tenpaiPlayers.length === playerCount) {
      return buildNoMovement(players, before, tenpaiPlayers, notenPlayers, "全員テンパイのため流局精算の点棒移動はありません。");
    }

    const deltas = players.map(() => 0);
    const tenpaiGain = totalPoints / tenpaiPlayers.length;
    const notenPayment = totalPoints / notenPlayers.length;
    tenpaiPlayers.forEach((playerIndex) => {
      deltas[playerIndex] += tenpaiGain;
    });
    notenPlayers.forEach((playerIndex) => {
      deltas[playerIndex] -= notenPayment;
    });

    return {
      applied: true,
      type: "exhaustive_draw",
      mode: settlementRule.mode || "noten-bappu-3000",
      tenpaiPlayers,
      notenPlayers,
      totalPoints,
      tenpaiGain,
      notenPayment,
      deltas,
      changes: players.map((player, index) => ({
        playerIndex: index,
        playerName: player.name,
        before: before[index],
        after: before[index] + deltas[index],
        delta: deltas[index],
      })),
      reason: `流局精算: テンパイ${tenpaiPlayers.length}人、ノーテン${notenPlayers.length}人。`,
    };
  }

  function applyExhaustiveDrawSettlement(input) {
    const options = input || {};
    const players = Array.isArray(options.players) ? options.players : [];
    const settlement = calculateExhaustiveDrawSettlement(options);
    if (!settlement.applied) return settlement;
    (settlement.changes || []).forEach((change) => {
      if (players[change.playerIndex]) players[change.playerIndex].points = change.after;
    });
    return settlement;
  }

  Sanma.Settlement = {
    applySettlement,
    applyMultiRonSettlement,
    calculateExhaustiveDrawSettlement,
    applyExhaustiveDrawSettlement,
  };
})(window);
