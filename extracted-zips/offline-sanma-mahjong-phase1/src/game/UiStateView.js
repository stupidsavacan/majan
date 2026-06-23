(function attachUiStateView(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function snapshot(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function renderableLabel(tile, safe) {
    if (safe && safe.label !== undefined) return safe.label;
    if (tile.label !== undefined) return tile.label;
    if (Sanma.TileUtil && typeof Sanma.TileUtil.getTileShortLabel === "function") {
      return Sanma.TileUtil.getTileShortLabel(tile);
    }
    return tile.baseId || "";
  }

  function tileSnapshot(engine, tile) {
    if (!tile) return null;
    const safe = typeof engine.tileSnapshot === "function" ? engine.tileSnapshot(tile) : snapshot(tile);
    return Object.assign({}, safe || {}, {
      instanceId: tile.instanceId,
      baseId: tile.baseId,
      suit: tile.suit,
      rank: tile.rank,
      label: renderableLabel(tile, safe),
      isRed: Boolean(tile.isRed),
    });
  }

  function tileSnapshots(engine, tiles) {
    return (Array.isArray(tiles) ? tiles : []).filter(Boolean).map((tile) => tileSnapshot(engine, tile));
  }

  function meldSnapshot(engine, meld) {
    if (!meld) return null;
    return {
      type: meld.type,
      kanType: meld.kanType,
      open: meld.open !== false,
      fromPlayerIndex: meld.fromPlayerIndex,
      calledTile: tileSnapshot(engine, meld.calledTile || meld.claimedTile || null),
      tiles: tileSnapshots(engine, meld.tiles),
    };
  }

  function playerSnapshot(engine, player) {
    const handCount = Array.isArray(player && player.hand) ? player.hand.length : 0;
    const isHuman = Boolean(player && player.isHuman);
    return {
      id: player.id,
      name: player.name,
      isHuman,
      seatWind: player.seatWind,
      points: player.points,
      hand: tileSnapshots(engine, player.hand),
      handCount,
      discards: tileSnapshots(engine, player.discards),
      melds: (Array.isArray(player.melds) ? player.melds : []).map((meld) => meldSnapshot(engine, meld)).filter(Boolean),
      kitaTiles: tileSnapshots(engine, player.kitaTiles),
      lastDraw: isHuman ? tileSnapshot(engine, player.lastDraw) : null,
      hasRiichi: Boolean(player.hasRiichi),
      riichi: isHuman ? snapshot(player.riichi || null) : player.hasRiichi ? { declared: true } : null,
      ippatsuActive: Boolean(player.ippatsuActive),
    };
  }

  function pendingCpuCallSummary(engine, candidate) {
    if (!candidate) return null;
    const player = engine.players && engine.players[candidate.playerIndex];
    const option = candidate.option || {};
    return {
      playerIndex: candidate.playerIndex,
      playerName: candidate.playerName || (player && player.name) || null,
      actionId: candidate.actionId,
      option: { type: option.type || candidate.actionId },
      priority: candidate.priority,
      turnDistance: candidate.turnDistance,
    };
  }

  function callWindowSnapshot(engine, callWindow) {
    if (!callWindow) return null;
    const safe = snapshot(callWindow);
    safe.pendingCpuCallCandidate = pendingCpuCallSummary(engine, callWindow.pendingCpuCallCandidate);
    safe.pendingCpuRonCandidate = callWindow.pendingCpuRonCandidate
      ? pendingCpuCallSummary(engine, Object.assign({ actionId: "ron" }, callWindow.pendingCpuRonCandidate))
      : null;
    delete safe.ronCandidates;
    (safe.actions || []).forEach((action) => {
      const targetIndex = Number.isInteger(action && action.playerIndex)
        ? action.playerIndex
        : Number.isInteger(callWindow.playerIndex) ? callWindow.playerIndex : 0;
      const targetPlayer = engine.players && engine.players[targetIndex];
      if (action && action.analysis && (!targetPlayer || !targetPlayer.isHuman)) delete action.analysis;
    });
    return safe;
  }

  function kanAttemptSummary(engine, attempt) {
    if (!attempt) return null;
    return {
      prepared: Boolean(attempt.prepared),
      playerIndex: attempt.playerIndex,
      playerName: engine.players && engine.players[attempt.playerIndex] ? engine.players[attempt.playerIndex].name : null,
      kanType: attempt.kanType,
      declaredTile: tileSnapshot(engine, attempt.declaredTile),
    };
  }

  function gameRecordSummary(record) {
    if (!record) return null;
    const rounds = Array.isArray(record.rounds) ? record.rounds : [];
    return {
      id: record.id,
      createdAt: record.createdAt,
      completedAt: record.completedAt || null,
      seed: record.seed,
      schemaVersion: record.schemaVersion,
      roundsCount: rounds.length,
      eventCount: rounds.reduce((sum, round) => sum + (Array.isArray(round.events) ? round.events.length : 0), 0),
      finalPoints: Array.isArray(record.finalPoints) ? record.finalPoints.slice() : [],
    };
  }

  function invariantSummary(report) {
    if (!report) return null;
    return {
      ok: Boolean(report.ok),
      errors: Array.isArray(report.errors) ? report.errors.slice() : [],
      warnings: Array.isArray(report.warnings) ? report.warnings.slice() : [],
    };
  }

  function tileLedgerSummary(report) {
    const ledger = report && report.tileLedger;
    if (!ledger) return null;
    return {
      ok: Boolean(ledger.ok),
      errorCount: Array.isArray(ledger.errors) ? ledger.errors.length : 0,
      warningCount: Array.isArray(ledger.warnings) ? ledger.warnings.length : 0,
    };
  }

  function assistEventSummary(event) {
    if (!event) return null;
    return {
      type: event.type,
      phase: event.phase,
      playerIndex: event.playerIndex,
      enabled: event.enabled,
      applied: event.applied,
      reason: event.reason,
      beforeShanten: event.beforeShanten,
      afterShanten: event.afterShanten,
      integrityValid: event.integrityValid,
    };
  }

  function cpuCandidateSummary(candidate, index) {
    if (!candidate) return null;
    return {
      index,
      score: candidate.score,
      baseScore: candidate.baseScore,
      shanten: candidate.shanten,
      tenpai: candidate.tenpai,
      visibleCount: candidate.visibleCount,
      remainingVisibleEstimate: candidate.remainingVisibleEstimate,
      danger: candidate.danger,
      dangerReasons: candidate.dangerReasons,
      pushFoldMode: candidate.pushFoldMode,
      handValue: candidate.handValue,
      liveShapeValue: candidate.liveShapeValue,
      safetyReason: candidate.safetyReason,
      reasons: candidate.reasons,
    };
  }

  function cpuThinkingEntrySummary(entry) {
    if (!entry) return null;
    const safe = snapshot(entry);
    delete safe.hand;
    delete safe.selectedTileInstanceId;
    delete safe.tileInstanceId;
    if (Array.isArray(safe.candidates)) {
      safe.candidates = safe.candidates.map(cpuCandidateSummary).filter(Boolean);
    }
    if (safe.assist) safe.assist = assistEventSummary(safe.assist);
    return safe;
  }

  Sanma.UiStateView = {
    playerSnapshot,
    callWindowSnapshot,
    kanAttemptSummary,
    gameRecordSummary,
    invariantSummary,
    tileLedgerSummary,
    assistEventSummary,
    cpuThinkingEntrySummary,
  };
})(window);
