// 個体（スネーク）データモデル・血統（家系図）・ショップ・経営要素（資金/ケージ上限/依頼）

let nextId = 1;
function makeId() {
  return "s" + nextId++;
}
function specimenNumber(snake) {
  return "#" + snake.id.slice(1);
}

// ---- 個体差・偶発イベントのパラメータ ----
// 「ヘテロ個体の一部にわずかな特徴（het tell）が出ることがある」というブリーダー界隈の言説の再現。
// 確実な判別方法ではないため、あくまで見た目のゆらぎとして低確率で表現する。
const HET_TELL_CHANCE = 0.12;
// 突然変異: 実際のボールパイソンの新モルフも、もとは通常の繁殖の中で偶然発見されてきた。
// ゲーム上の演出として、既存の遺伝子プールの中から低確率で「本来持っていないはずの遺伝子」が
// 発現することがある、という形で再現する（現実の突然変異の発生率とは無関係の、ゲーム的な確率設定）。
const MUTATION_CHANCE = 0.015;

function computeFlareTraits(genotype) {
  const flares = [];
  for (const g of GENES) {
    if (g.type === GENE_TYPE.RECESSIVE && genotype[g.id] === 1 && Math.random() < HET_TELL_CHANCE) {
      flares.push(g.id);
    }
  }
  return flares;
}

function maybeApplyMutation(genotype) {
  if (Math.random() >= MUTATION_CHANCE) return null;
  const candidates = GENES.filter((g) => (genotype[g.id] ?? 0) === 0);
  if (candidates.length === 0) return null;
  const gene = candidates[Math.floor(Math.random() * candidates.length)];
  genotype[gene.id] = gene.type === GENE_TYPE.RECESSIVE ? 2 : 1;
  return gene.id;
}

// もようの「個体差シード」。親から弱めに遺伝させることで、交配で生まれた子が
// 親のどちらかのもようの雰囲気を薄く受け継ぐことがあるようにする（社長指定: やや弱め）。
const PATTERN_INHERIT_CHANCE = 0.3;
const PATTERN_INHERIT_JITTER = 4.0e8;
const SEED_MAX = 2 ** 31;

function randomPatternSeed() {
  return Math.floor(Math.random() * SEED_MAX);
}

function inheritedPatternSeed(mother, father) {
  if (Math.random() < PATTERN_INHERIT_CHANCE) {
    const parent = Math.random() < 0.5 ? mother : father;
    const base = parent.patternSeed ?? randomPatternSeed();
    const jitter = Math.floor((Math.random() - 0.5) * 2 * PATTERN_INHERIT_JITTER);
    return Math.abs((base + jitter) % SEED_MAX);
  }
  return randomPatternSeed();
}

function createFounder(genotype, sex) {
  return {
    id: makeId(),
    sex,
    genotype,
    motherId: null,
    fatherId: null,
    generation: 0,
    patternSeed: randomPatternSeed(),
    flareTraits: computeFlareTraits(genotype),
    mutationGeneId: null,
  };
}

function createChild(mother, father) {
  const sex = Math.random() < 0.5 ? "male" : "female";
  const genotype = breed(mother.genotype, father.genotype);
  const mutationGeneId = maybeApplyMutation(genotype);
  return {
    id: makeId(),
    sex,
    genotype,
    motherId: mother.id,
    fatherId: father.id,
    generation: Math.max(mother.generation, father.generation) + 1,
    patternSeed: inheritedPatternSeed(mother, father),
    flareTraits: computeFlareTraits(genotype),
    mutationGeneId,
  };
}

// ---- 経営パラメータ ----
const CAGE_LIMIT = 10;
const START_MONEY = 20000;
const RELEASE_REFUND_RATE = 0.4;
const ORDER_SLOTS = 3;

const WORLD_STORAGE_KEY = "bpb-world-v2";

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

function priceFor(genotype) {
  const traits = resolvePhenotype(genotype);
  const base = 3000;
  const perTrait = 4500;
  const comboBonus = comboNameFor(genotype) ? 12000 : 0;
  return base + traits.length * perTrait + comboBonus;
}

// ---- 図鑑の発見状況 ----
function discoveryKeysFor(genotype) {
  const keys = resolvePhenotype(genotype).map((t) => t.id);
  const combo = comboNameFor(genotype);
  if (combo) keys.push("combo:" + combo);
  return keys;
}

function recordDiscoveries(world, snake) {
  for (const key of discoveryKeysFor(snake.genotype)) {
    if (!world.discovered.includes(key)) world.discovered.push(key);
  }
}

function dexTotalCount() {
  // 通常遺伝子の顕性/潜性/不完全顕性の可視形質 + BELロクスの各ヘテロ/スーパー + 実装済みコンボ名
  let total = 0;
  for (const g of GENES) total += g.type === GENE_TYPE.RECESSIVE ? 1 : 2;
  total += BEL_LOCUS.alleles.length + 1; // 各アレルのヘテロ + BEL共通形
  total += COMBO_NAMES.length;
  return total;
}

