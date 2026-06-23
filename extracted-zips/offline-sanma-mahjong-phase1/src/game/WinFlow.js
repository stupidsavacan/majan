(function attachWinFlow(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const Player = Sanma.Player;
  const Wall = Sanma.Wall;
  const RuleConfig = Sanma.RuleConfig;
  const TileUtil = Sanma.TileUtil;
  const HandAnalysis = Sanma.HandAnalysis;
  const YakuAnalysis = Sanma.YakuAnalysis;
  const ScoreCalculator = Sanma.ScoreCalculator;
  const Settlement = Sanma.Settlement;
  const ActionResolver = Sanma.ActionResolver;
  const CallWindow = Sanma.CallWindow;
  const RiichiManager = Sanma.RiichiManager;
  const KanManager = Sanma.KanManager;
  const KitaManager = Sanma.KitaManager;
  const FuritenManager = Sanma.FuritenManager;
  const RiichiRules = Sanma.RiichiRules;
  const KanRules = Sanma.KanRules;
  const CpuStrategy = Sanma.CpuStrategy;
  const AssistManager = Sanma.AssistManager;
  const GameRecord = Sanma.GameRecord;
  const MatchManager = Sanma.MatchManager;
  const DebugEventLog = Sanma.DebugEventLog;
  const GameStateMachine = Sanma.GameStateMachine;
  const InvariantChecker = Sanma.InvariantChecker;

  function isDoubleRonEnabled(ruleConfig) {
    return Boolean(ruleConfig && ruleConfig.doubleRonPolicy && ruleConfig.doubleRonPolicy.allowed === true);
  }

  function orderedRonCandidates(candidates) {
    return (candidates || []).slice().sort((left, right) => left.priorityOffset - right.priorityOffset);
  }

  function ronLimitLabel(scoreResult) {
    return scoreResult.limitName || `${scoreResult.han}飜${scoreResult.fu}符`;
  }

  function moveAcceptedKakanChankanTile(engine) {
    const attempt = engine && engine.pendingKanAttempt;
    if (!attempt || attempt.kanType !== "kakan" || !attempt.requested) return null;
    const player = engine.players && engine.players[attempt.playerIndex];
    if (!player || !Array.isArray(player.hand) || !Array.isArray(player.discards)) return null;
    const consumeIds = Array.isArray(attempt.requested.consumeInstanceIds)
      ? attempt.requested.consumeInstanceIds
      : [];
    const moved = [];
    consumeIds.forEach((instanceId) => {
      const index = player.hand.findIndex((tile) => tile && tile.instanceId === instanceId);
      if (index < 0) return;
      const tile = player.hand.splice(index, 1)[0];
      if (player.lastDraw && player.lastDraw.instanceId === tile.instanceId) player.lastDraw = null;
      if (!player.discards.some((discard) => discard && discard.instanceId === tile.instanceId)) {
        player.discards.push(tile);
      }
      moved.push(tile);
    });
    return moved.length ? moved : null;
  }

  function getRonWinningTile(engine) {
    if (engine && engine.lastDiscard && engine.lastDiscard.tile) return engine.lastDiscard.tile;
    const attempt = engine && engine.pendingKanAttempt;
    if (!attempt) return null;
    return attempt.declaredTile || (attempt.requested && attempt.requested.tile) || null;
  }

  function snapshotRevealedHand(engine, playerIndex, winningTile) {
    const player = engine && engine.players && engine.players[playerIndex];
    if (!player || typeof engine.tileSnapshot !== "function") return null;
    return {
      playerIndex,
      playerName: player.name,
      concealedTiles: (player.hand || []).map((tile) => engine.tileSnapshot(tile)).filter(Boolean),
      winningTile: winningTile ? engine.tileSnapshot(winningTile) : null,
      melds: (player.melds || []).map((meld) => ({
        type: meld.type,
        kanType: meld.kanType || null,
        open: meld.open !== false,
        fromPlayerIndex: meld.fromPlayerIndex,
        tiles: (meld.tiles || []).map((tile) => engine.tileSnapshot(tile)).filter(Boolean),
      })),
      kitaTiles: (player.kitaTiles || []).map((tile) => engine.tileSnapshot(tile)).filter(Boolean),
    };
  }

  Sanma.WinFlow = {
        tryCpuTsumo(player) {
          const analysis = ActionResolver.analyzeWin(this, player.id, "tsumo", null, null);
          if (!analysis.scoreResult.isValidWin) return false;
          const settlement = Settlement.applySettlement({
            players: this.players,
            scoreResult: analysis.scoreResult,
            context: analysis.context,
          });
          if (!settlement.applied) return false;

          this.phase = "win-ended";
          this.callWindow = null;
          this.winResult = {
            winnerIndex: player.id,
            winnerName: player.name,
            winType: "tsumo",
            yaku: analysis.yakuResult,
            score: analysis.scoreResult,
            settlement,
            context: analysis.context,
          };
          this.addCpuActionLog(player, "ツモ", "有効な和了形と役を検出したためツモ和了しました。");
          this.addLog(`${player.name} がツモ和了しました。`);
          this.recordGameEvent("win", {
            playerIndex: player.id,
            playerName: player.name,
            winType: "tsumo",
            context: analysis.context,
          });
          this.recordGameEvent("score_settlement", { changes: settlement.changes });
          this.finishGameRecord(this.winResult);
          this.emitChange();
          return true;
        },

        collectRonCandidatesAfterDiscard(discarderIndex) {
          if (!this.lastDiscard || this.lastDiscard.playerIndex !== discarderIndex) return null;
          const candidates = [];
          for (let offset = 1; offset < this.players.length; offset += 1) {
            const playerIndex = (discarderIndex + offset) % this.players.length;
            const player = this.players[playerIndex];
            if (!player || playerIndex === discarderIndex) continue;
            const furiten = FuritenManager.checkRonEligibility({
              state: this,
              playerIndex,
              winningTile: this.lastDiscard.tile,
              sourcePlayerIndex: discarderIndex,
              ruleConfig: this.ruleConfig,
            });
            if (!furiten.canRon) continue;
            const analysis = ActionResolver.analyzeWin(
              this,
              playerIndex,
              "ron",
              this.lastDiscard.tile,
              discarderIndex
            );
            if (analysis.scoreResult.isValidWin) candidates.push({ playerIndex, analysis, priorityOffset: offset });
          }
          return orderedRonCandidates(candidates);
        },

        selectHeadBumpCandidates(candidates) {
          const ordered = orderedRonCandidates(candidates);
          const primary = ordered[0] || null;
          const fallbackCpu = primary && this.players[primary.playerIndex].isHuman
            ? ordered.slice(1).find((candidate) => !this.players[candidate.playerIndex].isHuman) || null
            : null;
          return { primary, fallbackCpu };
        },

        findCpuRonAfterDiscard(discarderIndex) {
          const priority = this.selectHeadBumpCandidates(this.collectRonCandidatesAfterDiscard(discarderIndex) || []);
          return priority.primary && !this.players[priority.primary.playerIndex].isHuman
            ? priority.primary
            : null;
        },

        tryCpuRonAfterDiscard(discarderIndex) {
          const candidates = this.collectRonCandidatesAfterDiscard(discarderIndex) || [];
          if (isDoubleRonEnabled(this.ruleConfig)) {
            const cpuOnly = orderedRonCandidates(candidates).filter((candidate) => !this.players[candidate.playerIndex].isHuman);
            if (cpuOnly.length > 1) return Sanma.WinFlow.resolveMultiRonWin.call(this, cpuOnly, { isCpuRon: true });
          }
          const reaction = this.findCpuRonAfterDiscard(discarderIndex);
          if (!reaction) return false;
          this.addCpuActionLog(this.players[reaction.playerIndex], "ロン", "他家の打牌に対する和了を選択しました。");
          return this.resolveRonWin(reaction.playerIndex, reaction.analysis, { isCpuRon: true });
        },

        resolveRonCandidatesAfterDiscard(discarderIndex) {
          const candidates = orderedRonCandidates(this.collectRonCandidatesAfterDiscard(discarderIndex) || []);
          const priority = this.selectHeadBumpCandidates(candidates);
          const primary = priority.primary;
          if (!primary) return false;

          if (isDoubleRonEnabled(this.ruleConfig)) {
            const humanCandidate = candidates.find((candidate) => this.players[candidate.playerIndex].isHuman) || null;
            if (humanCandidate) {
              const windowState = CallWindow.create(this, this.humanPlayer.id);
              if (!windowState) return false;
              windowState.actions = windowState.actions.filter((action) => action.id === "ron");
              if (windowState.actions.length === 0) {
                windowState.actions = [{
                  id: "ron",
                  label: "ロン",
                  enabled: true,
                  reason: "この捨て牌でロンできます。",
                  analysis: humanCandidate.analysis,
                }];
              } else {
                windowState.actions = windowState.actions.map((action) => Object.assign({}, action, {
                  analysis: humanCandidate.analysis,
                }));
              }
              windowState.ronCandidates = candidates;
              windowState.pendingCpuRonCandidate = candidates.find((candidate) => !this.players[candidate.playerIndex].isHuman) || null;
              windowState.kind = "discard-ron";
              this.markOpeningInterrupted("ロン選択窓");
              this.callWindow = windowState;
              this.phase = "human-call";
              this.addLog(`${this.players[discarderIndex].name}の捨て牌にロンできます。`);
              this.emitChange();
              return true;
            }
            if (candidates.length > 1) {
              candidates.forEach((candidate) => {
                this.addCpuActionLog(this.players[candidate.playerIndex], "ロン", "ダブロン許可ルールで和了を選択しました。");
              });
              return Sanma.WinFlow.resolveMultiRonWin.call(this, candidates, { isCpuRon: true });
            }
          }

          if (this.players[primary.playerIndex].isHuman) {
            const windowState = CallWindow.create(this, this.humanPlayer.id);
            if (!windowState) return false;
            windowState.actions = windowState.actions.filter((action) => action.id === "ron");
            if (windowState.actions.length === 0) {
              windowState.actions = [{
                id: "ron",
                label: "ロン",
                enabled: true,
                reason: "この捨て牌でロンできます。",
                analysis: primary.analysis,
              }];
            }
            if (priority.fallbackCpu) windowState.pendingCpuRonCandidate = priority.fallbackCpu;
            windowState.kind = "discard-ron";
            this.markOpeningInterrupted("ロン選択窓");
            this.callWindow = windowState;
            this.phase = "human-call";
            this.addLog(`${this.players[discarderIndex].name}の捨て牌にロンできます。`);
            this.emitChange();
            return true;
          }
          this.addCpuActionLog(this.players[primary.playerIndex], "ロン", "頭ハネ順で最優先の和了を選択しました。");
          return this.resolveRonWin(primary.playerIndex, primary.analysis, { isCpuRon: true });
        },

        drawForHumanManually() {
          if (this.phase !== "human-draw") return;
          const drawn = this.wall.draw();
          if (!drawn) {
            this.endRoundForInvalidDraw("あなたのツモ牌を取得できませんでした。");
            return;
          }
          this.humanPlayer.receiveTile(drawn);
          this.lastDiscard = null;
          this.lastDrawContext = this.createNormalDrawContext(this.humanPlayer);
          this.recordGameEvent("draw", this.playerTileEvent(this.humanPlayer, drawn));
          this.recordAssist(AssistManager.evaluateDraw({
            state: this,
            ruleConfig: this.ruleConfig,
            player: this.humanPlayer,
            random: this.assistRandom,
          }));
          this.phase = "human-discard";
          this.addLog(`あなたのツモ: ${TileUtil.getTileAriaLabel(drawn)}。`);
          this.emitChange();
        },

        claimHumanTsumo() {
          const validation = this.validateAction("ツモ和了", ["waitingForDiscard"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
            this.addLog("現在はツモ和了できません。");
            this.emitChange();
            return false;
          }
          const analysis = this.analyzeHumanWin("tsumo");
          if (!analysis.score.isValidWin) {
            this.addLog(analysis.score.reason);
            this.emitChange();
            return false;
          }

          const settlement = Settlement.applySettlement({
            players: this.players,
            scoreResult: analysis.score,
            context: analysis.context,
          });
          if (!settlement.applied) {
            this.addLog(settlement.reason);
            this.emitChange();
            return false;
          }
          this.phase = "win-ended";
          this.winResult = {
            winnerIndex: this.humanPlayer.id,
            winnerName: this.humanPlayer.name,
            winType: "tsumo",
            yaku: analysis.yaku,
            score: analysis.score,
            settlement,
            context: analysis.context,
          };
          this.addLog(`あなたがツモ和了しました。${analysis.score.limitName || `${analysis.score.han}飜${analysis.score.fu}符`} / ${analysis.score.payments.tsumo.total.toLocaleString()}点。`);
          this.recordGameEvent("win", {
            playerIndex: this.humanPlayer.id,
            playerName: this.humanPlayer.name,
            winType: "tsumo",
            context: analysis.context,
          });
          this.recordGameEvent("score_settlement", { changes: settlement.changes });
          this.finishGameRecord(this.winResult);
          this.emitChange();
          return true;
        },

        claimHumanRon() {
          const validation = this.validateAction("ロン", ["waitingForCall"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-call" || !this.callWindow) {
            this.addLog("現在はロンできません。");
            this.emitChange();
            return false;
          }
          const action = this.callWindow.actions.find((candidate) => candidate.id === "ron");
          if (!action || !action.analysis || !action.analysis.scoreResult.isValidWin) {
            this.addLog("この捨て牌ではロンできません。");
            this.emitChange();
            return false;
          }
          const analysis = action.analysis;
          const metadata = this.callWindow.kind === "chankan"
            ? {
              isChankan: true,
              kanType: this.callWindow.kanType,
              isAnkanKokushiException: Boolean(this.callWindow.isAnkanKokushiException),
            }
            : {};
          const ronCandidates = Array.isArray(this.callWindow.ronCandidates)
            ? orderedRonCandidates(this.callWindow.ronCandidates)
            : [];
          if (!metadata.isChankan && isDoubleRonEnabled(this.ruleConfig) && ronCandidates.length > 1) {
            return Sanma.WinFlow.resolveMultiRonWin.call(this, ronCandidates, metadata);
          }
          return this.resolveRonWin(this.humanPlayer.id, analysis, metadata);
        },

        resolveRonWin(winnerIndex, analysis, metadata) {
          const winner = this.players[winnerIndex];
          if (!winner || !analysis || !analysis.scoreResult || !analysis.scoreResult.isValidWin) {
            this.addLog("ロン和了情報が不正です。");
            this.emitChange();
            return false;
          }
          const settlement = Settlement.applySettlement({
            players: this.players,
            scoreResult: analysis.scoreResult,
            context: analysis.context,
          });
          if (!settlement.applied) {
            this.addLog(settlement.reason);
            this.emitChange();
            return false;
          }
          const details = metadata || {};
          const ronTile = getRonWinningTile(this);
          if (details.isChankan) moveAcceptedKakanChankanTile(this);
          this.phase = "win-ended";
          this.callWindow = null;
          this.pendingKanAttempt = null;
          this.winResult = {
            winnerIndex,
            winnerName: winner.name,
            winType: "ron",
            yaku: analysis.yakuResult,
            score: analysis.scoreResult,
            settlement,
            context: analysis.context,
            revealedHand: snapshotRevealedHand(this, winnerIndex, ronTile),
          };
          this.addLog(`${winner.name}がロン和了しました。${ronLimitLabel(analysis.scoreResult)} / ${analysis.scoreResult.payments.ron.amount.toLocaleString()}点。`);
          if (details.isChankan) {
            this.recordGameEvent("chankan", {
              playerIndex: winnerIndex,
              playerName: winner.name,
              fromPlayerIndex: analysis.context.loserIndex,
              kanType: details.kanType,
              isAnkanKokushiException: details.isAnkanKokushiException,
              decision: "accept",
            });
          }
          this.recordGameEvent("win", {
            playerIndex: winnerIndex,
            playerName: winner.name,
            winType: "ron",
            isChankan: Boolean(details.isChankan),
            kanType: details.kanType || null,
            isAnkanKokushiException: Boolean(details.isAnkanKokushiException),
          });
          this.recordGameEvent("score_settlement", { changes: settlement.changes });
          this.finishGameRecord(this.winResult);
          this.pendingWinContext = null;
          this.emitChange();
          return true;
        },

        resolveMultiRonWin(candidates, metadata) {
          const ordered = orderedRonCandidates(candidates).filter((candidate) => (
            candidate
            && this.players[candidate.playerIndex]
            && candidate.analysis
            && candidate.analysis.scoreResult
            && candidate.analysis.scoreResult.isValidWin
          ));
          if (ordered.length === 0) {
            this.addLog("ロン和了情報が不正です。");
            this.emitChange();
            return false;
          }
          if (ordered.length === 1) {
            return this.resolveRonWin(ordered[0].playerIndex, ordered[0].analysis, metadata || {});
          }
          const settlement = Settlement.applyMultiRonSettlement({
            players: this.players,
            entries: ordered.map((candidate) => ({
              playerIndex: candidate.playerIndex,
              scoreResult: candidate.analysis.scoreResult,
              context: candidate.analysis.context,
            })),
          });
          if (!settlement.applied) {
            this.addLog(settlement.reason);
            this.emitChange();
            return false;
          }

          const details = metadata || {};
          const ronTile = getRonWinningTile(this);
          const winners = ordered.map((candidate, index) => {
            const player = this.players[candidate.playerIndex];
            return {
              winnerIndex: candidate.playerIndex,
              winnerName: player.name,
              winType: "ron",
              yaku: candidate.analysis.yakuResult,
              score: candidate.analysis.scoreResult,
              context: candidate.analysis.context,
              priorityOffset: candidate.priorityOffset,
              order: index,
              revealedHand: snapshotRevealedHand(this, candidate.playerIndex, ronTile),
            };
          });
          const winnerIndexes = winners.map((winner) => winner.winnerIndex);
          this.phase = "win-ended";
          this.callWindow = null;
          this.pendingKanAttempt = null;
          this.winResult = {
            type: "double_ron",
            winnerIndex: winners[0].winnerIndex,
            winnerIndexes,
            winnerName: winners.map((winner) => winner.winnerName).join("・"),
            winType: "ron",
            yaku: winners[0].yaku,
            score: winners[0].score,
            settlement,
            context: winners[0].context,
            winners,
            isMultiRon: true,
            reason: `ダブロン: ${winners.map((winner) => winner.winnerName).join("、")}`,
          };

          this.addLog(`ダブロン: ${winners.map((winner) => winner.winnerName).join("、")}がロン和了しました。`);
          winners.forEach((winner) => {
            this.addLog(`${winner.winnerName}がロン和了しました。${ronLimitLabel(winner.score)} / ${winner.score.payments.ron.amount.toLocaleString()}点。`);
            this.recordGameEvent("win", {
              playerIndex: winner.winnerIndex,
              playerName: winner.winnerName,
              winType: "ron",
              multiRon: true,
              multiRonOrder: winner.order,
              winnerIndexes,
              isChankan: Boolean(details.isChankan),
              kanType: details.kanType || null,
              isAnkanKokushiException: Boolean(details.isAnkanKokushiException),
            });
          });
          this.recordGameEvent("score_settlement", {
            changes: settlement.changes,
            multiRon: true,
            winners: settlement.winners || winners.map((winner) => ({
              playerIndex: winner.winnerIndex,
              playerName: winner.winnerName,
            })),
          });
          this.finishGameRecord(this.winResult);
          this.pendingWinContext = null;
          this.emitChange();
          return true;
        },

        analyzeHumanWin(winType) {
          const analysis = ActionResolver.analyzeWin(
            this,
            this.humanPlayer.id,
            winType,
            winType === "ron" && this.lastDiscard ? this.lastDiscard.tile : null,
            winType === "ron" && this.lastDiscard ? this.lastDiscard.playerIndex : null
          );
          return {
            agari: analysis.agariResult,
            yaku: analysis.yakuResult,
            score: analysis.scoreResult,
            context: analysis.context,
          };
        }
  };
})(window);
