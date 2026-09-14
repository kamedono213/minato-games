// 遺伝子型からSVGスネークイラストを生成する（レトロ・ドット絵ではなくフラットなベクター表現）

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

function svgSnake(genotype, size) {
  const traits = resolvePhenotype(genotype);
  const base = baseColorFor(traits);
  const isPiebald = hasTrait(traits, "piebald");
  const isSpider = traits.some((t) => t.id === "spider");
  const isPinstripe = traits.some((t) => t.id === "pinstripe");
  const isLeopard = traits.some((t) => t.id === "leopard");
  const isClown = traits.some((t) => t.id === "clown");
  const isAlbino = hasTrait(traits, "albino");
  const isBelLike = traits.some((t) => t.form === "bel");

  const eyeColor = isAlbino || isBelLike ? "#e05a5a" : "#1c1c1c";

  let patternSvg = "";
  if (isPiebald) {
    patternSvg += `<ellipse cx="118" cy="60" rx="30" ry="16" fill="#ffffff" opacity="0.92"/>`;
    patternSvg += `<ellipse cx="70" cy="72" rx="18" ry="10" fill="#ffffff" opacity="0.85"/>`;
  }
  if (isSpider) {
    for (let i = 0; i < 6; i++) {
      patternSvg += `<path d="M ${40 + i * 22} 55 q 6 -14 12 0 q 6 14 -12 0" stroke="#3a2a1a" stroke-width="1.4" fill="none" opacity="0.55"/>`;
    }
  }
  if (isPinstripe) {
    patternSvg += `<line x1="20" y1="50" x2="180" y2="50" stroke="#3a2a1a" stroke-width="2" opacity="0.5"/>`;
  }
  if (isLeopard) {
    for (let i = 0; i < 8; i++) {
      patternSvg += `<circle cx="${30 + i * 20}" cy="${45 + (i % 2 === 0 ? -6 : 6)}" r="6" fill="#3a2a1a" opacity="0.35"/>`;
    }
  }
  if (isClown) {
    patternSvg += `<path d="M 30 60 Q 100 20 170 60" stroke="#3a2a1a" stroke-width="3" fill="none" opacity="0.4"/>`;
  }
  if (!isPiebald && !isSpider && !isPinstripe && !isLeopard && !isClown) {
    for (let i = 0; i < 5; i++) {
      patternSvg += `<ellipse cx="${45 + i * 28}" cy="60" rx="12" ry="8" fill="#000000" opacity="0.12"/>`;
    }
  }

  return `
  <svg viewBox="0 0 200 120" width="${size}" height="${size * 0.6}" xmlns="http://www.w3.org/2000/svg">
    <path d="M 15 80 Q 10 50 40 45 Q 90 35 130 50 Q 165 60 185 45"
      stroke="${base}" stroke-width="34" fill="none" stroke-linecap="round"/>
    ${patternSvg}
    <circle cx="188" cy="44" r="10" fill="${base}"/>
    <circle cx="192" cy="41" r="2.4" fill="${eyeColor}"/>
  </svg>`;
}
