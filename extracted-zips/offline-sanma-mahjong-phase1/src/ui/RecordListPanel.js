(function attachRecordListPanel(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, action) {
    const node = el("button", "", label);
    node.type = "button";
    node.dataset.recordAction = action;
    return node;
  }

  function highestHandLabel(entry) {
    const result = entry.highestHand;
    if (!result || !result.score) return "最高打点: 集計不可";
    if (result.score.isYakuman) return `最高打点: ${result.score.limitName || "役満"}`;
    const parts = [];
    if (result.score.limitName) parts.push(result.score.limitName);
    if (Number(result.score.han)) parts.push(`${result.score.han}翻`);
    if (Number(result.score.fu)) parts.push(`${result.score.fu}符`);
    return `最高打点: ${parts.join(" ") || "集計不可"}`;
  }

  function render(root, input, handlers) {
    const entries = input.entries || [];
    root.innerHTML = "";
    const filters = el("div", "record-filters");
    const query = el("input", "", "");
    query.type = "search";
    query.placeholder = "日付・順位・タグで検索";
    const outcome = el("select");
    [["all", "全結果"], ["win", "和了局あり"], ["loss", "敗北あり"]].forEach(([value, label]) => {
      const option = el("option", "", label);
      option.value = value;
      outcome.appendChild(option);
    });
    const tag = el("select");
    [["all", "全タグ"], ["yakuman", "役満"], ["highScore", "高打点"]].forEach(([value, label]) => {
      const option = el("option", "", label);
      option.value = value;
      tag.appendChild(option);
    });
    filters.append(query, outcome, tag);
    const list = el("div", "record-list");

    function drawList() {
      list.innerHTML = "";
      const filtered = Sanma.RecordIndex.filter(entries, {
        query: query.value,
        outcome: outcome.value,
        tag: tag.value,
      });
      if (!filtered.length) {
        list.appendChild(el("div", "record-empty", "条件に一致する牌譜はありません。"));
        return;
      }
      filtered.forEach((entry) => {
        const item = el("article", "record-list-item");
        const summary = el("div", "record-list-summary");
        summary.append(
          el("strong", "", entry.summary),
          el("span", "record-summary", entry.createdAt || "日時不明"),
          el("span", "record-tags", entry.tags.join(" / ") || "タグなし"),
          el("span", "record-summary", highestHandLabel(entry)),
          el("span", "record-summary", `サイズ ${entry.sizeBytes.toLocaleString()} bytes / schema ${entry.schemaVersion}`)
        );
        const actions = el("div", "record-item-actions");
        const detail = button("詳細", "detail");
        detail.addEventListener("click", () => handlers.onDetail(entry.id));
        const replay = button("再生", "replay");
        replay.addEventListener("click", () => handlers.onReplay(entry.id));
        const exportButton = button("エクスポート", "export");
        exportButton.addEventListener("click", () => handlers.onExport(entry.id));
        const remove = button("削除", "delete");
        remove.className = "danger";
        remove.addEventListener("click", () => {
          if (global.confirm && !global.confirm("この牌譜を削除しますか？")) return;
          handlers.onDelete(entry.id);
        });
        actions.append(detail, replay, exportButton, remove);
        item.append(summary, actions);
        list.appendChild(item);
      });
    }

    query.addEventListener("input", drawList);
    outcome.addEventListener("change", drawList);
    tag.addEventListener("change", drawList);
    root.append(filters, list);
    drawList();
  }

  Sanma.RecordListPanel = { render, highestHandLabel };
})(window);
