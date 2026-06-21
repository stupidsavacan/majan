(function attachHandAnalysis(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  // 34-type mapping:
  // 0-8: 1m-9m, 9-17: 1p-9p, 18-26: 1s-9s, 27-33: East-South-West-North-White-Green-Red.
  // Sanma legality is applied separately: 2m-8m never exist, and North may be disabled.
  const tileTypes = [];
  for (const suit of ["m", "p", "s"]) {
    for (let rank = 1; rank <= 9; rank += 1) {
      tileTypes.push({
        suit,
        rank,
        tileType: `${rank}${suit}`,
        label: `${rank}${{ m: "萬", p: "筒", s: "索" }[suit]}`,
      });
    }
  }
  ["東", "南", "西", "北", "白", "發", "中"].forEach((label, offset) => {
    tileTypes.push({ suit: "z", rank: offset + 1, tileType: `z${offset + 1}`, label });
  });

  const typeIndexByKey = Object.freeze(tileTypes.reduce((result, type, index) => {
    result[`${type.suit}:${type.rank}`] = index;
    return result;
  }, {}));

  const kokushiIndices = Object.freeze([0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]);

  function getTypeIndex(tile) {
    if (!tile) return -1;
    const index = typeIndexByKey[`${tile.suit}:${Number(tile.rank)}`];
    return Number.isInteger(index) ? index : -1;
  }

  function isLegalTypeIndex(index, ruleConfig) {
    if (!Number.isInteger(index) || index < 0 || index >= tileTypes.length) return false;
    if (index >= 1 && index <= 7) return false;
    if (index === 30 && ruleConfig && ruleConfig.northMode === "disabled") return false;
    return true;
  }

  function getLegalTileTypes(ruleConfig) {
    return tileTypes
      .map((type, index) => Object.assign({ index }, type))
      .filter((type) => isLegalTypeIndex(type.index, ruleConfig));
  }

  function countsToSummary(counts) {
    return counts
      .map((count, index) => count > 0 ? `${tileTypes[index].tileType}x${count}` : "")
      .filter(Boolean)
      .join(" ");
  }

  function toCountArray(tiles, ruleConfig) {
    const counts = Array(34).fill(0);
    if (!Array.isArray(tiles)) {
      return { isValid: false, counts, tileCount: 0, reason: "手牌が配列ではありません。", invalidTiles: [] };
    }

    const invalidTiles = [];
    for (const tile of tiles) {
      const index = getTypeIndex(tile);
      if (!isLegalTypeIndex(index, ruleConfig)) {
        invalidTiles.push(tile && tile.baseId ? tile.baseId : String(tile));
        continue;
      }
      counts[index] += 1;
      if (counts[index] > 4) {
        invalidTiles.push(`${tileTypes[index].tileType}が5枚以上`);
      }
    }

    return {
      isValid: invalidTiles.length === 0,
      counts,
      tileCount: tiles.length,
      summary: countsToSummary(counts),
      invalidTiles,
      reason: invalidTiles.length > 0 ? `不正な牌があります: ${invalidTiles.join(", ")}` : "",
    };
  }

  function describeGroup(kind, indices) {
    return {
      kind,
      tileTypes: indices.map((index) => tileTypes[index].tileType),
      labels: indices.map((index) => tileTypes[index].label),
    };
  }

  function findMelds(counts, melds) {
    const first = counts.findIndex((count) => count > 0);
    if (first < 0) return melds.slice();

    if (counts[first] >= 3) {
      counts[first] -= 3;
      melds.push(describeGroup("triplet", [first, first, first]));
      const tripletResult = findMelds(counts, melds);
      if (tripletResult) return tripletResult;
      melds.pop();
      counts[first] += 3;
    }

    const type = tileTypes[first];
    const canSequence = (type.suit === "p" || type.suit === "s") && type.rank <= 7;
    if (canSequence && counts[first + 1] > 0 && counts[first + 2] > 0) {
      counts[first] -= 1;
      counts[first + 1] -= 1;
      counts[first + 2] -= 1;
      melds.push(describeGroup("sequence", [first, first + 1, first + 2]));
      const sequenceResult = findMelds(counts, melds);
      if (sequenceResult) return sequenceResult;
      melds.pop();
      counts[first] += 1;
      counts[first + 1] += 1;
      counts[first + 2] += 1;
    }

    return null;
  }

  function findAllMelds(counts, melds, results, limit) {
    const first = counts.findIndex((count) => count > 0);
    if (first < 0) {
      results.push(melds.slice());
      return results;
    }
    if (results.length >= limit) return results;

    if (counts[first] >= 3) {
      counts[first] -= 3;
      melds.push(describeGroup("triplet", [first, first, first]));
      findAllMelds(counts, melds, results, limit);
      melds.pop();
      counts[first] += 3;
    }

    const type = tileTypes[first];
    const canSequence = (type.suit === "p" || type.suit === "s") && type.rank <= 7;
    if (canSequence && counts[first + 1] > 0 && counts[first + 2] > 0 && results.length < limit) {
      counts[first] -= 1;
      counts[first + 1] -= 1;
      counts[first + 2] -= 1;
      melds.push(describeGroup("sequence", [first, first + 1, first + 2]));
      findAllMelds(counts, melds, results, limit);
      melds.pop();
      counts[first] += 1;
      counts[first + 1] += 1;
      counts[first + 2] += 1;
    }

    return results;
  }

  function invalidAgariResult(type, reason, tileCount) {
    return { isAgari: false, type, pair: null, melds: [], tileCount, reason };
  }

  function isStandardAgari(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    if (!converted.isValid) return invalidAgariResult("standard", converted.reason, converted.tileCount);
    if (converted.tileCount !== 14) return invalidAgariResult("standard", "4面子1雀頭判定には14枚必要です。", converted.tileCount);

    const alternativeMeldPatterns = [];
    for (let pairIndex = 0; pairIndex < converted.counts.length; pairIndex += 1) {
      if (converted.counts[pairIndex] < 2) continue;
      const remaining = converted.counts.slice();
      remaining[pairIndex] -= 2;
      const melds = findMelds(remaining.slice(), []);
      if (melds && melds.length === 4) {
        findAllMelds(remaining.slice(), [], [], 64)
          .filter((candidate) => candidate.length === 4)
          .forEach((candidate) => {
            alternativeMeldPatterns.push({
              type: "standard",
              pair: describeGroup("pair", [pairIndex, pairIndex]),
              melds: candidate,
            });
          });
        return {
          isAgari: true,
          type: "standard",
          typeLabel: "4面子1雀頭",
          pair: describeGroup("pair", [pairIndex, pairIndex]),
          melds,
          alternativeMeldPatterns,
          tileCount: converted.tileCount,
          reason: "4面子1雀頭に分解できます。",
        };
      }
    }

    return invalidAgariResult("standard", "4面子1雀頭に分解できません。", converted.tileCount);
  }

  function isChiitoitsuAgari(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    const result = { isAgari: false, type: "chiitoitsu", typeLabel: "七対子", pairs: [], tileCount: converted.tileCount, reason: "" };
    if (!converted.isValid) return Object.assign(result, { reason: converted.reason });
    if (converted.tileCount !== 14) return Object.assign(result, { reason: "七対子判定には14枚必要です。" });

    const pairIndices = [];
    converted.counts.forEach((count, index) => {
      if (count === 2) pairIndices.push(index);
    });
    if (pairIndices.length === 7 && converted.counts.every((count) => count === 0 || count === 2)) {
      return Object.assign(result, {
        isAgari: true,
        pairs: pairIndices.map((index) => describeGroup("pair", [index, index])),
        reason: "異なる7組の対子があります。",
      });
    }
    return Object.assign(result, { reason: "異なる7組の対子ではありません。槓子は2組の対子として数えません。" });
  }

  function isKokushiAgari(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    const result = { isAgari: false, type: "kokushi", typeLabel: "国士無双", duplicate: null, tileCount: converted.tileCount, reason: "" };
    if (ruleConfig && ruleConfig.northMode === "disabled") {
      return Object.assign(result, { reason: "北なしルールでは国士無双を成立させません。" });
    }
    if (!converted.isValid) return Object.assign(result, { reason: converted.reason });
    if (converted.tileCount !== 14) return Object.assign(result, { reason: "国士無双判定には14枚必要です。" });

    const required = new Set(kokushiIndices);
    const hasOnlyRequired = converted.counts.every((count, index) => count === 0 || required.has(index));
    const missing = kokushiIndices.filter((index) => converted.counts[index] === 0);
    const duplicates = kokushiIndices.filter((index) => converted.counts[index] === 2);
    const overCount = kokushiIndices.some((index) => converted.counts[index] > 2);
    if (hasOnlyRequired && missing.length === 0 && duplicates.length === 1 && !overCount) {
      return Object.assign(result, {
        isAgari: true,
        duplicate: Object.assign({ index: duplicates[0] }, tileTypes[duplicates[0]]),
        reason: "13種の么九牌と、そのうち1種の対子があります。",
      });
    }
    return Object.assign(result, { reason: "国士無双に必要な13種の么九牌と対子が揃っていません。" });
  }

  function describeFixedMeld(meld, ruleConfig) {
    const tiles = meld && Array.isArray(meld.tiles) ? meld.tiles : [];
    if (tiles.length < 3) return null;
    const indices = tiles.slice(0, 3).map(getTypeIndex);
    if (indices.some((index) => !isLegalTypeIndex(index, ruleConfig))) return null;
    let kind = null;
    if (meld.type === "chi") {
      const sorted = indices.slice().sort((left, right) => left - right);
      const types = sorted.map((index) => tileTypes[index]);
      const sameSuit = types.every((type) => type.suit === types[0].suit);
      const sequence = sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
      if (!sameSuit || !sequence || !["p", "s"].includes(types[0].suit)) return null;
      indices.splice(0, indices.length, ...sorted);
      kind = "sequence";
    } else if (indices.every((index) => index === indices[0])) {
      kind = "triplet";
    }
    if (!kind) return null;
    return Object.assign(describeGroup(kind, indices), {
      fixed: true,
      open: meld.open !== false,
      isKan: meld.type === "kan" || tiles.length >= 4,
      sourceMeld: meld,
    });
  }

  function isStandardAgariWithMelds(concealedTiles, fixedMelds, ruleConfig) {
    const fixedGroups = (fixedMelds || []).map((meld) => describeFixedMeld(meld, ruleConfig));
    if (fixedGroups.some((group) => !group) || fixedGroups.length > 4) {
      return invalidAgariResult("standard", "固定面子の構造が不正です。", concealedTiles.length);
    }
    const converted = toCountArray(concealedTiles, ruleConfig);
    const expectedConcealedCount = 14 - fixedGroups.length * 3;
    if (!converted.isValid) return invalidAgariResult("standard", converted.reason, converted.tileCount);
    if (converted.tileCount !== expectedConcealedCount) {
      return invalidAgariResult(
        "standard",
        `固定面子${fixedGroups.length}組では手牌${expectedConcealedCount}枚が必要です。`,
        converted.tileCount
      );
    }

    const alternativeMeldPatterns = [];
    for (let pairIndex = 0; pairIndex < converted.counts.length; pairIndex += 1) {
      if (converted.counts[pairIndex] < 2) continue;
      const remaining = converted.counts.slice();
      remaining[pairIndex] -= 2;
      const concealedMelds = findMelds(remaining.slice(), []);
      if (concealedMelds && concealedMelds.length === 4 - fixedGroups.length) {
        findAllMelds(remaining.slice(), [], [], 64)
          .filter((candidate) => candidate.length === 4 - fixedGroups.length)
          .forEach((candidate) => {
            alternativeMeldPatterns.push({
              type: "standard",
              pair: describeGroup("pair", [pairIndex, pairIndex]),
              melds: candidate.concat(fixedGroups),
            });
          });
        return {
          isAgari: true,
          type: "standard",
          typeLabel: "固定面子付き4面子1雀頭",
          pair: describeGroup("pair", [pairIndex, pairIndex]),
          melds: concealedMelds.concat(fixedGroups),
          fixedMelds: fixedGroups,
          alternativeMeldPatterns,
          tileCount: 14,
          concealedTileCount: converted.tileCount,
          reason: "固定面子を保持した和了形に分解できます。",
        };
      }
    }
    return invalidAgariResult("standard", "固定面子を含む4面子1雀頭に分解できません。", converted.tileCount);
  }

  function analyzeAgariWithMelds(concealedTiles, fixedMelds, ruleConfig) {
    const melds = Array.isArray(fixedMelds) ? fixedMelds : [];
    if (melds.length === 0) return analyzeAgari(concealedTiles, ruleConfig);
    const standard = isStandardAgariWithMelds(concealedTiles, melds, ruleConfig);
    return {
      isAgari: standard.isAgari,
      patterns: standard.isAgari ? [standard] : [],
      bestPattern: standard.isAgari ? standard : null,
      tileCount: standard.tileCount,
      reason: standard.reason,
    };
  }

  function analyzeAgari(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    if (!converted.isValid) {
      return { isAgari: false, patterns: [], bestPattern: null, tileCount: converted.tileCount, reason: converted.reason };
    }

    const checked = [
      isStandardAgari(tiles, ruleConfig),
      isChiitoitsuAgari(tiles, ruleConfig),
      isKokushiAgari(tiles, ruleConfig),
    ];
    const patterns = checked.filter((pattern) => pattern.isAgari);
    const priority = ["kokushi", "chiitoitsu", "standard"];
    const bestPattern = priority.map((type) => patterns.find((pattern) => pattern.type === type)).find(Boolean) || null;
    return {
      isAgari: patterns.length > 0,
      patterns,
      bestPattern,
      tileCount: converted.tileCount,
      reason: bestPattern ? `${bestPattern.typeLabel}の和了形です。` : checked.map((result) => result.reason).join(" / "),
    };
  }

  function createAnalysisTile(type, copyIndex) {
    return {
      suit: type.suit,
      rank: type.rank,
      baseId: type.tileType,
      instanceId: `analysis-${type.tileType}-${copyIndex}`,
      isRed: false,
    };
  }

  function analyzeThirteenTileTenpai(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    if (!converted.isValid) {
      return { isTenpai: false, waits: [], tileCount: converted.tileCount, reason: converted.reason };
    }
    if (converted.tileCount !== 13) {
      return { isTenpai: false, waits: [], tileCount: converted.tileCount, reason: "聴牌判定には13枚必要です。" };
    }

    const waits = [];
    getLegalTileTypes(ruleConfig).forEach((type) => {
      if (converted.counts[type.index] >= 4) return;
      const agari = analyzeAgari(tiles.concat(createAnalysisTile(type, converted.counts[type.index])), ruleConfig);
      if (agari.isAgari) {
        waits.push({
          index: type.index,
          tileType: type.tileType,
          label: type.label,
          patterns: agari.patterns.map((pattern) => pattern.typeLabel),
        });
      }
    });
    return {
      isTenpai: waits.length > 0,
      waits,
      tileCount: converted.tileCount,
      reason: waits.length > 0 ? `待ち牌: ${waits.map((wait) => wait.label).join("、")}` : "和了形になる待ち牌はありません。",
    };
  }

  function analyzeTenpai(tiles, ruleConfig) {
    const converted = toCountArray(tiles, ruleConfig);
    if (!converted.isValid) {
      return { isTenpai: false, waits: [], discardOptions: [], tileCount: converted.tileCount, reason: converted.reason };
    }
    if (converted.tileCount === 13) {
      return Object.assign({ discardOptions: [] }, analyzeThirteenTileTenpai(tiles, ruleConfig));
    }
    if (converted.tileCount !== 14) {
      return { isTenpai: false, waits: [], discardOptions: [], tileCount: converted.tileCount, reason: "聴牌判定は13枚または14枚の手牌に対応しています。" };
    }

    const agari = analyzeAgari(tiles, ruleConfig);
    const checkedTypes = new Set();
    const discardOptions = [];
    tiles.forEach((tile, index) => {
      const typeIndex = getTypeIndex(tile);
      if (checkedTypes.has(typeIndex)) return;
      checkedTypes.add(typeIndex);
      const remaining = tiles.slice();
      remaining.splice(index, 1);
      const tenpai = analyzeThirteenTileTenpai(remaining, ruleConfig);
      if (tenpai.isTenpai) {
        discardOptions.push({
          discardTileType: tileTypes[typeIndex].tileType,
          discardLabel: tileTypes[typeIndex].label,
          waits: tenpai.waits,
        });
      }
    });

    return {
      isTenpai: agari.isAgari || discardOptions.length > 0,
      isAlreadyAgari: agari.isAgari,
      waits: [],
      discardOptions,
      tileCount: converted.tileCount,
      reason: agari.isAgari ? "現在の14枚はすでに和了形です。" : discardOptions.length > 0 ? "打牌後に聴牌する候補があります。" : "打牌後に聴牌する候補はありません。",
    };
  }

  function analyzeTenpaiWithMelds(concealedTiles, fixedMelds, ruleConfig) {
    const melds = Array.isArray(fixedMelds) ? fixedMelds : [];
    if (melds.length === 0) return analyzeTenpai(concealedTiles, ruleConfig);
    const fixedGroups = melds.map((meld) => describeFixedMeld(meld, ruleConfig));
    if (fixedGroups.some((group) => !group) || fixedGroups.length > 4) {
      return {
        isTenpai: false,
        waits: [],
        discardOptions: [],
        tileCount: Array.isArray(concealedTiles) ? concealedTiles.length : 0,
        reason: "固定面子の形が不正です。",
      };
    }
    const converted = toCountArray(concealedTiles, ruleConfig);
    if (!converted.isValid) {
      return { isTenpai: false, waits: [], discardOptions: [], tileCount: converted.tileCount, reason: converted.reason };
    }
    const expectedConcealedCount = 13 - fixedGroups.length * 3;
    if (converted.tileCount !== expectedConcealedCount) {
      return {
        isTenpai: false,
        waits: [],
        discardOptions: [],
        tileCount: converted.tileCount,
        reason: "副露手の聴牌判定に必要な concealed tile count と一致しません。",
      };
    }
    const ownedTiles = (concealedTiles || []).concat(melds.flatMap((meld) => (
      meld && Array.isArray(meld.tiles) ? meld.tiles : []
    )));
    const waits = [];
    getLegalTileTypes(ruleConfig).forEach((type) => {
      const ownedCount = ownedTiles.filter((tile) => tile && getTypeIndex(tile) === type.index).length;
      if (ownedCount >= 4) return;
      const agari = analyzeAgariWithMelds(
        (concealedTiles || []).concat(createAnalysisTile(type, ownedCount)),
        melds,
        ruleConfig
      );
      if (agari.isAgari) {
        waits.push({
          index: type.index,
          tileType: type.tileType,
          label: type.label,
          patterns: agari.patterns.map((pattern) => pattern.typeLabel),
        });
      }
    });
    return {
      isTenpai: waits.length > 0,
      waits,
      discardOptions: [],
      tileCount: converted.tileCount,
      reason: waits.length > 0 ? `副露手の待ち牌: ${waits.map((wait) => wait.label).join("、")}` : "副露手の待ち牌はありません。",
    };
  }

  Sanma.HandAnalysis = {
    tileTypes,
    getTypeIndex,
    getLegalTileTypes,
    toCountArray,
    isStandardAgari,
    isChiitoitsuAgari,
    isKokushiAgari,
    describeFixedMeld,
    isStandardAgariWithMelds,
    analyzeAgariWithMelds,
    analyzeAgari,
    analyzeTenpai,
    analyzeTenpaiWithMelds,
  };
})(window);
