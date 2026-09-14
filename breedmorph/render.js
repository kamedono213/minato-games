// 遺伝子型からSVGスネークイラストを生成する（レトロ・ドット絵ではなくフラットなベクター表現）
// snake.visualSeed を使って、同じモルフでも個体ごとに模様・色味が少しずつ変わるようにする
// （実際のボールパイソンも同じモルフ内で個体差があることの再現）。

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
  if (snake && typeof snake.visualSeed === "number") return snake.visualSeed;
  return 12345; // 図鑑など個体を持たない表示用の固定シード
}

function baseColorFor(traits) {
  const colorTrait = traits.find((t) => t.gene && t.gene.color && t.form !== "bel" && t.form !== "het");
  if (colorTrait) return colorTrait.gene.color;
  const belTrait = traits.find((t) => t.form === "bel" || t.form === "het");
  if (belTrait) {
    if (belTrait.id.startsWith("bel-het-")) {
      const alleleId = belTrait.id.replace("bel-het-", "");
      return BEL_ALLELE_BY_ID[alleleId].color;
    }
    return "#dfe6e8";
  }
  return "#6b8f5a"; // ノーマル(野生型)のオリーブグリーン
}

function hasTrait(traits, id) {
  return traits.some((t) => t.id === id);
}

// snake引数はオプション（省略時は図鑑用の固定表示になる）
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
  const shadeOpacity = 0.06 + rand() * 0.06;
  const shadeIsLight = rand() < 0.5;

  const eyeColor = isAlbino || isBelLike ? "#e05a5a" : "#1c1c1c";

  let patternSvg = "";
  if (isPiebald) {
    patternSvg += `<ellipse cx="${118 + jitter(10)}" cy="${60 + jitter(6)}" rx="${30 + jitter(6)}" ry="16" fill="#ffffff" opacity="0.92"/>`;
    patternSvg += `<ellipse cx="${70 + jitter(10)}" cy="${72 + jitter(6)}" rx="${18 + jitter(4)}" ry="10" fill="#ffffff" opacity="0.85"/>`;
  }
  if (isSpider) {
    for (let i = 0; i < 6; i++) {
      const cx = 40 + i * 22 + jitter(4);
      patternSvg += `<path d="M ${cx} ${55 + jitter(3)} q 6 -14 12 0 q 6 14 -12 0" stroke="#3a2a1a" stroke-width="1.4" fill="none" opacity="${0.5 + jitter(0.15)}"/>`;
    }
  }
  if (isPinstripe) {
    patternSvg += `<line x1="20" y1="${50 + jitter(3)}" x2="180" y2="${50 + jitter(3)}" stroke="#3a2a1a" stroke-width="2" opacity="0.5"/>`;
  }
  if (isLeopard) {
    for (let i = 0; i < 8; i++) {
      patternSvg += `<circle cx="${30 + i * 20 + jitter(4)}" cy="${45 + (i % 2 === 0 ? -6 : 6) + jitter(4)}" r="${6 + jitter(1.5)}" fill="#3a2a1a" opacity="0.35"/>`;
    }
  }
  if (isClown) {
    patternSvg += `<path d="M 30 60 Q 100 ${20 + jitter(6)} 170 60" stroke="#3a2a1a" stroke-width="3" fill="none" opacity="0.4"/>`;
  }
  if (!isPiebald && !isSpider && !isPinstripe && !isLeopard && !isClown) {
    for (let i = 0; i < 5; i++) {
      patternSvg += `<ellipse cx="${45 + i * 28 + jitter(5)}" cy="${60 + jitter(4)}" rx="12" ry="8" fill="#000000" opacity="${0.1 + jitter(0.05)}"/>`;
    }
  }

  // ヘテロ個体の一部にごくわずかに出るとされる「het tell」の表現（確実な判別法ではない旨は図鑑側に記載）
  let flareSvg = "";
  if (snake && snake.flareTraits && snake.flareTraits.length > 0) {
    for (const geneId of snake.flareTraits) {
      const gene = GENE_BY_ID[geneId];
      if (!gene) continue;
      flareSvg += `<ellipse cx="${95 + jitter(20)}" cy="${52 + jitter(6)}" rx="5" ry="3" fill="${gene.color}" opacity="0.5"/>`;
    }
  }

  let mutationSvg = "";
  if (snake && snake.mutationGeneId) {
    mutationSvg = `<g transform="translate(28,20)">
      <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill="#f2c14e" stroke="#8a5a00" stroke-width="0.6"/>
    </g>`;
  }

  return `
  <svg viewBox="0 0 200 120" width="${size}" height="${size * 0.6}" xmlns="http://www.w3.org/2000/svg">
    <path d="M 15 80 Q 10 50 40 45 Q 90 35 130 50 Q 165 60 185 45"
      stroke="${base}" stroke-width="34" fill="none" stroke-linecap="round"/>
    <path d="M 15 80 Q 10 50 40 45 Q 90 35 130 50 Q 165 60 185 45"
      stroke="${shadeIsLight ? "#ffffff" : "#000000"}" stroke-width="34" fill="none" stroke-linecap="round" opacity="${shadeOpacity}"/>
    ${patternSvg}
    ${flareSvg}
    <circle cx="188" cy="44" r="10" fill="${base}"/>
    <circle cx="192" cy="41" r="2.4" fill="${eyeColor}"/>
    ${mutationSvg}
  </svg>`;
}
