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
const green = "#168252";
const red = "#c73333";

function tile(suit, rank, isRed, copyIndex) {
  return TileUtil.createTile(suit, rank, copyIndex, isRed);
}

function graphic(suit, rank, isRed, copyIndex) {
  return RenderTiles.createTileGraphic(tile(suit, rank, isRed, copyIndex));
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

const normalSevenSouFills = groupFills(graphic("s", 7, false, 3));
assert(normalSevenSouFills[0] === red, "7sの既存赤アクセントが失われました");
assert(normalSevenSouFills.slice(1).every((fill) => fill === green), "7sの赤アクセント範囲が変わりました");

const normalNineSouFills = groupFills(graphic("s", 9, false, 4));
assert(
  normalNineSouFills.filter((fill) => fill === red).length === 3,
  "9sの既存赤アクセント数が変わりました"
);

const normalFivePin = graphic("p", 5, false, 5);
const redFivePin = graphic("p", 5, true, 6);
assert(
  normalFivePin.children.filter((child) => child.tagName === "circle").every((circle) => circle.attributes.fill !== red),
  "通常5pが赤くなりました"
);
assert(
  redFivePin.children.filter((child) => child.tagName === "circle").every((circle) => circle.attributes.fill === red),
  "赤5pの既存挙動が変わりました"
);

console.log("5s / red 5s tile design tests passed.");
