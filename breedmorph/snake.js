// 個体（スネーク）データモデル・血統（家系図）・ショップ生成

const MALE_NAMES = ["レオ", "ソル", "ノア", "カイ", "ジン", "リオ", "アトラス", "ヒューゴ"];
const FEMALE_NAMES = ["ルナ", "ミラ", "ヒナ", "セラ", "ノヴァ", "アリア", "フィオナ", "エマ"];

let nextId = 1;
function makeId() {
  return "s" + nextId++;
}

function randomName(sex) {
  const list = sex === "female" ? FEMALE_NAMES : MALE_NAMES;
  return list[Math.floor(Math.random() * list.length)];
}

function createFounder(genotype, sex) {
  return {
    id: makeId(),
    name: randomName(sex),
    sex,
    genotype,
    motherId: null,
    fatherId: null,
    generation: 0,
  };
}

function createChild(mother, father) {
  const sex = Math.random() < 0.5 ? "male" : "female";
  return {
    id: makeId(),
    name: randomName(sex),
    sex,
    genotype: breed(mother.genotype, father.genotype),
    motherId: mother.id,
    fatherId: father.id,
    generation: Math.max(mother.generation, father.generation) + 1,
  };
}

// ---- 世界の状態（コレクション）----

const WORLD_STORAGE_KEY = "bpb-world-v1";

function makeFounderGenotype(traitIds) {
  const g = wildGenotype();
  for (const t of traitIds) {
    if (t.startsWith("bel:")) {
      const allele = t.slice(4);
      g.bel = [allele, allele];
    } else {
      g[t] = 2;
    }
  }
  return g;
}

function buildInitialWorld() {
  nextId = 1;
  const snakes = {};

  const founders = [
    createFounder(makeFounderGenotype([]), "male"),
    createFounder(makeFounderGenotype([]), "female"),
    createFounder(makeFounderGenotype(["pastel"]), "male"),
    createFounder(makeFounderGenotype(["pastel"]), "female"),
    createFounder(makeFounderGenotype(["spider"]), "male"),
    createFounder(makeFounderGenotype(["albino"]), "female"),
    createFounder(makeFounderGenotype(["clown"]), "male"),
    createFounder(makeFounderGenotype(["piebald"]), "female"),
    createFounder(makeFounderGenotype(["bel:mojave"]), "male"),
    createFounder(makeFounderGenotype(["bel:lesser"]), "female"),
  ];
  for (const f of founders) snakes[f.id] = f;

  // 何世代か交配させて、血統付きのショップ在庫を用意する
  const pool = Object.values(snakes);
  const shopIds = [];
  for (let i = 0; i < 8; i++) {
    const males = pool.filter((s) => s.sex === "male");
    const females = pool.filter((s) => s.sex === "female");
    const father = males[Math.floor(Math.random() * males.length)];
    const mother = females[Math.floor(Math.random() * females.length)];
    const child = createChild(mother, father);
    snakes[child.id] = child;
    pool.push(child);
    shopIds.push(child.id);
  }

  return {
    snakes,
    myCollection: [],
    shop: shopIds.map((id) => ({ snakeId: id, price: priceFor(snakes[id].genotype) })),
  };
}

function priceFor(genotype) {
  const traits = resolvePhenotype(genotype);
  const base = 3000;
  const perTrait = 4500;
  const comboBonus = comboNameFor(genotype) ? 12000 : 0;
  return base + traits.length * perTrait + comboBonus;
}

let WORLD = null;

function loadWorld() {
  if (WORLD) return WORLD;
  try {
    const raw = localStorage.getItem(WORLD_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      nextId = parsed.nextId || 1;
      WORLD = parsed.world;
      return WORLD;
    }
  } catch (e) {
    // localStorageが使えない環境ではワールドを保存せずその場限りで遊べるようにする
  }
  WORLD = buildInitialWorld();
  saveWorld();
  return WORLD;
}

function saveWorld() {
  try {
    localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify({ world: WORLD, nextId }));
  } catch (e) {
    // 保存できなくてもゲームは続行できる
  }
}

function resetWorld() {
  WORLD = buildInitialWorld();
  saveWorld();
}

function getSnake(id) {
  return loadWorld().snakes[id];
}

function myCollectionSnakes() {
  const w = loadWorld();
  return w.myCollection.map((id) => w.snakes[id]);
}

function buySnake(shopEntryIndex) {
  const w = loadWorld();
  const entry = w.shop[shopEntryIndex];
  if (!entry) return null;
  w.myCollection.push(entry.snakeId);
  w.shop.splice(shopEntryIndex, 1);
  saveWorld();
  return getSnake(entry.snakeId);
}

function breedPair(motherId, fatherId, clutchSize) {
  const w = loadWorld();
  const mother = w.snakes[motherId];
  const father = w.snakes[fatherId];
  const babies = [];
  for (let i = 0; i < clutchSize; i++) {
    const baby = createChild(mother, father);
    w.snakes[baby.id] = baby;
    w.myCollection.push(baby.id);
    babies.push(baby);
  }
  saveWorld();
  return babies;
}

function pedigreeOf(snakeId, depth) {
  const w = loadWorld();
  function build(id, remaining) {
    if (!id || remaining < 0) return null;
    const s = w.snakes[id];
    if (!s) return null;
    return {
      snake: s,
      mother: build(s.motherId, remaining - 1),
      father: build(s.fatherId, remaining - 1),
    };
  }
  return build(snakeId, depth);
}
