(function attachGameEngine(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const RuleConfig = Sanma.RuleConfig;
  const MatchManager = Sanma.MatchManager;
  const DebugEventLog = Sanma.DebugEventLog;
  const GameStateMachine = Sanma.GameStateMachine;
  const InvariantChecker = Sanma.InvariantChecker;
  const HandAnalysis = Sanma.HandAnalysis;
  const ActionResolver = Sanma.ActionResolver;
  const RiichiRules = Sanma.RiichiRules;

  function snapshot(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  class GameEngine {
    constructor({ ruleConfig, seed, onChange }) {
      this.ruleConfig = RuleConfig.createRuleConfig(ruleConfig);
      this.seed = Sanma.SeedPolicy ? Sanma.SeedPolicy.requireValidSeed(seed) : String(seed || "");
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
      this.initialDealerDiscardPending = false;
      this.openingYakuState = null;
      this.gameRecord = null;
      this.debugEventLog = DebugEventLog.create();
      this.stateMachine = GameStateMachine.create("idle", this.debugEventLog);
      this.cpuTaskActive = false;
      this.pendingCpuCallDiscardIndex = null;
      this.lastInvariantReport = null;
      this.startRound();
    }

    get humanPlayer() {
      return this.players.find((player) => player.isHuman);
    }

    createNormalDrawContext(player) {
      return Sanma.DrawContext.createNormalDrawContext.call(this, player);
    }

    createLastDiscard(discarderIndex, discarded) {
      return Sanma.DrawContext.createLastDiscard.call(this, discarderIndex, discarded);
    }

    createHumanWinContext(winType) {
      return Sanma.DrawContext.createHumanWinContext.call(this, winType);
    }

    recordAssist(event) {
      return Sanma.RecordFlow.recordAssist.call(this, event);
    }

    playerTileEvent(player, tile) {
      return Sanma.RecordFlow.playerTileEvent.call(this, player, tile);
    }

    tileSnapshot(tile) {
      return Sanma.RecordFlow.tileSnapshot.call(this, tile);
    }

    recordGameEvent(type, data) {
      return Sanma.RecordFlow.recordGameEvent.call(this, type, data);
    }

    startRound() {
      this.pendingCpuCallDiscardIndex = null;
      return Sanma.RoundLifecycle.startRound.call(this);
    }

    startNextRound() {
      return Sanma.RoundLifecycle.startNextRound.call(this);
    }

    dealInitialHands() {
      return Sanma.RoundLifecycle.dealInitialHands.call(this);
    }

    finishGameRecord(result) {
      return Sanma.RoundLifecycle.finishGameRecord.call(this, result);
    }

    withDrawTenpai(result) {
      return Sanma.RoundLifecycle.withDrawTenpai.call(this, result);
    }

    getRoundLabel() {
      return Sanma.RoundLifecycle.getRoundLabel.call(this);
    }

    discardHumanTile(instanceId) {
      return Sanma.TurnFlow.discardHumanTile.call(this, instanceId);
    }

    handleDiscard(discarderIndex, discarded) {
      return Sanma.TurnFlow.handleDiscard.call(this, discarderIndex, discarded);
    }

    resolveNonWinningCallsAfterDiscard(discarderIndex) {
      return Sanma.TurnFlow.resolveNonWinningCallsAfterDiscard.call(this, discarderIndex);
    }

    applySelectedCpuCallCandidate(candidate, metadata) {
      return Sanma.TurnFlow.applySelectedCpuCallCandidate.call(this, candidate, metadata);
    }

    continueAfterDiscard(discarderIndex) {
      return Sanma.TurnFlow.continueAfterDiscard.call(this, discarderIndex);
    }

    runCpuUntilHumanTurn() {
      return Sanma.TurnFlow.runCpuUntilHumanTurn.call(this);
    }

    runCpuUntilHumanTurnUnlocked() {
      return Sanma.TurnFlow.runCpuUntilHumanTurnUnlocked.call(this);
    }

    chooseCpuDiscardIndex(player) {
      return Sanma.TurnFlow.chooseCpuDiscardIndex.call(this, player);
    }

    tryCpuKita(player) {
      return Sanma.TurnFlow.tryCpuKita.call(this, player);
    }

    markOpeningInterrupted() {
      return Sanma.TurnFlow.markOpeningInterrupted.call(this);
    }

    noteOpeningDiscard(discarderIndex) {
      return Sanma.TurnFlow.noteOpeningDiscard.call(this, discarderIndex);
    }

    tryCpuRiichi(player) {
      return Sanma.TurnFlow.tryCpuRiichi.call(this, player);
    }

    addCpuActionLog(player, action, reason) {
      return Sanma.TurnFlow.addCpuActionLog.call(this, player, action, reason);
    }

    endRoundForInvalidDraw(reason) {
      return Sanma.TurnFlow.endRoundForInvalidDraw.call(this, reason);
    }

    declareHumanRiichi() {
      return Sanma.TurnFlow.declareHumanRiichi.call(this);
    }

    tryCpuTsumo(player) {
      return Sanma.WinFlow.tryCpuTsumo.call(this, player);
    }

    collectRonCandidatesAfterDiscard(discarderIndex) {
      return Sanma.WinFlow.collectRonCandidatesAfterDiscard.call(this, discarderIndex);
    }

    selectHeadBumpCandidates(candidates) {
      return Sanma.WinFlow.selectHeadBumpCandidates.call(this, candidates);
    }

    findCpuRonAfterDiscard(discarderIndex) {
      return Sanma.WinFlow.findCpuRonAfterDiscard.call(this, discarderIndex);
    }

    tryCpuRonAfterDiscard(discarderIndex) {
      return Sanma.WinFlow.tryCpuRonAfterDiscard.call(this, discarderIndex);
    }

    resolveRonCandidatesAfterDiscard(discarderIndex) {
      return Sanma.WinFlow.resolveRonCandidatesAfterDiscard.call(this, discarderIndex);
    }

    drawForHumanManually() {
      return Sanma.WinFlow.drawForHumanManually.call(this);
    }

    claimHumanTsumo() {
      return Sanma.WinFlow.claimHumanTsumo.call(this);
    }

    claimHumanRon() {
      return Sanma.WinFlow.claimHumanRon.call(this);
    }

    resolveRonWin(winnerIndex, analysis, metadata) {
      return Sanma.WinFlow.resolveRonWin.call(this, winnerIndex, analysis, metadata);
    }

    analyzeHumanWin(winType) {
      return Sanma.WinFlow.analyzeHumanWin.call(this, winType);
    }

    claimHumanCall(actionId, optionIndex) {
      return Sanma.CallFlow.claimHumanCall.call(this, actionId, optionIndex);
    }

    skipHumanCall() {
      return Sanma.CallFlow.skipHumanCall.call(this);
    }

    applyOpenCall(playerIndex, actionId, option, metadata) {
      if (!Sanma.CallFlow.applyOpenCall) return false;
      return Sanma.CallFlow.applyOpenCall.call(this, playerIndex, actionId, option, metadata);
    }

    applyCpuCall(candidate, metadata) {
      if (!Sanma.CallFlow.applyCpuCall) return false;
      return Sanma.CallFlow.applyCpuCall.call(this, candidate, metadata);
    }

    tryCpuKan(player) {
      return Sanma.KanFlow.tryCpuKan.call(this, player);
    }

    extractHumanKita(instanceId) {
      return Sanma.KanFlow.extractHumanKita.call(this, instanceId);
    }

    requestHumanKan() {
      return Sanma.KanFlow.requestHumanKan.call(this);
    }

    selectHumanKan(optionIndex) {
      return Sanma.KanFlow.selectHumanKan.call(this, optionIndex);
    }

    cancelHumanKanChoice() {
      return Sanma.KanFlow.cancelHumanKanChoice.call(this);
    }

    applyHumanKan(option) {
      return Sanma.KanFlow.applyHumanKan.call(this, option);
    }

    beginKanAttempt(playerIndex, option) {
      return Sanma.KanFlow.beginKanAttempt.call(this, playerIndex, option);
    }

    findChankanInterrupts(attempt) {
      return Sanma.KanFlow.findChankanInterrupts.call(this, attempt);
    }

    findChankanInterrupt(attempt) {
      return Sanma.KanFlow.findChankanInterrupt.call(this, attempt);
    }

    openOrResolveChankan(interrupts, attempt) {
      return Sanma.KanFlow.openOrResolveChankan.call(this, interrupts, attempt);
    }

    finalizePendingKan() {
      return Sanma.KanFlow.finalizePendingKan.call(this);
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
      const view = Sanma.UiStateView;
      return {
        ruleConfig: snapshot(this.ruleConfig),
        ruleSummary: RuleConfig.describeRuleConfig(this.ruleConfig),
        round: snapshot(Object.assign({}, this.round, { label: this.getRoundLabel() })),
        players: this.players.map((player) => view.playerSnapshot(this, player)),
        wallRemaining: this.wall.remainingCount(),
        doraIndicators: (this.wall.doraIndicators || []).map((tile) => this.tileSnapshot(tile)).filter(Boolean),
        deadWallCount: null,
        totalKnownTileCount: null,
        phase: this.phase,
        gameState: this.stateMachine.state,
        turnIndex: this.turnIndex,
        logs: this.logs.slice(0, 12),
        cpuThinkingLog: this.cpuThinkingLog.slice(0, 20).map(view.cpuThinkingEntrySummary).filter(Boolean),
        assistEvents: this.assistEvents.slice(0, 20).map(view.assistEventSummary),
        humanAgariAnalysis,
        humanTenpaiAnalysis,
        humanYakuAnalysis,
        humanScoreAnalysis,
        humanAvailableActions: snapshot(humanAvailableActions),
        pendingRiichiDiscardInstanceIds: RiichiRules
          ? RiichiRules.getDeclarationDiscardOptions(this, this.humanPlayer.id).map((tile) => tile.instanceId)
          : [],
        lastDiscard: snapshot(this.lastDiscard),
        callWindow: view.callWindowSnapshot(this, this.callWindow),
        pendingKanChoice: snapshot(this.pendingKanChoice),
        pendingKanAttempt: view.kanAttemptSummary(this, this.pendingKanAttempt),
        winResult: snapshot(this.winResult),
        matchState: this.matchManager.getState(),
        gameRecord: view.gameRecordSummary(this.gameRecord),
        invariantReport: view.invariantSummary(this.lastInvariantReport),
        tileLedger: view.tileLedgerSummary(this.lastInvariantReport),
        debugEvents: snapshot(DebugEventLog.list(this.debugEventLog)),
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
