const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { assert, projectRoot } = require("./test-helpers");

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.attributes = {};
    this.children = [];
    this.className = "";
    this.dataset = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

global.window = global;
global.Sanma = {};
global.document = {
  createElementNS(namespace, tag) {
    return new FakeElement(tag);
  },
  createElement(tag) {
    return new FakeElement(tag);
  },
  createDocumentFragment() {
    return new FakeElement("fragment");
  },
};

["src/game/Tile.js", "src/ui/renderTiles.js"].forEach((file) => {
  vm.runInThisContext(fs.readFileSync(path.resolve(projectRoot, file), "utf8"), { filename: file });
});

const { TileUtil, RenderTiles } = global.Sanma;
const black = "#202020";
const green = "#168252";
const red = "#c73333";
const ivory = "#fffaf0";

function tile(suit, rank, isRed, copyIndex) {
  return TileUtil.createTile(suit, rank, copyIndex, isRed);
}

function graphic(suit, rank, isRed, copyIndex) {
  return RenderTiles.createTileGraphic(tile(suit, rank, isRed, copyIndex));
}

function circles(svg) {
  return svg.children.filter((child) => child.tagName === "circle");
}

function bambooGroups(svg) {
  return svg.children.filter((child) => child.tagName === "g");
}

function groupFills(svg) {
  return bambooGroups(svg).map((group) => group.children[0].attributes.fill);
}

function geometry(svg) {
  return bambooGroups(svg).map((group) => ({
    transform: group.attributes.transform,
    parts: group.children.map((part) => ({
      tagName: part.tagName,
      attributes: Object.fromEntries(
        Object.entries(part.attributes).filter(([name]) => name !== "fill")
      ),
    })),
  }));
}

function circleTriples(svg) {
  const nodes = circles(svg);
  const triples = [];
  for (let i = 0; i < nodes.length; i += 3) {
    triples.push(nodes.slice(i, i + 3).map((node) => node.attributes));
  }
  return triples;
}

const normalFiveSou = graphic("s", 5, false, 1);
const redFiveSou = graphic("s", 5, true, 2);
assert(bambooGroups(normalFiveSou).length === 5, "通常5sの竹要素が5本ではありません");
assert(bambooGroups(redFiveSou).length === 5, "赤5sの竹要素が5本ではありません");
assert(
  JSON.stringify(groupFills(normalFiveSou)) === JSON.stringify([green, green, red, green, green]),
  "通常5sが中央赤・外側4本緑ではありません"
);
assert(groupFills(redFiveSou).every((fill) => fill === red), "赤5sの5本すべてが赤ではありません");
assert(
  JSON.stringify(geometry(normalFiveSou)) === JSON.stringify(geometry(redFiveSou)),
  "通常5sと赤5sの形状・配置が一致しません"
);

const whiteDragon = graphic("z", 5, false, 3);
assert(whiteDragon.children.length === 0, "白牌のSVG面が無地ではありません");
assert(TileUtil.getTileAriaLabel(tile("z", 5, false, 4)) === "白", "白牌のaria labelが変わりました");

const sevenPinTriples = circleTriples(graphic("p", 7, false, 5));
const expectedSevenPin = [
  { cx: "21.5", cy: "17.5", r: "8.9", fill: red, innerFill: red },
  { cx: "42", cy: "28", r: "8.9", fill: red, innerFill: red },
  { cx: "25.5", cy: "62", r: "8.9", fill: black, innerFill: ivory },
  { cx: "61.5", cy: "39", r: "8.9", fill: red, innerFill: red },
  { cx: "54", cy: "62", r: "8.9", fill: black, innerFill: ivory },
  { cx: "26", cy: "89", r: "8.9", fill: black, innerFill: ivory },
  { cx: "54", cy: "89", r: "8.9", fill: black, innerFill: ivory },
];
assert(sevenPinTriples.length === expectedSevenPin.length, "7pの円数がユーザー編集SVGと一致しません");
sevenPinTriples.forEach((triple, index) => {
  const [outer, inner, dot] = triple;
  const expected = expectedSevenPin[index];
  assert(outer.cx === expected.cx && outer.cy === expected.cy, `7pの${index + 1}個目の座標が違います`);
  assert(outer.r === expected.r, `7pの${index + 1}個目の外円半径が違います`);
  assert(outer.fill === expected.fill, `7pの${index + 1}個目の外円色が違います`);
  assert(inner.fill === expected.innerFill, `7pの${index + 1}個目の内円色が違います`);
  assert(dot.fill === expected.fill, `7pの${index + 1}個目の中心点色が違います`);
});

const eightSouTransforms = bambooGroups(graphic("s", 8, false, 6)).map((group) => group.attributes.transform);
assert(
  JSON.stringify(eightSouTransforms) === JSON.stringify([
    "translate(15.237 25.988) rotate(0)",
    "translate(60.388 26.869) rotate(0)",
    "translate(46.75 32.25) rotate(130)",
    "translate(28.375 32.125) rotate(50)",
    "translate(15.363 80.119) rotate(0)",
    "translate(60.388 81.755) rotate(0)",
    "translate(28.97 74.103) rotate(130)",
    "translate(46.625 75.5) rotate(50)",
  ]),
  "8sの座標またはrotate(50)/rotate(130)がユーザー編集SVGと一致しません"
);

const normalSevenSouFills = groupFills(graphic("s", 7, false, 7));
assert(normalSevenSouFills[0] === red, "7sの既存赤アクセントが失われました");
assert(normalSevenSouFills.slice(1).every((fill) => fill === green), "7sの赤アクセント範囲が変わりました");

const normalNineSouFills = groupFills(graphic("s", 9, false, 8));
assert(
  normalNineSouFills.filter((fill) => fill === red).length === 3,
  "9sの既存赤アクセント数が変わりました"
);

const normalFivePin = graphic("p", 5, false, 9);
const redFivePin = graphic("p", 5, true, 10);
assert(
  circles(normalFivePin).every((circle) => circle.attributes.fill !== red),
  "通常5pが赤くなりました"
);
assert(
  circles(redFivePin).every((circle) => circle.attributes.fill === red),
  "赤5pの既存挙動が変わりました"
);

console.log("Phase 9.2 tile design follow-up tests passed.");
