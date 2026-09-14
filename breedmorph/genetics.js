// ボールパイソン遺伝エンジン
// データの出典・確度は ../genetics-research.md を参照。
// MVPでは「確度: 確認済み」の遺伝子を中心に採用している。

const GENE_TYPE = {
  RECESSIVE: "recessive", // 潜性（旧: 劣性）: 対立遺伝子が2つ揃って初めて発現
  DOMINANT: "dominant", // 顕性（旧: 優性）: 1つで発現
  INCOMPLETE: "incomplete", // 不完全顕性・共優性: 1つで発現、2つでスーパー体
};

// 通常ロクス（対立遺伝子が「野生型 or 変異型」の2種類のみ）の遺伝子一覧
const GENES = [
  {
    id: "pastel",
    nameEn: "Pastel",
    nameJa: "パステル",
    type: GENE_TYPE.INCOMPLETE,
    color: "#e8c34a",
    note: "全身の色がより明るく、黄色みが強くなる代表的なモルフ。",
    superName: "スーパーパステル",
    superNote: "ヘテロ接合よりさらに明るく発色する。",
  },
  {
    id: "spider",
    nameEn: "Spider",
    nameJa: "スパイダー",
    type: GENE_TYPE.DOMINANT,
    color: "#c98a4b",
    note: "細かい網目状の模様になる代表的なモルフ。遺伝形式は資料間で見解が割れている（顕性 or 不完全顕性）。",
    lethalHomozygous: true,
    lethalNote: "ホモ接合体（スーパースパイダー）は業界的に確認例が乏しく、孵化しないとされることが多い。",
  },
  {
    id: "albino",
    nameEn: "Albino",
    nameJa: "アルビノ",
    type: GENE_TYPE.RECESSIVE,
    color: "#f2c9a0",
    note: "黒色素が作られず、黄色〜白色になる。潜性のため2つ揃わないと見た目に出ない。",
  },
  {
    id: "clown",
    nameEn: "Clown",
    nameJa: "クラウン",
    type: GENE_TYPE.RECESSIVE,
    color: "#d7b23a",
    note: "頭部の模様が特徴的で、体側の模様が乱れて見える潜性モルフ。",
  },
  {
    id: "piebald",
    nameEn: "Piebald",
    nameJa: "パイボールド（パイド）",
    type: GENE_TYPE.RECESSIVE,
    color: "#ffffff",
    note: "体の一部が真っ白になる潜性モルフ。白さの割合は個体差が大きい。",
  },
  {
    id: "cinnamon",
    nameEn: "Cinnamon",
    nameJa: "シナモン",
    type: GENE_TYPE.INCOMPLETE,
    color: "#7a3b2e",
    note: "赤みがかった焦げ茶色になる。",
    superName: "スーパーシナモン",
    superNote: "ほぼ黒に近い色になる。系統により健康上の課題が報告されている。",
  },
  {
    id: "blackPastel",
    nameEn: "Black Pastel",
    nameJa: "ブラックパステル",
    type: GENE_TYPE.INCOMPLETE,
    color: "#3a2f2a",
    note: "全体的に黒みが強くなり、バンド状の模様が出やすい。",
    superName: "スーパーブラックパステル",
    superNote: "ホモ接合体が存在する（詳細な見た目の違いは資料未確認）。",
  },
  {
    id: "yellowBelly",
    nameEn: "Yellow Belly",
    nameJa: "イエローベリー",
    type: GENE_TYPE.INCOMPLETE,
    color: "#f2d76b",
    note: "腹側から体側にかけて黄色みが強く出る。単体では地味だが組み合わせ相性が良い。",
    superName: "スーパーイエローベリー",
    superNote: "より強く黄色が出る。",
  },
  {
    id: "champagne",
    nameEn: "Champagne",
    nameJa: "シャンパン",
    type: GENE_TYPE.INCOMPLETE,
    color: "#e3c9a8",
    note: "淡いクリーム色で模様が少なくなる。",
    superName: "スーパーシャンパン",
    superNote: "健康上の懸念が報告されているため、実際の繁殖では注意が必要とされる。",
  },
  {
    id: "vanilla",
    nameEn: "Vanilla",
    nameJa: "バニラ",
    type: GENE_TYPE.INCOMPLETE,
    color: "#f0e2c0",
    note: "淡く柔らかい色合いになる。",
    superName: "スーパーバニラ",
    superNote: "さらに淡くなる。",
  },
  {
    id: "pinstripe",
    nameEn: "Pinstripe",
    nameJa: "ピンストライプ",
    type: GENE_TYPE.DOMINANT,
    color: "#c9a15a",
    note: "背中に細い縦線状の模様が入る顕性モルフ。",
  },
  {
    id: "leopard",
    nameEn: "Leopard",
    nameJa: "レオパード",
    type: GENE_TYPE.DOMINANT,
    color: "#caa25f",
    note: "斑点模様がヒョウ柄のように分離して見える顕性モルフ。",
  },
];

// BELロクス（複対立遺伝子）: Mojave / Lesser / Butter / Russo は同じ系列（アレリック）として
// 振る舞い、異なる組み合わせ同士のヘテロ接合でも「Blue-Eyed Leucistic (BEL)」になるとされる。
// 単純な1遺伝子=1座のモデルでは表現できないため、専用ロクスとして扱う。
const BEL_LOCUS = {
  id: "bel",
  alleles: [
    { id: "mojave", nameEn: "Mojave", nameJa: "モハベ", color: "#8fa6b0" },
    { id: "lesser", nameEn: "Lesser", nameJa: "レッサー（プラチナ）", color: "#a8b8bd" },
    { id: "butter", nameEn: "Butter", nameJa: "バター", color: "#e0c96a" },
    { id: "russo", nameEn: "Russo", nameJa: "ルッソ", color: "#b7a98f" },
  ],
  wild: "normal",
  belName: "ブルーアイドルシスティック（BEL）",
  belNote:
    "Mojave・Lesser・Butter・Russoは互いに『複対立遺伝子』の関係にあり、同じ遺伝子でも違う遺伝子でも、" +
    "2つ揃うと共通してBEL（目が青く、ほぼ真っ白になる）という姿になる。",
};

