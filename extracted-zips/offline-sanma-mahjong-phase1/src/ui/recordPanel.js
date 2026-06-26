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

  function metricGrid(items) {
    const grid = el("div", "stats-grid advanced-stats-grid");
    items.forEach(([label, value]) => {
      const item = el("div", "stat-item");
      item.append(el("span", "info-label", label), el("strong", "info-value", value));
      grid.appendChild(item);
    });
    return grid;
  }

  function renderAdvancedStats(root, stats) {
    root.innerHTML = "";
    root.append(
      el("h3", "", "対局成績"),
      metricGrid([
        ["対局数", Sanma.AdvancedStats.display(stats.match.gamesPlayed)],
        ["1位回数", Sanma.AdvancedStats.display(stats.match.firstPlaceCount)],
        ["平均順位", Sanma.AdvancedStats.display(stats.match.averageRank, "位")],
        ["平均最終点", Sanma.AdvancedStats.display(stats.match.averageFinalPoints, "点")],
        ["最高最終点", Sanma.AdvancedStats.display(stats.match.bestFinalPoints, "点")],
      ]),
      el("h3", "", "局成績"),
      metricGrid([
        ["和了", Sanma.AdvancedStats.display(stats.hand.wins)],
        ["敗北", Sanma.AdvancedStats.display(stats.hand.losses)],
        ["放銃", Sanma.AdvancedStats.display(stats.hand.dealInCount)],
        ["ツモ和了", Sanma.AdvancedStats.display(stats.hand.tsumoWinCount)],
        ["ロン和了", Sanma.AdvancedStats.display(stats.hand.ronWinCount)],
        ["最高獲得点", Sanma.AdvancedStats.display(stats.hand.highestScore, "点")],
        ["役満和了", Sanma.AdvancedStats.display(stats.hand.yakumanHands !== undefined ? stats.hand.yakumanHands : stats.hand.yakumanCount)],
        ["役満単位", Sanma.AdvancedStats.display(stats.hand.yakumanUnits !== undefined ? stats.hand.yakumanUnits : stats.hand.yakumanCount)],
      ])
    );
    const yaku = el("div", "advanced-yaku");
    yaku.appendChild(el(
      "div",
      "record-summary",
      `最多役: ${stats.yaku.mostCommonYaku ? `${stats.yaku.mostCommonYaku.name} ${stats.yaku.mostCommonYaku.count}回` : "集計不可"}`
    ));
    const yakuList = el("ul", "record-history");
    Object.entries(stats.yaku.frequency).forEach(([name, count]) => {
      yakuList.appendChild(el("li", "", `${name}: ${count}回`));
    });
    if (!yakuList.children.length) yakuList.appendChild(el("li", "", "役データはありません。"));
    yaku.appendChild(yakuList);
    root.append(el("h3", "", "役頻度"), yaku);
    const yakumanNames = Object.entries(stats.yaku.yakumanNames);
    root.appendChild(el(
      "div",
      "record-summary",
      `役満名: ${yakumanNames.length ? yakumanNames.map(([name, count]) => `${name} ${count}回`).join(" / ") : "集計不可"}`
    ));

    const modes = el("div", "mode-breakdown");
    [
      ["高打点モード", stats.modeBreakdown.highScoreMode],
      ["チー", stats.modeBreakdown.allowChi],
      ["ツモ損", stats.modeBreakdown.tsumoLoss],
    ].forEach(([label, values]) => {
      modes.appendChild(el("div", "record-summary", `${label}: ON ${values.on} / OFF ${values.off} / 集計不可 ${values.unknown}`));
    });
    root.append(el("h3", "", "モード別"), modes);
  }

  function render(root, input, handlers) {
    const options = input || {};
    const records = options.records || [];
    const entries = options.entries || Sanma.RecordIndex.build(records);
    const advancedStats = options.advancedStats || Sanma.AdvancedStats.calculate(records);
    let selectedId = entries.length ? entries[0].id : null;
    let replayController = null;
    root.innerHTML = "";

    const tabs = el("div", "record-tabs");
    const listTab = actionButton("牌譜一覧", "tab-list");
    const replayTab = actionButton("再生", "tab-replay");
    const statsTab = actionButton("成績", "tab-stats");
    tabs.append(listTab, replayTab, statsTab);

    const listPanel = el("section", "record-tab-panel");
    const replayPanel = el("section", "record-tab-panel");
    const statsPanel = el("section", "record-tab-panel");
    const status = el("div", "transfer-status");
    const detail = el("pre", "record-detail");
    const textarea = el("textarea", "transfer-textarea");
    textarea.id = "recordsJson";
    textarea.placeholder = "選択した牌譜JSON";
    const importTextarea = el("textarea", "transfer-textarea");
    importTextarea.id = "recordImportJson";
    importTextarea.placeholder = "インポートする牌譜JSONを貼り付けてください";

    function selectedRecord(recordId) {
      return records.find((record) => record.id === (recordId || selectedId)) || null;
    }

    function showTab(target) {
      [listPanel, replayPanel, statsPanel].forEach((panel) => panel.hidden = panel !== target);
      [listTab, replayTab, statsTab].forEach((button) => button.classList.remove("active"));
      if (target === listPanel) listTab.classList.add("active");
      if (target === replayPanel) replayTab.classList.add("active");
      if (target === statsPanel) statsTab.classList.add("active");
      if (target !== replayPanel && replayController) replayController.stop();
    }

    function showDetail(recordId) {
      selectedId = recordId;
      const record = selectedRecord();
      const entry = entries.find((item) => item.id === recordId);
      detail.textContent = record ? JSON.stringify({
        summary: entry ? entry.summary : "",
        tags: entry ? entry.tags : [],
        rounds: record.rounds.length,
        finalPoints: record.finalPoints,
        finalRankings: record.finalRankings,
        matchEndReason: record.matchEndReason,
      }, null, 2) : "牌譜が見つかりません。";
      status.textContent = "牌譜の詳細を表示しました。";
    }

    function showReplay(recordId) {
      selectedId = recordId;
      const record = selectedRecord();
      replayPanel.innerHTML = "";
      if (!record) {
        replayPanel.appendChild(el("div", "record-empty", "再生する牌譜がありません。"));
      } else {
        replayController = Sanma.ReplayViewer.mount(replayPanel, record);
      }
      showTab(replayPanel);
    }

    Sanma.RecordListPanel.render(listPanel, { entries }, {
      onDetail: showDetail,
      onReplay: showReplay,
      onExport: (recordId) => {
        selectedId = recordId;
        const record = selectedRecord();
        textarea.value = record ? JSON.stringify(record, null, 2) : "";
        status.textContent = record ? "選択牌譜をエクスポート表示しました。" : "牌譜が見つかりません。";
      },
      onDelete: (recordId) => handlers && handlers.onDelete && handlers.onDelete(recordId),
    });
    listPanel.append(el("h3", "", "詳細"), detail);

    renderAdvancedStats(statsPanel, advancedStats);

    const transferActions = el("div", "panel-actions transfer-actions");
    const copyButton = actionButton("コピー", "copy");
    copyButton.id = "copyRecordsButton";
    copyButton.textContent = "選択牌譜をコピー";
    copyButton.addEventListener("click", () => {
      const record = selectedRecord();
      const text = record ? JSON.stringify(record, null, 2) : "";
      textarea.value = text;
      if (handlers && handlers.onCopy) handlers.onCopy(text, status);
    });
    const exportButton = actionButton("エクスポート", "export");
    exportButton.id = "exportRecordsButton";
    exportButton.addEventListener("click", () => {
      const record = selectedRecord();
      textarea.value = record ? JSON.stringify(record, null, 2) : "";
      status.textContent = record ? "選択牌譜JSONを表示しました。" : "牌譜がありません。";
    });
    const copyDebug = actionButton("デバッグデータをコピー", "copy-debug");
    copyDebug.id = "copyRecordDebugButton";
    copyDebug.addEventListener("click", () => {
      const text = JSON.stringify({
        index: entries,
        advancedStats,
        diagnostics: options.diagnostics || {},
      }, null, 2);
      textarea.value = text;
      if (handlers && handlers.onCopy) handlers.onCopy(text, status);
    });
    const resetRecords = actionButton("牌譜をリセット", "reset-records");
    resetRecords.id = "resetRecordsButton";
    resetRecords.className = "danger";
    resetRecords.addEventListener("click", () => handlers && handlers.onResetRecords && handlers.onResetRecords());
    const resetStats = actionButton("成績をリセット", "reset-stats");
    resetStats.id = "resetStatsButton";
    resetStats.className = "danger";
    resetStats.addEventListener("click", () => handlers && handlers.onResetStats && handlers.onResetStats());
    transferActions.append(copyButton, exportButton, copyDebug, resetRecords, resetStats);

    const importActions = el("div", "panel-actions transfer-actions");
    const importButton = actionButton("インポート", "import");
    importButton.id = "importRecordButton";
    importButton.addEventListener("click", () => {
      if (handlers && handlers.onImport) handlers.onImport(importTextarea.value, status);
    });
    importActions.appendChild(importButton);

    listTab.addEventListener("click", () => showTab(listPanel));
    replayTab.addEventListener("click", () => showReplay(selectedId));
    statsTab.addEventListener("click", () => showTab(statsPanel));

    root.append(
      tabs,
      listPanel,
      replayPanel,
      statsPanel,
      el("h3", "", "エクスポート・デバッグ"),
      transferActions,
      textarea,
      el("h3", "", "インポート"),
      importTextarea,
      importActions,
      status
    );
    if (selectedId) showDetail(selectedId);
    showTab(listPanel);
  }

  Sanma.RecordPanel = { render, renderAdvancedStats };
})(window);
