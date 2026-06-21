(function attachRoundLifecycle(global) {
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

  function compactWaits(analysis) {
    const waits = analysis && Array.isArray(analysis.waits) ? analysis.waits : [];
    return waits.map((wait) => ({
      tileType: wait.tileType,
      label: wait.label,
    }));
  }

  function analyzePlayerTenpai(player, ruleConfig) {
    if (!player) return { isTenpai: false, waits: [], reason: "プレイヤーが見つかりません。" };
    const result = HandAnalysis.analyzeTenpaiWithMelds
      ? HandAnalysis.analyzeTenpaiWithMelds(player.hand || [], player.melds || [], ruleConfig)
      : HandAnalysis.analyzeTenpai(ActionResolver.getAnalysisTiles(player), ruleConfig);
    return {
      isTenpai: Boolean(result && result.isTenpai),
      waits: compactWaits(result),
      reason: result && result.reason ? result.reason : "",
    };
  }

  function buildDrawTenpaiStatus(players, ruleConfig) {
    return (players || []).map((player, playerIndex) => {
      const analysis = analyzePlayerTenpai(player, ruleConfig);
      return {
        playerIndex,
        playerName: player && player.name ? player.name : `Player ${playerIndex + 1}`,
        isTenpai: analysis.isTenpai,
        waits: analysis.waits,
        reason: analysis.reason,
      };
    });
  }

  function formatDelta(change) {
    const delta = Number(change && change.delta) || 0;
    const sign = delta > 0 ? "+" : "";
    return `${change.playerName || `P${change.playerIndex}`} ${sign}${delta}`;
  }

  Sanma.RoundLifecycle = {
        startRound() {
          this.round = this.matchManager.getRoundSnapshot();
          const roundSeed = Sanma.SeedPolicy
            ? Sanma.SeedPolicy.deriveSeed(this.seed, `${this.round.label}:${this.round.honba}`)
            : (this.seed ? `${this.seed}:${this.round.label}:${this.round.honba}` : "");
          this.wall = new Wall(this.ruleConfig, { seed: roundSeed });
          this.cpuRandom = Sanma.createRandom(Sanma.SeedPolicy
            ? Sanma.SeedPolicy.deriveSeed(roundSeed, "cpu")
            : (roundSeed ? `${roundSeed}:cpu` : ""));
          this.assistRandom = Sanma.createRandom(Sanma.SeedPolicy
            ? Sanma.SeedPolicy.deriveSeed(roundSeed, "assist")
            : (roundSeed ? `${roundSeed}:assist` : ""));
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
          this.initialDealerDiscardPending = false;
          this.openingYakuState = {
            dealerFirstDiscardPending: true,
            chihoEligible: true,
            firstDrawnPlayers: Object.create(null),
          };
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
          const dealer = this.players[this.round.dealerIndex];
          const openingAssist = AssistManager.evaluateOpening({
            state: this,
            ruleConfig: this.ruleConfig,
            player: dealer,
            random: this.assistRandom,
          });
          this.recordAssist(openingAssist);
          this.lastDrawContext = {
            playerIndex: dealer.id,
            isRinshan: false,
            isInitialDealerDraw: true,
            isTenho: !openingAssist.applied,
            isChiho: false,
          };
          this.initialDealerDiscardPending = !dealer.isHuman;
          this.phase = dealer.isHuman ? "human-discard" : "cpu-running";
          GameStateMachine.syncLegacy(this.stateMachine, this.phase, this.matchManager.state, "配牌完了");
          this.addLog(dealer.isHuman
            ? `配牌しました。${dealer.name}が親です。切る牌をクリック/タップしてください。`
            : `配牌しました。${dealer.name}が親です。CPU親が最初の打牌を行います。`);
          this.emitChange();
          if (!dealer.isHuman) this.runCpuUntilHumanTurn();
        },

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
        },

        dealInitialHands() {
          for (let draw = 0; draw < 13; draw += 1) {
            for (const player of this.players) {
              player.receiveTile(this.wall.draw());
            }
          }
          const dealer = this.players[this.round.dealerIndex];
          dealer.receiveTile(this.wall.draw());
          this.players.forEach((player) => {
            if (player.id !== dealer.id) player.lastDraw = null;
          });
        },

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
        },

        withDrawTenpai(result) {
          const safeResult = Object.assign({}, result || {});
          if (safeResult.type !== "exhaustive_draw") return safeResult;
          const tenpaiStatus = Array.isArray(safeResult.tenpaiStatus)
            ? safeResult.tenpaiStatus.slice()
            : buildDrawTenpaiStatus(this.players, this.ruleConfig);
          const tenpaiPlayers = Array.isArray(safeResult.tenpaiPlayers)
            ? safeResult.tenpaiPlayers.slice()
            : tenpaiStatus.filter((status) => status.isTenpai).map((status) => status.playerIndex);
          const notenPlayers = Array.isArray(safeResult.notenPlayers)
            ? safeResult.notenPlayers.slice()
            : tenpaiStatus.filter((status) => !status.isTenpai).map((status) => status.playerIndex);
          safeResult.tenpaiStatus = tenpaiStatus;
          safeResult.tenpaiPlayers = tenpaiPlayers;
          safeResult.notenPlayers = notenPlayers;
          safeResult.dealerTenpai = tenpaiPlayers.includes(this.round.dealerIndex);

          if (!safeResult.settlement && Settlement && typeof Settlement.applyExhaustiveDrawSettlement === "function") {
            safeResult.settlement = Settlement.applyExhaustiveDrawSettlement({
              players: this.players,
              tenpaiPlayers,
              ruleConfig: this.ruleConfig,
            });
            safeResult.drawSettlement = safeResult.settlement;
            if (typeof this.recordGameEvent === "function") {
              this.recordGameEvent("score_settlement", {
                type: "exhaustive_draw",
                tenpaiPlayers,
                notenPlayers,
                changes: safeResult.settlement.changes || [],
                reason: safeResult.settlement.reason || "",
              });
            }
            const nonZeroChanges = (safeResult.settlement.changes || []).filter((change) => Number(change.delta) !== 0);
            if (nonZeroChanges.length > 0 && typeof this.addLog === "function") {
              this.addLog(`流局精算: ${nonZeroChanges.map(formatDelta).join(" / ")}`);
            }
          } else if (safeResult.settlement && !safeResult.drawSettlement) {
            safeResult.drawSettlement = safeResult.settlement;
          }
          return safeResult;
        },

        getRoundLabel() {
          return Sanma.RoundManager.roundLabel(this.round.roundWind, this.round.handNumber);
        }
  };
})(window);
