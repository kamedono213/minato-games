// ゲーム開始時のガイド付きチュートリアル。
// できるだけ簡単な言葉で、「1つ学んだらすぐ交配して確かめる」をテンポよく繰り返す構成にする。
// 学校の理科の正式な言葉（顕性・潜性）は使いつつ、まず身近な言い換え（目立つタイプ・かくれるタイプ）で
// イメージをつかんでもらう。

function demoGenotype(traitSpec) {
  const g = wildGenotype();
  for (const [id, count] of Object.entries(traitSpec)) g[id] = count;
  return g;
}

const PREDICT_OPTIONS = [
  { id: "normal", label: "ノーマル", genes: {} },
  { id: "pastel", label: "パステル", genes: { pastel: 1 } },
  { id: "albino", label: "アルビノ", genes: { albino: 2 } },
  { id: "pastel-albino", label: "パステルアルビノ", genes: { pastel: 1, albino: 2 } },
  { id: "super-pastel", label: "スーパーパステル", genes: { pastel: 2 } },
  { id: "spider", label: "スパイダー", genes: { spider: 1 } },
  { id: "clown", label: "クラウン", genes: { clown: 2 } },
];

const ONBOARDING_STEPS = [
  {
    type: "read",
    title: "ようこそ！",
    paragraphs: ["このゲームでは、本物のヘビの「遺伝」のルールで交配を楽しめる。", "むずかしそうに見えるけど、実は簡単。実際に交配しながら覚えていこう！"],
  },

  // --- レッスン1: せっけいず（遺伝子）の基本 ---
  {
    type: "read",
    title: "① 体は「せっけいず」でできている",
    paragraphs: [
      "生き物の体の色やもようは、体の中にある目に見えない「せっけいず」で決まっている。",
      "このせっけいずは、お父さんから1まい、お母さんから1まい、合わせて2まいもらう。",
    ],
    diagram: "gamete",
  },
  {
    type: "read",
    title: "② 「目立つタイプ」と「かくれるタイプ」",
    paragraphs: [
      "せっけいずには2種類ある。",
      "【目立つタイプ】1まいでも見た目に出る",
      "【かくれるタイプ】2まいそろわないと見た目に出ない（1まいだけだと見た目はふつうのまま、こっそり隠れている）",
      "学校の理科では「目立つタイプ＝顕性（けんせい）」「かくれるタイプ＝潜性（せんせい）」と習うよ。むかしは「優性・劣性」と呼ばれていたけど、今はこの呼び方に変わった。",
    ],
  },
  {
    type: "breed-demo",
    key: "albino-demo",
    title: "③ さっそく交配！「かくれるタイプ」を試そう",
    paragraphs: [
      "アルビノは「かくれるタイプ」。",
      "ここにいる2匹は、どちらも見た目はふつうだけど、アルビノのせっけいずを1まいだけこっそり持っている（これを「ヘテロ」と呼ぶ）。",
    ],
    predictText: "よそう：4匹生まれたら、だいたい1匹くらいがアルビノになるはず（4匹に1匹の確率だから）。",
    setup: { motherGenotype: demoGenotype({ albino: 1 }), fatherGenotype: demoGenotype({ albino: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const albinoCount = babies.filter((g) => (g.albino ?? 0) === 2).length;
      return [
        `結果：${albinoCount}匹がアルビノだった！`,
        "ぴったり1匹になるとは限らない。サイコロと同じで、運によって毎回すこし変わる。",
        "アルビノにならなかった子も、実はアルビノのせっけいずを1まいだけ隠し持っているかもしれない。",
      ];
    },
  },

  // --- レッスン2: 目立つタイプ ---
  {
    type: "breed-demo",
    key: "spider-demo",
    title: "④ 今度は「目立つタイプ」を試そう",
    paragraphs: [
      "スパイダーは「目立つタイプ」。1まいでも見た目に出る。",
      "お父さんはスパイダーのせっけいずを1まい持っている（見た目にスパイダー模様が出ている）。お母さんは持っていない、ふつうのヘビ。",
    ],
    predictText: "よそう：4匹生まれたら、だいたい半分（2匹くらい）がスパイダーになるはず。",
    setup: { motherGenotype: demoGenotype({}), fatherGenotype: demoGenotype({ spider: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const spiderCount = babies.filter((g) => (g.spider ?? 0) >= 1).length;
      return [
        `結果：${spiderCount}匹がスパイダーだった！`,
        "「目立つタイプ」は1まい持っているだけで見た目に出るから、「かくれるタイプ」より見た目に出やすい。",
      ];
    },
  },

  // --- レッスン3: 混ざるタイプ ---
  {
    type: "read",
    title: "⑤ もう1つ、「混ざるタイプ」もある",
    paragraphs: [
      "「目立つ」でも「かくれる」でもない、3つ目のタイプがある。",
      "1まいだけでも見た目に出るけど、2まいそろうと「もっと強く」見た目に出るタイプ。",
      "パステルがこのタイプ。1まいだと「パステル」、2まいだと「スーパーパステル」になる。",
    ],
  },
  {
    type: "breed-demo",
    key: "pastel-demo",
    title: "⑥ 「混ざるタイプ」を交配してみよう",
    paragraphs: ["パステルを1まい持つ者どうしを交配する。何が生まれるかな？"],
    predictText: "よそう：ノーマル・パステル・スーパーパステルが、だいたい 1 : 2 : 1 の割合で生まれるはず。",
    setup: { motherGenotype: demoGenotype({ pastel: 1 }), fatherGenotype: demoGenotype({ pastel: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const superCount = babies.filter((g) => (g.pastel ?? 0) === 2).length;
      const pastelCount = babies.filter((g) => (g.pastel ?? 0) === 1).length;
      const normalCount = babies.filter((g) => (g.pastel ?? 0) === 0).length;
      return [`結果：ノーマル ${normalCount}匹、パステル ${pastelCount}匹、スーパーパステル ${superCount}匹だった！`, "1まいの時と2まいの時で見た目が変わる、というのが「混ざるタイプ」の特徴。"];
    },
  },

  {
    type: "read",
    title: "⑦ 表で予想する方法（パネットスクエア）",
    paragraphs: [
      "実は、生まれる前から「どんな割合になりそうか」を表で予想できる。",
      "たて・よこに、それぞれの親が持っているせっけいずを並べて、交わったマスが子どもの組み合わせになる。",
      "さっきの実験も、この表の通りの割合に近づいていたはず。",
    ],
  },

  {
    type: "predict",
    title: "⑧ 卒業テスト：自分で予想してみよう",
    paragraphs: ["パステルを1まい持つメスと、アルビノを1まい持つオスを交配する。", "生まれてくる子には、どんな見た目がありえる？ 当てはまるものを全部えらんでね。"],
    setup: { motherGenotype: demoGenotype({ pastel: 1 }), fatherGenotype: demoGenotype({ albino: 1 }), clutchSize: 4 },
    options: PREDICT_OPTIONS,
    correctIds: ["normal", "pastel"],
  },

  // --- 復習レッスン ---
  {
    type: "read",
    title: "⑨ ここから復習レッスン",
    paragraphs: ["新しいことは教えない。ここまで学んだことを使って、いくつか予想して確かめてみよう。"],
  },
  {
    type: "breed-demo",
    key: "review-spider-spider",
    title: "復習1：スパイダー×スパイダー",
    review: true,
    paragraphs: ["スパイダー（目立つタイプ）を持つ者どうしを交配したらどうなる？", "実は「スパイダーが2まい」になる組み合わせは、実際のブリーダーの間でもほとんど育たないと言われている。"],
    predictText: "よそう：多くはノーマルかスパイダーになるはず。まれに「2まいの組み合わせ」が出ることもある。",
    setup: { motherGenotype: demoGenotype({ spider: 1 }), fatherGenotype: demoGenotype({ spider: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const counts = { 0: 0, 1: 0, 2: 0 };
      for (const g of babies) counts[g.spider ?? 0]++;
      return [
        `結果：ノーマル ${counts[0]}匹、スパイダー ${counts[1]}匹、スーパースパイダー(2まい) ${counts[2]}匹だった。`,
        "「目立つタイプ」どうしをかけ合わせると、まれに2まいの組み合わせが生まれる。これが実際の繁殖では避けられることが多い理由。",
      ];
    },
  },
  {
    type: "breed-demo",
    key: "review-clown",
    title: "復習2：クラウン ヘテロ×ヘテロ",
    review: true,
    paragraphs: ["クラウンも「かくれるタイプ」。アルビノの時と同じ考え方が使えるはず。"],
    predictText: "よそう：4匹のうち、だいたい1匹くらいがクラウンになるはず。",
    setup: { motherGenotype: demoGenotype({ clown: 1 }), fatherGenotype: demoGenotype({ clown: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const clownCount = babies.filter((g) => (g.clown ?? 0) === 2).length;
      return [`結果：${clownCount}匹がクラウンだった！`, "「かくれるタイプ」はどの遺伝子でも同じ考え方で予想できる。"];
    },
  },
  {
    type: "breed-demo",
    key: "review-combo",
    title: "復習3：組み合わせると特別な名前がつくことも",
    review: true,
    paragraphs: ["パステルとスパイダーを両方持つ子が生まれると、「バンブルビー」という特別な名前がつく。", "組み合わせ次第で、こんなふうに名前が変わることも覚えておこう。"],
    predictText: "よそう：一部の子は「バンブルビー」になるはず。",
    setup: { motherGenotype: demoGenotype({ pastel: 1 }), fatherGenotype: demoGenotype({ spider: 1 }), clutchSize: 4 },
    breedLabel: "交配して確かめる",
    explain: (babies) => {
      const comboCount = babies.filter((g) => comboNameFor(g) === "バンブルビー").length;
      return [`結果：${comboCount}匹が「バンブルビー」になった！`, "図鑑やショップでも、こういう特別な名前の組み合わせをたくさん見つけられる。"];
    },
  },

  {
    type: "done",
    title: "レッスン完了！",
    paragraphs: ["これで遺伝の基本はバッチリ。ここまで生まれた個体は、そのままあなたのコレクションに加わる。", "ここから先は自由に交配・ショップ・依頼に挑戦できる。チュートリアルはいつでも見返せるよ。"],
  },
];
