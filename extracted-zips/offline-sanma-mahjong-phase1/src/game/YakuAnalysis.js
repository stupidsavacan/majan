(function attachYakuAnalysis(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const windRanks = Object.freeze({ east: 1, south: 2, west: 3, north: 4 });
  const honorNames = Object.freeze({ 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" });

  function normalizeContext(context) {
    return Object.assign({
      winType: "debug",
      isMenzen: true,
      seatWind: "east",
      roundWind: "east",
      waitType: null,
      isRiichi: false,
      isIppatsu: false,
      isRinshan: false,
      isChankan: false,
      isHaitei: false,
      isHoutei: false,
      isTenho: false,
      isChiho: false,
      doraIndicators: [],
      uraDoraIndicators: [],
      kitaDoraCount: 0,
    }, context || {});
  }

  function isSimple(tile) {
    return (tile.suit === "p" || tile.suit === "s") && tile.rank >= 2 && tile.rank <= 8;
  }

  function isTerminalOrHonor(tile) {
    return tile.suit === "z" || tile.rank === 1 || tile.rank === 9;
  }

  function firstTileType(group) {
    return group && Array.isArray(group.tileTypes) ? group.tileTypes[0] || "" : "";
  }

  function honorRank(tileType) {
    const match = /^z([1-7])$/.exec(tileType);
    return match ? Number(match[1]) : 0;
  }

  function isValuePair(pair, context) {
    const rank = honorRank(firstTileType(pair));
    return rank >= 5 || rank === windRanks[context.seatWind] || rank === windRanks[context.roundWind];
  }

  function analyzeYaku(input) {
    const options = input || {};
    const tiles = Array.isArray(options.tiles) ? options.tiles : [];
    const ruleConfig = options.ruleConfig || {};
    const agariResult = options.agariResult || {};
    const context = normalizeContext(options.context);
    const yaku = [];
    const yakuman = [];

    function addYaku(id, name, hanClosed, hanOpen, reason) {
      const han = context.isMenzen ? hanClosed : hanOpen;
      if (!han) return;
      yaku.push({ id, name, hanClosed, hanOpen, han, isYakuman: false, reason });
    }

    function addYakuman(id, name, reason, multiplier) {
      yakuman.push({ id, name, yakuman: Number(multiplier) || 1, isYakuman: true, reason });
    }

    if (!agariResult.isAgari || !agariResult.bestPattern) {
      return {
        hasYaku: false,
        yaku,
        yakuman,
        dora: [],
        doraDetails: null,
        totalHan: 0,
        isYakuman: false,
        reason: "和了形ではありません。",
        context,
      };
    }

    const pattern = agariResult.bestPattern;
    if (context.isTenho) addYakuman("tenho", "天和", "親の配牌時のツモ和了です。");
    if (context.isChiho) addYakuman("chiho", "地和", "子の第一ツモでの和了です。");
    if (context.isRiichi && context.isMenzen) addYaku("riichi", "リーチ", 1, 0, "門前でリーチを宣言しています。");
    if (context.isRiichi && context.isIppatsu && context.isMenzen) addYaku("ippatsu", "一発", 1, 0, "リーチ後の一発有効中に和了しています。");
    if (context.isHaitei) addYaku("haitei", "海底摸月", 1, 1, "海底牌で自摸和了しています。");
    if (context.isHoutei) addYaku("houtei", "河底撈魚", 1, 1, "河底牌でロン和了しています。");
    if (context.isRinshan) addYaku("rinshan-kaihou", "嶺上開花", 1, 1, "嶺上牌で自摸和了しています。");
    if (context.isChankan) addYaku("chankan", "槍槓", 1, 1, "加槓牌をロン和了しています。");
    if (pattern.type === "kokushi") {
      const isThirteenWait = Boolean(
        context.winningTile
        && pattern.duplicate
        && pattern.duplicate.tileType === context.winningTile.baseId
      );
      addYakuman(
        isThirteenWait ? "kokushi-musou-13-wait" : "kokushi-musou",
        isThirteenWait ? "国士無双十三面待ち" : "国士無双",
        isThirteenWait ? "十三種すべてを待つ国士無双です。" : "十三種の么九牌を揃えた和了形です。",
        isThirteenWait && ruleConfig.doubleYakuman !== false ? 2 : 1
      );
    } else {
      if (context.winType === "tsumo" && context.isMenzen) addYaku("menzen-tsumo", "門前清自摸和", 1, 0, "門前で自摸和了しています。");
      if (tiles.length > 0 && tiles.every(isSimple) && (context.isMenzen || ruleConfig.kuitan !== false)) addYaku("tanyao", "断么九", 1, 1, "手牌が数牌の2から8だけで構成されています。");
      if (tiles.length > 0 && tiles.every(isTerminalOrHonor)) addYaku("honroutou", "混老頭", 2, 2, "すべての牌が么九牌です。");
      if (pattern.type === "chiitoitsu") addYaku("chiitoitsu", "七対子", 2, 0, "異なる七組の対子で構成されています。");

      if (pattern.type === "standard") {
        const melds = Array.isArray(pattern.melds) ? pattern.melds : [];
        const triplets = melds.filter((meld) => meld.kind === "triplet");
        const sequences = melds.filter((meld) => meld.kind === "sequence");
        triplets.forEach((triplet) => {
          const rank = honorRank(firstTileType(triplet));
          if (rank >= 5) addYaku(`yakuhai-dragon-${rank}`, `役牌: ${honorNames[rank]}`, 1, 1, `${honorNames[rank]}の刻子です。`);
          if (rank === windRanks[context.seatWind]) addYaku("yakuhai-seat", `役牌: 自風 ${honorNames[rank]}`, 1, 1, "自風牌の刻子です。");
          if (rank === windRanks[context.roundWind]) addYaku("yakuhai-round", `役牌: 場風 ${honorNames[rank]}`, 1, 1, "場風牌の刻子です。");
        });
        if (triplets.length === 4) addYaku("toitoi", "対々和", 2, 2, "四面子がすべて刻子です。");
        if (context.isMenzen && sequences.length === 4 && !isValuePair(pattern.pair, context) && context.waitType === "ryanmen") addYaku("pinfu", "平和", 1, 0, "門前・全順子・役牌でない雀頭・両面待ちです。");
        if (context.isMenzen && sequences.length >= 2) {
          const seen = new Set();
          const hasIdenticalSequence = sequences.some((sequence) => {
            const key = sequence.tileTypes.join(",");
            if (seen.has(key)) return true;
            seen.add(key);
            return false;
          });
          if (hasIdenticalSequence) addYaku("iipeikou", "一盃口", 1, 0, "門前で同じ順子が二組あります。");
        }
      }
    }

    const yakuHan = yaku.reduce((sum, item) => sum + item.han, 0);
    const hasYaku = yaku.length > 0 || yakuman.length > 0;
    const doraDetails = Sanma.DoraCalculator.calculate({ tiles, ruleConfig, context });
    const dora = yaku.length > 0 && yakuman.length === 0 ? doraDetails.items : [];
    const doraHan = dora.reduce((sum, item) => sum + item.han, 0);
    const totalHan = yakuman.length > 0 ? 0 : yakuHan + doraHan;
    return {
      hasYaku,
      yaku,
      yakuman,
      dora,
      doraDetails,
      yakuHan,
      doraHan,
      totalHan,
      isYakuman: yakuman.length > 0,
      reason: hasYaku ? yakuman.concat(yaku).map((item) => item.name).join("、") : "和了形ですが役がありません。",
      context,
    };
  }

  Sanma.YakuAnalysis = { analyzeYaku };
})(window);
