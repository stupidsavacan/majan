const fs = require("fs");
const path = require("path");
const { assert, loadModules, projectRoot } = require("./test-helpers");

const Sanma = loadModules();
const preEngineModules = [
  "CallResolver",
  "DrawContext",
  "RecordFlow",
  "RoundLifecycle",
  "TurnFlow",
  "WinFlow",
  "CallFlow",
  "KanFlow",
  "RecoveryFlow",
  "UiStateView",
];
const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
const rootIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "index.html"), "utf8");
const testHelpers = fs.readFileSync(path.resolve(projectRoot, "tests", "test-helpers.js"), "utf8");
const mainSource = fs.readFileSync(path.resolve(projectRoot, "src", "main.js"), "utf8");

function assertOrder(source, prefix) {
  const gameEngineIndex = source.indexOf(`${prefix}GameEngine.js`);
  assert(gameEngineIndex >= 0, "GameEngine.js must be loaded");
  preEngineModules.forEach((name) => {
    const modulePath = `${prefix}${name}.js`;
    const moduleIndex = source.indexOf(modulePath);
    assert(moduleIndex >= 0, `${modulePath} must be loaded`);
    assert(moduleIndex < gameEngineIndex, `${modulePath} must load before GameEngine.js`);
  });
}

assertOrder(canonicalIndex, "src/game/");
assertOrder(rootIndex, "extracted-zips/offline-sanma-mahjong-phase1/src/game/");
assertOrder(testHelpers, "src/game/");

preEngineModules.forEach((name) => {
  assert(Sanma[name], `Sanma.${name} must be attached`);
  assert(mainSource.includes(`"${name}"`), `diagnostics must include ${name}`);
});
assert(mainSource.includes("modules_loaded: requiredModules.every"), "diagnostics must detect missing modules");

const simulatedModules = Object.assign({}, Sanma);
delete simulatedModules.TurnFlow;
const missing = preEngineModules.filter((name) => !simulatedModules[name]);
assert(missing.length === 1 && missing[0] === "TurnFlow", "missing module detection must catch a removed flow module");

console.log("Phase 16 GameEngine module load-order tests passed.");
