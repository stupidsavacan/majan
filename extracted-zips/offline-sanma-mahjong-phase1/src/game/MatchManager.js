(function attachMatchManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  let matchSequence = 0;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function compactResult(result) {
    const input = result || {};
    return {
      type: input.type || (Number.isInteger(input.winnerIndex) ? "win" : "exhaustive_draw"),
      winnerIndex: Number.isInteger(input.winnerIndex) ? input.winnerIndex : null,
      winType: input.winType || null,
      dealerTenpai: Boolean(input.dealerTenpai),
      reason: input.reason || "",
    };
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
        phase: 10,
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
      const dealerWon = Number.isInteger(compact.winnerIndex)
        && compact.winnerIndex === this.state.dealerIndex;
      const dealerDrawContinues = compact.type === "exhaustive_draw"
        && compact.dealerTenpai
        && this.ruleConfig.renchanPolicy.dealerTenpaiDraw;
      const dealerContinues = dealerWon
        ? this.ruleConfig.renchanPolicy.dealerWin
        : dealerDrawContinues;

      this.pendingRound = Sanma.RoundManager.nextRound(this.state, dealerContinues);
      this.pendingRound.honba = Sanma.HonbaManager.nextHonba(this.state.honba, dealerContinues);
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
