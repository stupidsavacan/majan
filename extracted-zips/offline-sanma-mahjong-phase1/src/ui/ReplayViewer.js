(function attachReplayViewer(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyZones(playerCount) {
    return Array.from({ length: Math.max(playerCount, 3) }, () => []);
  }

  function initialView(record, round) {
    const playerCount = Math.max((record.players || []).length, 3);
    return {
      hands: emptyZones(playerCount),
      discards: emptyZones(playerCount),
      melds: emptyZones(playerCount),
      kita: emptyZones(playerCount),
      diagnostics: [],
      points: Array.isArray(round.startingPoints) && round.startingPoints.length
        ? round.startingPoints.slice()
        : (record.players || []).map((player) => Number(player.initialPoints) || 0),
    };
  }

  function tileLabel(tile) {
    if (typeof tile === "string") return tile;
    return tile && (tile.label || tile.baseId) ? (tile.label || tile.baseId) : "?";
  }

  function sameTile(left, right) {
    if (left && right && typeof left === "object" && typeof right === "object"
      && left.instanceId && right.instanceId) {
      return left.instanceId === right.instanceId;
    }
    return tileLabel(left) === tileLabel(right);
  }

  function removeTile(hand, tile) {
    let index = -1;
    for (let cursor = hand.length - 1; cursor >= 0; cursor -= 1) {
      if (sameTile(hand[cursor], tile)) {
        index = cursor;
        break;
      }
    }
    if (index >= 0) {
      hand.splice(index, 1);
      return true;
    }
    return false;
  }

  function removeFirstMatchingTile(tiles, tile) {
    if (!Array.isArray(tiles) || !tile) return false;
    const index = tiles.findIndex((candidate) => sameTile(candidate, tile));
    if (index < 0) return false;
    tiles.splice(index, 1);
    return true;
  }

  function callMeldTiles(data, tiles) {
    const meldTiles = Array.isArray(tiles) ? tiles.slice() : [];
    const expectedMeldSize = data && (data.action === "pon" || data.action === "chi") ? 3 : 0;
    if (
      data
      && data.calledTile
      && (meldTiles.length < expectedMeldSize || !meldTiles.some((tile) => sameTile(tile, data.calledTile)))
    ) {
      meldTiles.push(data.calledTile);
    }
    return meldTiles;
  }

  function callConsumedTiles(data, tiles) {
    if (data && Array.isArray(data.consumedTiles)) {
      return data.consumedTiles.slice();
    }
    if (
      data
      && Array.isArray(data.consumedTileInstanceIds)
      && data.consumedTileInstanceIds.length > 0
    ) {
      return data.consumedTileInstanceIds.map((instanceId) => ({ instanceId }));
    }
    const consumed = Array.isArray(tiles) ? tiles.slice() : [];
    if (data && data.calledTile) {
      removeFirstMatchingTile(consumed, data.calledTile);
    }
    return consumed;
  }

  function kanMeldFromEvent(data, tiles, existingMeld) {
    const kanType = (data && data.kanType) || (existingMeld && existingMeld.kanType) || "kan";
    const meld = {
      type: kanType,
      kanType,
      tiles: Array.isArray(tiles) ? tiles.slice() : [],
      open: kanType !== "ankan",
    };
    if (data && Number.isInteger(data.fromPlayerIndex)) {
      meld.fromPlayerIndex = data.fromPlayerIndex;
    } else if (existingMeld && Number.isInteger(existingMeld.fromPlayerIndex)) {
      meld.fromPlayerIndex = existingMeld.fromPlayerIndex;
    }
    return meld;
  }

  function warn(view, message) {
    if (!Array.isArray(view.diagnostics)) view.diagnostics = [];
    view.diagnostics.push(message);
  }

  function removeOrWarn(view, hand, tile, label) {
    if (removeTile(hand, tile)) return true;
    warn(view, `${label || "remove"} failed: ${tileLabel(tile)}`);
    return false;
  }

  function playerZone(view, name, playerIndex) {
    const zones = view && view[name];
    return Number.isInteger(playerIndex) && Array.isArray(zones) && Array.isArray(zones[playerIndex])
      ? zones[playerIndex]
      : null;
  }

  function applyPointChanges(view, changes) {
    (Array.isArray(changes) ? changes : []).forEach((change) => {
      if (
        change
        && Number.isInteger(change.playerIndex)
        && change.playerIndex >= 0
        && change.playerIndex < view.points.length
        && Number.isFinite(Number(change.after))
      ) {
        view.points[change.playerIndex] = Number(change.after);
      }
    });
  }

  function applyEvent(view, event) {
    if (!event || typeof event !== "object") return view;
    const data = event && event.data ? event.data : {};
    const playerIndex = Number(data.playerIndex);
    if (event.type === "deal" && Array.isArray(data.hands)) {
      data.hands.forEach((entry) => {
        if (entry && playerZone(view, "hands", entry.playerIndex) && Array.isArray(entry.tiles)) {
          view.hands[entry.playerIndex] = clone(entry.tiles);
        }
      });
    } else if (event.type === "draw" && playerZone(view, "hands", playerIndex) && data.tile) {
      playerZone(view, "hands", playerIndex).push(data.tile);
    } else if (
      event.type === "discard"
      && playerZone(view, "hands", playerIndex)
      && playerZone(view, "discards", playerIndex)
      && data.tile
    ) {
      removeOrWarn(view, playerZone(view, "hands", playerIndex), data.tile, "discard");
      playerZone(view, "discards", playerIndex).push(data.tile);
    } else if (
      event.type === "call"
      && data.action !== "skip"
      && playerZone(view, "hands", playerIndex)
      && playerZone(view, "melds", playerIndex)
    ) {
      const tiles = Array.isArray(data.tiles) ? data.tiles.slice() : [];
      const meldTiles = callMeldTiles(data, tiles);
      const consumedTiles = callConsumedTiles(data, tiles);
      consumedTiles.forEach((tile) => removeOrWarn(view, playerZone(view, "hands", playerIndex), tile, "call"));
      playerZone(view, "melds", playerIndex).push({
        type: data.action || "call",
        tiles: meldTiles,
        fromPlayerIndex: data.fromPlayerIndex,
        open: true,
      });
      const sourceDiscards = playerZone(view, "discards", data.fromPlayerIndex);
      if (sourceDiscards && sourceDiscards.length) {
        if (data.calledTile) removeOrWarn(view, sourceDiscards, data.calledTile, "called discard");
        else sourceDiscards.pop();
      }
    } else if (
      event.type === "kita"
      && playerZone(view, "hands", playerIndex)
      && playerZone(view, "kita", playerIndex)
      && data.tile
    ) {
      removeOrWarn(view, playerZone(view, "hands", playerIndex), data.tile, "kita");
      playerZone(view, "kita", playerIndex).push(data.tile);
    } else if (
      event.type === "kan"
      && playerZone(view, "hands", playerIndex)
      && playerZone(view, "melds", playerIndex)
    ) {
      const tiles = Array.isArray(data.tiles) ? data.tiles.slice() : [];
      const melds = playerZone(view, "melds", playerIndex);
      if (Array.isArray(data.consumedTileInstanceIds) && data.consumedTileInstanceIds.length > 0) {
        data.consumedTileInstanceIds.forEach((instanceId) => {
          removeOrWarn(view, playerZone(view, "hands", playerIndex), { instanceId }, "kan");
        });
      } else {
        tiles.forEach((tile) => removeOrWarn(view, playerZone(view, "hands", playerIndex), tile, "kan"));
      }
      if (data.kanType === "kakan" && Number.isInteger(data.meldIndex) && melds[data.meldIndex]) {
        melds[data.meldIndex] = kanMeldFromEvent(data, tiles, melds[data.meldIndex]);
      } else {
        melds.push(kanMeldFromEvent(data, tiles, null));
      }
      const sourceDiscards = playerZone(view, "discards", data.fromPlayerIndex);
      if (data.kanType === "minkan" && sourceDiscards) removeOrWarn(view, sourceDiscards, data.calledTile, "minkan discard");
    } else if (
      event.type === "assist"
      && playerZone(view, "hands", playerIndex)
      && data.outgoing
      && data.incoming
    ) {
      removeOrWarn(view, playerZone(view, "hands", playerIndex), data.outgoing, "assist");
      playerZone(view, "hands", playerIndex).push(data.incoming);
    } else if (event.type === "riichi") {
      applyPointChanges(view, data.changes);
    } else if (event.type === "score_settlement") {
      applyPointChanges(view, data.changes || (data.result && data.result.changes));
    } else if (event.type === "win" || event.type === "double_ron" || event.type === "round_result") {
      applyPointChanges(view, data.changes || (data.result && data.result.changes));
    }
    return view;
  }

  function rebuild(state) {
    const round = state.record.rounds[state.roundIndex];
    const view = initialView(state.record, round);
    round.events.slice(0, state.eventIndex).forEach((event) => applyEvent(view, event));
    state.view = view;
    state.diagnostics = view.diagnostics.slice();
    state.partial = !round.events.some((event) => event && event.type === "deal")
      || round.events.some((event) => event && event.pruned === true)
      || state.diagnostics.length > 0;
    return state;
  }

  function create(record, roundIndex) {
    const normalized = Sanma.GameRecord.normalize(record);
    const safeRoundIndex = Math.max(0, Math.min(Number(roundIndex) || 0, normalized.rounds.length - 1));
    return rebuild({
      recordId: normalized.id,
      record: normalized,
      roundIndex: safeRoundIndex,
      eventIndex: 0,
      isPlaying: false,
      speedMs: 700,
      view: {},
      diagnostics: [],
      partial: false,
    });
  }

  function stepForward(state) {
    const events = state.record.rounds[state.roundIndex].events;
    state.eventIndex = Math.min(events.length, state.eventIndex + 1);
    return rebuild(state);
  }

  function stepBack(state) {
    state.eventIndex = Math.max(0, state.eventIndex - 1);
    return rebuild(state);
  }

  function jumpToStart(state) {
    state.eventIndex = 0;
    return rebuild(state);
  }

  function jumpToEnd(state) {
    state.eventIndex = state.record.rounds[state.roundIndex].events.length;
    return rebuild(state);
  }

  function setRound(state, roundIndex) {
    state.roundIndex = Math.max(0, Math.min(Number(roundIndex) || 0, state.record.rounds.length - 1));
    state.eventIndex = 0;
    return rebuild(state);
  }

  function playerNames(record, indexes) {
    return (Array.isArray(indexes) ? indexes : [])
      .map((index) => (record && record.players && record.players[index] && record.players[index].name) || `P${index}`);
  }

  function eventText(event, record) {
    if (!event) return "開始";
    const data = event.data || {};
    if (event.type === "score_settlement") {
      const result = data.result || data;
      if (result.type === "exhaustive_draw") {
        const tenpai = playerNames(record, result.tenpaiPlayers).join("、") || "なし";
        const noten = playerNames(record, result.notenPlayers).join("、") || "なし";
        return `${event.index || ""} 流局: テンパイ ${tenpai} / ノーテン ${noten}`.trim();
      }
      return `${event.index || ""} 点棒精算`.trim();
    }
    if (event.type === "double_ron") {
      const winners = Array.isArray(data.winners) ? data.winners.map((winner) => winner && winner.winnerIndex) : [];
      return `${event.index || ""} ダブロン: ${playerNames(record, winners).join("、")}`.trim();
    }
    if (event.type === "win" && Array.isArray(data.winners) && data.winners.length > 1) {
      return `${event.index || ""} ダブロン: ${playerNames(record, data.winners.map((winner) => winner.winnerIndex)).join("、")}`.trim();
    }
    const details = [data.playerName, data.tile ? tileLabel(data.tile) : null, data.action, data.kanType, data.reason].filter(Boolean);
    return `${event.index || ""} ${event.type}${details.length ? `: ${details.join(" / ")}` : ""}`.trim();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function tileNode(label) {
    return el("span", "replay-tile", tileLabel(label));
  }

  function renderZone(title, items) {
    const zone = el("div", "replay-zone");
    zone.appendChild(el("strong", "replay-zone-title", title));
    const row = el("div", "replay-tile-row");
    (items || []).forEach((item) => {
      const label = item && Array.isArray(item.tiles)
        ? item.tiles.map(tileLabel).join(" ")
        : tileLabel(item);
      row.appendChild(tileNode(label));
    });
    zone.appendChild(row);
    return zone;
  }

  function mount(root, record) {
    const state = create(record, 0);
    let timer = null;

    function stop() {
      state.isPlaying = false;
      if (timer) global.clearInterval(timer);
      timer = null;
    }

    function play() {
      if (state.isPlaying) return;
      state.isPlaying = true;
      timer = global.setInterval(() => {
        const events = state.record.rounds[state.roundIndex].events;
        if (state.eventIndex >= events.length) {
          stop();
          draw();
          return;
        }
        stepForward(state);
        draw();
      }, state.speedMs);
      draw();
    }

    function button(label, action) {
      const node = el("button", "", label);
      node.type = "button";
      node.addEventListener("click", action);
      return node;
    }

    function draw() {
      const round = state.record.rounds[state.roundIndex];
      const current = round.events[state.eventIndex - 1] || null;
      root.innerHTML = "";
      const head = el("div", "replay-head");
      const roundSelect = el("select", "replay-round-select");
      state.record.rounds.forEach((item, index) => {
        const option = el("option", "", item.roundLabel || `局${index + 1}`);
        option.value = String(index);
        option.selected = index === state.roundIndex;
        roundSelect.appendChild(option);
      });
      roundSelect.addEventListener("change", () => {
        stop();
        setRound(state, roundSelect.value);
        draw();
      });
      head.append(
        el("strong", "", `${round.roundLabel} / 本場 ${round.honba || 0} / 親 ${round.dealerIndex}`),
        roundSelect,
        el("span", "record-summary", `${state.eventIndex}/${round.events.length} イベント`)
      );
      const controls = el("div", "replay-controls");
      controls.append(
        button("先頭", () => { stop(); jumpToStart(state); draw(); }),
        button("戻る", () => { stop(); stepBack(state); draw(); }),
        button(state.isPlaying ? "一時停止" : "自動再生", () => { if (state.isPlaying) { stop(); draw(); } else play(); }),
        button("進む", () => { stop(); stepForward(state); draw(); }),
        button("末尾", () => { stop(); jumpToEnd(state); draw(); })
      );
      const board = el("div", "replay-board");
      state.view.hands.forEach((hand, index) => {
        const player = state.record.players[index] || { name: `プレイヤー${index + 1}` };
        const area = el("section", "replay-player");
        area.append(
          el("h4", "", `${player.name} / ${Number(state.view.points[index] || 0).toLocaleString()}点`),
          renderZone("手牌", hand),
          renderZone("河", state.view.discards[index]),
          renderZone("副露", state.view.melds[index]),
          renderZone("抜き北", state.view.kita[index])
        );
        board.appendChild(area);
      });
      root.append(head, controls);
      if (state.partial) root.appendChild(el("div", "replay-warning", "この牌譜は古い形式のため、一部の表示を省略しています。"));
      root.append(board, el("div", "replay-current-event", eventText(current, state.record)));
    }

    draw();
    return { state, stop, draw };
  }

  Sanma.ReplayViewer = {
    create,
    applyEvent,
    rebuild,
    stepForward,
    stepBack,
    jumpToStart,
    jumpToEnd,
    setRound,
    eventText,
    tileLabel,
    sameTile,
    mount,
    clone,
  };
})(window);
