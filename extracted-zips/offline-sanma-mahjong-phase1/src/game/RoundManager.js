(function attachRoundManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const winds = ["east", "south", "west"];
  const windLabels = { east: "東", south: "南", west: "西" };

  function roundLabel(roundWind, roundNumber) {
    return `${windLabels[roundWind] || "東"}${Number(roundNumber) || 1}局`;
  }

  function seatWindFor(playerIndex, dealerIndex) {
    const offset = ((Number(playerIndex) - Number(dealerIndex)) % 3 + 3) % 3;
    return winds[offset];
  }

  function createInitialRound() {
    return {
      roundWind: "east",
      roundNumber: 1,
      dealerIndex: 0,
    };
  }

  function nextRound(round, dealerContinues) {
    const current = round || createInitialRound();
    if (dealerContinues) {
      return {
        roundWind: current.roundWind || "east",
        roundNumber: Number(current.roundNumber) || 1,
        dealerIndex: Number(current.dealerIndex) || 0,
      };
    }

    let roundWind = current.roundWind || "east";
    let roundNumber = (Number(current.roundNumber) || 1) + 1;
    if (roundNumber > 3) {
      roundNumber = 1;
      roundWind = roundWind === "east" ? "south" : "west";
    }
    return {
      roundWind,
      roundNumber,
      dealerIndex: ((Number(current.dealerIndex) || 0) + 1) % 3,
    };
  }

  Sanma.RoundManager = {
    winds,
    windLabels,
    roundLabel,
    seatWindFor,
    createInitialRound,
    nextRound,
  };
})(window);
