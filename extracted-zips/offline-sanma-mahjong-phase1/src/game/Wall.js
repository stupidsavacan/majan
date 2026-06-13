(function attachWall(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;

  function hashSeed(seedText) {
    let hash = 1779033703 ^ String(seedText || "").length;
    for (let i = 0; i < String(seedText || "").length; i += 1) {
      hash = Math.imul(hash ^ String(seedText)[i].charCodeAt(0), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }
    return function nextHash() {
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return (hash ^= hash >>> 16) >>> 0;
    };
  }

  function createRandom(seedText) {
    if (!seedText) return Math.random;
    const seed = hashSeed(seedText);
    let a = seed();
    return function random() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Wall {
    constructor(ruleConfig, options) {
      this.ruleConfig = ruleConfig;
      this.random = createRandom(options && options.seed);
      this.seed = options && options.seed ? String(options.seed) : "";
      this.tiles = this.createSanmaTiles(ruleConfig);
      this.shuffle();
      this.deadWall = [];
      this.doraIndicators = [];
      this.initializeDeadWallAndDora();
    }

    createSanmaTiles(ruleConfig) {
      const tiles = [];
      const addCopies = (suit, rank, redCopies) => {
        for (let copy = 0; copy < 4; copy += 1) {
          tiles.push(TileUtil.createTile(suit, rank, copy, copy < redCopies));
        }
      };

      addCopies("m", 1, 0);
      addCopies("m", 9, 0);

      for (let rank = 1; rank <= 9; rank += 1) {
        let redPin = 0;
        let redSou = 0;
        if (rank === 5) {
          if (ruleConfig.highScoreMode) {
            redPin = 4;
            redSou = 4;
          } else if (ruleConfig.redDoraMode !== "none") {
            redPin = 1;
            redSou = 1;
          }
        }
        addCopies("p", rank, redPin);
        addCopies("s", rank, redSou);
      }

      for (let rank = 1; rank <= 7; rank += 1) {
        if (rank === 4 && ruleConfig.northMode === "disabled") continue;
        addCopies("z", rank, 0);
      }

      return tiles;
    }

    shuffle() {
      for (let i = this.tiles.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
      }
    }

    initializeDeadWallAndDora() {
      // Phase 1 keeps a simple dead wall so later phases can add rinshan, kan dora, ura dora.
      const deadWallSize = Math.min(14, this.tiles.length);
      this.deadWall = this.tiles.splice(-deadWallSize, deadWallSize);
      if (this.deadWall.length > 0) {
        this.doraIndicators = [this.deadWall[0]];
      }
    }

    draw() {
      return this.tiles.shift() || null;
    }

    remainingCount() {
      return this.tiles.length;
    }

    totalKnownTileCount(players) {
      const playerTiles = players.reduce((sum, player) => {
        const meldTileCount = (player.melds || []).reduce((meldSum, meld) => meldSum + (Array.isArray(meld.tiles) ? meld.tiles.length : 0), 0);
        return sum + player.hand.length + player.discards.length + meldTileCount + player.kitaTiles.length;
      }, 0);
      return playerTiles + this.tiles.length + this.deadWall.length;
    }
  }

  Sanma.Wall = Wall;
  Sanma.createRandom = createRandom;
})(window);
