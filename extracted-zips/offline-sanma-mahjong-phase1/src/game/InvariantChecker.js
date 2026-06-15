(function attachInvariantChecker(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function checkState(state, ruleConfig) {
    const errors = [];
    const warnings = [];
    const players = state && Array.isArray(state.players) ? state.players : [];
    const round = state && state.round ? state.round : {};
    const matchState = state && (state.matchState || (state.matchManager && state.matchManager.state));

    if (!Number.isInteger(state && state.turnIndex) || !players[state.turnIndex]) {
      errors.push("現在の手番プレイヤーが存在しません");
    }
    if (!Number.isInteger(round.dealerIndex) || !players[round.dealerIndex]) {
      errors.push("親インデックスが不正です");
    }
    if (!Number.isFinite(round.honba) || round.honba < 0) errors.push("本場が不正です");
    if (!Number.isFinite(round.riichiSticks) || round.riichiSticks < 0) errors.push("供託が不正です");
    players.forEach((player, index) => {
      if (!Number.isFinite(player.points)) errors.push(`プレイヤー${index}の点数が数値ではありません`);
      const meldCount = Array.isArray(player.melds) ? player.melds.length : 0;
      const minHand = Math.max(0, 13 - meldCount * 3);
      const maxHand = minHand + 1;
      if (!Array.isArray(player.hand) || player.hand.length < minHand || player.hand.length > maxHand) {
        errors.push(`プレイヤー${index}の手牌枚数が不正です: ${player.hand ? player.hand.length : "なし"}`);
      }
    });
    if (matchState && !matchState.roundEnded) {
      if (Number.isInteger(matchState.dealerIndex) && matchState.dealerIndex !== round.dealerIndex) {
        errors.push("対局状態と局状態の親が一致しません");
      }
      if (Number.isFinite(matchState.honba) && Number(matchState.honba) !== Number(round.honba)) {
        errors.push("対局状態と局状態の本場が一致しません");
      }
    }
    if (state && state.phase === "human-call" && !state.callWindow) {
      errors.push("鳴き待ち状態ですが呼び出し窓がありません");
    }
    const human = players.find((player) => player && player.isHuman);
    if (state && state.phase === "human-discard" && human && state.turnIndex !== human.id) {
      errors.push("人間打牌状態ですが手番が人間ではありません");
    }
    if (state && state.phase === "human-call" && state.callWindow && state.callWindow.isOpen === false) {
      errors.push("人間呼び出し状態ですが呼び出し窓が閉じています");
    }
    if (state && state.phase === "win-ended" && state.callWindow) {
      errors.push("和了終了後に呼び出し窓が残っています");
    }
    if (state && state.callWindow) {
      if (!Array.isArray(state.callWindow.actions) || state.callWindow.actions.length === 0) {
        errors.push("呼び出し窓に操作候補がありません");
      }
      if (!Number.isInteger(state.callWindow.fromPlayerIndex)) {
        errors.push("呼び出し窓の打牌者が不明です");
      }
      warnings.push("呼び出し窓はスキップ操作またはRecoveryManagerで閉じられます");
    }
    const dealer = players[round.dealerIndex];
    if (state && dealer && !dealer.isHuman
      && state.initialDealerDiscardPending === false
      && state.lastDiscard
      && state.lastDiscard.playerIndex === dealer.id
      && !dealer.lastDraw
      && dealer.hand.length !== Math.max(0, 13 - (dealer.melds || []).length * 3)) {
      errors.push("CPU親の初回打牌後の手牌枚数が不正です");
    }
    if (state && state.lastDrawContext && state.lastDrawContext.isRinshan) {
      const rinshanPlayer = players[state.lastDrawContext.playerIndex];
      if (!rinshanPlayer || !rinshanPlayer.lastDraw
        || !rinshanPlayer.hand.some((tile) => tile.instanceId === rinshanPlayer.lastDraw.instanceId)) {
        errors.push("嶺上牌が手牌またはlastDrawに存在しません");
      }
    }

    const tileLedger = state && state.wall
      ? Sanma.TileLedger.inspect(state, ruleConfig || state.ruleConfig || {})
      : { ok: true, errors: [], warnings: ["牌山がないため牌台帳を省略しました"], counts: {} };
    errors.push(...tileLedger.errors);
    warnings.push(...tileLedger.warnings);
    const report = {
      ok: errors.length === 0,
      errors,
      warnings,
      tileLedger,
    };
    if (!report.ok && Sanma.DebugEventLog && state && state.debugEventLog) {
      Sanma.DebugEventLog.add(state.debugEventLog, "invariantFailure", { errors: errors.slice(0, 20) });
    }
    return report;
  }

  function assertState(state, ruleConfig, contextLabel) {
    const report = checkState(state, ruleConfig);
    if (!report.ok) {
      throw new Error(`${contextLabel || "状態検査"}: ${report.errors.join(" / ")}`);
    }
    return report;
  }

  Sanma.InvariantChecker = {
    checkState,
    assertState,
  };
})(window);
