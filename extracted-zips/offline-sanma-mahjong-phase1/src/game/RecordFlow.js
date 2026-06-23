(function attachRecordFlow(global) {
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

  Sanma.RecordFlow = {
        recordAssist(event) {
          if (!event) return;
          this.assistEvents.unshift(event);
          this.assistEvents = this.assistEvents.slice(0, 20);
          if (event.applied) {
            this.markOpeningInterrupted("アシスト適用");
            if (this.lastDrawContext && this.lastDrawContext.playerIndex === event.playerIndex) {
              this.lastDrawContext.isTenho = false;
              this.lastDrawContext.isChiho = false;
            }
            this.recordGameEvent("assist", {
              phase: event.phase,
              playerIndex: event.playerIndex,
              beforeShanten: event.beforeShanten,
              afterShanten: event.afterShanten,
              outgoing: this.tileSnapshot(event.outgoing),
              incoming: this.tileSnapshot(event.incoming),
            });
          }
        },

        playerTileEvent(player, tile) {
          return {
            playerIndex: player.id,
            playerName: player.name,
            tile: this.tileSnapshot(tile),
            tileInstanceId: tile ? tile.instanceId : null,
          };
        },

        tileSnapshot(tile) {
          if (!tile) return null;
          return {
            instanceId: tile.instanceId,
            baseId: tile.baseId,
            suit: tile.suit,
            rank: tile.rank,
            label: TileUtil.getTileShortLabel(tile),
            isRed: Boolean(tile.isRed),
          };
        },

        recordGameEvent(type, data) {
          if (!this.gameRecord) return null;
          if (type === "score_settlement") {
            DebugEventLog.add(this.debugEventLog, "settlementResult", data || {});
          }
          return GameRecord.addEvent(this.gameRecord, type, data);
        }
  };
})(window);
