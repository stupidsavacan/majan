(function attachEndConditionManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function matchLength(config) {
    const value = config && (config.matchLength || config.gameLength);
    return ["single", "tonpuu", "hanchan"].includes(value) ? value : "tonpuu";
  }

  function evaluate(input) {
    const options = input || {};
    const config = options.ruleConfig || {};
    const round = options.round || {};
    const players = options.players || [];
    const length = matchLength(config);

    if (config.allowTobi !== false && players.some((player) => Number(player.points) < 0)) {
      return { matchEnded: true, reason: "トビ終了" };
    }
    if (length === "single") {
      return { matchEnded: true, reason: "一局戦終了" };
    }

    const finalWind = length === "hanchan" && config.allowSouthRound !== false ? "south" : "east";
    const finalRoundFinished = round.roundWind === finalWind
      && Number(round.roundNumber) === 3
      && options.dealerContinues !== true;
    return finalRoundFinished
      ? { matchEnded: true, reason: "オーラス終了" }
      : { matchEnded: false, reason: "" };
  }

  Sanma.EndConditionManager = { evaluate, matchLength };
})(window);