// ---- 顧客からの依頼 ----
function randomOrderRequirement() {
  const pool = [];
  for (const g of GENES) {
    pool.push({ kind: "gene", geneId: g.id, label: g.nameJa + "を持つ個体" });
  }
  for (const c of COMBO_NAMES) {
    pool.push({ kind: "combo", comboName: c.name, label: c.name + "の個体" });
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function rewardForRequirement(req) {
  if (req.kind === "combo") return 18000 + Math.floor(Math.random() * 6000);
  return 8000 + Math.floor(Math.random() * 4000);
}

function makeOrder() {
  const req = randomOrderRequirement();
  return { id: "o" + Math.random().toString(36).slice(2, 8), req, reward: rewardForRequirement(req) };
}

function snakeMatchesOrder(snake, order) {
  if (order.req.kind === "combo") return comboNameFor(snake.genotype) === order.req.comboName;
  const traits = resolvePhenotype(snake.genotype);
  return traits.some((t) => t.id === order.req.geneId || t.id.startsWith("bel-het-" + order.req.geneId));
}

// ---- ワールド構築 ----
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

  const world = {
    snakes,
    myCollection: [],
    shop: shopIds.map((id) => ({ snakeId: id, price: priceFor(snakes[id].genotype) })),
    money: START_MONEY,
    discovered: [],
    orders: [],
    onboardingDone: false,
  };
  while (world.orders.length < ORDER_SLOTS) world.orders.push(makeOrder());
  return world;
}

function hasSave() {
  try {
    return localStorage.getItem(WORLD_STORAGE_KEY) !== null;
  } catch (e) {
    return false;
  }
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
    // localStorageが使えない環境でもその場限りで遊べるようにする
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

function cageSpaceLeft() {
  return CAGE_LIMIT - loadWorld().myCollection.length;
}

function buySnake(shopEntryIndex) {
  const w = loadWorld();
  const entry = w.shop[shopEntryIndex];
  if (!entry) return { ok: false, reason: "not-found" };
  if (w.myCollection.length >= CAGE_LIMIT) return { ok: false, reason: "cage-full" };
  if (w.money < entry.price) return { ok: false, reason: "no-money" };
  w.money -= entry.price;
  w.myCollection.push(entry.snakeId);
  recordDiscoveries(w, w.snakes[entry.snakeId]);
  w.shop.splice(shopEntryIndex, 1);
  saveWorld();
  return { ok: true, snake: getSnake(entry.snakeId) };
}

function releaseSnake(snakeId) {
  const w = loadWorld();
  const idx = w.myCollection.indexOf(snakeId);
  if (idx === -1) return false;
  const refund = Math.floor(priceFor(w.snakes[snakeId].genotype) * RELEASE_REFUND_RATE);
  w.money += refund;
  w.myCollection.splice(idx, 1);
  saveWorld();
  return refund;
}

function breedPair(motherId, fatherId, clutchSize) {
  const w = loadWorld();
  const mother = w.snakes[motherId];
  const father = w.snakes[fatherId];
  const allowed = Math.max(0, Math.min(clutchSize, CAGE_LIMIT - w.myCollection.length));
  const babies = [];
  for (let i = 0; i < allowed; i++) {
    const baby = createChild(mother, father);
    w.snakes[baby.id] = baby;
    w.myCollection.push(baby.id);
    recordDiscoveries(w, baby);
    babies.push(baby);
  }
  saveWorld();
  return { babies, requested: clutchSize, allowed };
}

function fulfillOrder(orderId, snakeId) {
  const w = loadWorld();
  const order = w.orders.find((o) => o.id === orderId);
  const snake = w.snakes[snakeId];
  if (!order || !snake) return false;
  if (!snakeMatchesOrder(snake, order)) return false;
  const idx = w.myCollection.indexOf(snakeId);
  if (idx === -1) return false;
  w.myCollection.splice(idx, 1);
  w.money += order.reward;
  w.orders = w.orders.filter((o) => o.id !== orderId);
  w.orders.push(makeOrder());
  saveWorld();
  return true;
}

// チュートリアルで生まれた個体を、実際のコレクションに正式な個体として迎え入れる
function grantSnakeFromGenotype(genotype, sex) {
  const w = loadWorld();
  if (w.myCollection.length >= CAGE_LIMIT) return null;
  const snake = {
    id: makeId(),
    sex: sex || (Math.random() < 0.5 ? "male" : "female"),
    genotype,
    motherId: null,
    fatherId: null,
    generation: 0,
    patternSeed: randomPatternSeed(),
    flareTraits: computeFlareTraits(genotype),
    mutationGeneId: null,
  };
  w.snakes[snake.id] = snake;
  w.myCollection.push(snake.id);
  recordDiscoveries(w, snake);
  saveWorld();
  return snake;
}

function completeOnboarding() {
  const w = loadWorld();
  w.onboardingDone = true;
  saveWorld();
}

function pedigreeOf(snakeId, depth) {
  const w = loadWorld();
  function build(id, remaining) {
    if (!id || remaining < 0) return null;
    const s = w.snakes[id];
    if (!s) return null;
    return { snake: s, mother: build(s.motherId, remaining - 1), father: build(s.fatherId, remaining - 1) };
  }
  return build(snakeId, depth);
}
