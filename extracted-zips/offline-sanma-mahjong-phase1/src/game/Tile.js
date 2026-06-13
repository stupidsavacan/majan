(function attachTile(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
  const suitLabels = { m: "萬", p: "筒", s: "索" };
  const numberLabels = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const honorLabels = { 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" };
  const honorShortLabels = { 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" };

  function baseId(suit, rank) {
    return suit === "z" ? `z${rank}` : `${rank}${suit}`;
  }

  function createTile(suit, rank, copyIndex, isRed) {
    const redSuffix = isRed ? "r" : "";
    return {
      suit,
      rank,
      id: `${baseId(suit, rank)}${redSuffix}`,
      baseId: baseId(suit, rank),
      instanceId: `${baseId(suit, rank)}${redSuffix}-${copyIndex}`,
      isRed: Boolean(isRed),
    };
  }

  function isSameBase(a, b) {
    return Boolean(a && b && a.suit === b.suit && a.rank === b.rank);
  }

  function compareTiles(a, b) {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    if (a.isRed !== b.isRed) {
      return a.isRed ? -1 : 1;
    }
    return a.instanceId.localeCompare(b.instanceId);
  }

  function cloneAndSortTiles(tiles) {
    return tiles.slice().sort(compareTiles);
  }

  function getTileLabel(tile) {
    if (!tile) return "";
    if (tile.suit === "z") {
      return honorLabels[tile.rank] || "?";
    }
    return `${numberLabels[tile.rank]}${suitLabels[tile.suit]}`;
  }

  function getTileShortLabel(tile) {
    if (!tile) return "";
    if (tile.suit === "z") {
      return honorShortLabels[tile.rank] || "?";
    }
    return `${tile.rank}${tile.suit}`;
  }

  function getTileAriaLabel(tile) {
    const label = getTileLabel(tile);
    return tile.isRed ? `赤${label}` : label;
  }

  function countByBaseId(tiles) {
    return tiles.reduce((acc, tile) => {
      acc[tile.baseId] = (acc[tile.baseId] || 0) + 1;
      return acc;
    }, {});
  }

  Sanma.TileUtil = {
    baseId,
    createTile,
    isSameBase,
    compareTiles,
    cloneAndSortTiles,
    getTileLabel,
    getTileShortLabel,
    getTileAriaLabel,
    countByBaseId,
    suitLabels,
    numberLabels,
    honorLabels,
  };
})(window);
