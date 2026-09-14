// 「チュートリアル」タブ用の読み物まとめ（オンボーディングと同じ簡単な言葉で統一）。
// 学校の理科は2021年度から「優性・劣性」ではなく「顕性・潜性」という用語を使っている。

const TUTORIAL_STEPS = [
  {
    title: "① 体は「せっけいず」でできている",
    paragraphs: [
      "生き物の色やもようは、体の中の目に見えない「せっけいず」で決まる。",
      "せっけいずは、お父さんから1まい、お母さんから1まい、合わせて2まいもらう。",
    ],
    diagram: "gamete",
  },
  {
    title: "② 「目立つタイプ」と「かくれるタイプ」",
    paragraphs: [
      "せっけいずには2種類ある。",
      "【目立つタイプ】1まいでも見た目に出る",
      "【かくれるタイプ】2まいそろわないと見た目に出ない",
      "学校の理科では「目立つタイプ＝顕性」「かくれるタイプ＝潜性」と習う。むかしの「優性・劣性」から、2021年度に呼び方が変わった。",
    ],
  },
  {
    title: "③ かくれるタイプの例：アルビノ",
    paragraphs: [
      "ふつうのせっけいずを A、アルビノのせっけいずを a とすると：",
      "・AA → ふつうの見た目",
      "・Aa → 見た目はふつう（アルビノを1まい持ってるけど隠れてる、これを「ヘテロ」と呼ぶ）",
      "・aa → アルビノの見た目",
    ],
    punnett: {
      left: ["A", "a"],
      top: ["A", "a"],
      labels: { AA: "ふつう", Aa: "ふつう(ヘテロ)", aA: "ふつう(ヘテロ)", aa: "アルビノ" },
      colors: { AA: "#6b8f5a", Aa: "#6b8f5a", aA: "#6b8f5a", aa: GENE_BY_ID.albino.color },
    },
    punnettDiagram: { leftColor: "#6b8f5a", topColor: "#6b8f5a" },
  },
  {
    title: "④ 目立つタイプの例：スパイダー",
    paragraphs: [
      "ふつうのせっけいずを S、スパイダーのせっけいずを s とすると：",
      "・SS → ふつうの見た目",
      "・Ss → スパイダーの見た目（1まいだけで出る）",
      "・ss → 実はこの組み合わせ、ほとんど育たないと言われている",
    ],
    punnett: {
      left: ["S", "s"],
      top: ["S", "s"],
      labels: { SS: "ふつう", Ss: "スパイダー", sS: "スパイダー", ss: "育たない(推定)" },
      colors: { SS: "#6b8f5a", Ss: GENE_BY_ID.spider.color, sS: GENE_BY_ID.spider.color, ss: "#8a4a4a" },
    },
    punnettDiagram: { leftColor: GENE_BY_ID.spider.color, topColor: GENE_BY_ID.spider.color },
  },
  {
    title: "⑤ 混ざるタイプの例：パステル",
    paragraphs: [
      "「目立つ」でも「かくれる」でもない、3つ目のタイプもある。",
      "1まいだと「パステル」、2まいだと「スーパーパステル」という、もっと強い見た目になる。",
    ],
    punnett: {
      left: ["P", "p"],
      top: ["P", "p"],
      labels: { PP: "ふつう", Pp: "パステル", pP: "パステル", pp: "スーパーパステル" },
      colors: { PP: "#6b8f5a", Pp: GENE_BY_ID.pastel.color, pP: GENE_BY_ID.pastel.color, pp: "#f5da7a" },
    },
    punnettDiagram: { leftColor: GENE_BY_ID.pastel.color, topColor: GENE_BY_ID.pastel.color },
  },
  {
    title: "⑥ 表で予想する方法（パネットスクエア）",
    paragraphs: [
      "生まれる前から「どんな割合になりそうか」を表で予想できる。",
      "たて・よこに親の持つせっけいずを並べて、交わったマスが子どもの組み合わせ。",
      "「交配」画面でも、同じ仕組みで子の遺伝子型を計算している。",
    ],
  },
];
