(function attachRenderTiles(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;

  function createTileButton(tile, options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "tile",
      `tile-${tile.suit}`,
      tile.isRed ? "tile-red" : "",
      options && options.small ? "tile-small" : "",
      options && options.faceDown ? "tile-back" : "",
    ].filter(Boolean).join(" ");
    button.dataset.instanceId = tile.instanceId;
    button.setAttribute("aria-label", TileUtil.getTileAriaLabel(tile));

    const main = document.createElement("span");
    main.className = "tile-main";
    main.textContent = tile.suit === "z" ? TileUtil.getTileLabel(tile) : String(tile.rank);

    const suit = document.createElement("span");
    suit.className = "tile-suit";
    suit.textContent = tile.suit === "z" ? "" : TileUtil.suitLabels[tile.suit];

    const red = document.createElement("span");
    red.className = "tile-red-dot";
    red.textContent = tile.isRed ? "●" : "";

    button.append(main, suit, red);
    return button;
  }

  function renderTileRow(container, tiles, options) {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    tiles.forEach((tile) => fragment.appendChild(createTileButton(tile, options)));
    container.appendChild(fragment);
  }

  Sanma.RenderTiles = { createTileButton, renderTileRow };
})(window);
