(function attachGameEngine(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const Player = Sanma.Player;
  const Wall = Sanma.Wall;
  const RuleConfig = Sanma.RuleConfig;
  const TileUtil = Sanma.TileUtil;
  const HandAnalysis = Sanma.HandAnalysis;
  const YakuAnalysis = Sanma.YakuAnalysis;

  const windLabels = { east: "東", south: "南", west: "西" };

  class GameEngine {
    constructor({ ruleConfig, seed, onChange }) {
      this.ruleConfig = RuleConfig.createRuleConfig(ruleConfig);
      this.seed = seed || "";
      this.onChange = typeof onChange === "function" ? onChange : function noop() {};
      this.round = { roundWind: "east", handNumber: 1, honba: 0, riichiSticks: 0, dealerIndex: 0 };
      this.players = [];
      this.wall = null;
      this.turnIndex = 0;
      this.phase = "idle";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.startRound();
    }

    startRound() {
      this.wall = new Wall(this.ruleConfig, { seed: this.seed });
      this.players = [
        new Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: this.ruleConfig.initialPoints }),
        new Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: this.ruleConfig.initialPoints }),
        new Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: this.ruleConfig.initialPoints }),
      ];
      this.turnIndex = this.round.dealerIndex;
      this.phase = "dealing";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.dealInitialHands();
      this.phase = "human-discard";
      this.addLog("配牌しました。あなたは親です。切る牌をクリック/タップしてください。");
      this.emitChange();
    }

    dealInitialHands() {
      for (let draw = 0; draw < 13; draw += 1) for (const player of this.players) player.receiveTile(this.wall.draw());
      this.players[this.round.dealerIndex].receiveTile(this.wall.draw());
    }

    get humanPlayer() { return this.players.find((player) => player.isHuman); }
    getCurrentPlayer() { return this.players[this.turnIndex]; }

    discardHumanTile(instanceId) {
      if (this.phase !== "human-discard" || this.turnIndex !== 0) { this.addLog("現在はあなたの打牌番ではありません。"); this.emitChange(); return; }
      const discarded = this.humanPlayer.discardTileByInstanceId(instanceId);
      if (!discarded) { this.addLog("その牌は手牌にありません。"); this.emitChange(); return; }
      this.addLog(`あなたが ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
      const tenpai = HandAnalysis.analyzeTenpai(this.humanPlayer.hand, this.ruleConfig);
      if (tenpai.isTenpai) this.addLog(`聴牌: 待ち牌 ${tenpai.waits.map((wait) => wait.label).join("、")}`);
      this.advanceAfterDiscard();
    }

    advanceAfterDiscard() {
      if (this.wall.remainingCount() <= 0) { this.phase = "round-ended"; this.addLog("山がなくなりました。Phase 1では流局表示のみです。"); this.emitChange(); return; }
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      this.phase = "cpu-running";
      this.emitChange();
      this.runCpuUntilHumanTurn();
    }

    runCpuUntilHumanTurn() {
      while (this.turnIndex !== 0 && this.wall.remainingCount() > 0) {
        const player = this.getCurrentPlayer();
        const drawn = this.wall.draw();
        player.receiveTile(drawn);
        this.addLog(`${player.name} がツモりました。`);
        const discarded = player.discardTileAt(this.chooseCpuDiscardIndex(player));
        this.addLog(`${player.name} が ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
      }
      if (this.wall.remainingCount() <= 0) { this.phase = "round-ended"; this.addLog("山がなくなりました。Phase 1では流局表示のみです。"); this.emitChange(); return; }
      if (this.turnIndex === 0) {
        const drawn = this.wall.draw();
        this.humanPlayer.receiveTile(drawn);
        this.phase = "human-discard";
        this.addLog(`あなたのツモ: ${TileUtil.getTileAriaLabel(drawn)}。切る牌を選んでください。`);
        this.emitChange();
      }
    }

    chooseCpuDiscardIndex(player) {
      const index = Math.floor(Math.random() * player.hand.length);
      const tile = player.hand[index];
      this.cpuThinkingLog.unshift({ player: player.name, phase: "Phase 1 random discard", choice: TileUtil.getTileAriaLabel(tile), hand: player.hand.map(TileUtil.getTileShortLabel).join(" ") });
      this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 20);
      return index;
    }

    drawForHumanManually() {
      if (this.phase !== "human-draw") return;
      const drawn = this.wall.draw();
      this.humanPlayer.receiveTile(drawn);
      this.phase = "human-discard";
      this.addLog(`あなたのツモ: ${TileUtil.getTileAriaLabel(drawn)}。`);
      this.emitChange();
    }

    getRoundLabel() { return `${windLabels[this.round.roundWind]}${this.round.handNumber}局`; }

    getState() {
      const humanHand = this.humanPlayer ? this.humanPlayer.hand : [];
      const humanAgariAnalysis = HandAnalysis.analyzeAgari(humanHand, this.ruleConfig);
      const humanTenpaiAnalysis = HandAnalysis.analyzeTenpai(humanHand, this.ruleConfig);
      const humanYakuAnalysis = YakuAnalysis.analyzeYaku({
        tiles: humanHand,
        ruleConfig: this.ruleConfig,
        agariResult: humanAgariAnalysis,
        context: {
          winType: "debug",
          isMenzen: this.humanPlayer.melds.length === 0,
          seatWind: this.humanPlayer.seatWind,
          roundWind: this.round.roundWind,
          isRiichi: this.humanPlayer.hasRiichi,
          doraIndicators: this.wall.doraIndicators,
          kitaDoraCount: this.humanPlayer.kitaTiles.length,
        },
      });
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
        humanAgariAnalysis,
        humanTenpaiAnalysis,
        humanYakuAnalysis,
        seed: this.seed,
      };
    }

    addLog(message) {
      const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      this.logs.unshift(`[${time}] ${message}`);
      this.logs = this.logs.slice(0, 80);
    }

    emitChange() { this.onChange(this.getState()); }
  }

  Sanma.GameEngine = GameEngine;
})(window);
