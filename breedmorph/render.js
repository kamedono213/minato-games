// 遺伝子型からSVGスネークイラストを生成する。
// 「無地のとぐろベース」の上に、モルフごとの模様レイヤーをマスクで重ねる方式。
// snake.patternSeed を使って模様の配置が個体ごとに変わる（弱めに親から遺伝する、snake.js参照）。

let renderCounter = 0;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromSnake(snake) {
  if (snake && typeof snake.patternSeed === "number") return snake.patternSeed;
  return 12345; // 図鑑など個体を持たない表示用の固定シード
}

// 体の地色を変えない形質（パッチ・お腹だけの形質など）はベースカラー選びから除外する
const NON_RECOLOR_TRAIT_IDS = new Set(["piebald", "yellowBelly"]);

function baseColorFor(traits) {
  const colorTrait = traits.find((t) => t.gene && t.gene.color && t.form !== "bel" && t.form !== "het" && !NON_RECOLOR_TRAIT_IDS.has(t.id));
  if (colorTrait) return colorTrait.gene.color;
  const belTrait = traits.find((t) => t.form === "bel" || t.form === "het");
  if (belTrait) {
    if (belTrait.id.startsWith("bel-het-")) {
      const alleleId = belTrait.id.replace("bel-het-", "");
      return BEL_ALLELE_BY_ID[alleleId].color;
    }
    return BEL_LOCUS.belColor;
  }
  return "#b8895a"; // ノーマル(野生型): 実際の色に合わせた黄土色〜茶色
}

function hasTrait(traits, id) {
  return traits.some((t) => t.id === id);
}

// とぐろ(スパイラル)の骨格になる座標列を作る
function spiralPoints(cx, cy, rOuter, rInner, turns, steps) {
  const pts = [];
  const thetaMax = turns * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * thetaMax;
    const r = rOuter - (rOuter - rInner) * t;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta) * 0.74;
    pts.push([x, y]);
  }
  return pts;
}

function pathFromPoints(pts) {
  return "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
}

