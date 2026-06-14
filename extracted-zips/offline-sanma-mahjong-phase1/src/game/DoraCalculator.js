(function attachDoraCalculator(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function nextDoraBaseId(indicator) {
    if (!indicator) return null;
    const suit = indicator.suit;
    const rank = Number(indicator.rank);
    if (suit === "m") {
      if (rank === 1) return "9m";
      if (rank === 9) return "1m";
      return null;
    }
    if (suit === "p" || suit === "s") {
      return `${rank === 9 ? 1 : rank + 1}${suit}`;
    }
    if (suit === "z") {
      if (rank >= 1 && rank <= 4) return `z${rank === 4 ? 1 : rank + 1}`;
      if (rank >= 5 && rank <= 7) return `z${rank === 7 ? 5 : rank + 1}`;
    }
    return null;
  }

  function countMatchingTiles(tiles, baseId) {
    return (tiles || []).filter((tile) => tile && tile.baseId === baseId).length;
  }

  function calculate(input) {
    const options = input || {};
    const tiles = Array.isArray(options.tiles) ? options.tiles : [];
    const ruleConfig = options.ruleConfig || {};
    const context = options.context || {};
    const indicators = Array.isArray(context.doraIndicators) ? context.doraIndicators : [];
    let normalDora = 0;

    const indicatorDetails = indicators.map((indicator) => {
      const doraBaseId = nextDoraBaseId(indicator);
      const matchingTiles = countMatchingTiles(tiles, doraBaseId);
      const multiplier = ruleConfig.highScoreMode && indicator && indicator.isRed ? 2 : 1;
      const han = matchingTiles * multiplier;
      normalDora += han;
      return {
        indicatorBaseId: indicator && indicator.baseId ? indicator.baseId : null,
        doraBaseId,
        matchingTiles,
        multiplier,
        han,
      };
    });

    const redDora = ruleConfig.redDoraMode === "none"
      ? 0
      : tiles.filter((tile) => tile && tile.isRed).length;
    const kitaDora = ruleConfig.northMode === "kita-dora"
      ? Math.max(0, Number(context.kitaDoraCount) || 0)
      : 0;
    const items = [];
    if (normalDora > 0) items.push({ id: "dora", name: "ドラ", han: normalDora, isDora: true });
    if (redDora > 0) items.push({ id: "red-dora", name: "赤ドラ", han: redDora, isDora: true });
    if (kitaDora > 0) items.push({ id: "kita-dora", name: "抜き北ドラ", han: kitaDora, isDora: true });

    return {
      totalHan: normalDora + redDora + kitaDora,
      normalDora,
      redDora,
      kitaDora,
      items,
      indicatorDetails,
    };
  }

  Sanma.DoraCalculator = { nextDoraBaseId, calculate };
})(window);
