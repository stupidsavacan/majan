(function markDeprecatedRootLoader(global) {
  "use strict";

  const message = [
    "root src/main.js は実行入口ではありません。",
    "ゲームを起動するにはリポジトリ直下の index.html を開いてください。",
  ].join(" ");

  global.SanmaDeprecatedRootLoader = Object.freeze({
    canonicalEntryPoint: "index.html",
    canonicalMain: "extracted-zips/offline-sanma-mahjong-phase1/src/main.js",
    message,
  });

  if (global.console && typeof global.console.warn === "function") {
    global.console.warn(message);
  }
})(window);