function svgSnake(genotype, size, snake) {
  const traits = resolvePhenotype(genotype);
  const base = baseColorFor(traits);
  const isPiebald = hasTrait(traits, "piebald");
  const isSpider = traits.some((t) => t.id === "spider");
  const isPinstripe = traits.some((t) => t.id === "pinstripe");
  const isLeopard = traits.some((t) => t.id === "leopard");
  const isClown = traits.some((t) => t.id === "clown");
  const isAlbino = hasTrait(traits, "albino");
  const isBelLike = traits.some((t) => t.form === "bel");

  const rand = mulberry32(seedFromSnake(snake));
  const jitter = (range) => (rand() - 0.5) * 2 * range;

  renderCounter++;
  const uid = "sn" + renderCounter;

  // --- とぐろの骨格 ---
  const cx = 110,
    cy = 122;
  const rOuter = 74 + jitter(4);
  const rInner = 20;
  const turns = 2.1;
  const bodyWidth = 25;
  const pts = spiralPoints(cx, cy, rOuter, rInner, turns, 72);
  const bodyPath = pathFromPoints(pts);

  const tail = pts[0];
  const neck = pts[pts.length - 1];
  const headX = neck[0] + (cx - neck[0]) * 0.15 + 8;
  const headY = neck[1] - 14;
  const headR = 20;

  const shadeOpacity = 0.05 + rand() * 0.06;
  const shadeIsLight = rand() < 0.5;
  const eyeColor = isAlbino ? "#e05a6a" : isBelLike ? "#3f8fd6" : "#1c1c1c";
  const patternColor = GENE_BY_ID.albino.patternColor && isAlbino ? GENE_BY_ID.albino.patternColor : hasTrait(traits, "blackPastel") ? GENE_BY_ID.blackPastel.patternColor : "#2b1d14";

  // --- 模様レイヤー（bodymaskで、とぐろの形にだけ切り抜かれる）---
  let pattern = "";
  const scatter = (count, make) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + jitter(0.6);
      const rr = rInner + rand() * (rOuter - rInner);
      const px = cx + rr * Math.cos(a * turns * 1.3) + jitter(20);
      const py = cy + rr * Math.sin(a * turns * 1.3) * 0.74 + jitter(20);
      pattern += make(px, py, i);
    }
  };

  if (isBelLike) {
    // 実際のBELは無地・模様なしとされるため、他の形質があっても模様は付けない
  } else if (isPiebald) {
    scatter(3, (px, py) => `<ellipse cx="${px}" cy="${py}" rx="${20 + jitter(8)}" ry="${14 + jitter(5)}" fill="#ffffff" opacity="0.95"/>`);
  } else if (isSpider) {
    scatter(14, (px, py) => `<path d="M ${px} ${py} q 7 -10 14 0 q -7 10 -14 0" stroke="${patternColor}" stroke-width="1.6" fill="none" opacity="${0.55 + jitter(0.15)}"/>`);
  } else if (isLeopard) {
    scatter(10, (px, py) => `<circle cx="${px}" cy="${py}" r="${6 + jitter(2)}" fill="${patternColor}" opacity="0.4"/>`);
  } else if (isClown) {
    scatter(6, (px, py) => `<ellipse cx="${px}" cy="${py}" rx="${16 + jitter(6)}" ry="${9 + jitter(3)}" fill="${patternColor}" opacity="0.32" transform="rotate(${jitter(30)} ${px} ${py})"/>`);
  } else {
    // ノーマル系: サドル状の楕円もようを鎖状に
    scatter(9, (px, py) => `<ellipse cx="${px}" cy="${py}" rx="14" ry="9" fill="${patternColor}" opacity="${0.5 + jitter(0.1)}" transform="rotate(${jitter(25)} ${px} ${py})"/>`);
  }
  if (isPinstripe && !isBelLike) {
    pattern += `<path d="${bodyPath}" fill="none" stroke="${patternColor}" stroke-width="1.6" opacity="0.4" stroke-dasharray="1 10" stroke-linecap="round"/>`;
  }

  // ヘテロ個体にごくわずかに出るとされる「het tell」marker
  let flareSvg = "";
  if (snake && snake.flareTraits && snake.flareTraits.length > 0) {
    for (const geneId of snake.flareTraits) {
      const gene = GENE_BY_ID[geneId];
      if (!gene) continue;
      flareSvg += `<circle cx="${cx + jitter(30)}" cy="${cy + jitter(20)}" r="4" fill="${gene.color}" opacity="0.55"/>`;
    }
  }

  let mutationSvg = "";
  if (snake && snake.mutationGeneId) {
    mutationSvg = `<g transform="translate(${headX + 16},${headY - 22})">
      <path d="M8 0 L10.5 6 L17 8 L10.5 10 L8 17 L5.5 10 L0 8 L5.5 6 Z" fill="#f2c14e" stroke="#8a5a00" stroke-width="0.6"/>
    </g>`;
  }

  return `
  <svg viewBox="0 0 220 220" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <mask id="${uid}">
      <path d="${bodyPath}" stroke="#fff" stroke-width="${bodyWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${headX}" cy="${headY}" r="${headR}" fill="#fff"/>
    </mask>

    <path d="${bodyPath}" stroke="${base}" stroke-width="${bodyWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${headX}" cy="${headY}" r="${headR}" fill="${base}"/>

    <path d="${bodyPath}" stroke="${shadeIsLight ? "#ffffff" : "#000000"}" stroke-width="${bodyWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${shadeOpacity}"/>

    <g mask="url(#${uid})">${pattern}</g>
    ${flareSvg}

    <!-- 舌 -->
    <path d="M ${headX + headR - 4} ${headY} q 10 2 14 -4 M ${headX + headR + 8} ${headY - 4} l 5 -4 M ${headX + headR + 8} ${headY - 4} l 5 3"
      stroke="#c0392b" stroke-width="1.4" fill="none" stroke-linecap="round"/>

    <circle cx="${headX + 7}" cy="${headY - 6}" r="3.2" fill="${eyeColor}"/>
    ${mutationSvg}
  </svg>`;
}
