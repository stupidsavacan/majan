(function loadValidatedGame(document) {
  "use strict";

  const currentScript = document.currentScript;
  const sourceRoot = new URL(
    "../extracted-zips/offline-sanma-mahjong-phase1/src/",
    currentScript && currentScript.src ? currentScript.src : document.baseURI
  );
  const scripts = [
    "game/RuleConfig.js",
    "game/Tile.js",
    "game/HandAnalysis.js",
    "game/Wall.js",
    "game/Player.js",
    "game/GameEngine.js",
    "storage/settingsStorage.js",
    "ui/renderTiles.js",
    "ui/renderTable.js",
    "ui/settingsPanel.js",
    "main.js",
  ];

  function showLoadError(path) {
    const messagePanel = document.getElementById("messagePanel");
    if (messagePanel) {
      messagePanel.textContent = `ゲームファイルを読み込めませんでした: ${path}`;
    }
    console.error(`Failed to load game script: ${path}`);
  }

  function loadNext(index) {
    if (index >= scripts.length) return;

    const script = document.createElement("script");
    script.src = new URL(scripts[index], sourceRoot).href;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => showLoadError(scripts[index]);
    document.head.appendChild(script);
  }

  loadNext(0);
})(document);
