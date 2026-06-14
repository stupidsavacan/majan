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
      opponents.appendChild(renderOpponent(player, state.turnIndex === player.id, state.round.dealerIndex));
    });

    const center = el("section", "center-board");
    center.append(tableInfo, renderDiscards(state.players), doraPanel);
    if (state.callWindow && state.callWindow.isOpen) center.appendChild(renderCallWindow(state.callWindow, handlers));
    if (state.winResult) center.appendChild(renderWinResult(state.winResult));
    if (state.matchState && state.matchState.roundEnded) {
      center.appendChild(renderMatchFlow(state.matchState, handlers));
    }

    const human = renderHuman(state.players[0], state, handlers);

    root.append(opponents, center, human);
  }

  function infoBadge(label, value) {
    const badge = el("div", "info-badge");
    badge.append(el("span", "info-label", label), el("strong", "info-value", value));
    return badge;
  }

  function renderOpponent(player, isTurn, dealerIndex) {
    const card = el("article", `player-card opponent-card ${isTurn ? "active-player" : ""}`);
    const head = el("div", "player-head");
    head.append(
      el("strong", "player-name", `${player.name}${player.id === dealerIndex ? " 親" : ""}`),
      el("span", "points", `${player.points.toLocaleString()}点`)
    );

    const handBacks = el("div", "opponent-hand");
    for (let i = 0; i < player.hand.length; i += 1) {
      handBacks.appendChild(el("span", "tile-back-mini", ""));
    }

    const discardTitle = el("div", "mini-title", "河");
    const discards = el("div", "tile-row discard-row compact");
    RenderTiles.renderTileRow(discards, player.discards, { small: true });
    const melds = renderMelds(player);

    card.append(head, handBacks, discardTitle, discards, melds);
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

  function renderMelds(player) {
    const wrap = el("div", "meld-area");
    (player.melds || []).forEach((meld) => {
      const item = el("div", "meld-item");
      item.appendChild(el("span", "mini-title", `${meld.type === "pon" ? "ポン" : meld.type === "chi" ? "チー" : "カン"}${meld.open ? "（副露）" : "（暗）"}`));
      const row = el("div", "tile-row");
      RenderTiles.renderTileRow(row, meld.tiles || [], { small: true });
      item.appendChild(row);
      wrap.appendChild(item);
    });
    if ((player.kitaTiles || []).length > 0) {
      const item = el("div", "meld-item");
      item.appendChild(el("span", "mini-title", `抜き北 ${player.kitaTiles.length}`));
      const row = el("div", "tile-row");
      RenderTiles.renderTileRow(row, player.kitaTiles, { small: true });
      item.appendChild(row);
      wrap.appendChild(item);
    }
    return wrap;
  }

  function findAction(state, id) {
    return (state.humanAvailableActions || []).find((action) => action.id === id) || { enabled: false, reason: "利用できません。" };
  }

  function renderHuman(player, state, handlers) {
    const phase = state.phase;
    const canDiscard = phase === "human-discard" || phase === "caller-discard";
    const section = el("section", `human-area ${canDiscard ? "active-player" : ""}`);
    const head = el("div", "human-head");
    let statusLabel = "CPU思考中";
    if (canDiscard) statusLabel = "打牌してください";
    else if (phase === "human-call") statusLabel = "鳴き・ロンを選択してください";
    else if (state.matchState && state.matchState.matchEnded) statusLabel = "対局終了";
    else if (state.matchState && state.matchState.roundEnded) statusLabel = "局終了";
    else if (phase === "win-ended") statusLabel = "和了終了";
    head.append(
      el("div", "human-title", `あなたの手牌${player.id === state.round.dealerIndex ? " 親" : ""}`),
      el("div", "human-status", `${player.points.toLocaleString()}点 / ${statusLabel}`)
    );

    const hand = el("div", "tile-row human-hand");
    (player.hand || []).filter(Boolean).forEach((tile) => {
      const tileNode = RenderTiles.createTileButton(tile, { small: false });
      const riichiLocked = player.hasRiichi
        && (!player.lastDraw || tile.instanceId !== player.lastDraw.instanceId);
      tileNode.disabled = !canDiscard || riichiLocked;
      tileNode.addEventListener("click", () => handlers.onDiscard(tile.instanceId));
      tileNode.addEventListener("touchend", (event) => {
        event.preventDefault();
        handlers.onDiscard(tile.instanceId);
      }, { passive: false });
      hand.appendChild(tileNode);
    });

    const actions = el("div", "action-row");
    const tsumo = findAction(state, "tsumo");
    const riichi = findAction(state, "riichi");
    const kita = findAction(state, "kita");
    const kan = findAction(state, "kan");
    const tsumoButton = actionButton(tsumo.enabled ? "ツモ和了" : "ツモ", tsumo.reason, !tsumo.enabled, tsumo.enabled ? "valid-win" : "");
    const riichiButton = actionButton("リーチ", riichi.reason, !riichi.enabled, riichi.enabled ? "available-action" : "");
    const kitaButton = actionButton("北抜き", kita.reason, !kita.enabled, kita.enabled ? "available-action" : "");
    const kanButton = actionButton("カン確認", kan.reason, !kan.enabled, kan.enabled ? "available-action" : "");
    if (tsumo.enabled) tsumoButton.addEventListener("click", handlers.onTsumo);
    if (riichi.enabled) riichiButton.addEventListener("click", handlers.onRiichi);
    if (kita.enabled) kitaButton.addEventListener("click", handlers.onKita);
    if (kan.enabled) kanButton.addEventListener("click", handlers.onKan);
    actions.append(
      tsumoButton,
      actionButton("ロン", phase === "human-call" ? "呼び出し窓から選択してください。" : "他家の捨て牌待ちです。", true),
      riichiButton,
      kanButton,
      kitaButton
    );

    section.append(head, hand, renderMelds(player), actions);
    return section;
  }

  function renderCallWindow(callWindow, handlers) {
    const panel = el("section", "call-window");
    panel.appendChild(el("h2", "section-title", "呼び出し操作"));
    panel.appendChild(el("div", "call-window-message", "他家の捨て牌に対する操作を選んでください。"));
    const tileRow = el("div", "tile-row tile-row-center");
    RenderTiles.renderTileRow(tileRow, callWindow.tile ? [callWindow.tile] : [], { small: false });
    panel.appendChild(tileRow);
    const actions = el("div", "call-window-actions");
    callWindow.actions.forEach((action) => {
      if (action.options && action.options.length > 0) {
        action.options.forEach((option, index) => {
          const label = action.id === "kan" ? `${option.label}（判定のみ）` : option.label;
          const button = actionButton(label, action.reason, false, action.id === "ron" ? "valid-win" : "available-action");
          button.addEventListener("click", () => handlers.onCall(action.id, index));
          actions.appendChild(button);
        });
      } else {
        const button = actionButton(action.label, action.reason, false, action.id === "ron" ? "valid-win" : "available-action");
        button.addEventListener("click", () => handlers.onCall(action.id, 0));
        actions.appendChild(button);
      }
    });
    const skip = actionButton("スキップ", "鳴かずに次の手番へ進みます。", false, "");
    skip.addEventListener("click", handlers.onSkipCall);
    actions.appendChild(skip);
    panel.appendChild(actions);
    return panel;
  }

  function renderMatchFlow(matchState, handlers) {
    const panel = el("section", "match-flow-panel");
    if (matchState.matchEnded) {
      panel.appendChild(el("h2", "section-title", "対局終了"));
      panel.appendChild(el("strong", "match-end-reason", matchState.endReason || "対局終了"));
      const rankingTitle = el("h3", "ranking-title", "順位");
      const rankings = el("ol", "ranking-list");
      (matchState.rankings || []).forEach((ranking) => {
        const sign = ranking.pointDelta >= 0 ? "+" : "";
        rankings.appendChild(el(
          "li",
          "",
          `${ranking.label} ${ranking.name}: ${ranking.points.toLocaleString()}点 (${sign}${ranking.pointDelta.toLocaleString()})`
        ));
      });
      panel.append(rankingTitle, rankings);
      return panel;
    }

    panel.appendChild(el("h2", "section-title", "局終了"));
    const nextRound = actionButton("次局へ", "次の局を配牌します。", false, "available-action");
    nextRound.id = "nextRoundButton";
    nextRound.addEventListener("click", handlers.onNextRound);
    panel.appendChild(nextRound);
    return panel;
  }

  function renderWinResult(winResult) {
    const score = winResult.score || {};
    const settlement = winResult.settlement || {};
    const panel = el("section", "win-result");
    panel.appendChild(el("h2", "section-title", "和了結果"));
    panel.appendChild(el(
      "strong",
      "win-result-title",
      `${winResult.winnerName || "和了者"} / ${winResult.winType === "tsumo" ? "ツモ" : "ロン"} / ${score.limitName || `${score.han}飜${score.fu}符`}`
    ));
    const payment = winResult.winType === "ron"
      ? (score.payments && score.payments.ron ? score.payments.ron.amount : 0)
      : (score.payments && score.payments.tsumo ? score.payments.tsumo.total : 0);
    panel.appendChild(el("div", "win-result-payment", `支払い合計: ${payment.toLocaleString()}点`));
    const yakuNames = [
      ...((winResult.yaku && winResult.yaku.yaku) || []).map((item) => item.name),
      ...((winResult.yaku && winResult.yaku.dora) || []).map((item) => `${item.name} ${item.han}`),
      ...((winResult.yaku && winResult.yaku.yakuman) || []).map((item) => item.name),
    ];
    panel.appendChild(el("div", "win-result-yaku", `役: ${yakuNames.join("、") || "なし"}`));
    const changes = el("ul", "win-result-changes");
    (settlement.changes || []).forEach((change) => {
      const sign = change.delta >= 0 ? "+" : "";
      changes.appendChild(el("li", "", `${change.playerName}: ${sign}${change.delta.toLocaleString()}点 → ${change.after.toLocaleString()}点`));
    });
    panel.appendChild(changes);
    return panel;
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
    const assistLog = JSON.stringify(state.assistEvents || [], null, 2);
    const agari = state.humanAgariAnalysis || {};
    const tenpai = state.humanTenpaiAnalysis || {};
    const yaku = state.humanYakuAnalysis || {};
    const score = state.humanScoreAnalysis || {};
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
      "役判定:",
      `hasYaku: ${Boolean(yaku.hasYaku)}`,
      `役: ${yaku.yaku && yaku.yaku.length > 0 ? yaku.yaku.map((item) => item.name).join("、") : "なし"}`,
      `ドラ: ${yaku.dora && yaku.dora.length > 0 ? yaku.dora.map((item) => `${item.name} ${item.han}`).join("、") : "なし"}`,
      `ドラ詳細: ${JSON.stringify(yaku.doraDetails || {}, null, 2)}`,
      `totalHan: ${yaku.totalHan || 0}`,
      `役満: ${yaku.yakuman && yaku.yakuman.length > 0 ? yaku.yakuman.map((item) => item.name).join("、") : "なし"}`,
      `理由: ${yaku.reason || ""}`,
      `context: ${JSON.stringify(yaku.context || {}, null, 2)}`,
      "",
      "点数計算:",
      `isValidWin: ${Boolean(score.isValidWin)}`,
      `飜: ${score.han || 0}`,
      `符: ${score.fu === null || score.fu === undefined ? "なし" : score.fu}`,
      `区分: ${score.limitName || "なし"}`,
      `基本点: ${score.basePoints || 0}`,
      `支払い: ${JSON.stringify(score.payments || {}, null, 2)}`,
      `理由: ${score.reason || ""}`,
      `詳細: ${(score.details || []).join(" / ") || "なし"}`,
      "",
      "和了結果:",
      JSON.stringify(state.winResult || null, null, 2),
      "",
      "対局進行:",
      JSON.stringify(state.matchState || null, null, 2),
      "",
      "利用可能操作:",
      JSON.stringify(state.humanAvailableActions || [], null, 2),
      "",
      "呼び出し窓:",
      JSON.stringify(state.callWindow || null, null, 2),
      "",
      "副露・抜き北:",
      JSON.stringify((state.players || []).map((player) => ({
        player: player.name,
        hasRiichi: player.hasRiichi,
        ippatsuActive: player.ippatsuActive,
        melds: player.melds,
        kitaTiles: player.kitaTiles,
      })), null, 2),
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
      "CPU思考:",
      cpuLog,
      "",
      "補助:",
      assistLog,
      "",
      "診断:",
      JSON.stringify(state.diagnostics || {}, null, 2),
    ].join("\n");
  }

  Sanma.RenderTable = { renderTable, renderMessages, renderDebug };
})(window);
