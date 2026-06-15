const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { assert, gameModules, projectRoot } = require("./test-helpers");

const seedPolicyPath = path.resolve(projectRoot, "src/game/SeedPolicy.js");
assert(fs.existsSync(seedPolicyPath), "SeedPolicy.jsが存在しません");
assert(
  gameModules.indexOf("src/game/SeedPolicy.js") < gameModules.indexOf("src/game/Wall.js"),
  "test-helpersがSeedPolicy.jsをWall.jsより前に読み込みません"
);

global.window = global;
global.Sanma = {};
vm.runInThisContext(fs.readFileSync(seedPolicyPath, "utf8"), { filename: "src/game/SeedPolicy.js" });
assert(Sanma.SeedPolicy && Sanma.SeedPolicy.MAX_SEED_LENGTH === 128, "Wall作成前にSeedPolicyが利用できません");
vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, "src/game/Tile.js"), "utf8"), { filename: "src/game/Tile.js" });
vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, "src/game/Wall.js"), "utf8"), { filename: "src/game/Wall.js" });
assert(Sanma.SeedPolicy.validateSeed("s".repeat(128)).ok, "SeedPolicyが128文字seedを拒否しました");
assert(!Sanma.SeedPolicy.validateSeed("s".repeat(129)).ok, "SeedPolicyが129文字seedを受理しました");
let wallRejected = false;
try {
  new Sanma.Wall({ northMode: "kita-dora", redDoraMode: "standard" }, { seed: "s".repeat(129) });
} catch (error) {
  wallRejected = error.message.includes("128");
}
assert(wallRejected, "WallがSeedPolicy経由で129文字seedを拒否しません");

const canonicalIndex = fs.readFileSync(path.resolve(projectRoot, "index.html"), "utf8");
const rootIndex = fs.readFileSync(path.resolve(projectRoot, "..", "..", "index.html"), "utf8");
[canonicalIndex, rootIndex].forEach((source, index) => {
  const seed = source.indexOf("SeedPolicy.js");
  const wall = source.indexOf("Wall.js");
  const engine = source.indexOf("GameEngine.js");
  const main = source.indexOf("src/main.js");
  assert(seed >= 0 && seed < wall && seed < engine && seed < main, `${index ? "root" : "canonical"} indexのSeedPolicy読込順が不正です`);
});

const { loadModules } = require("./test-helpers");
const loaded = loadModules();
let engineRejected = false;
try {
  new loaded.GameEngine({ ruleConfig: {}, seed: "e".repeat(129), onChange() {} });
} catch (error) {
  engineRejected = error.message.includes("128");
}
assert(engineRejected, "GameEngineが129文字seedを拒否しません");

console.log("Phase 14.2 follow-up SeedPolicy module tests passed.");
