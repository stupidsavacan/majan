(function attachRankingManager(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function rank(players, returnPoints) {
    const base = Number(returnPoints) || 40000;
    return (players || [])
      .map((player, playerIndex) => ({
        playerIndex,
        playerId: player.id,
        name: player.name,
        points: Number(player.points) || 0,
      }))
      .sort((left, right) => right.points - left.points || left.playerIndex - right.playerIndex)
      .map((entry, index) => Object.assign(entry, {
        rank: index + 1,
        pointDelta: entry.points - base,
        label: `${index + 1}位`,
      }));
  }

  Sanma.RankingManager = { rank };
})(window);
