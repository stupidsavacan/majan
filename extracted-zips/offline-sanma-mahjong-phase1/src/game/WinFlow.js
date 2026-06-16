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
          };
          this.addCpuActionLog(player, "ツモ", "有効な和了形と役を検出したためツモ和了しました。");
          this.addLog(`${player.name} がツモ和了しました。`);
          this.recordGameEvent("win", { playerIndex: player.id, playerName: player.name, winType: "tsumo" });
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
          return candidates.sort((left, right) => left.priorityOffset - right.priorityOffset);
        },

        selectHeadBumpCandidates(candidates) {
          const ordered = (candidates || [])
            .slice()
            .sort((left, right) => left.priorityOffset - right.priorityOffset);
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
          const reaction = this.findCpuRonAfterDiscard(discarderIndex);
          if (!reaction) return false;
          this.addCpuActionLog(this.players[reaction.playerIndex], "ロン", "他家の打牌に対する和了を選択しました。");
          return this.resolveRonWin(reaction.playerIndex, reaction.analysis, { isCpuRon: true });
        },

        resolveRonCandidatesAfterDiscard(discarderIndex) {
          const candidates = this.collectRonCandidatesAfterDiscard(discarderIndex) || [];
          const priority = this.selectHeadBumpCandidates(candidates);
          const primary = priority.primary;
          if (!primary) return false;
          if (this.players[primary.playerIndex].isHuman) {
            const windowState = CallWindow.create(this, this.humanPlayer.id);
            if (!windowState) return false;
            if (priority.fallbackCpu) {
              windowState.actions = windowState.actions.filter((action) => action.id === "ron");
              windowState.pendingCpuRonCandidate = priority.fallbackCpu;
            }
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
            return;
          }
          const analysis = this.analyzeHumanWin("tsumo");
          if (!analysis.score.isValidWin) {
            this.addLog(analysis.score.reason);
            this.emitChange();
            return;
          }

          const settlement = Settlement.applySettlement({
            players: this.players,
            scoreResult: analysis.score,
            context: analysis.context,
          });
          if (!settlement.applied) {
            this.addLog(settlement.reason);
            this.emitChange();
            return;
          }
          this.phase = "win-ended";
          this.winResult = {
            winnerIndex: this.humanPlayer.id,
            winnerName: this.humanPlayer.name,
            winType: "tsumo",
            yaku: analysis.yaku,
            score: analysis.score,
            settlement,
          };
          this.addLog(`あなたがツモ和了しました。${analysis.score.limitName || `${analysis.score.han}飜${analysis.score.fu}符`} / ${analysis.score.payments.tsumo.total.toLocaleString()}点。`);
          this.recordGameEvent("win", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, winType: "tsumo" });
          this.recordGameEvent("score_settlement", { changes: settlement.changes });
          this.finishGameRecord(this.winResult);
          this.emitChange();
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
            return;
          }
          const action = this.callWindow.actions.find((candidate) => candidate.id === "ron");
          if (!action || !action.analysis || !action.analysis.scoreResult.isValidWin) {
            this.addLog("この捨て牌ではロンできません。");
            this.emitChange();
            return;
          }
          const analysis = action.analysis;
          const metadata = this.callWindow.kind === "chankan"
            ? {
              isChankan: true,
              kanType: this.callWindow.kanType,
              isAnkanKokushiException: Boolean(this.callWindow.isAnkanKokushiException),
            }
            : {};
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
            return;
          }
          const details = metadata || {};
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
          };
          this.addLog(`${winner.name}がロン和了しました。${analysis.scoreResult.limitName || `${analysis.scoreResult.han}飜${analysis.scoreResult.fu}符`} / ${analysis.scoreResult.payments.ron.amount.toLocaleString()}点。`);
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
