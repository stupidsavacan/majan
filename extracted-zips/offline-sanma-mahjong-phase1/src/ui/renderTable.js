(function attachRenderTable(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;
  const RenderTiles = Sanma.RenderTiles;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
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
    RenderTiles.renderTileRow(doraRow, state.doraIndicators, { small: true });
    doraPanel.appendChild(doraRow);

    const opponents = el("section", "opponents-grid");
    state.players.filter((player) => !player.isHuman).forEach((player) => {
      opponents.appendChild(renderOpponent(player, state.turnIndex === player.id));
    });

    const center = el("section", "center-board");
    center.append(tableInfo, doraPanel, renderDiscards(state.players));

    const human = renderHuman(state.players[0], state.phase, handlers, state.humanAgariAnalysis);

    root.append(opponents, center, human);
  }

  function infoBadge(label, value) {
    const badge = el("div", "info-badge");
    badge.append(el("span", "info-label", label), el("strong", "info-value", value));
    return badge;
  }

  function renderOpponent(player, isTurn) {
    const card = el("article", `player-card opponent-card ${isTurn ? "active-player" : ""}`);
    const head = el("div", "player-head");
    head.append(el("strong", "player-name", player.name), el("span", "points", `${player.points.toLocaleString()}点`));

    const handBacks = el("div", "opponent-hand");
    for (let i = 0; i < player.hand.length; i += 1) {
      handBacks.appendChild(el("span", "tile-back-mini", ""));
    }

    const discardTitle = el("div", "mini-title", "河");
    const discards = el("div", "tile-row discard-row compact");
    RenderTiles.renderTileRow(discards, player.discards, { small: true });

    card.append(head, handBacks, discardTitle, discards);
    return card;
  }

  function renderDiscards(players) {
    const area = el("section", "river-board");
    area.appendChild(el("h2", "section-title", "河"));
    players.forEach((player) => {
      const rowWrap = el("div", "river-player-row");
      rowWrap.appendChild(el("span", "river-name", player.name));
      const row = el("div", "tile-row discard-row");
      RenderTiles.renderTileRow(row, player.discards, { small: true });
      rowWrap.appendChild(row);
      area.appendChild(rowWrap);
    });
    return area;
  }

  function renderHuman(player, phase, handlers, agariAnalysis) {
    const section = el("section", `human-area ${phase === "human-discard" ? "active-player" : ""}`);
    const head = el("div", "human-head");
    head.append(
      el("div", "human-title", "あなたの手牌"),
      el("div", "human-status", `${player.points.toLocaleString()}点 / ${phase === "human-discard" ? "打牌してください" : "CPU思考中"}`)
    );

    const hand = el("div", "tile-row human-hand");
    player.hand.forEach((tile) => {
      const tileNode = RenderTiles.createTileButton(tile, { small: false });
      tileNode.disabled = phase !== "human-discard";
      tileNode.addEventListener("click", () => handlers.onDiscard(tile.instanceId));
      tileNode.addEventListener("touchend", (event) => {
        event.preventDefault();
        handlers.onDiscard(tile.instanceId);
      }, { passive: false });
      hand.appendChild(tileNode);
    });

    const actions = el("div", "action-row");
    const shapeAgari = Boolean(agariAnalysis && agariAnalysis.isAgari);
    actions.append(
      actionButton(shapeAgari ? "形だけ和了可能" : "ツモ", shapeAgari ? "Phase 2: 和了形を検出しました。点数計算と局終了は未実装です。" : "和了形ではありません", true, shapeAgari ? "shape-agari" : ""),
      actionButton("ロン", "Phase 2以降", true),
      actionButton("リーチ", "Phase 4以降", true),
      actionButton("北抜き", "Phase 5以降", true)
    );

    section.append(head, hand, actions);
    return section;
  }

  function actionButton(label, title, disabled, extraClass) {
    const button = el("button", `action-button ${extraClass || ""}`.trim(), label);
    button.type = "button";
    button.title = title;
    button.disabled = disabled;
    return button;
  }

  function renderMessages(root, state) {
    root.innerHTML = "";
    const title = el("h2", "section-title", "ログ");
    const list = el("ul", "log-list");
    state.logs.forEach((line) => {
      list.appendChild(el("li", "", line));
    });
    root.append(title, list);
  }

  function renderDebug(root, state) {
    const safeConfig = JSON.stringify(state.ruleConfig, null, 2);
    const cpuLog = JSON.stringify(state.cpuThinkingLog, null, 2);
    const agari = state.humanAgariAnalysis || {};
    const tenpai = state.humanTenpaiAnalysis || {};
    const waits = tenpai.waits && tenpai.waits.length > 0
      ? tenpai.waits.map((wait) => wait.label).join("、")
      : "なし";
    const discardOptions = tenpai.discardOptions && tenpai.discardOptions.length > 0
      ? tenpai.discardOptions.map((option) => `${option.discardLabel}切り → ${option.waits.map((wait) => wait.label).join("、")}`).join("\n")
      : "なし";
    root.textContent = [
      `phase: ${state.phase}`,
      `turnIndex: ${state.turnIndex}`,
      `wallRemaining: ${state.wallRemaining}`,
      `deadWallCount: ${state.deadWallCount}`,
      `totalKnownTileCount: ${state.totalKnownTileCount}`,
      "",
      "和了形判定:",
      `isAgari: ${Boolean(agari.isAgari)}`,
      `手牌枚数: ${agari.tileCount}`,
      `成立形: ${agari.patterns && agari.patterns.length > 0 ? agari.patterns.map((pattern) => pattern.typeLabel).join("、") : "なし"}`,
      `bestPattern: ${agari.bestPattern ? agari.bestPattern.typeLabel : "なし"}`,
      `理由: ${agari.reason || ""}`,
      "",
      "聴牌判定:",
      `isTenpai: ${Boolean(tenpai.isTenpai)}`,
      `待ち牌: ${waits}`,
      `打牌候補:\n${discardOptions}`,
      `理由: ${tenpai.reason || ""}`,
      "",
      "RuleConfig:",
      safeConfig,
      "",
      "CPU thinking log:",
      cpuLog,
    ].join("\n");
  }

  Sanma.RenderTable = { renderTable, renderMessages, renderDebug };
})(window);
