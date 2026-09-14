// ゲーム開始時のガイド付きチュートリアル。
// 読む→実際に交配して結果を見る→予想してから交配する、の順で進める。
// 完了後は世界(world)のonboardingDoneフラグを立てて通常プレイに戻る。

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
  { id: "spider", label: "スパイダー", genes: { spider: 1 } }, // 分布に絡まない誤答（親が持っていない）
  { id: "clown", label: "クラウン", genes: { clown: 2 } }, // 誤答
];

const ONBOARDING_STEPS = [
  {
    type: "read",
    title: "ようこそ、ブリードモルフへ",
    paragraphs: [
      "このゲームでは、実際のボールパイソンの遺伝ルールに沿って交配を楽しめます。",
      "まずは短いレッスンで「遺伝の仕組み」を、実際に交配しながら覚えていきましょう。",
    ],
  },
  {
    type: "read",
    title: "「遺伝子」と「対立遺伝子」",
    paragraphs: TUTORIAL_STEPS[0].paragraphs,
    diagram: "gamete",
  },
  {
    type: "read",
    title: "顕性（優性）と潜性（劣性）",
    paragraphs: TUTORIAL_STEPS[1].paragraphs,
  },
  {
    type: "breed-demo",
    key: "albino-demo",
    title: "実際にやってみよう：アルビノ",
    paragraphs: [
      "ここに、どちらも「アルビノを1つだけ持つ（ヘテロ）」オスとメスがいます。見た目はふつうですが、体の中にはアルビノの対立遺伝子が1つ隠れています。",
      "この2匹を交配すると何が生まれるでしょうか？ボタンを押して実際に4個の卵を孵化させてみましょう。",
    ],
    setup: {
      motherGenotype: demoGenotype({ albino: 1 }),
      fatherGenotype: demoGenotype({ albino: 1 }),
      clutchSize: 4,
    },
    explain: (babies) => {
      const albinoCount = babies.filter((g) => (g.albino ?? 0) === 2).length;
      return [
        `生まれた4匹のうち、${albinoCount}匹がアルビノになりました。`,
        "理論上は、ヘテロ同士の交配でアルビノが生まれる確率は4分の1（25%）です。ただしこれはあくまで確率で、サイコロを4回振るのと同じように、毎回ぴったり1匹になるとは限りません。",
        "生まれなかった子も、実は見た目に出ていないだけでアルビノの対立遺伝子を持っている（ヘテロ）可能性があります。",
      ];
    },
  },
  {
    type: "breed-demo",
    key: "spider-demo",
    title: "実際にやってみよう：スパイダー（顕性）",
    paragraphs: [
      "次は顕性（優性）の例です。スパイダーを1つ持つオスと、何も持たないふつうのメスを交配します。",
      "顕性は「1つ持っているだけで見た目に出る」タイプでした。結果を見てみましょう。",
    ],
    setup: {
      motherGenotype: demoGenotype({}),
      fatherGenotype: demoGenotype({ spider: 1 }),
      clutchSize: 4,
    },
    explain: (babies) => {
      const spiderCount = babies.filter((g) => (g.spider ?? 0) >= 1).length;
      return [
        `生まれた4匹のうち、${spiderCount}匹がスパイダーの見た目になりました。`,
        "顕性の遺伝子を1つ持つ親と、持たない親を交配すると、理論上は約半分（50%）の子に見た目が出ます。",
        "潜性（劣性）と違って「隠れている」ということが起きにくいのが顕性の特徴です。",
      ];
    },
  },
  {
    type: "breed-demo",
    key: "pastel-demo",
    title: "実際にやってみよう：パステル（不完全顕性）",
    paragraphs: [
      "最後に不完全顕性・共優性の例です。パステルを1つ持つ者同士を交配します。",
      "1つの時と2つの時で見た目が違うタイプでした。何が生まれるでしょうか。",
    ],
    setup: {
      motherGenotype: demoGenotype({ pastel: 1 }),
      fatherGenotype: demoGenotype({ pastel: 1 }),
      clutchSize: 4,
    },
    explain: (babies) => {
      const superCount = babies.filter((g) => (g.pastel ?? 0) === 2).length;
      const pastelCount = babies.filter((g) => (g.pastel ?? 0) === 1).length;
      const normalCount = babies.filter((g) => (g.pastel ?? 0) === 0).length;
      return [
        `内訳：ノーマル ${normalCount}匹、パステル ${pastelCount}匹、スーパーパステル ${superCount}匹でした。`,
        "理論上の比率は ノーマル:パステル:スーパーパステル = 1:2:1 です。2つとも持つと『スーパー』になる、というのが不完全顕性・共優性の特徴でしたね。",
      ];
    },
  },
  {
    type: "read",
    title: "パネットスクエア（掛け合わせ表）",
    paragraphs: TUTORIAL_STEPS[5].paragraphs,
  },
  {
    type: "predict",
    title: "予想してみよう",
    paragraphs: [
      "最後の練習です。パステルを1つ持つメスと、アルビノを1つ持つオスを交配します。",
      "生まれてくる子には、どんな見た目の可能性があるでしょうか？ 当てはまるものをすべて選んでください。",
    ],
    setup: {
      motherGenotype: demoGenotype({ pastel: 1 }),
      fatherGenotype: demoGenotype({ albino: 1 }),
      clutchSize: 4,
    },
    options: PREDICT_OPTIONS,
    correctIds: ["normal", "pastel"], // アルビノは母親がヘテロを持たないため両親ともホモにならず出現しない
  },
  {
    type: "done",
    title: "レッスン完了！",
    paragraphs: [
      "遺伝の基本はこれで一通り体験できました。ここまで生まれた個体は、そのままあなたのコレクションに加わります。",
      "ここから先は自由に交配・ショップ・顧客からの依頼に挑戦できます。チュートリアルはいつでも見返せます。",
    ],
  },
];
