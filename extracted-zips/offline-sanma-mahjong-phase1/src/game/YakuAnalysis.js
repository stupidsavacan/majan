(function attachYakuAnalysis(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  const windRanks = Object.freeze({ east: 1, south: 2, west: 3, north: 4 });
  const honorNames = Object.freeze({ 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" });
  const greenTileTypes = Object.freeze(["2s", "3s", "4s", "6s", "8s", "z6"]);

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

  function parseTileType(tileType) {
    let match = /^z([1-7])$/.exec(tileType || "");
    if (match) return { suit: "z", rank: Number(match[1]) };
    match = /^([1-9])([mps])$/.exec(tileType || "");
    return match ? { suit: match[2], rank: Number(match[1]) } : null;
  }

  function tileTypeOf(tile) {
    if (!tile) return "";
    if (tile.baseId) return tile.baseId;
    if (tile.suit === "z") return `z${tile.rank}`;
    return tile.suit && tile.rank ? `${tile.rank}${tile.suit}` : "";
  }

  function honorRank(tileType) {
    const parsed = parseTileType(tileType);
    return parsed && parsed.suit === "z" ? parsed.rank : 0;
  }

  function isNumberSuit(parsed) {
    return parsed && ["m", "p", "s"].includes(parsed.suit);
  }

  function oneSuitSummary(tiles) {
    const suits = new Set();
    let hasHonor = false;
    let hasInvalid = false;
    tiles.forEach((tile) => {
      const parsed = parseTileType(tileTypeOf(tile));
      if (!parsed) {
        hasInvalid = true;
      } else if (parsed.suit === "z") {
        hasHonor = true;
      } else if (isNumberSuit(parsed)) {
        suits.add(parsed.suit);
      }
    });
    return {
      isValid: !hasInvalid,
      numberSuitCount: suits.size,
      hasHonor,
    };
  }

  function tripletRankSet(triplets, minRank, maxRank) {
    const ranks = new Set();
    triplets.forEach((triplet) => {
      const rank = honorRank(firstTileType(triplet));
      if (rank >= minRank && rank <= maxRank) ranks.add(rank);
    });
    return ranks;
  }

  function isValuePair(pair, context) {
    const rank = honorRank(firstTileType(pair));
    return rank >= 5 || rank === windRanks[context.seatWind] || rank === windRanks[context.roundWind];
  }

  function groupTypes(group) {
    return group && Array.isArray(group.tileTypes) ? group.tileTypes : [];
  }

  function groupHasTerminalOrHonor(group) {
    return groupTypes(group).some((tileType) => {
      const parsed = parseTileType(tileType);
      return parsed && (parsed.suit === "z" || parsed.rank === 1 || parsed.rank === 9);
    });
  }

  function groupHasTerminal(group) {
    return groupTypes(group).some((tileType) => {
      const parsed = parseTileType(tileType);
      return parsed && parsed.suit !== "z" && (parsed.rank === 1 || parsed.rank === 9);
    });
  }

  function groupHasHonor(group) {
    return groupTypes(group).some((tileType) => {
      const parsed = parseTileType(tileType);
      return parsed && parsed.suit === "z";
    });
  }

  function isKanGroup(group) {
    const source = group && group.sourceMeld;
    return Boolean(group && (group.isKan || (source && (source.type === "kan" || (source.tiles || []).length >= 4))));
  }

  function isConcealedTriplet(group, context) {
    if (!group || group.kind !== "triplet") return false;
    if (group.open === true) return false;
    const source = group.sourceMeld;
    if (source) return source.open === false;
    if (context.winType === "ron") {
      if (context.waitType === "tanki") return true;
      if (context.waitType === "shanpon" && context.winningTile) {
        return context.winningTile.baseId !== firstTileType(group);
      }
      return false;
    }
    return true;
  }

  function sequenceKey(sequence) {
    return groupTypes(sequence).join(",");
  }

  function sequenceStart(sequence) {
    const parsed = parseTileType(firstTileType(sequence));
    return parsed && parsed.suit !== "z" ? parsed : null;
  }


  function isChinroutou(tiles) {
    return tiles.length > 0 && tiles.every((tile) => tile && tile.suit !== "z" && (tile.rank === 1 || tile.rank === 9));
  }

  function isRyuuiisou(tiles, ruleConfig) {
    const allowed = new Set(greenTileTypes);
    if (!tiles.length || !tiles.every((tile) => tile && allowed.has(tile.baseId))) return false;
    const yakuRules = ruleConfig && ruleConfig.yakuRules ? ruleConfig.yakuRules : {};
    return yakuRules.ryuuiisouRequiresHatsu ? tiles.some((tile) => tile && tile.baseId === "z6") : true;
  }

  function getSingleSuitNumberCounts(tiles) {
    let suit = null;
    const counts = Array(10).fill(0);
    for (const tile of tiles || []) {
      if (!tile || tile.suit === "z" || !["p", "s"].includes(tile.suit)) return null;
      if (suit && suit !== tile.suit) return null;
      suit = tile.suit;
      counts[tile.rank] += 1;
    }
    return suit ? { suit, counts } : null;
  }

  function analyzeChuuren(tiles, context) {
    if (!context.isMenzen || tiles.length !== 14) return null;
    const singleSuit = getSingleSuitNumberCounts(tiles);
    if (!singleSuit) return null;
    const required = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
    const ok = required.every((count, rank) => singleSuit.counts[rank] >= count)
      && singleSuit.counts.reduce((sum, count) => sum + count, 0) === 14;
    if (!ok) return null;
    const pure = Boolean(context.winningTile
      && context.winningTile.suit === singleSuit.suit
      && singleSuit.counts[context.winningTile.rank] > 0
      && singleSuit.counts.every((count, rank) => count - (rank === context.winningTile.rank ? 1 : 0) === required[rank]));
    return { pure };
  }

  function detectRyanpeikou(tiles, ruleConfig) {
    if (!tiles.length || !Sanma.HandAnalysis) return false;
    const converted = Sanma.HandAnalysis.toCountArray(tiles, ruleConfig);
    if (!converted.isValid || converted.tileCount !== 14) return false;
    const tileTypes = Sanma.HandAnalysis.tileTypes || [];
    const sequencePairs = [];
    for (const suit of ["p", "s"]) {
      for (let rank = 1; rank <= 7; rank += 1) {
        const indexes = [rank, rank + 1, rank + 2].map((value) => tileTypes.findIndex((type) => type.suit === suit && type.rank === value));
        if (indexes.every((index) => index >= 0 && converted.counts[index] >= 2)) sequencePairs.push(indexes);
      }
    }
    for (let left = 0; left < sequencePairs.length; left += 1) {
      for (let right = left; right < sequencePairs.length; right += 1) {
        const remaining = converted.counts.slice();
        [sequencePairs[left], sequencePairs[right]].forEach((indexes) => {
          indexes.forEach((index) => { remaining[index] -= 2; });
        });
        if (remaining.some((count) => count < 0)) continue;
        const pairCount = remaining.filter((count) => count === 2).length;
        if (pairCount === 1 && remaining.every((count) => count === 0 || count === 2)) return true;
      }
    }
    return false;
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
      if (!han || yaku.some((item) => item.id === id)) return;
      yaku.push({ id, name, hanClosed, hanOpen, han, isYakuman: false, reason });
    }

    function addYakuman(id, name, reason, multiplier) {
      if (yakuman.some((item) => item.id === id)) return;
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
    const ryanpeikouFromTiles = context.isMenzen && detectRyanpeikou(tiles, ruleConfig);
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
      const oneSuit = oneSuitSummary(tiles);
      const chuuren = analyzeChuuren(tiles, context);
      if (chuuren) {
        addYakuman(
          chuuren.pure ? "chuuren-9-wait" : "chuuren-poutou",
          chuuren.pure ? "純正九蓮宝燈" : "九蓮宝燈",
          chuuren.pure ? "九面待ちの九蓮宝燈です。" : "同一色で九蓮宝燈の形です。",
          chuuren.pure && ruleConfig.doubleYakuman !== false ? 2 : 1
        );
      }
      if (isChinroutou(tiles)) addYakuman("chinroutou", "清老頭", "全ての牌が老頭牌です。");
      if (isRyuuiisou(tiles, ruleConfig)) addYakuman("ryuuiisou", "緑一色", "緑色の牌だけで構成されています。");
      if (tiles.length > 0 && tiles.every((tile) => tile && tile.suit === "z")) addYakuman("tsuuiisou", "字一色", "すべての牌が字牌で構成されています。");
      if (context.winType === "tsumo" && context.isMenzen) addYaku("menzen-tsumo", "門前清自摸和", 1, 0, "門前で自摸和了しています。");
      if (tiles.length > 0 && tiles.every(isSimple) && (context.isMenzen || ruleConfig.kuitan !== false)) addYaku("tanyao", "断么九", 1, 1, "手牌が数牌の2から8だけで構成されています。");
      if (tiles.length > 0 && tiles.every(isTerminalOrHonor)) addYaku("honroutou", "混老頭", 2, 2, "すべての牌が么九牌です。");
      if (oneSuit.isValid && oneSuit.numberSuitCount === 1) {
        if (oneSuit.hasHonor) addYaku("honitsu", "混一色", 3, 2, "一種類の数牌と字牌だけで構成されています。");
        else addYaku("chinitsu", "清一色", 6, 5, "一種類の数牌だけで構成されています。");
      }
      if (ryanpeikouFromTiles) addYaku("ryanpeikou", "二盃口", 3, 0, "門前で同じ順子の組が二組あります。");
      if (pattern.type === "chiitoitsu" && !ryanpeikouFromTiles) addYaku("chiitoitsu", "七対子", 2, 0, "異なる七組の対子で構成されています。");

      if (pattern.type === "standard") {
        const melds = Array.isArray(pattern.melds) ? pattern.melds : [];
        const triplets = melds.filter((meld) => meld.kind === "triplet");
        const sequences = melds.filter((meld) => meld.kind === "sequence");
        const kanCount = melds.filter(isKanGroup).length;
        const dragonTripletRanks = tripletRankSet(triplets, 5, 7);
        const windTripletRanks = tripletRankSet(triplets, 1, 4);
        const pairRank = honorRank(firstTileType(pattern.pair));
        if ([5, 6, 7].every((rank) => dragonTripletRanks.has(rank))) {
          addYakuman("daisangen", "大三元", "白・發・中をすべて刻子または槓子にしています。");
        }
        if ([1, 2, 3, 4].every((rank) => windTripletRanks.has(rank))) {
          addYakuman(
            "daisuushii",
            "大四喜",
            "東・南・西・北をすべて刻子または槓子にしています。",
            ruleConfig.doubleYakuman !== false ? 2 : 1
          );
        } else if (windTripletRanks.size === 3 && pairRank >= 1 && pairRank <= 4) {
          addYakuman("shousuushii", "小四喜", "風牌3種類の刻子または槓子と、風牌の雀頭があります。");
        }
        if (triplets.length === 4 && triplets.every((triplet) => isConcealedTriplet(triplet, context))) {
          const isTanki = context.waitType === "tanki";
          addYakuman(
            isTanki ? "suuankou-tanki" : "suuankou",
            isTanki ? "四暗刻単騎" : "四暗刻",
            isTanki ? "四つの暗刻を単騎待ちで和了しています。" : "四つの暗刻で構成されています。",
            isTanki && ruleConfig.doubleYakuman !== false ? 2 : 1
          );
        }
        triplets.forEach((triplet) => {
          const rank = honorRank(firstTileType(triplet));
          if (rank >= 5) addYaku(`yakuhai-dragon-${rank}`, `役牌: ${honorNames[rank]}`, 1, 1, `${honorNames[rank]}の刻子です。`);
          if (rank === windRanks[context.seatWind]) addYaku("yakuhai-seat", `役牌: 自風 ${honorNames[rank]}`, 1, 1, "自風牌の刻子です。");
          if (rank === windRanks[context.roundWind]) addYaku("yakuhai-round", `役牌: 場風 ${honorNames[rank]}`, 1, 1, "場風牌の刻子です。");
        });
        if (kanCount === 4) addYakuman("suukantsu", "四槓子", "四つの槓子があります。");
        else if (kanCount === 3) addYaku("sankantsu", "三槓子", 2, 2, "三つの槓子があります。");
        if (triplets.length === 4) addYaku("toitoi", "対々和", 2, 2, "四面子がすべて刻子です。");
        if (triplets.filter((triplet) => honorRank(firstTileType(triplet)) >= 5).length === 2
          && honorRank(firstTileType(pattern.pair)) >= 5) {
          addYaku("shousangen", "小三元", 2, 2, "三元牌二刻子と三元牌雀頭です。");
        }
        const concealedTriplets = triplets.filter((triplet) => isConcealedTriplet(triplet, context));
        if (concealedTriplets.length >= 3) addYaku("sanankou", "三暗刻", 2, 2, "暗刻が三つあります。");
        const tripletRanks = triplets.reduce((result, triplet) => {
          const parsed = parseTileType(firstTileType(triplet));
          if (parsed && parsed.suit !== "z") {
            const key = String(parsed.rank);
            result[key] = result[key] || new Set();
            result[key].add(parsed.suit);
          }
          return result;
        }, {});
        if (["1", "9"].some((rank) => tripletRanks[rank] && ["m", "p", "s"].every((suit) => tripletRanks[rank].has(suit)))) {
          addYaku("sanshoku-doukou", "三色同刻", 2, 2, "三色で同じ数字の刻子があります。");
        }
        if (sequences.some((sequence) => {
          const parsed = sequenceStart(sequence);
          if (!parsed || !["p", "s"].includes(parsed.suit)) return false;
          const sameSuitSequences = new Set(sequences
            .filter((item) => {
              const start = sequenceStart(item);
              return start && start.suit === parsed.suit;
            })
            .map((item) => sequenceStart(item).rank));
          return sameSuitSequences.has(1) && sameSuitSequences.has(4) && sameSuitSequences.has(7);
        })) {
          addYaku("ittsuu", "一気通貫", 2, 1, "同一色の123・456・789の順子があります。");
        }
        if (sequences.length > 0) {
          const allChanta = melds.every(groupHasTerminalOrHonor) && groupHasTerminalOrHonor(pattern.pair);
          const allJunchan = allChanta && melds.every((group) => groupHasTerminal(group) && !groupHasHonor(group))
            && groupHasTerminal(pattern.pair) && !groupHasHonor(pattern.pair);
          if (allJunchan) addYaku("junchan", "純全帯么九", 3, 2, "全ての面子と雀頭に老頭牌があり、字牌を含みません。");
          else if (allChanta) addYaku("chanta", "混全帯么九", 2, 1, "全ての面子と雀頭に么九牌が関係しています。");
        }
        if (context.isMenzen && sequences.length === 4 && !isValuePair(pattern.pair, context) && context.waitType === "ryanmen") addYaku("pinfu", "平和", 1, 0, "門前・全順子・役牌でない雀頭・両面待ちです。");
        if (context.isMenzen && sequences.length >= 2 && !ryanpeikouFromTiles) {
          const seen = new Set();
          const hasIdenticalSequence = sequences.some((sequence) => {
            const key = sequenceKey(sequence);
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