const GENE_BY_ID = Object.fromEntries(GENES.map((g) => [g.id, g]));
const BEL_ALLELE_BY_ID = Object.fromEntries(BEL_LOCUS.alleles.map((a) => [a.id, a]));

// 有名な組み合わせ名（MVPの遺伝子セットに合わせて抜粋。出典: genetics-research.md）
const COMBO_NAMES = [
  { name: "バンブルビー", genes: { pastel: 1, spider: 1 } },
  { name: "キラービー", genes: { pastel: 2, spider: 1 } },
  { name: "パステルアルビノ", genes: { pastel: 1, albino: 2 } },
  { name: "パステルクラウン", genes: { pastel: 1, clown: 2 } },
  { name: "スーパーパステルパイド", genes: { pastel: 2, piebald: 2 } },
  { name: "ファントムのようなシナモンパステル", genes: { pastel: 1, cinnamon: 1 } }, // 便宜的な仮称（要確認）
];

function randomAllele(count) {
  // count: 0=野生型のみ, 1=ヘテロ, 2=ホモ
  if (count === 0) return 0;
  if (count === 2) return 1;
  return Math.random() < 0.5 ? 1 : 0;
}

function breedLocus(parentACount, parentBCount) {
  const a = randomAllele(parentACount);
  const b = randomAllele(parentBCount);
  return a + b; // 0,1,2
}

function randomBelAllele(pair) {
  return pair[Math.floor(Math.random() * 2)];
}

function breedBelLocus(parentAPair, parentBPair) {
  return [randomBelAllele(parentAPair), randomBelAllele(parentBPair)];
}

function wildGenotype() {
  const genotype = {};
  for (const g of GENES) genotype[g.id] = 0;
  genotype.bel = [BEL_LOCUS.wild, BEL_LOCUS.wild];
  return genotype;
}

function breed(motherGenotype, fatherGenotype) {
  const child = {};
  for (const g of GENES) {
    child[g.id] = breedLocus(motherGenotype[g.id] ?? 0, fatherGenotype[g.id] ?? 0);
  }
  child.bel = breedBelLocus(
    motherGenotype.bel ?? [BEL_LOCUS.wild, BEL_LOCUS.wild],
    fatherGenotype.bel ?? [BEL_LOCUS.wild, BEL_LOCUS.wild]
  );
  return child;
}

// 遺伝子型(genotype) → 見た目の形質(phenotype)一覧を求める
function resolvePhenotype(genotype) {
  const traits = [];
  for (const g of GENES) {
    const count = genotype[g.id] ?? 0;
    if (count === 0) continue;
    if (g.type === GENE_TYPE.RECESSIVE) {
      if (count === 2) traits.push({ id: g.id, label: g.nameJa, gene: g, form: "homozygous" });
    } else if (g.type === GENE_TYPE.DOMINANT) {
      if (count === 1) traits.push({ id: g.id, label: g.nameJa, gene: g, form: "heterozygous" });
      else traits.push({ id: g.id, label: (g.superName || "スーパー" + g.nameJa) + (g.lethalHomozygous ? "（通常は生存しない）" : ""), gene: g, form: "homozygous" });
    } else if (g.type === GENE_TYPE.INCOMPLETE) {
      if (count === 1) traits.push({ id: g.id, label: g.nameJa, gene: g, form: "heterozygous" });
      else traits.push({ id: g.id, label: g.superName || "スーパー" + g.nameJa, gene: g, form: "homozygous" });
    }
  }

  const bel = genotype.bel ?? [BEL_LOCUS.wild, BEL_LOCUS.wild];
  if (bel[0] !== BEL_LOCUS.wild || bel[1] !== BEL_LOCUS.wild) {
    const mutantAlleles = bel.filter((a) => a !== BEL_LOCUS.wild);
    if (mutantAlleles.length === 2) {
      if (mutantAlleles[0] === mutantAlleles[1]) {
        const allele = BEL_ALLELE_BY_ID[mutantAlleles[0]];
        traits.push({ id: "bel-super", label: "スーパー" + allele.nameJa + "（" + BEL_LOCUS.belName + "）", gene: BEL_LOCUS, form: "bel" });
      } else {
        traits.push({ id: "bel-combo", label: BEL_LOCUS.belName, gene: BEL_LOCUS, form: "bel" });
      }
    } else {
      const allele = BEL_ALLELE_BY_ID[mutantAlleles[0]];
      traits.push({ id: "bel-het-" + allele.id, label: allele.nameJa, gene: BEL_LOCUS, form: "het" });
    }
  }

  return traits;
}

function comboNameFor(genotype) {
  for (const combo of COMBO_NAMES) {
    const matches = Object.entries(combo.genes).every(([id, count]) => (genotype[id] ?? 0) === count);
    if (matches) return combo.name;
  }
  return null;
}

function morphLabel(genotype) {
  const combo = comboNameFor(genotype);
  if (combo) return combo;
  const traits = resolvePhenotype(genotype);
  if (traits.length === 0) return "ノーマル";
  return traits.map((t) => t.label).join(" ");
}
