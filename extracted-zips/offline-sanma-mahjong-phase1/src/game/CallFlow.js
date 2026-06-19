(function attachCallFlow(global) {
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

  Sanma.CallFlow = {
        claimHumanCall(actionId, optionIndex) {
          if (actionId === "ron") {
            return this.claimHumanRon();
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
          if (actionId !== "ron" && this.callWindow.pendingCpuRonCandidate) {
            const pending = this.callWindow.pendingCpuRonCandidate;
            this.callWindow = null;
            return this.resolveRonWin(pending.playerIndex, pending.analysis, { isCpuRon: true });
          }
          if (actionId !== "ron" && this.wall.remainingCount() <= 0) {
            const fromPlayerIndex = this.callWindow.fromPlayerIndex;
            this.callWindow = null;
            this.continueAfterDiscard(fromPlayerIndex);
            return false;
          }
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
        },

        skipHumanCall() {
          const validation = this.validateAction("鳴きスキップ", ["waitingForCall"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-call" || !this.callWindow) return;
          const discarderIndex = this.callWindow.fromPlayerIndex;
          const pendingCpuRonCandidate = this.callWindow.pendingCpuRonCandidate || null;
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
            if (pendingCpuRonCandidate) {
              return this.resolveRonWin(pendingCpuRonCandidate.playerIndex, pendingCpuRonCandidate.analysis, {
                isChankan: true,
                kanType,
                isAnkanKokushiException: pendingCpuRonCandidate.isAnkanKokushiException,
              });
            }
            const result = this.finalizePendingKan();
            if (result && result.applied && declarerIndex !== this.humanPlayer.id && this.phase === "cpu-running") {
              this.emitChange();
              this.runCpuUntilHumanTurn();
            }
            if (!result || !result.applied) {
              this.pendingWinContext = null;
              this.turnIndex = declarerIndex;
              this.phase = declarerIndex === this.humanPlayer.id ? "human-discard" : "cpu-running";
              this.addLog("槍槓復旧時に保留中のカン情報がなかったため、宣言者の手番へ戻しました。");
              this.emitChange();
              if (this.phase === "cpu-running") this.runCpuUntilHumanTurn();
            }
            return true;
          }
          CallWindow.close(this.callWindow, "スキップ");
          if (pendingCpuRonCandidate) {
            this.callWindow = null;
            return this.resolveRonWin(pendingCpuRonCandidate.playerIndex, pendingCpuRonCandidate.analysis, { isCpuRon: true });
          }
          this.addLog("鳴きをスキップしました。");
          this.recordGameEvent("call", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, action: "skip" });
          this.continueAfterDiscard(discarderIndex);
        }
  };
})(window);
