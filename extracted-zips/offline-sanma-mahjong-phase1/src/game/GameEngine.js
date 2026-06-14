(function attachGameEngine(global) {
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
  const CpuStrategy = Sanma.CpuStrategy;
  const AssistManager = Sanma.AssistManager;
  const GameRecord = Sanma.GameRecord;

  const windLabels = { east: "東", south: "南", west: "西" };

  class GameEngine {
    constructor({ ruleConfig, seed, onChange }) {
      this.ruleConfig = RuleConfig.createRuleConfig(ruleConfig);
      this.seed = seed || "";
      this.onChange = typeof onChange === "function" ? onChange : function noop() {};
      this.round = {
        roundWind: "east",
        handNumber: 1,
        honba: 0,
        riichiSticks: 0,
        dealerIndex: 0,
      };
      this.players = [];
      this.wall = null;
      this.turnIndex = 0;
      this.phase = "idle";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.assistEvents = [];
      this.cpuRandom = Math.random;
      this.assistRandom = Math.random;
      this.winResult = null;
      this.lastDiscard = null;
      this.callWindow = null;
      this.gameRecord = null;
      this.startRound();
    }

    startRound() {
      this.wall = new Wall(this.ruleConfig, { seed: this.seed });
      this.cpuRandom = Sanma.createRandom(this.seed ? `${this.seed}:cpu` : "");
      this.assistRandom = Sanma.createRandom(this.seed ? `${this.seed}:assist` : "");
      this.players = [
        new Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: this.ruleConfig.initialPoints }),
        new Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: this.ruleConfig.initialPoints }),
        new Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: this.ruleConfig.initialPoints }),
      ];
      this.turnIndex = this.round.dealerIndex;
      this.phase = "dealing";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.assistEvents = [];
      this.winResult = null;
      this.lastDiscard = null;
      this.callWindow = null;
      this.dealInitialHands();
      this.gameRecord = GameRecord.create({
        seed: this.seed,
        ruleConfig: this.ruleConfig,
        players: this.players,
        roundLabel: this.getRoundLabel(),
        honba: this.round.honba,
      });
      this.recordGameEvent("deal", {
        dealerIndex: this.round.dealerIndex,
        hands: this.players.map((player) => ({
          playerIndex: player.id,
          tiles: player.hand.map(TileUtil.getTileShortLabel),
        })),
      });
      this.recordAssist(AssistManager.evaluateOpening({
        state: this,
        ruleConfig: this.ruleConfig,
        player: this.humanPlayer,
        random: this.assistRandom,
      }));
      this.phase = "human-discard";
      this.addLog("配牌しました。あなたは親です。切る牌をクリック/タップしてください。");
      this.emitChange();
    }

    dealInitialHands() {
      for (let draw = 0; draw < 13; draw += 1) {
        for (const player of this.players) {
          player.receiveTile(this.wall.draw());
        }
      }
      this.players[this.round.dealerIndex].receiveTile(this.wall.draw());
    }

    get humanPlayer() {
      return this.players.find((player) => player.isHuman);
    }

    getCurrentPlayer() {
      return this.players[this.turnIndex];
    }

    discardHumanTile(instanceId) {
      if ((this.phase !== "human-discard" && this.phase !== "caller-discard") || this.turnIndex !== 0) {
        this.addLog("現在はあなたの打牌番ではありません。");
        this.emitChange();
        return;
      }

      const discarded = this.humanPlayer.discardTileByInstanceId(instanceId);
      if (!discarded) {
        this.addLog("その牌は手牌にありません。");
        this.emitChange();
        return;
      }

      this.addLog(`あなたが ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
      this.recordGameEvent("discard", this.playerTileEvent(this.humanPlayer, discarded));
      const tenpai = HandAnalysis.analyzeTenpai(ActionResolver.getAnalysisTiles(this.humanPlayer), this.ruleConfig);
      if (tenpai.isTenpai) {
        this.addLog(`聴牌: 待ち牌 ${tenpai.waits.map((wait) => wait.label).join("、")}`);
      }
      this.handleDiscard(this.humanPlayer.id, discarded);
    }

    handleDiscard(discarderIndex, discarded) {
      this.lastDiscard = { playerIndex: discarderIndex, tile: discarded };
      if (discarderIndex !== this.humanPlayer.id) {
        const windowState = CallWindow.create(this, this.humanPlayer.id);
        if (windowState) {
          this.callWindow = windowState;
          this.phase = "human-call";
          this.addLog(`${this.players[discarderIndex].name}の捨て牌に対する操作を選んでください。`);
          this.emitChange();
          return;
        }
      }
      this.continueAfterDiscard(discarderIndex);
    }

    continueAfterDiscard(discarderIndex) {
      this.callWindow = null;
      if (this.wall.remainingCount() <= 0) {
        this.phase = "round-ended";
        this.addLog("山がなくなりました。簡易流局として終了します。");
        this.finishGameRecord({ type: "exhaustive_draw", reason: "山がなくなりました。" });
        this.emitChange();
        return;
      }

      this.turnIndex = (discarderIndex + 1) % this.players.length;
      this.phase = "cpu-running";
      this.emitChange();
      this.runCpuUntilHumanTurn();
    }

    runCpuUntilHumanTurn() {
      while (this.turnIndex !== 0 && this.wall.remainingCount() > 0) {
        const player = this.getCurrentPlayer();
        const drawn = this.wall.draw();
        if (!drawn) {
          this.endRoundForInvalidDraw(`${player.name}のツモ牌を取得できませんでした。`);
          return;
        }
        player.receiveTile(drawn);
        this.addLog(`${player.name} がツモりました。`);
        this.recordGameEvent("draw", this.playerTileEvent(player, drawn));
        this.recordAssist(AssistManager.evaluateDraw({
          state: this,
          ruleConfig: this.ruleConfig,
          player,
          random: this.assistRandom,
        }));
        if (this.tryCpuTsumo(player)) return;
        if (this.tryCpuKita(player)) return;
        if (this.tryCpuTsumo(player)) return;
        this.tryCpuRiichi(player);
        const discardIndex = this.chooseCpuDiscardIndex(player);
        const discarded = player.discardTileAt(discardIndex);
        if (!discarded) {
          this.endRoundForInvalidDraw(`${player.name}の打牌を取得できませんでした。`);
          return;
        }
        this.addLog(`${player.name} が ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
        this.recordGameEvent("discard", this.playerTileEvent(player, discarded));
        this.lastDiscard = { playerIndex: player.id, tile: discarded };
        const windowState = CallWindow.create(this, this.humanPlayer.id);
        if (windowState) {
          this.callWindow = windowState;
          this.phase = "human-call";
          this.addLog(`${player.name}の捨て牌に対する操作を選んでください。`);
          this.emitChange();
          return;
        }
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
      }

      if (this.wall.remainingCount() <= 0) {
        this.phase = "round-ended";
        this.addLog("山がなくなりました。簡易流局として終了します。");
        this.finishGameRecord({ type: "exhaustive_draw", reason: "山がなくなりました。" });
        this.emitChange();
        return;
      }

      if (this.turnIndex === 0) {
        const drawn = this.wall.draw();
        if (!drawn) {
          this.endRoundForInvalidDraw("あなたのツモ牌を取得できませんでした。");
          return;
        }
        this.humanPlayer.receiveTile(drawn);
        this.recordGameEvent("draw", this.playerTileEvent(this.humanPlayer, drawn));
        this.recordAssist(AssistManager.evaluateDraw({
          state: this,
          ruleConfig: this.ruleConfig,
          player: this.humanPlayer,
          random: this.assistRandom,
        }));
        this.lastDiscard = null;
        this.phase = "human-discard";
        this.addLog(`あなたのツモ: ${TileUtil.getTileAriaLabel(drawn)}。切る牌を選んでください。`);
        this.emitChange();
      }
    }

    chooseCpuDiscardIndex(player) {
      const analysis = ActionResolver.analyzeWin(this, player.id, "tsumo", null, null);
      const decision = CpuStrategy.chooseDiscard({
        player,
        state: this,
        ruleConfig: this.ruleConfig,
        analysis,
        random: this.cpuRandom,
      });
      const index = player.hand.findIndex((tile) => tile.instanceId === decision.tileInstanceId);
      const safeIndex = index >= 0 ? index : 0;
      const tile = player.hand[safeIndex];
      this.cpuThinkingLog.unshift({
        player: player.name,
        phase: "Phase 7 CPU思考",
        action: "打牌",
        selectedDiscard: TileUtil.getTileAriaLabel(tile),
        selectedTileInstanceId: tile.instanceId,
        reason: index >= 0 ? decision.reason : "候補牌が見つからなかったため先頭牌を選択しました。",
        score: decision.score,
        shanten: decision.candidates[0] ? decision.candidates[0].shanten : null,
        tenpai: decision.candidates[0] ? decision.candidates[0].tenpai : false,
        candidates: decision.candidates.slice(0, 8),
        assist: this.assistEvents[0] || null,
        hand: player.hand.map(TileUtil.getTileShortLabel).join(" "),
      });
      this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 20);
      return safeIndex;
    }

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
      this.round.riichiSticks = 0;
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
    }

    tryCpuKita(player) {
      if (player.hasRiichi) return false;
      let extractedCount = 0;
      while (extractedCount < 4) {
        const availability = KitaManager.canExtract(this, player.id);
        if (!availability.enabled || availability.options.length === 0) break;
        const result = KitaManager.extract(this, player.id, availability.options[0].instanceId);
        if (!result.applied) break;
        extractedCount += 1;
        this.addCpuActionLog(player, "抜き北", result.reason);
        this.addLog(`${player.name} が北を抜きました。`);
        this.recordGameEvent("kita", {
          playerIndex: player.id,
          playerName: player.name,
          tile: TileUtil.getTileShortLabel(result.extracted),
        });
        if (!result.replacement) {
          this.phase = "round-ended";
          this.addLog("抜き北の補充牌がないため局を終了します。");
          this.finishGameRecord({ type: "exhaustive_draw", reason: "抜き北の補充牌がありません。" });
          this.emitChange();
          return true;
        }
        this.recordAssist(AssistManager.evaluateDraw({
          state: this,
          ruleConfig: this.ruleConfig,
          player,
          random: this.assistRandom,
        }));
        this.recordGameEvent("draw", this.playerTileEvent(player, result.replacement));
        if (this.tryCpuTsumo(player)) return true;
      }
      return false;
    }

    tryCpuRiichi(player) {
      const availability = RiichiManager.canDeclare(this, player.id);
      if (!availability.enabled) return false;
      const result = RiichiManager.declare(this, player.id);
      if (!result.applied) return false;
      this.addCpuActionLog(player, "リーチ", result.reason);
      this.addLog(`${player.name} がリーチを宣言しました。`);
      this.recordGameEvent("riichi", { playerIndex: player.id, playerName: player.name });
      return true;
    }

    addCpuActionLog(player, action, reason) {
      this.cpuThinkingLog.unshift({
        player: player.name,
        phase: "Phase 7 CPU思考",
        action,
        reason,
        assist: this.assistEvents[0] || null,
      });
      this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 20);
    }

    recordAssist(event) {
      if (!event) return;
      this.assistEvents.unshift(event);
      this.assistEvents = this.assistEvents.slice(0, 20);
    }

    endRoundForInvalidDraw(reason) {
      this.phase = "round-ended";
      this.callWindow = null;
      this.addLog(`${reason} 安全のため局を終了します。`);
      this.finishGameRecord({ type: "exhaustive_draw", reason });
      this.emitChange();
    }

    drawForHumanManually() {
      if (this.phase !== "human-draw") return;
      const drawn = this.wall.draw();
      if (!drawn) {
        this.endRoundForInvalidDraw("あなたのツモ牌を取得できませんでした。");
        return;
      }
      this.humanPlayer.receiveTile(drawn);
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
    }

    createHumanWinContext(winType) {
      return ActionResolver.createWinContext(this, this.humanPlayer.id, winType, this.lastDiscard ? this.lastDiscard.playerIndex : 1);
    }

    claimHumanTsumo() {
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
      this.round.riichiSticks = 0;
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
    }

    claimHumanRon() {
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
      this.phase = "win-ended";
      this.round.riichiSticks = 0;
      this.callWindow = null;
      this.winResult = {
        winnerIndex: this.humanPlayer.id,
        winnerName: this.humanPlayer.name,
        winType: "ron",
        yaku: analysis.yakuResult,
        score: analysis.scoreResult,
        settlement,
      };
      this.addLog(`あなたがロン和了しました。${analysis.scoreResult.limitName || `${analysis.scoreResult.han}飜${analysis.scoreResult.fu}符`} / ${analysis.scoreResult.payments.ron.amount.toLocaleString()}点。`);
      this.recordGameEvent("win", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, winType: "ron" });
      this.recordGameEvent("score_settlement", { changes: settlement.changes });
      this.finishGameRecord(this.winResult);
      this.emitChange();
    }

    claimHumanCall(actionId, optionIndex) {
      if (actionId === "ron") {
        this.claimHumanRon();
        return;
      }
      if (this.phase !== "human-call" || !this.callWindow) {
        this.addLog("現在は鳴けません。");
        this.emitChange();
        return;
      }
      const action = this.callWindow.actions.find((candidate) => candidate.id === actionId);
      const option = action && action.options ? action.options[Number(optionIndex) || 0] : null;
      if (!action || !option) {
        this.addLog("選択した鳴きは利用できません。");
        this.emitChange();
        return;
      }
      if (actionId === "kan") {
        this.addLog("カンはPhase 5では判定・表示のみです。今回はスキップします。");
        this.skipHumanCall();
        return;
      }
      if (actionId !== "pon" && actionId !== "chi") return;
      if (!option.tile || !option.tile.instanceId || !Array.isArray(option.consumeInstanceIds)) {
        this.addLog("鳴き情報が不正なため、操作をスキップしました。");
        this.skipHumanCall();
        return;
      }

      const discarder = this.players[option.fromPlayerIndex];
      const discardIndex = discarder && Array.isArray(discarder.discards)
        ? discarder.discards.findIndex((tile) => tile && tile.instanceId === option.tile.instanceId)
        : -1;
      const isCurrentDiscard = this.lastDiscard
        && this.lastDiscard.playerIndex === option.fromPlayerIndex
        && this.lastDiscard.tile
        && this.lastDiscard.tile.instanceId === option.tile.instanceId;
      if (discardIndex < 0 || !isCurrentDiscard) {
        this.addLog("対象の捨て牌が河にないため、鳴きを取り消しました。");
        this.callWindow = null;
        this.continueAfterDiscard(option.fromPlayerIndex);
        return;
      }

      const consumed = [];
      option.consumeInstanceIds.forEach((instanceId) => {
        const index = this.humanPlayer.hand.findIndex((tile) => tile.instanceId === instanceId);
        if (index >= 0) consumed.push(this.humanPlayer.hand.splice(index, 1)[0]);
      });
      if (consumed.length !== option.consumeInstanceIds.length) {
        consumed.forEach((tile) => this.humanPlayer.receiveTile(tile));
        this.addLog("鳴きに必要な牌を手牌から取り出せませんでした。");
        this.emitChange();
        return;
      }

      discarder.discards.splice(discardIndex, 1);
      const meldTiles = consumed.concat(option.tile).sort(TileUtil.compareTiles);
      this.humanPlayer.melds.push({
        type: actionId,
        tiles: meldTiles,
        fromPlayerIndex: option.fromPlayerIndex,
        open: true,
      });
      this.humanPlayer.lastDraw = null;
      this.turnIndex = this.humanPlayer.id;
      this.phase = "caller-discard";
      this.lastDiscard = null;
      this.callWindow = null;
      this.addLog(`あなたが${actionId === "pon" ? "ポン" : "チー"}しました。続けて打牌してください。`);
      this.recordGameEvent("call", {
        playerIndex: this.humanPlayer.id,
        playerName: this.humanPlayer.name,
        action: actionId,
        fromPlayerIndex: option.fromPlayerIndex,
        tiles: meldTiles.map(TileUtil.getTileShortLabel),
      });
      this.emitChange();
    }

    skipHumanCall() {
      if (this.phase !== "human-call" || !this.callWindow) return;
      const discarderIndex = this.callWindow.fromPlayerIndex;
      CallWindow.close(this.callWindow, "スキップ");
      this.addLog("鳴きをスキップしました。");
      this.recordGameEvent("call", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, action: "skip" });
      this.continueAfterDiscard(discarderIndex);
    }

    declareHumanRiichi() {
      if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
        this.addLog("現在はリーチできません。");
        this.emitChange();
        return;
      }
      const result = RiichiManager.declare(this, this.humanPlayer.id);
      this.addLog(result.reason);
      if (result.applied) {
        this.recordGameEvent("riichi", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name });
      }
      this.emitChange();
    }

    extractHumanKita(instanceId) {
      if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
        this.addLog("現在は北抜きできません。");
        this.emitChange();
        return;
      }
      const result = KitaManager.extract(this, this.humanPlayer.id, instanceId);
      this.addLog(result.reason);
      if (result.applied) {
        this.recordGameEvent("kita", {
          playerIndex: this.humanPlayer.id,
          playerName: this.humanPlayer.name,
          tile: TileUtil.getTileShortLabel(result.extracted),
        });
        if (result.replacement) this.recordGameEvent("draw", this.playerTileEvent(this.humanPlayer, result.replacement));
      }
      if (result.applied && !result.replacement) {
        this.phase = "round-ended";
        this.finishGameRecord({ type: "exhaustive_draw", reason: "抜き北の補充牌がありません。" });
      }
      this.emitChange();
    }

    requestHumanKan() {
      const availability = KanManager.describeAvailability(this, this.humanPlayer.id);
      this.addLog(availability.enabled ? "カン可能牌を検出しました。Phase 5では判定・デバッグ表示のみです。" : availability.reason);
      this.emitChange();
    }

    playerTileEvent(player, tile) {
      return {
        playerIndex: player.id,
        playerName: player.name,
        tile: tile ? TileUtil.getTileShortLabel(tile) : null,
        tileInstanceId: tile ? tile.instanceId : null,
      };
    }

    recordGameEvent(type, data) {
      if (!this.gameRecord) return null;
      return GameRecord.addEvent(this.gameRecord, type, data);
    }

    finishGameRecord(result) {
      if (!this.gameRecord || this.gameRecord.completedAt) return;
      GameRecord.finishRound(
        this.gameRecord,
        result,
        this.players.map((player) => player.points)
      );
    }

    getRoundLabel() {
      return `${windLabels[this.round.roundWind]}${this.round.handNumber}局`;
    }

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

    getState() {
      const humanHand = this.humanPlayer ? this.humanPlayer.hand : [];
      const humanWinAnalysis = this.analyzeHumanWin("tsumo");
      const humanAgariAnalysis = humanWinAnalysis.agari;
      const humanTenpaiAnalysis = HandAnalysis.analyzeTenpai(ActionResolver.getAnalysisTiles(this.humanPlayer), this.ruleConfig);
      const humanYakuAnalysis = humanWinAnalysis.yaku;
      const humanScoreAnalysis = humanWinAnalysis.score;
      const humanAvailableActions = ActionResolver.getAvailableActions(this, this.humanPlayer.id);
      return {
        ruleConfig: this.ruleConfig,
        ruleSummary: RuleConfig.describeRuleConfig(this.ruleConfig),
        round: Object.assign({}, this.round, { label: this.getRoundLabel() }),
        players: this.players,
        wallRemaining: this.wall.remainingCount(),
        doraIndicators: this.wall.doraIndicators,
        deadWallCount: this.wall.deadWall.length,
        totalKnownTileCount: this.wall.totalKnownTileCount(this.players),
        phase: this.phase,
        turnIndex: this.turnIndex,
        logs: this.logs.slice(0, 12),
        cpuThinkingLog: this.cpuThinkingLog.slice(0, 20),
        assistEvents: this.assistEvents.slice(0, 20),
        humanAgariAnalysis,
        humanTenpaiAnalysis,
        humanYakuAnalysis,
        humanScoreAnalysis,
        humanAvailableActions,
        lastDiscard: this.lastDiscard,
        callWindow: this.callWindow,
        winResult: this.winResult,
        gameRecord: this.gameRecord,
        seed: this.seed,
      };
    }

    addLog(message) {
      const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      this.logs.unshift(`[${time}] ${message}`);
      this.logs = this.logs.slice(0, 80);
    }

    emitChange() {
      this.onChange(this.getState());
    }
  }

  Sanma.GameEngine = GameEngine;
})(window);
