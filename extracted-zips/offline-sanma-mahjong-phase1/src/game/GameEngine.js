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

  class GameEngine {
    constructor({ ruleConfig, seed, onChange }) {
      this.ruleConfig = RuleConfig.createRuleConfig(ruleConfig);
      this.seed = seed || "";
      this.onChange = typeof onChange === "function" ? onChange : function noop() {};
      this.matchManager = new MatchManager({ ruleConfig: this.ruleConfig, seed: this.seed });
      this.round = this.matchManager.getRoundSnapshot();
      this.players = [];
      this.wall = null;
      this.turnIndex = 0;
      this.phase = "idle";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.assistEvents = [];
      this.assistUsage = { opening: 0, drawsByPlayer: Object.create(null) };
      this.cpuRandom = Math.random;
      this.assistRandom = Math.random;
      this.winResult = null;
      this.lastDiscard = null;
      this.callWindow = null;
      this.lastDrawContext = null;
      this.pendingWinContext = null;
      this.pendingKanChoice = null;
      this.pendingKanAttempt = null;
      this.gameRecord = null;
      this.debugEventLog = DebugEventLog.create();
      this.stateMachine = GameStateMachine.create("idle", this.debugEventLog);
      this.cpuTaskActive = false;
      this.lastInvariantReport = null;
      this.startRound();
    }

    startRound() {
      this.round = this.matchManager.getRoundSnapshot();
      const roundSeed = this.seed ? `${this.seed}:${this.round.label}:${this.round.honba}` : "";
      this.wall = new Wall(this.ruleConfig, { seed: roundSeed });
      this.cpuRandom = Sanma.createRandom(roundSeed ? `${roundSeed}:cpu` : "");
      this.assistRandom = Sanma.createRandom(roundSeed ? `${roundSeed}:assist` : "");
      this.players = this.matchManager.state.players.map((player) => new Player(player));
      this.turnIndex = this.round.dealerIndex;
      this.phase = "dealing";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.assistEvents = [];
      this.assistUsage = { opening: 0, drawsByPlayer: Object.create(null) };
      this.winResult = null;
      this.lastDiscard = null;
      this.callWindow = null;
      this.lastDrawContext = null;
      this.pendingWinContext = null;
      this.pendingKanChoice = null;
      this.pendingKanAttempt = null;
      this.cpuTaskActive = false;
      GameStateMachine.cancelAll(this.stateMachine, "新しい局を開始");
      GameStateMachine.syncLegacy(this.stateMachine, this.phase, this.matchManager.state, "配牌開始");
      this.dealInitialHands();
      const roundRecordInput = {
        roundLabel: this.getRoundLabel(),
        dealerIndex: this.round.dealerIndex,
        honba: this.round.honba,
        riichiSticks: this.round.riichiSticks,
        startingPoints: this.players.map((player) => player.points),
      };
      if (!this.gameRecord) {
        this.gameRecord = GameRecord.create(Object.assign({
          matchId: this.matchManager.state.matchId,
          seed: this.seed,
          ruleConfig: this.ruleConfig,
          players: this.players,
        }, roundRecordInput));
      } else {
        GameRecord.addRound(this.gameRecord, roundRecordInput);
      }
      this.recordGameEvent("deal", {
        dealerIndex: this.round.dealerIndex,
        hands: this.players.map((player) => ({
          playerIndex: player.id,
          tiles: player.hand.map((tile) => this.tileSnapshot(tile)),
        })),
      });
      this.recordAssist(AssistManager.evaluateOpening({
        state: this,
        ruleConfig: this.ruleConfig,
        player: this.humanPlayer,
        random: this.assistRandom,
      }));
      this.phase = "human-discard";
      GameStateMachine.syncLegacy(this.stateMachine, this.phase, this.matchManager.state, "配牌完了");
      this.addLog(`配牌しました。${this.players[this.round.dealerIndex].name}が親です。切る牌をクリック/タップしてください。`);
      this.emitChange();
    }

    startNextRound() {
      const validation = this.validateAction("次局へ進行", ["roundEnded"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if (!this.matchManager.startNextRound()) {
        this.addLog(this.matchManager.state.matchEnded ? "対局は終了しています。" : "まだ次局へ進めません。");
        this.emitChange();
        return false;
      }
      this.startRound();
      return true;
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

    syncStateMachine(label) {
      return GameStateMachine.syncLegacy(this.stateMachine, this.phase, this.matchManager.state, label);
    }

    validateAction(action, allowedStates) {
      this.syncStateMachine(`${action}要求`);
      const result = GameStateMachine.validateAction(this.stateMachine, action, allowedStates);
      if (!result.ok) this.addLog(result.reason);
      return result;
    }

    discardHumanTile(instanceId) {
      const validation = this.validateAction("打牌", ["waitingForDiscard"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if ((this.phase !== "human-discard" && this.phase !== "caller-discard") || this.turnIndex !== 0) {
        this.addLog("現在はあなたの打牌番ではありません。");
        this.emitChange();
        return;
      }

      const target = this.humanPlayer.hand.find((tile) => tile.instanceId === instanceId);
      if (this.humanPlayer.riichi
        && this.humanPlayer.riichi.pending
        && !RiichiRules.canDeclareDiscard(this, this.humanPlayer.id, target)) {
        this.addLog("聴牌を維持するリーチ宣言牌を選んでください。");
        this.emitChange();
        return;
      }
      if (this.humanPlayer.hasRiichi
        && (!target || !this.humanPlayer.lastDraw || target.instanceId !== this.humanPlayer.lastDraw.instanceId)) {
        this.addLog("リーチ後はツモ切りのみです。");
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
      const riichiResult = RiichiRules.handleDiscard(this, this.humanPlayer.id, discarded);
      if (riichiResult.finalized) {
        this.addLog(riichiResult.reason);
        this.recordGameEvent("riichi", {
          playerIndex: this.humanPlayer.id,
          playerName: this.humanPlayer.name,
          declarationDiscard: TileUtil.getTileShortLabel(discarded),
        });
      }
      const tenpai = HandAnalysis.analyzeTenpai(ActionResolver.getAnalysisTiles(this.humanPlayer), this.ruleConfig);
      if (tenpai.isTenpai) {
        this.addLog(`聴牌: 待ち牌 ${tenpai.waits.map((wait) => wait.label).join("、")}`);
      }
      this.handleDiscard(this.humanPlayer.id, discarded);
    }

    handleDiscard(discarderIndex, discarded) {
      this.lastDiscard = { playerIndex: discarderIndex, tile: discarded };
      this.lastDrawContext = null;
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
      this.syncStateMachine("CPU進行開始");
      if (this.cpuTaskActive) {
        DebugEventLog.add(this.debugEventLog, "actionRejected", {
          action: "cpuAutomation",
          reason: "CPU処理はすでに実行中です",
        });
        return false;
      }
      const guard = GameStateMachine.beginAction(
        this.stateMachine,
        "cpuAutomation",
        ["resolvingAction"]
      );
      if (!guard.ok) return false;
      this.cpuTaskActive = true;
      try {
        return this.runCpuUntilHumanTurnUnlocked();
      } finally {
        this.cpuTaskActive = false;
        GameStateMachine.endAction(this.stateMachine, "cpuAutomation");
      }
    }

    runCpuUntilHumanTurnUnlocked() {
      let cpuSteps = 0;
      while (this.turnIndex !== 0 && this.wall.remainingCount() > 0) {
        cpuSteps += 1;
        if (cpuSteps > 12) {
          this.endRoundForInvalidDraw("CPU処理の安全上限を超えました。");
          return false;
        }
        const player = this.getCurrentPlayer();
        const drawn = this.wall.draw();
        if (!drawn) {
          this.endRoundForInvalidDraw(`${player.name}のツモ牌を取得できませんでした。`);
          return;
        }
        player.receiveTile(drawn);
        this.lastDrawContext = { playerIndex: player.id, isRinshan: false };
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
        if (this.tryCpuKan(player)) return;
        this.tryCpuRiichi(player);
        const discardIndex = this.chooseCpuDiscardIndex(player);
        const discarded = player.discardTileAt(discardIndex);
        if (!discarded) {
          this.endRoundForInvalidDraw(`${player.name}の打牌を取得できませんでした。`);
          return;
        }
        const riichiResult = RiichiRules.handleDiscard(this, player.id, discarded);
        if (riichiResult.finalized) {
          this.addCpuActionLog(player, "リーチ", riichiResult.reason);
          this.addLog(riichiResult.reason);
          this.recordGameEvent("riichi", {
            playerIndex: player.id,
            playerName: player.name,
            declarationDiscard: TileUtil.getTileShortLabel(discarded),
          });
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
        this.lastDrawContext = { playerIndex: this.humanPlayer.id, isRinshan: false };
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
      return true;
    }

    chooseCpuDiscardIndex(player) {
      if (player.riichi && player.riichi.pending) {
        const options = RiichiRules.getDeclarationDiscardOptions(this, player.id);
        const optionIds = new Set(options.map((tile) => tile.instanceId));
        const declarationIndex = player.hand.findIndex((tile) => optionIds.has(tile.instanceId));
        if (declarationIndex < 0) {
          this.addCpuActionLog(player, "打牌失敗", "有効なリーチ宣言牌が見つかりません。");
          return -1;
        }
        this.addCpuActionLog(player, "リーチ宣言牌", "聴牌を維持する牌を選択しました。");
        return declarationIndex;
      }

      if (player.hasRiichi) {
        const lastDrawIndex = player.lastDraw
          ? player.hand.findIndex((tile) => tile.instanceId === player.lastDraw.instanceId)
          : -1;
        if (lastDrawIndex < 0) {
          this.addCpuActionLog(player, "打牌失敗", "リーチ後のツモ牌が見つからないため安全に局を終了します。");
          return -1;
        }
        this.addCpuActionLog(player, "ツモ切り", "リーチ後のためツモ牌をそのまま切ります。");
        return lastDrawIndex;
      }

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
          tile: this.tileSnapshot(result.extracted),
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

    tryCpuKan(player) {
      const availability = KanRules.describeAvailability(this, player.id, this.ruleConfig);
      const option = (availability.options || []).find((candidate) => candidate.type !== "minkan");
      if (!availability.enabled || !option) return false;
      this.addCpuActionLog(player, "カン", option.label || option.type);
      this.beginKanAttempt(player.id, option);
      return this.phase === "human-call" || this.phase === "win-ended" || this.phase === "round-ended";
    }

    tryCpuRiichi(player) {
      const availability = RiichiManager.canDeclare(this, player.id);
      if (!availability.enabled) return false;
      const result = RiichiManager.declare(this, player.id);
      if (!result.applied) return false;
      this.addCpuActionLog(player, "リーチ", result.reason);
      this.addLog(`${player.name} がリーチ宣言牌を選択しています。`);
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
      DebugEventLog.add(this.debugEventLog, "cpuDecision", {
        playerIndex: player.id,
        playerName: player.name,
        action,
        reason,
      });
    }

    recordAssist(event) {
      if (!event) return;
      this.assistEvents.unshift(event);
      this.assistEvents = this.assistEvents.slice(0, 20);
      if (event.applied) {
        this.recordGameEvent("assist", {
          phase: event.phase,
          playerIndex: event.playerIndex,
          beforeShanten: event.beforeShanten,
          afterShanten: event.afterShanten,
          outgoing: this.tileSnapshot(event.outgoing),
          incoming: this.tileSnapshot(event.incoming),
        });
      }
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
      this.lastDrawContext = { playerIndex: this.humanPlayer.id, isRinshan: false };
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
      return ActionResolver.createWinContext(
        this,
        this.humanPlayer.id,
        winType,
        this.lastDiscard ? this.lastDiscard.playerIndex : 1,
        winType === "ron" && this.lastDiscard ? this.lastDiscard.tile : null
      );
    }

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
    }

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
    }

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
    }

    claimHumanCall(actionId, optionIndex) {
      if (actionId === "ron") {
        this.claimHumanRon();
        return;
      }
      const validation = this.validateAction("鳴き", ["waitingForCall"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if (this.phase !== "human-call" || !this.callWindow) {
        this.addLog("現在は鳴けません。");
        this.emitChange();
        return;
      }
      if (this.humanPlayer.hasRiichi) {
        this.addLog("リーチ後は鳴けません。");
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
        if (FuritenManager && this.callWindow.actions.some((candidate) => candidate.id === "ron")) {
          FuritenManager.markMissedRon(this, this.humanPlayer.id);
        }
        this.applyHumanKan(option);
        return;
      }
      if (actionId !== "pon" && actionId !== "chi") return;
      if (FuritenManager && this.callWindow.actions.some((candidate) => candidate.id === "ron")) {
        FuritenManager.markMissedRon(this, this.humanPlayer.id);
      }
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
      if (RiichiRules) RiichiRules.clearIppatsu(this);
      else {
        this.players.forEach((player) => {
          player.ippatsuActive = false;
        });
      }
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
        tiles: meldTiles.map((tile) => this.tileSnapshot(tile)),
        calledTile: this.tileSnapshot(option.tile),
      });
      this.emitChange();
    }

    skipHumanCall() {
      const validation = this.validateAction("鳴きスキップ", ["waitingForCall"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if (this.phase !== "human-call" || !this.callWindow) return;
      const discarderIndex = this.callWindow.fromPlayerIndex;
      if (FuritenManager && this.callWindow.actions.some((action) => action.id === "ron")) {
        FuritenManager.markMissedRon(this, this.humanPlayer.id);
      }
      if (this.callWindow.kind === "chankan") {
        const declarerIndex = this.callWindow.fromPlayerIndex;
        const kanType = this.callWindow.kanType;
        this.recordGameEvent("chankan", {
          playerIndex: this.humanPlayer.id,
          playerName: this.humanPlayer.name,
          fromPlayerIndex: declarerIndex,
          kanType,
          decision: "skip",
        });
        CallWindow.close(this.callWindow, "槍槓見逃し");
        this.callWindow = null;
        this.pendingWinContext = null;
        const result = this.finalizePendingKan();
        if (result && result.applied && declarerIndex !== this.humanPlayer.id && this.phase === "cpu-running") {
          this.emitChange();
          this.runCpuUntilHumanTurn();
        }
        return true;
      }
      CallWindow.close(this.callWindow, "スキップ");
      this.addLog("鳴きをスキップしました。");
      this.recordGameEvent("call", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, action: "skip" });
      this.continueAfterDiscard(discarderIndex);
    }

    declareHumanRiichi() {
      const validation = this.validateAction("リーチ", ["waitingForDiscard"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
        this.addLog("現在はリーチできません。");
        this.emitChange();
        return;
      }
      const result = RiichiRules
        ? RiichiRules.declare(this, this.humanPlayer.id)
        : RiichiManager.declare(this, this.humanPlayer.id);
      this.addLog(result.reason);
      this.emitChange();
    }

    extractHumanKita(instanceId) {
      const validation = this.validateAction("北抜き", ["waitingForDiscard"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
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
          tile: this.tileSnapshot(result.extracted),
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
      const validation = this.validateAction("カン", ["waitingForDiscard"]);
      if (!validation.ok) {
        this.emitChange();
        return false;
      }
      if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
        this.addLog("現在はカンできません。");
        this.emitChange();
        return;
      }
      const availability = KanRules
        ? KanRules.describeAvailability(this, this.humanPlayer.id, this.ruleConfig)
        : KanManager.describeAvailability(this, this.humanPlayer.id);
      if (!availability.enabled) {
        this.addLog(availability.reason);
        this.emitChange();
        return false;
      }
      if (availability.options.length > 1) {
        this.pendingKanChoice = {
          isOpen: true,
          playerIndex: this.humanPlayer.id,
          options: availability.options.slice(),
        };
        this.phase = "human-kan-choice";
        this.addLog("複数のカン候補があります。実行するカンを選択してください。");
        this.recordGameEvent("kan_choice_open", {
          playerIndex: this.humanPlayer.id,
          options: availability.options.map((option) => ({
            type: option.type,
            label: option.label,
            tile: option.tile ? TileUtil.getTileShortLabel(option.tile) : null,
          })),
        });
        this.emitChange();
        return true;
      }
      return this.applyHumanKan(availability.options[0]);
    }

    selectHumanKan(optionIndex) {
      const pending = this.pendingKanChoice;
      const index = Number(optionIndex);
      if (!pending || !pending.isOpen || !Number.isInteger(index) || !pending.options[index]) {
        this.addLog("選択されたカン候補は利用できません。");
        this.emitChange();
        return false;
      }
      const selected = pending.options[index];
      this.pendingKanChoice = null;
      this.phase = "human-discard";
      return this.applyHumanKan(selected);
    }

    cancelHumanKanChoice() {
      if (!this.pendingKanChoice || !this.pendingKanChoice.isOpen) {
        this.addLog("取り消せるカン選択はありません。");
        this.emitChange();
        return false;
      }
      this.recordGameEvent("kan_choice_cancel", { playerIndex: this.humanPlayer.id });
      this.pendingKanChoice = null;
      this.phase = "human-discard";
      this.addLog("カン選択を取り消しました。");
      this.emitChange();
      return true;
    }

    applyHumanKan(option) {
      if (!KanRules) {
        this.addLog("カンルール管理が読み込まれていません。");
        this.emitChange();
        return false;
      }
      this.pendingKanChoice = null;
      return this.beginKanAttempt(this.humanPlayer.id, option);
    }

    beginKanAttempt(playerIndex, option) {
      const attempt = KanRules.prepareKan({
        state: this,
        playerIndex,
        kanAction: option,
        ruleConfig: this.ruleConfig,
      });
      this.addLog(attempt.reason);
      if (!attempt.prepared) {
        this.emitChange();
        return false;
      }
      this.pendingKanAttempt = attempt;
      this.recordGameEvent("kan_attempt", {
        playerIndex,
        playerName: this.players[playerIndex].name,
        kanType: attempt.kanType,
        tile: TileUtil.getTileShortLabel(attempt.declaredTile),
      });
      const interrupt = this.findChankanInterrupt(attempt);
      if (interrupt) return this.openOrResolveChankan(interrupt, attempt);
      return Boolean(this.finalizePendingKan().applied);
    }

    findChankanInterrupt(attempt) {
      if (!attempt || !["kakan", "ankan"].includes(attempt.kanType)) return null;
      const kanRules = (this.ruleConfig.advancedRules && this.ruleConfig.advancedRules.kan) || {};
      if (kanRules.chankan === false) return null;
      const declaredTile = attempt.declaredTile;
      const previousContext = this.pendingWinContext;
      for (let offset = 1; offset < this.players.length; offset += 1) {
        const playerIndex = (attempt.playerIndex + offset) % this.players.length;
        const furiten = FuritenManager.checkRonEligibility({
          state: this,
          playerIndex,
          winningTile: declaredTile,
          sourcePlayerIndex: attempt.playerIndex,
          ruleConfig: this.ruleConfig,
        });
        if (!furiten.canRon) continue;
        const isAnkanKokushiException = attempt.kanType === "ankan";
        this.pendingWinContext = {
          isChankan: true,
          sourcePlayerIndex: attempt.playerIndex,
          winningTile: declaredTile,
          kanType: attempt.kanType,
          isAnkanKokushiException,
        };
        const analysis = ActionResolver.analyzeWin(
          this,
          playerIndex,
          "ron",
          declaredTile,
          attempt.playerIndex
        );
        const isKokushi = analysis.agariResult
          && analysis.agariResult.bestPattern
          && analysis.agariResult.bestPattern.type === "kokushi";
        if (analysis.scoreResult.isValidWin && (attempt.kanType === "kakan" || isKokushi)) {
          return { playerIndex, analysis, isAnkanKokushiException };
        }
      }
      this.pendingWinContext = previousContext;
      return null;
    }

    openOrResolveChankan(interrupt, attempt) {
      const winner = this.players[interrupt.playerIndex];
      this.recordGameEvent("chankan_offer", {
        playerIndex: interrupt.playerIndex,
        playerName: winner.name,
        fromPlayerIndex: attempt.playerIndex,
        kanType: attempt.kanType,
        isAnkanKokushiException: interrupt.isAnkanKokushiException,
      });
      if (!winner.isHuman) {
        return this.resolveRonWin(interrupt.playerIndex, interrupt.analysis, {
          isChankan: true,
          kanType: attempt.kanType,
          isAnkanKokushiException: interrupt.isAnkanKokushiException,
        });
      }
      this.callWindow = {
        isOpen: true,
        kind: "chankan",
        playerIndex: interrupt.playerIndex,
        fromPlayerIndex: attempt.playerIndex,
        tile: attempt.declaredTile,
        kanType: attempt.kanType,
        isAnkanKokushiException: interrupt.isAnkanKokushiException,
        actions: [{
          id: "ron",
          label: "槍槓ロン",
          enabled: true,
          reason: "カン宣言牌でロン和了できます。",
          analysis: interrupt.analysis,
        }],
      };
      this.phase = "human-call";
      this.addLog("槍槓ロンを選択できます。");
      this.emitChange();
      return true;
    }

    finalizePendingKan() {
      const attempt = this.pendingKanAttempt;
      if (!attempt) return { applied: false, reason: "確定待ちのカンがありません。" };
      this.pendingKanAttempt = null;
      this.pendingWinContext = null;
      const result = KanRules.finalizeKan({
        state: this,
        attempt,
        ruleConfig: this.ruleConfig,
      });
      this.addLog(result.reason);
      if (!result.applied) {
        this.emitChange();
        return result;
      }
      const player = this.players[attempt.playerIndex];
      this.turnIndex = attempt.playerIndex;
      this.phase = result.replacement
        ? (player.isHuman ? "human-discard" : "cpu-running")
        : "round-ended";
      this.recordGameEvent("kan", {
        playerIndex: attempt.playerIndex,
        playerName: player.name,
        kanType: result.kanType,
        tiles: result.meld.tiles.map((tile) => this.tileSnapshot(tile)),
        meldIndex: result.kanType === "kakan" ? attempt.requested.meldIndex : null,
        consumedTileInstanceIds: (attempt.requested.consumeInstanceIds || []).slice(),
        fromPlayerIndex: attempt.requested.fromPlayerIndex,
        calledTile: result.kanType === "minkan" ? this.tileSnapshot(attempt.requested.tile) : null,
      });
      if (result.replacement) {
        this.recordGameEvent("draw", this.playerTileEvent(player, result.replacement));
      } else {
        this.finishGameRecord({ type: "exhaustive_draw", reason: "嶺上牌を取得できませんでした。" });
      }
      this.emitChange();
      return result;
    }

    playerTileEvent(player, tile) {
      return {
        playerIndex: player.id,
        playerName: player.name,
        tile: this.tileSnapshot(tile),
        tileInstanceId: tile ? tile.instanceId : null,
      };
    }

    tileSnapshot(tile) {
      if (!tile) return null;
      return {
        instanceId: tile.instanceId,
        baseId: tile.baseId,
        label: TileUtil.getTileShortLabel(tile),
        isRed: Boolean(tile.isRed),
      };
    }

    recordGameEvent(type, data) {
      if (!this.gameRecord) return null;
      if (type === "score_settlement") {
        DebugEventLog.add(this.debugEventLog, "settlementResult", data || {});
      }
      return GameRecord.addEvent(this.gameRecord, type, data);
    }

    finishGameRecord(result) {
      if (!this.gameRecord || this.gameRecord.completedAt) return;
      const currentRound = this.gameRecord.rounds[this.gameRecord.rounds.length - 1];
      if (currentRound && currentRound.result) return;
      const safeResult = this.withDrawTenpai(result);
      const points = this.players.map((player) => player.points);
      GameRecord.completeRound(this.gameRecord, safeResult, points, {
        dealerIndex: this.round.dealerIndex,
        honba: this.round.honba,
        riichiSticks: this.round.riichiSticks,
        pointMovement: safeResult.settlement ? safeResult.settlement.changes : [],
      });
      this.matchManager.syncRound(this.round);
      const matchState = this.matchManager.completeRound(safeResult, this.players);
      if (!["win-ended", "round-ended"].includes(this.phase)) this.phase = "round-ended";
      this.round.riichiSticks = matchState.riichiSticks;
      if (matchState.matchEnded) {
        GameRecord.finishMatch(
          this.gameRecord,
          points,
          matchState.rankings,
          matchState.endReason
        );
      }
    }

    withDrawTenpai(result) {
      const safeResult = Object.assign({}, result || {});
      if (safeResult.type !== "exhaustive_draw" || safeResult.dealerTenpai !== undefined) return safeResult;
      const dealer = this.players[this.round.dealerIndex];
      const tiles = ActionResolver.getAnalysisTiles(dealer);
      safeResult.dealerTenpai = HandAnalysis.analyzeTenpai(tiles, this.ruleConfig).isTenpai;
      return safeResult;
    }

    getRoundLabel() {
      return Sanma.RoundManager.roundLabel(this.round.roundWind, this.round.handNumber);
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
      this.matchManager.syncRound(this.round);
      this.matchManager.syncPlayers(this.players);
      this.syncStateMachine("状態スナップショット");
      this.lastInvariantReport = InvariantChecker.checkState(this, this.ruleConfig);
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
        gameState: this.stateMachine.state,
        turnIndex: this.turnIndex,
        logs: this.logs.slice(0, 12),
        cpuThinkingLog: this.cpuThinkingLog.slice(0, 20),
        assistEvents: this.assistEvents.slice(0, 20),
        humanAgariAnalysis,
        humanTenpaiAnalysis,
        humanYakuAnalysis,
        humanScoreAnalysis,
        humanAvailableActions,
        pendingRiichiDiscardInstanceIds: RiichiRules
          ? RiichiRules.getDeclarationDiscardOptions(this, this.humanPlayer.id).map((tile) => tile.instanceId)
          : [],
        lastDiscard: this.lastDiscard,
        callWindow: this.callWindow,
        pendingKanChoice: this.pendingKanChoice,
        pendingKanAttempt: this.pendingKanAttempt,
        winResult: this.winResult,
        matchState: this.matchManager.getState(),
        gameRecord: this.gameRecord,
        invariantReport: this.lastInvariantReport,
        tileLedger: this.lastInvariantReport.tileLedger,
        debugEvents: DebugEventLog.list(this.debugEventLog),
        seed: this.seed,
      };
    }

    addLog(message) {
      const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      this.logs.unshift(`[${time}] ${message}`);
      this.logs = this.logs.slice(0, 80);
    }

    emitChange() {
      this.syncStateMachine("画面更新");
      this.onChange(this.getState());
    }
  }

  Sanma.GameEngine = GameEngine;
})(window);
