(function attachRenderTiles(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;
  const ns = "http://www.w3.org/2000/svg";
  const colors = {
    black: "#202020",
    blue: "#2455a4",
    green: "#168252",
    red: "#c73333",
    white: "#ffffff",
    line: "#0b5131",
  };
  const pin = {
    1: [[40, 56]],
    2: [[25, 33], [55, 79]],
    3: [[25, 30], [40, 56], [55, 82]],
    4: [[23, 31], [57, 31], [23, 81], [57, 81]],
    5: [[23, 27], [57, 27], [40, 56], [23, 85], [57, 85]],
    6: [[24, 24], [56, 24], [24, 56], [56, 56], [24, 88], [56, 88]],
    7: [[24, 22], [56, 22], [24, 48], [56, 48], [40, 67], [24, 92], [56, 92]],
    8: [[24, 18], [56, 18], [24, 43], [56, 43], [24, 69], [56, 69], [24, 94], [56, 94]],
    9: [[18, 22], [40, 22], [62, 22], [18, 56], [40, 56], [62, 56], [18, 90], [40, 90], [62, 90]],
  };
  const sou = {
    1: [[40, 56]],
    2: [[27, 35], [53, 77]],
    3: [[26, 29], [40, 56], [54, 83]],
    4: [[25, 32], [55, 32], [25, 80], [55, 80]],
    5: [[25, 28], [55, 28], [40, 56], [25, 84], [55, 84]],
    6: [[24, 23], [56, 23], [24, 56], [56, 56], [24, 89], [56, 89]],
    7: [[24, 20], [56, 20], [24, 47], [56, 47], [40, 67], [24, 94], [56, 94]],
    8: [[23, 18], [57, 18], [23, 43], [57, 43], [23, 69], [57, 69], [23, 94], [57, 94]],
    9: [[18, 21], [40, 21], [62, 21], [18, 56], [40, 56], [62, 56], [18, 91], [40, 91], [62, 91]],
  };

  function svgElement(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes || {}).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
  }

  function addText(svg, text, x, y, size, fill) {
    const node = svgElement("text", {
      x,
      y,
      fill,
      "font-size": size,
      "font-family": '"Yuji Mai Embedded", "Yuji Mai", "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif',
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    });
    node.textContent = text;
    svg.appendChild(node);
  }

  function renderManzu(svg, tile) {
    const one = tile.rank === 1;
    addText(svg, one ? "一" : "九", 40, 112 * 0.32, 112 * (one ? 0.41 : 0.37), colors.black);
    addText(svg, "萬", 40, 112 * (one ? 0.67 : 0.72), 112 * 0.39, colors.red);
  }

  function renderPinzu(svg, tile) {
    const layouts = {
      1: [[40, 56]],
      2: [[27, 35], [53, 77]],
      3: [[26, 31], [40, 56], [54, 81]],
      4: [[25, 32], [55, 32], [25, 80], [55, 80]],
      5: [[25, 30], [55, 30], [40, 56], [25, 82], [55, 82]],
      6: [[26, 25], [54, 25], [26, 56], [54, 56], [26, 87], [54, 87]],
      7: [[26, 23], [54, 23], [26, 49], [54, 49], [40, 66], [26, 89], [54, 89]],
      8: [[26, 20], [54, 20], [26, 44], [54, 44], [26, 68], [54, 68], [26, 92], [54, 92]],
      9: [[20, 24], [40, 24], [60, 24], [20, 56], [40, 56], [60, 56], [20, 88], [40, 88], [60, 88]],
    };
    const customPinDesigns = {
      7: [
        { cx: 21.5, cy: 17.5, r: 8.9, fill: colors.red, innerFill: colors.red },
        { cx: 42, cy: 28, r: 8.9, fill: colors.red, innerFill: colors.red },
        { cx: 25.5, cy: 62, r: 8.9, fill: colors.black, innerFill: "#fffaf0" },
        { cx: 61.5, cy: 39, r: 8.9, fill: colors.red, innerFill: colors.red },
        { cx: 54, cy: 62, r: 8.9, fill: colors.black, innerFill: "#fffaf0" },
        { cx: 26, cy: 89, r: 8.9, fill: colors.black, innerFill: "#fffaf0" },
        { cx: 54, cy: 89, r: 8.9, fill: colors.black, innerFill: "#fffaf0" },
      ],
    };
    const customDesign = customPinDesigns[tile.rank];
    if (customDesign) {
      customDesign.forEach(({ cx, cy, r, fill, innerFill }) => {
        svg.appendChild(svgElement("circle", { cx, cy, r, fill }));
        svg.appendChild(svgElement("circle", { cx, cy, r: r * 0.56, fill: innerFill }));
        svg.appendChild(svgElement("circle", { cx, cy, r: r * 0.22, fill }));
      });
      return;
    }
    const layout = layouts[tile.rank] || pin[tile.rank] || [];
    const radius = tile.rank === 1 ? 16.8 : 8.9;
    const isRedFive = tile.isRed && tile.rank === 5;
    layout.forEach(([cx, cy]) => {
      const ink = isRedFive ? colors.red : colors.black;
      svg.appendChild(svgElement("circle", { cx, cy, r: radius, fill: ink }));
      svg.appendChild(svgElement("circle", {
        cx,
        cy,
        r: radius * 0.56,
        fill: isRedFive ? colors.red : "#fffaf0",
      }));
      svg.appendChild(svgElement("circle", { cx, cy, r: radius * 0.22, fill: ink }));
    });
  }

  function renderSouzu(svg, tile) {
    const layouts = {
      1: [[40, 56]],
      2: [[29, 38], [51, 74]],
      3: [[28, 31], [40, 56], [52, 81]],
      4: [[28, 35], [52, 35], [28, 77], [52, 77]],
      5: [[28, 32], [52, 32], [40, 56], [28, 80], [52, 80]],
      6: [[29, 25], [51, 25], [29, 56], [51, 56], [29, 87], [51, 87]],
      7: [[40.4, 20.2], [21, 51.6], [40.4, 51.6], [60, 51.6], [21, 74.2], [40.4, 74.2], [60, 74.2]],
      8: [
        { x: 15.237, y: 25.988, rotation: 0 },
        { x: 60.388, y: 26.869, rotation: 0 },
        { x: 46.75, y: 32.25, rotation: 130 },
        { x: 28.375, y: 32.125, rotation: 50 },
        { x: 15.363, y: 80.119, rotation: 0 },
        { x: 60.388, y: 81.755, rotation: 0 },
        { x: 28.97, y: 74.103, rotation: 130 },
        { x: 46.625, y: 75.5, rotation: 50 },
      ],
      9: [[20, 24], [40, 24], [60, 24], [20, 56], [40, 56], [60, 56], [20, 88], [40, 88], [60, 88]],
    };
    const designRed = { 5: { 2: true }, 7: { 0: true }, 9: { 1: true, 4: true, 7: true } };
    const focusRanks = { 2: true, 3: true, 4: true, 5: true, 6: true };
    const cleanedRanks = { 7: true, 8: true, 9: true };
    const layout = layouts[tile.rank] || sou[tile.rank] || [];
    const focused = Boolean(focusRanks[tile.rank]);
    const cleaned = Boolean(cleanedRanks[tile.rank]);
    const stemWidth = cleaned ? 4.464 : focused ? 6.2 : 5.4;
    const stemHeight = cleaned ? 15.552 : focused ? 21.6 : 20.2;
    const capWidth = cleaned ? 10.512 : focused ? 14.6 : 12.8;
    const capHeight = cleaned ? 3.312 : focused ? 4.6 : 4.2;
    const strokeWidth = cleaned ? 0.648 : 0.9;

    layout.forEach((entry, index) => {
      const x = Array.isArray(entry) ? entry[0] : entry.x;
      const y = Array.isArray(entry) ? entry[1] : entry.y;
      const rotation = Array.isArray(entry) ? 0 : Number(entry.rotation || 0);
      const useRed = (designRed[tile.rank] && designRed[tile.rank][index])
        || (tile.isRed && tile.rank === 5);
      const fill = useRed ? colors.red : colors.green;
      const group = svgElement("g", { transform: `translate(${x} ${y}) rotate(${rotation})` });
      group.appendChild(svgElement("rect", {
        x: -stemWidth / 2,
        y: -stemHeight / 2,
        width: stemWidth,
        height: stemHeight,
        rx: cleaned ? 0.648 : 0.9,
        fill,
        stroke: colors.line,
        "stroke-width": strokeWidth,
      }));
      group.appendChild(svgElement("rect", {
        x: -capWidth / 2,
        y: -stemHeight / 2 - capHeight / 2,
        width: capWidth,
        height: capHeight,
        rx: cleaned ? 0.576 : 0.8,
        fill,
        stroke: colors.line,
        "stroke-width": strokeWidth,
      }));
      group.appendChild(svgElement("rect", {
        x: -capWidth / 2,
        y: stemHeight / 2 - capHeight / 2,
        width: capWidth,
        height: capHeight,
        rx: cleaned ? 0.576 : 0.8,
        fill,
        stroke: colors.line,
        "stroke-width": strokeWidth,
      }));
      group.appendChild(svgElement("line", {
        x1: 0,
        y1: cleaned ? -5.288 : -stemHeight * 0.34,
        x2: 0,
        y2: cleaned ? 5.288 : stemHeight * 0.34,
        stroke: colors.line,
        "stroke-width": cleaned ? 0.756 : 1.05,
        opacity: 0.48,
        "stroke-linecap": "round",
      }));
      group.appendChild(svgElement("line", {
        x1: cleaned ? -1.518 : -stemWidth * 0.34,
        y1: 0,
        x2: cleaned ? 1.518 : stemWidth * 0.34,
        y2: 0,
        stroke: "#fff7d6",
        "stroke-width": cleaned ? 0.9 : 1.25,
        opacity: 0.72,
        "stroke-linecap": "round",
      }));
      svg.appendChild(group);
    });
  }

  function renderHonor(svg, tile) {
    if (tile.rank === 5) {
      return;
    }

    const labels = { 1: "東", 2: "南", 3: "西", 4: "北", 6: "發", 7: "中" };
    const fills = {
      1: colors.black,
      2: colors.black,
      3: colors.black,
      4: colors.black,
      6: colors.green,
      7: colors.red,
    };
    addText(svg, labels[tile.rank] || "?", 40, 58, 53, fills[tile.rank] || colors.black);
  }

  function createTileGraphic(tile) {
    const svg = svgElement("svg", {
      class: "tile-svg",
      viewBox: "0 0 80 112",
      "aria-hidden": "true",
    });
    if (tile.suit === "m") renderManzu(svg, tile);
    if (tile.suit === "p") renderPinzu(svg, tile);
    if (tile.suit === "s") renderSouzu(svg, tile);
    if (tile.suit === "z") renderHonor(svg, tile);
    return svg;
  }

  function createTileButton(tile, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "tile",
      `tile-${tile.suit}`,
      tile.isRed ? "tile-red" : "",
      options && options.small ? "tile-small" : "",
    ].filter(Boolean).join(" ");
    button.dataset.instanceId = tile.instanceId;
    button.setAttribute("aria-label", TileUtil.getTileAriaLabel(tile));
    button.appendChild(createTileGraphic(tile));
    return button;
  }

  function renderTileRow(container, tiles, options) {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    (Array.isArray(tiles) ? tiles : [])
      .filter(Boolean)
      .forEach((tile) => fragment.appendChild(createTileButton(tile, options)));
    container.appendChild(fragment);
  }

  Sanma.RenderTiles = { createTileButton, createTileGraphic, renderTileRow };
})(window);
