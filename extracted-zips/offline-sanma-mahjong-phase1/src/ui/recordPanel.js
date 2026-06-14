(function attachRecordPanel(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function actionButton(label, action) {
    const node = el("button", "", label);
    node.type = "button";
    node.dataset.recordAction = action;
    return node;
  }

  function renderStats(stats) {
    const grid = el("div", "stats-grid");
    [
      ["対局", stats.gamesPlayed],
      ["局", stats.roundsPlayed],
      ["和了", stats.wins],
      ["敗北", stats.losses],
      ["役満", stats.yakumanCount],
      ["収支", `${stats.totalScoreMovement >= 0 ? "+" : ""}${stats.totalScoreMovement}点`],
    ].forEach(([label, value]) => {
      const item = el("div", "stat-item");
      item.append(el("span", "info-label", label), el("strong", "info-value", String(value)));
      grid.appendChild(item);
    });
    return grid;
  }

  function eventText(event) {
    const data = event.data || {};
    const details = [];
    if (data.playerName) details.push(data.playerName);
    if (data.tile) details.push(data.tile);
    if (data.action) details.push(data.action);
    if (data.reason) details.push(data.reason);
    return `${event.index}. ${event.type}${details.length ? `: ${details.join(" / ")}` : ""}`;
  }

  function render(root, input, handlers) {
    const options = input || {};
    const records = options.records || [];
    const stats = options.stats || Sanma.GameRecordStorage.defaultStats();
    const latest = records.length > 0 ? records[records.length - 1] : null;
    root.innerHTML = "";

    root.append(el("h3", "", "成績"), renderStats(stats), el("h3", "", "牌譜・履歴"));
    const highest = stats.highestHand && stats.highestHand.score
      ? stats.highestHand.score.limitName || `${stats.highestHand.score.han}飜${stats.highestHand.score.fu || 0}符`
      : "なし";
    root.appendChild(el(
      "div",
      "record-summary",
      `最高打点: ${highest} / 最終プレイ: ${stats.lastPlayedAt || "なし"}`
    ));
    const summary = el("div", "record-summary", latest
      ? `${latest.createdAt} / ${latest.rounds[0].roundLabel} / ${latest.seed || "ランダムseed"}`
      : "保存済み牌譜はありません。");
    root.appendChild(summary);

    const history = el("ul", "record-history");
    records.slice().reverse().forEach((record) => {
      const round = record.rounds && record.rounds[0] ? record.rounds[0] : {};
      const result = round.result || {};
      const outcome = Number.isInteger(result.winnerIndex)
        ? `${record.players[result.winnerIndex] ? record.players[result.winnerIndex].name : "和了者"} ${result.winType || "和了"}`
        : "流局";
      history.appendChild(el("li", "", `${record.createdAt} / ${round.roundLabel || "局"} / ${outcome}`));
    });
    root.appendChild(history);

    const events = el("ol", "record-events");
    const latestEvents = latest && latest.rounds[0] ? latest.rounds[0].events : [];
    latestEvents.forEach((event) => events.appendChild(el("li", "", eventText(event))));
    root.appendChild(events);

    const textarea = el("textarea", "transfer-textarea");
    textarea.readOnly = true;
    textarea.placeholder = "牌譜JSON";
    const status = el("div", "transfer-status");
    const actions = el("div", "panel-actions transfer-actions");
    const exportButton = actionButton("エクスポート", "export");
    exportButton.disabled = !latest;
    exportButton.addEventListener("click", () => {
      textarea.value = latest ? JSON.stringify(latest, null, 2) : "";
      status.textContent = "最新の牌譜JSONを表示しました。";
    });
    const copyButton = actionButton("コピー", "copy");
    copyButton.disabled = !latest;
    copyButton.addEventListener("click", () => {
      const text = latest ? JSON.stringify(latest, null, 2) : "";
      textarea.value = text;
      if (handlers && handlers.onCopy) handlers.onCopy(text, status);
    });
    const resetRecords = actionButton("牌譜をリセット", "reset-records");
    resetRecords.className = "danger";
    resetRecords.addEventListener("click", () => handlers && handlers.onResetRecords && handlers.onResetRecords());
    const resetStats = actionButton("成績をリセット", "reset-stats");
    resetStats.className = "danger";
    resetStats.addEventListener("click", () => handlers && handlers.onResetStats && handlers.onResetStats());
    actions.append(exportButton, copyButton, resetRecords, resetStats);
    root.append(actions, textarea, status);
  }

  Sanma.RecordPanel = { render };
})(window);
