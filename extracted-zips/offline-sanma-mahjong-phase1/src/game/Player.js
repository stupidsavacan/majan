(function attachPlayer(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;

  class Player {
    constructor({ id, name, seatWind, isHuman, points }) {
      this.id = id;
      this.name = name;
      this.seatWind = seatWind;
      this.isHuman = Boolean(isHuman);
      this.points = points;
      this.hand = [];
      this.discards = [];
      this.melds = [];
      this.kitaTiles = [];
      this.hasRiichi = false;
      this.ippatsuActive = false;
      this.riichi = {
        declared: false,
        pending: false,
        turnIndex: null,
        ippatsu: false,
        discardLocked: false,
        riichiStickPaid: false,
      };
      this.sameTurnFuriten = false;
      this.riichiMissedWin = false;
      this.lastDraw = null;
    }

    sortHand() {
      this.hand.sort(TileUtil.compareTiles);
    }

    receiveTile(tile) {
      if (!tile) return;
      this.hand.push(tile);
      this.lastDraw = tile;
      this.sameTurnFuriten = false;
      this.sortHand();
    }

    discardTileByInstanceId(instanceId) {
      const index = this.hand.findIndex((tile) => tile.instanceId === instanceId);
      if (index < 0) return null;
      const [tile] = this.hand.splice(index, 1);
      this.discards.push(tile);
      this.lastDraw = null;
      return tile;
    }

    discardTileAt(index) {
      if (index < 0 || index >= this.hand.length) return null;
      const [tile] = this.hand.splice(index, 1);
      this.discards.push(tile);
      this.lastDraw = null;
      return tile;
    }
  }

  Sanma.Player = Player;
})(window);
