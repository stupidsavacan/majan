(function () {
  "use strict";

  const STORAGE_KEY = "offlineSanmaMahjongPhase1Settings";

  const defaultRuleConfig = {
    playerCount: 3,
    gameLength: "hanchan",
    initialPoints: 35000,
    northMode: "kita-dora",
    allowChi: true,
    tsumoLoss: false,
    kuitan: true,
    atozuke: true,
    redDoraMode: "standard",
    highScoreMode: false,
    uraDora: true,
    kanDora: true,
    kanUraDora: true,
    kitaDora: true,
    doubleYakuman: true,
    countedYakuman: true,
    countedDoubleYakuman: false,
    localYaku: false,
    dramaticLuckAssist: true,
    dramaticOpeningHandRate: 0.08,
    dramaticDrawAssist: true,
    dramaticDrawAssistRate: 0.06,
    cpuDramaticDrawAssistRate: 0.025,
    maxAssistDrawsPerRoundForHuman: 2,
    maxAssistDrawsPerRoundForCpu: 1,
    assistAfterTenpaiMultiplier: 0.35,
    assistAfterRiichiMultiplier: 0.15,
    assistYakumanTenpaiMultiplier: 0.05,
  };

  const normalSettings = [
    { key: "gameLength", label: "対局形式", type: "select", options: [["tonpuu", "東風"], ["hanchan", "半荘"]] },
    { key: "northMode", label: "北の扱い", type: "select", options: [["kita-dora", "北抜き"], ["normal-tile", "北通常牌"], ["disabled", "北なし"]] },
    { key: "allowChi", label: "チーあり", type: "checkbox" },
    { key: "tsumoLoss", label: "ツモ損あり", type: "checkbox" },
    { key: "highScoreMode", label: "高打点モード", type: "checkbox" },
    { key: "uraDora", label: "裏ドラあり", type: "checkbox" },
    { key: "kanDora", label: "槓ドラあり", type: "checkbox" },
    { key: "kanUraDora", label: "槓裏ドラあり", type: "checkbox" },
    { key: "redDoraMode", label: "赤ドラ", type: "select", options: [["standard", "標準"], ["none", "なし"], ["custom", "カスタム"]] },
    { key: "kuitan", label: "喰いタンあり", type: "checkbox" },
    { key: "atozuke", label: "後付けあり", type: "checkbox" },
  ];

  const suitLabels = { m: "萬", p: "筒", s: "索", z: "" };
  const honorLabels = { 1: "東", 2: "南", 3: "西", 4: "北", 5: "白", 6: "發", 7: "中" };
  const windLabels = { east: "東", south: "南", west: "西" };

  function createRuleConfig(overrides) {
    return Object.assign({}, defaultRuleConfig, overrides || {}, {
      playerCount: 3,
      localYaku: false,
      countedDoubleYakuman: false,
    });
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return createRuleConfig(raw ? JSON.parse(raw) : null);
    } catch (_error) {
      return createRuleConfig();
    }
  }

  function saveSettings(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createRuleConfig(config)));
  }

  function tileLabel(tile) {
    if (!tile) return "";
    if (tile.suit === "z") return honorLabels[tile.rank];
    return `${tile.rank}${suitLabels[tile.suit]}`;
  }

  function tileAriaLabel(tile) {
    return tile.isRed ? `赤${tileLabel(tile)}` : tileLabel(tile);
  }

  function sortTiles(tiles) {
    const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
    tiles.sort((a, b) => {
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      const rankDiff = a.rank - b.rank;
      if (rankDiff !== 0) return rankDiff;
      if (a.isRed === b.isRed) return a.instanceId.localeCompare(b.instanceId);
      return a.isRed ? -1 : 1;
    });
  }

  function createTileBaseSet(ruleConfig) {
    const bases = [];
    const pushCopies = (suit, rank, total, redCount) => {
      for (let copy = 0; copy < total; copy += 1) {
        bases.push({ suit, rank, baseId: `${rank}${suit}`, isRed: copy < redCount });
      }
    };

    pushCopies("m", 1, 4, 0);
    pushCopies("m", 9, 4, 0);
    for (let rank = 1; rank <= 9; rank += 1) {
      const redCountPin = rank === 5 ? getRedFiveCount(ruleConfig, "p") : 0;
      const redCountSou = rank === 5 ? getRedFiveCount(ruleConfig, "s") : 0;
      pushCopies("p", rank, 4, redCountPin);
      pushCopies("s", rank, 4, redCountSou);
    }
    for (let rank = 1; rank <= 7; rank += 1) {
      if (rank === 4 && ruleConfig.northMode === "disabled") continue;
      pushCopies("z", rank, 4, 0);
    }
    return bases.map((tile, index) => Object.assign({}, tile, {
      id: tile.isRed ? `${tile.baseId}r` : tile.baseId,
      instanceId: `${tile.isRed ? `${tile.baseId}r` : tile.baseId}-${index}`,
    }));
  }

  function getRedFiveCount(ruleConfig, suit) {
    if (ruleConfig.highScoreMode && (suit === "p" || suit === "s")) return 4;
    if (ruleConfig.redDoraMode === "none") return 0;
    if (ruleConfig.redDoraMode === "standard" && (suit === "p" || suit === "s")) return 1;
    if (ruleConfig.redDoraMode === "custom" && (suit === "p" || suit === "s")) return 1;
    return 0;
  }

  function createSeededRandom(seed) {
    let hash = 2166136261;
    const text = String(seed || `${Date.now()}-${Math.random()}`);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return function random() {
      hash += 0x6d2b79f5;
      let t = hash;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(array, random) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  class Wall {
    constructor(ruleConfig, seed) {
      this.ruleConfig = ruleConfig;
      this.seed = seed || "";
      this.tiles = createTileBaseSet(ruleConfig);
      this.random = createSeededRandom(seed);
      shuffle(this.tiles, this.random);
      this.doraIndicators = [this.tiles.pop()];
      this.deadWall = [];
      for (let i = 0; i < 13; i += 1) {
        const tile = this.tiles.pop();
        if (tile) this.deadWall.push(tile);
      }
    }

    draw() {
      return this.tiles.pop() || null;
    }

    remainingCount() {
      return this.tiles.length;
    }
  }

  class Player {
    constructor({ id, name, seatWind, isHuman, points }) {
      this.id = id;
      this.name = name;
      this.seatWind = seatWind;
      this.isHuman = isHuman;
      this.points = points;
      this.hand = [];
      this.discards = [];
      this.melds = [];
      this.kitaCount = 0;
    }

    receive(tile) {
      if (tile) this.hand.push(tile);
      sortTiles(this.hand);
    }

    discardByInstanceId(instanceId) {
      const index = this.hand.findIndex((tile) => tile.instanceId === instanceId);
      if (index < 0) return null;
      return this.discardAt(index);
    }

    discardAt(index) {
      const [tile] = this.hand.splice(index, 1);
      if (tile) this.discards.push(tile);
      sortTiles(this.hand);
      return tile || null;
    }
  }

  class GameEngine {
    constructor({ ruleConfig, seed, onChange }) {
      this.ruleConfig = createRuleConfig(ruleConfig);
      this.seed = seed || "";
      this.onChange = typeof onChange === "function" ? onChange : function noop() {};
      this.round = { roundWind: "east", handNumber: 1, honba: 0, riichiSticks: 0, dealerIndex: 0 };
      this.players = [];
      this.wall = null;
      this.turnIndex = 0;
      this.phase = "idle";
      this.logs = [];
      this.cpuThinkingLog = [];
      this.startRound();
    }

    startRound() {
      this.wall = new Wall(this.ruleConfig, this.seed);
      this.players = [
        new Player({ id: 0, name: "あなた", seatWind: "east", isHuman: true, points: this.ruleConfig.initialPoints }),
        new Player({ id: 1, name: "CPU 1", seatWind: "south", isHuman: false, points: this.ruleConfig.initialPoints }),
        new Player({ id: 2, name: "CPU 2", seatWind: "west", isHuman: false, points: this.ruleConfig.initialPoints }),
      ];
      this.turnIndex = 0;
      this.phase = "dealing";
      this.logs = [];
      this.cpuThinkingLog = [];
      for (let draw = 0; draw < 13; draw += 1) {
        this.players.forEach((player) => player.receive(this.wall.draw()));
      }
      this.players[0].receive(this.wall.draw());
      this.phase = "human-discard";
      this.addLog("配牌しました。あなたは親です。切る牌をクリック/タップしてください。");
      this.emitChange();
    }

    get humanPlayer() {
      return this.players[0];
    }

    discardHumanTile(instanceId) {
      if (this.phase !== "human-discard" || this.turnIndex !== 0) {
        this.addLog("現在はあなたの打牌番ではありません。");
        this.emitChange();
        return;
      }
      const discarded = this.humanPlayer.discardByInstanceId(instanceId);
      if (!discarded) {
        this.addLog("その牌は手牌にありません。");
        this.emitChange();
        return;
      }
      this.addLog(`あなたが ${tileAriaLabel(discarded)} を切りました。`);
      this.advanceAfterDiscard();
    }

    advanceAfterDiscard() {
      if (this.wall.remainingCount() <= 0) {
        this.phase = "round-ended";
        this.addLog("山がなくなりました。Phase 1では流局表示のみです。");
        this.emitChange();
        return;
      }
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
      this.phase = "cpu-running";
      this.emitChange();
      this.runCpuUntilHumanTurn();
    }

    runCpuUntilHumanTurn() {
      while (this.turnIndex !== 0 && this.wall.remainingCount() > 0) {
        const player = this.players[this.turnIndex];
        const drawn = this.wall.draw();
        player.receive(drawn);
        this.addLog(`${player.name} がツモりました。`);
        const index = Math.floor(Math.random() * player.hand.length);
        const discarded = player.discardAt(index);
        this.cpuThinkingLog.unshift({
          player: player.name,
          phase: "Phase 1 random discard",
          choice: tileAriaLabel(discarded),
          hand: player.hand.map(tileAriaLabel),
        });
        this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 8);
        this.addLog(`${player.name} が ${tileAriaLabel(discarded)} を切りました。`);
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
      }

      if (this.wall.remainingCount() <= 0) {
        this.phase = "round-ended";
        this.addLog("山がなくなりました。Phase 1では流局表示のみです。");
        this.emitChange();
        return;
      }

      const drawn = this.wall.draw();
      this.humanPlayer.receive(drawn);
      this.phase = "human-discard";
      this.addLog(`あなたのツモ: ${tileAriaLabel(drawn)}。切る牌を選んでください。`);
      this.emitChange();
    }

    addLog(message) {
      this.logs.unshift(message);
      this.logs = this.logs.slice(0, 12);
    }

    getState() {
      return {
        ruleConfig: this.ruleConfig,
        seed: this.seed,
        round: {
          label: `${windLabels[this.round.roundWind]}${this.round.handNumber}局`,
          honba: this.round.honba,
          riichiSticks: this.round.riichiSticks,
        },
        players: this.players,
        turnIndex: this.turnIndex,
        phase: this.phase,
        logs: this.logs,
        cpuThinkingLog: this.cpuThinkingLog,
        wallRemaining: this.wall.remainingCount(),
        deadWallCount: this.wall.deadWall.length,
        doraIndicators: this.wall.doraIndicators,
        totalKnownTileCount: this.countKnownTiles(),
        ruleSummary: `${this.ruleConfig.gameLength === "hanchan" ? "半荘" : "東風"} / ${this.ruleConfig.highScoreMode ? "高打点" : "通常"}`,
      };
    }

    countKnownTiles() {
      const hands = this.players.flatMap((player) => player.hand);
      const discards = this.players.flatMap((player) => player.discards);
      return hands.length + discards.length + this.wall.remainingCount() + this.wall.deadWall.length + this.wall.doraIndicators.length;
    }

    emitChange() {
      this.onChange(this.getState());
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createTileButton(tile, small) {
    const button = el("button", ["tile", `tile-${tile.suit}`, tile.isRed ? "tile-red" : "", small ? "tile-small" : ""].filter(Boolean).join(" "));
    button.type = "button";
    button.dataset.instanceId = tile.instanceId;
    button.setAttribute("aria-label", tileAriaLabel(tile));
    button.append(el("span", "tile-main", tile.suit === "z" ? tileLabel(tile) : String(tile.rank)));
    button.append(el("span", "tile-suit", tile.suit === "z" ? "" : suitLabels[tile.suit]));
    button.append(el("span", "tile-red-dot", tile.isRed ? "●" : ""));
    return button;
  }

  function renderTileRow(container, tiles, small) {
    container.innerHTML = "";
    tiles.forEach((tile) => container.appendChild(createTileButton(tile, small)));
  }

  function infoBadge(label, value) {
    const badge = el("div", "info-badge");
    badge.append(el("span", "info-label", label), el("strong", "info-value", value));
    return badge;
  }

  function renderTable(root, state, handlers) {
    root.innerHTML = "";

    const tableInfo = el("section", "table-info");
    tableInfo.append(
      infoBadge("局", state.round.label),
      infoBadge("本場", String(state.round.honba)),
      infoBadge("供託", String(state.round.riichiSticks)),
      infoBadge("山", String(state.wallRemaining)),
      infoBadge("ルール", state.ruleSummary),
      infoBadge("seed", state.seed || "ランダム")
    );

    const doraPanel = el("section", "dora-panel");
    doraPanel.appendChild(el("h2", "section-title", "ドラ表示牌"));
    const doraRow = el("div", "tile-row tile-row-center");
    renderTileRow(doraRow, state.doraIndicators, true);
    doraPanel.appendChild(doraRow);

    const opponents = el("section", "opponents-grid");
    state.players.filter((player) => !player.isHuman).forEach((player) => {
      opponents.appendChild(renderOpponent(player, state.turnIndex === player.id));
    });

    const center = el("section", "center-board");
    center.append(tableInfo, doraPanel, renderDiscards(state.players));

    root.append(opponents, center, renderHuman(state.players[0], state.phase, handlers));
  }

  function renderOpponent(player, isTurn) {
    const card = el("article", `player-card opponent-card ${isTurn ? "active-player" : ""}`);
    const head = el("div", "player-head");
    head.append(el("strong", "player-name", player.name), el("span", "points", `${player.points.toLocaleString()}点`));
    const handBacks = el("div", "opponent-hand");
    for (let i = 0; i < player.hand.length; i += 1) handBacks.appendChild(el("span", "tile-back-mini", ""));
    const discards = el("div", "tile-row discard-row compact");
    renderTileRow(discards, player.discards, true);
    card.append(head, handBacks, el("div", "mini-title", "河"), discards);
    return card;
  }

  function renderDiscards(players) {
    const area = el("section", "river-board");
    area.appendChild(el("h2", "section-title", "河"));
    players.forEach((player) => {
      const rowWrap = el("div", "river-player-row");
      rowWrap.appendChild(el("span", "river-name", player.name));
      const row = el("div", "tile-row discard-row");
      renderTileRow(row, player.discards, true);
      rowWrap.appendChild(row);
      area.appendChild(rowWrap);
    });
    return area;
  }

  function renderHuman(player, phase, handlers) {
    const section = el("section", `human-area ${phase === "human-discard" ? "active-player" : ""}`);
    const head = el("div", "human-head");
    head.append(el("div", "human-title", "あなたの手牌"), el("div", "human-status", `${player.points.toLocaleString()}点 / ${phase === "human-discard" ? "打牌してください" : "CPU思考中"}`));
    const hand = el("div", "tile-row human-hand");
    player.hand.forEach((tile) => {
      const tileNode = createTileButton(tile, false);
      tileNode.disabled = phase !== "human-discard";
      tileNode.addEventListener("click", () => handlers.onDiscard(tile.instanceId));
      tileNode.addEventListener("touchend", (event) => {
        event.preventDefault();
        handlers.onDiscard(tile.instanceId);
      }, { passive: false });
      hand.appendChild(tileNode);
    });
    const actions = el("div", "action-row");
    [["ツモ", "Phase 2以降"], ["ロン", "Phase 2以降"], ["リーチ", "Phase 4以降"], ["北抜き", "Phase 5以降"]].forEach(([label, title]) => {
      const button = el("button", "action-button", label);
      button.type = "button";
      button.title = title;
      button.disabled = true;
      actions.appendChild(button);
    });
    section.append(head, hand, actions);
    return section;
  }

  function renderMessages(root, state) {
    root.innerHTML = "";
    const list = el("ul", "log-list");
    state.logs.forEach((line) => list.appendChild(el("li", "", line)));
    root.append(el("h2", "section-title", "ログ"), list);
  }

  function renderDebug(root, state) {
    root.textContent = [
      `phase: ${state.phase}`,
      `turnIndex: ${state.turnIndex}`,
      `wallRemaining: ${state.wallRemaining}`,
      `deadWallCount: ${state.deadWallCount}`,
      `totalKnownTileCount: ${state.totalKnownTileCount}`,
      "",
      "RuleConfig:",
      JSON.stringify(state.ruleConfig, null, 2),
      "",
      "CPU thinking log:",
      JSON.stringify(state.cpuThinkingLog, null, 2),
    ].join("\n");
  }

  function renderSettings(root, currentConfig) {
    root.innerHTML = "";
    normalSettings.forEach((setting) => {
      const field = el("label", "setting-field");
      field.appendChild(el("span", "setting-label", setting.label));
      let input;
      if (setting.type === "select") {
        input = document.createElement("select");
        setting.options.forEach(([value, label]) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          option.selected = currentConfig[setting.key] === value;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(currentConfig[setting.key]);
      }
      input.dataset.settingKey = setting.key;
      field.appendChild(input);
      root.appendChild(field);
    });
  }

  function readSettings(root, baseConfig) {
    const next = Object.assign({}, baseConfig);
    root.querySelectorAll("[data-setting-key]").forEach((input) => {
      next[input.dataset.settingKey] = input.type === "checkbox" ? input.checked : input.value;
    });
    return createRuleConfig(next);
  }

  let currentConfig = loadSettings();
  let currentSeed = "";
  let engine;

  const tableRoot = document.getElementById("tableRoot");
  const messagePanel = document.getElementById("messagePanel");
  const settingsDialog = document.getElementById("settingsDialog");
  const settingsRoot = document.getElementById("settingsRoot");
  const debugDialog = document.getElementById("debugDialog");
  const debugRoot = document.getElementById("debugRoot");
  const seedInput = document.getElementById("seedInput");

  function rerender(state) {
    renderTable(tableRoot, state, { onDiscard: (instanceId) => engine.discardHumanTile(instanceId) });
    renderMessages(messagePanel, state);
    renderDebug(debugRoot, state);
  }

  function newGame(seed) {
    currentSeed = seed || "";
    engine = new GameEngine({ ruleConfig: currentConfig, seed: currentSeed, onChange: rerender });
  }

  document.getElementById("newGameButton").addEventListener("click", () => newGame(currentSeed));
  document.getElementById("settingsButton").addEventListener("click", () => {
    renderSettings(settingsRoot, currentConfig);
    settingsDialog.showModal();
  });
  document.getElementById("debugButton").addEventListener("click", () => {
    if (engine) renderDebug(debugRoot, engine.getState());
    debugDialog.showModal();
  });
  document.getElementById("saveSettingsButton").addEventListener("click", () => {
    currentConfig = readSettings(settingsRoot, currentConfig);
    saveSettings(currentConfig);
    newGame(currentSeed);
  });
  document.getElementById("applySeedButton").addEventListener("click", () => {
    newGame(seedInput.value.trim());
  });
  document.getElementById("resetStorageButton").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    currentConfig = createRuleConfig();
    newGame(currentSeed);
    debugDialog.close();
  });

  newGame("");
})();
