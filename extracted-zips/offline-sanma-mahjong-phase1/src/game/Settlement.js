(function attachSettlement(global) {
  const Sanma = global.Sanma = global.Sanma || {};

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
    if (!players.every((player) => player && Number.isFinite(player.points))) {
      return { applied: false, changes: [], reason: "点棒を安全に更新できないプレイヤー状態です。" };
    }
    const before = players.map((player) => player.points);

    if (context.winType === "ron") {
      const loser = players[context.loserIndex];
      if (!loser) return { applied: false, changes: [], reason: "放銃者が見つかりません。" };
      if (!scoreResult.payments || !scoreResult.payments.ron
        || !Number.isFinite(scoreResult.payments.ron.amount)
        || !Number.isFinite(scoreResult.payments.ron.winnerGain)) {
        return { applied: false, changes: [], reason: "ロン支払い情報が不正です。" };
      }
      loser.points -= scoreResult.payments.ron.amount;
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
      changes: players.map((player, index) => ({
        playerIndex: index,
        playerName: player.name,
        before: before[index],
        after: player.points,
        delta: player.points - before[index],
      })),
      reason: `${winner.name}の${context.winType === "tsumo" ? "ツモ" : "ロン"}和了を反映しました。`,
    };
  }

  Sanma.Settlement = { applySettlement };
})(window);
