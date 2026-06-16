(function attachDrawContext(global) {
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

  Sanma.DrawContext = {
        createNormalDrawContext(player) {
          const opening = this.openingYakuState;
          const isFirstDraw = opening && !opening.firstDrawnPlayers[player.id];
          const isChiho = Boolean(
            isFirstDraw
              && opening.chihoEligible
              && player.id !== this.round.dealerIndex
              && player.discards.length === 0
          );
          if (opening) opening.firstDrawnPlayers[player.id] = true;
          return {
            playerIndex: player.id,
            isRinshan: false,
            isInitialDealerDraw: false,
            isTenho: false,
            isChiho,
          };
        },

        createLastDiscard(discarderIndex, discarded) {
          const context = this.lastDrawContext || {};
          const fromFinalNormalDraw = Boolean(
            this.wall
              && typeof this.wall.remainingCount === "function"
              && this.wall.remainingCount() <= 0
              && context.playerIndex === discarderIndex
              && context.isRinshan !== true
              && context.isKitaReplacement !== true
              && this.phase !== "caller-discard"
          );
          return {
            playerIndex: discarderIndex,
            tile: discarded,
            isFinalDrawDiscard: fromFinalNormalDraw,
          };
        },

        createHumanWinContext(winType) {
          return ActionResolver.createWinContext(
            this,
            this.humanPlayer.id,
            winType,
            this.lastDiscard ? this.lastDiscard.playerIndex : 1,
            winType === "ron" && this.lastDiscard ? this.lastDiscard.tile : null
          );
        }
  };
})(window);
