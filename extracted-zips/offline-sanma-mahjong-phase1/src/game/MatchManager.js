(function attachMatchManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  let matchSequence = 0;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function compactDrawSettlement(input) {
    if (!input || typeof input !== "object") return null;
    return {
      applied: Boolean(input.applied),
      type: input.type || "exhaustive_draw",
      mode: input.mode || "noten-bappu-3000",
      tenpaiPlayers: Array.isArray(input.tenpaiPlayers) ? input.tenpaiPlayers.slice() : [],
      notenPlayers: Array.isArray(input.notenPlayers) ? input.notenPlayers.slice() : [],
      changes: (input.changes || []).map((change) => ({
        playerIndex: change.playerIndex,
        delta: change.delta,
        after: change.after,
      })),
      reason: input.reason || "",
    };
  }

  function compactResult(result) {
    const input = result || {};
    const winnerIndexes = Array.isArray(input.winnerIndexes)
      ? input.winnerIndexes.filter(Number.isInteger)
      : (Number.isInteger(input.winnerIndex) ? [input.winnerIndex] : []);
    return {
      type: input.type || (winnerIndexes.length > 0 ? "win" : "exhaustive_draw"),
      winnerIndex: winnerIndexes.length > 0 ? winnerIndexes[0] : null,
      winnerIndexes,
      isMultiRon: Boolean(input.isMultiRon || winnerIndexes.length > 1),
      winType: input.winType || null,
      dealerTenpai: Boolean(input.dealerTenpai),
      tenpaiPlayers: Array.isArray(input.tenpaiPlayers) ? input.tenpaiPlayers.slice() : [],
      notenPlayers: Array.isArray(input.notenPlayers) ? input.notenPlayers.slice() : [],
      drawSettlement: compactDrawSettlement(input.drawSettlement || input.settlement),
      reason: input.reason || "",
    };
  }

  function doubleRonHonbaIncrement(ruleConfig, compact) {
    if (!compact.isMultiRon || !ruleConfig || !ruleConfig.doubleRonPolicy) return 1;
    const value = Number(ruleConfig.doubleRonPolicy.honbaIncrement);
    return Number.isInteger(value) && value >= 1 ? value : 1;
  }

  class MatchManager {
    constructor(input) {
      const options = input || {};
      this.ruleConfig = Sanma.RuleConfig.createRuleConfig(options.ruleConfig || {});
      matchSequence += 1;
      const initial = Sanma.RoundManager.createInitialRound();
      const startingPoints = Number(this.ruleConfig.startingPoints) || Number(this.ruleConfig.initialPoints) || 35000;
      this.pendingRound = null;
      this.state = {
        matchId: `match-${Date.now().toString(36)}-${matchSequence.toString(36)}`,
        phase: 13,
        roundWind: initial.roundWind,
        roundNumber: initial.roundNumber,
        roundLabel: Sanma.RoundManager.roundLabel(initial.roundWind, initial.roundNumber),
        dealerIndex: initial.dealerIndex,
        honba: 0,
        riichiSticks: 0,
        players: [
          { id: 0, name: "あなた", points: startingPoints, seatWind: "east", isHuman: true },
          { id: 1, name: "CPU 1", points: startingPoints, seatWind: "south", isHuman: false },
          { id: 2, name: "CPU 2", points: startingPoints, seatWind: "west", isHuman: false },
        ],
        roundEnded: false,
        matchEnded: false,
        endReason: "",
        lastResult: null,
        rankings: [],
      };
    }

    syncRound(round) {
      if (!round || this.state.roundEnded) return;
      this.state.honba = Number(round.honba) || 0;
      this.state.riichiSticks = Number(round.riichiSticks) || 0;
    }

    syncPlayers(players) {
      (players || []).forEach((player, index) => {
        if (!this.state.players[index]) return;
        this.state.players[index].name = player.name;
        this.state.players[index].points = Number(player.points) || 0;
        this.state.players[index].seatWind = player.seatWind;
      });
    }

    getRoundSnapshot() {
      return {
        roundWind: this.state.roundWind,
        handNumber: this.state.roundNumber,
        roundNumber: this.state.roundNumber,
        honba: this.state.honba,
        riichiSticks: this.state.riichiSticks,
        dealerIndex: this.state.dealerIndex,
        label: this.state.roundLabel,
      };
    }

    completeRound(result, players) {
      if (this.state.roundEnded) return this.getState();
      this.syncPlayers(players);
      const compact = compactResult(result);
      const dealerWon = compact.winnerIndexes.includes(this.state.dealerIndex);
      const dealerDrawContinues = compact.type === "exhaustive_draw"
        && compact.dealerTenpai
        && this.ruleConfig.renchanPolicy.dealerTenpaiDraw;
      const dealerContinues = dealerWon
        ? this.ruleConfig.renchanPolicy.dealerWin
        : dealerDrawContinues;

      this.pendingRound = Sanma.RoundManager.nextRound(this.state, dealerContinues);
      this.pendingRound.honba = dealerContinues
        ? this.state.honba + doubleRonHonbaIncrement(this.ruleConfig, compact)
        : 0;
      this.pendingRound.riichiSticks = Sanma.HonbaManager.nextRiichiSticks(this.state.riichiSticks, compact);
      this.state.riichiSticks = this.pendingRound.riichiSticks;
      this.state.roundEnded = true;
      this.state.lastResult = Object.assign(compact, { dealerContinues });

      const end = Sanma.EndConditionManager.evaluate({
        ruleConfig: this.ruleConfig,
        round: this.state,
        players: this.state.players,
        dealerContinues,
      });
      this.state.matchEnded = end.matchEnded;
      this.state.endReason = end.reason;
      if (end.matchEnded) {
        this.state.rankings = Sanma.RankingManager.rank(this.state.players, this.ruleConfig.returnPoints);
      }
      return this.getState();
    }

    startNextRound() {
      if (!this.state.roundEnded || this.state.matchEnded || !this.pendingRound) return false;
      this.state.roundWind = this.pendingRound.roundWind;
      this.state.roundNumber = this.pendingRound.roundNumber;
      this.state.roundLabel = Sanma.RoundManager.roundLabel(this.state.roundWind, this.state.roundNumber);
      this.state.dealerIndex = this.pendingRound.dealerIndex;
      this.state.honba = this.pendingRound.honba;
      this.state.riichiSticks = this.pendingRound.riichiSticks;
      this.state.roundEnded = false;
      this.state.lastResult = null;
      this.pendingRound = null;
      this.state.players.forEach((player, index) => {
        player.seatWind = Sanma.RoundManager.seatWindFor(index, this.state.dealerIndex);
      });
      return true;
    }

    getState() {
      return clone(this.state);
    }
  }

  Sanma.MatchManager = MatchManager;
})(window);
