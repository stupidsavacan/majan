(function attachHonbaManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function nextHonba(currentHonba, dealerContinues) {
    return dealerContinues ? (Number(currentHonba) || 0) + 1 : 0;
  }

  function nextRiichiSticks(currentSticks, result) {
    return result && Number.isInteger(result.winnerIndex)
      ? 0
      : Number(currentSticks) || 0;
  }

  Sanma.HonbaManager = { nextHonba, nextRiichiSticks };
})(window);
