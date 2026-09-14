// 画面遷移・描画ロジック

const APP = document.getElementById("app");
const TAB_GROUPS = [
  {
    id: "learn",
    label: "まなぶ",
    tabs: [
      { id: "tutorial", label: "チュートリアル" },
      { id: "dex", label: "図鑑" },
    ],
  },
  {
    id: "play",
    label: "あそぶ",
    tabs: [
      { id: "collection", label: "マイコレクション" },
      { id: "breed", label: "交配" },
      { id: "shop", label: "ショップ" },
      { id: "orders", label: "依頼" },
    ],
  },
];
const TABS = TAB_GROUPS.flatMap((g) => g.tabs);

let currentTab = "collection";
let selectedForPedigree = null;
let breedSelection = { motherId: null, fatherId: null, clutchSize: 4 };
let lastClutch = null;
let toast = null;

let obIndex = 0;
let obDemoResults = {};
let obPredictSelection = new Set();
let obPredictRevealed = false;
let obPredictActual = null;
let replayingTutorial = false;
let titleScreenActive = hasSave();

function resetOnboardingState() {
  obIndex = 0;
  obDemoResults = {};
  obPredictSelection = new Set();
  obPredictRevealed = false;
  obPredictActual = null;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function showToast(text) {
  toast = text;
  render();
  setTimeout(() => {
    toast = null;
    render();
  }, 2200);
}

function render() {
  APP.innerHTML = "";
  if (titleScreenActive) {
    APP.appendChild(renderTitleScreen());
    return;
  }
  if (replayingTutorial || !loadWorld().onboardingDone) {
    APP.appendChild(renderOnboarding());
    return;
  }
  APP.appendChild(renderStatusBar());
  APP.appendChild(renderNav());
  const content = el("main", { class: "content" });
  if (currentTab === "collection") content.appendChild(renderCollection());
  if (currentTab === "breed") content.appendChild(renderBreed());
  if (currentTab === "shop") content.appendChild(renderShop());
  if (currentTab === "orders") content.appendChild(renderOrders());
  if (currentTab === "dex") content.appendChild(renderDex());
  if (currentTab === "tutorial") content.appendChild(renderTutorial());
  APP.appendChild(content);
  if (selectedForPedigree) APP.appendChild(renderPedigreeModal(selectedForPedigree));
  if (toast) APP.appendChild(el("div", { class: "toast" }, toast));
}

function renderStatusBar() {
  const w = loadWorld();
  const bar = el("div", { class: "statusbar" });
  bar.appendChild(el("div", { class: "status-chip money" }, `¥${w.money.toLocaleString()}`));
  bar.appendChild(el("div", { class: "status-chip cage" }, `ケージ ${w.myCollection.length}/${CAGE_LIMIT}`));
  bar.appendChild(el("div", { class: "status-chip dex" }, `図鑑 ${w.discovered.length}/${dexTotalCount()}`));
  return bar;
}

function renderNav() {
  const nav = el("nav", { class: "tabgroups" });
  for (const group of TAB_GROUPS) {
    const groupWrap = el("div", { class: "tabgroup tabgroup-" + group.id });
    groupWrap.appendChild(el("div", { class: "tabgroup-label" }, group.label));
    const row = el("div", { class: "tabbar" });
    for (const t of group.tabs) {
      row.appendChild(
        el(
          "button",
          {
            class: "tab" + (currentTab === t.id ? " active" : ""),
            onclick: () => {
              currentTab = t.id;
              render();
            },
          },
          t.label
        )
      );
    }
    groupWrap.appendChild(row);
    nav.appendChild(groupWrap);
  }
  return nav;
}

function snakeLabel(snake) {
  return `${specimenNumber(snake)}（${snake.sex === "male" ? "♂" : "♀"}）`;
}

function snakeCard(snake, opts = {}) {
  const wrapper = el("div", { class: "snake-card" });
  wrapper.appendChild(el("div", { class: "snake-art", html: svgSnake(snake.genotype, 178, snake) }));
  if (snake.mutationGeneId) wrapper.appendChild(el("div", { class: "mutation-badge" }, "✨ 突然変異！"));
  wrapper.appendChild(el("div", { class: "snake-name" }, snakeLabel(snake)));
  wrapper.appendChild(el("div", { class: "snake-morph" }, morphLabel(snake.genotype)));
  if (snake.mutationGeneId) {
    wrapper.appendChild(el("div", { class: "snake-mutation-note" }, `${GENE_BY_ID[snake.mutationGeneId].nameJa}が偶然発現した`));
  }
  if (snake.flareTraits && snake.flareTraits.length > 0) {
    wrapper.appendChild(
      el("div", { class: "snake-flare-note" }, `${snake.flareTraits.map((id) => GENE_BY_ID[id].nameJa).join("・")}のヘテロ持ちかもしれない特徴あり`)
    );
  }
  const actions = el("div", { class: "snake-actions" });
  actions.appendChild(
    el(
      "button",
      {
        class: "btn-secondary",
        onclick: () => {
          selectedForPedigree = snake.id;
          render();
        },
      },
      "家系図"
    )
  );
  if (opts.extra) actions.appendChild(opts.extra);
  wrapper.appendChild(actions);
  if (opts.price != null) wrapper.appendChild(el("div", { class: "snake-price" }, `¥${opts.price.toLocaleString()}`));
  return wrapper;
}

function renderCollection() {
  const wrap = el("div");
  wrap.appendChild(el("h2", {}, "マイコレクション"));
  const mine = myCollectionSnakes();
  if (mine.length === 0) {
    wrap.appendChild(el("p", { class: "muted" }, "まだ手持ちのヘビがいません。ショップで買うか、交配で増やしましょう。"));
  }
  const grid = el("div", { class: "grid" });
  for (const s of mine) {
    const releaseBtn = el(
      "button",
      {
        class: "btn-secondary",
        onclick: () => {
          const refund = releaseSnake(s.id);
          showToast(`${specimenNumber(s)}を手放して ¥${refund.toLocaleString()} を得た`);
        },
      },
      "手放す"
    );
    grid.appendChild(snakeCard(s, { extra: releaseBtn }));
  }
  wrap.appendChild(grid);
  return wrap;
}

function renderBreed() {
  const wrap = el("div");
  wrap.appendChild(el("h2", {}, "交配"));
  const mine = myCollectionSnakes();
  const males = mine.filter((s) => s.sex === "male");
  const females = mine.filter((s) => s.sex === "female");

  if (males.length === 0 || females.length === 0) {
    wrap.appendChild(el("p", { class: "muted" }, "交配にはオス・メスが最低1匹ずつ必要です。ショップで買い足しましょう。"));
    return wrap;
  }

  const form = el("div", { class: "breed-form" });

  const motherSelect = el("select", { onchange: (e) => (breedSelection.motherId = e.target.value) });
  motherSelect.appendChild(el("option", { value: "" }, "母親を選ぶ"));
  for (const f of females) motherSelect.appendChild(el("option", { value: f.id }, `${snakeLabel(f)} ${morphLabel(f.genotype)}`));

  const fatherSelect = el("select", { onchange: (e) => (breedSelection.fatherId = e.target.value) });
  fatherSelect.appendChild(el("option", { value: "" }, "父親を選ぶ"));
  for (const m of males) fatherSelect.appendChild(el("option", { value: m.id }, `${snakeLabel(m)} ${morphLabel(m.genotype)}`));

  form.appendChild(el("label", {}, ["母親", motherSelect]));
  form.appendChild(el("label", {}, ["父親", fatherSelect]));

  const clutchInput = el("input", {
    type: "number",
    min: "1",
    max: "8",
    value: String(breedSelection.clutchSize),
    onchange: (e) => (breedSelection.clutchSize = Math.max(1, Math.min(8, Number(e.target.value) || 4))),
  });
  form.appendChild(el("label", {}, ["卵の数", clutchInput]));

  form.appendChild(
    el(
      "button",
      {
        class: "btn-primary",
        onclick: () => {
          if (!breedSelection.motherId || !breedSelection.fatherId) return;
          const result = breedPair(breedSelection.motherId, breedSelection.fatherId, breedSelection.clutchSize);
          lastClutch = result.babies;
          if (result.allowed < result.requested) {
            showToast(`ケージ上限のため${result.allowed}匹しか卵を確保できなかった`);
          }
          render();
        },
      },
      "交配する"
    )
  );

  wrap.appendChild(form);
  wrap.appendChild(el("p", { class: "muted small" }, `ケージ空き: ${cageSpaceLeft()}匹分`));

  if (lastClutch) {
    wrap.appendChild(el("h3", {}, `生まれた${lastClutch.length}匹`));
    const grid = el("div", { class: "grid" });
    for (const baby of lastClutch) grid.appendChild(snakeCard(baby));
    wrap.appendChild(grid);
  }

  return wrap;
}

function renderShop() {
  const wrap = el("div");
  wrap.appendChild(el("h2", {}, "ショップ"));
  const w = loadWorld();
  const grid = el("div", { class: "grid" });
  w.shop.forEach((entry, idx) => {
    const s = getSnake(entry.snakeId);
    const buyBtn = el(
      "button",
      {
        class: "btn-primary",
        onclick: () => {
          const result = buySnake(idx);
          if (!result.ok) {
            showToast(result.reason === "cage-full" ? "ケージが満杯です" : "資金が足りません");
            return;
          }
          render();
        },
      },
      "購入する"
    );
    grid.appendChild(snakeCard(s, { extra: buyBtn, price: entry.price }));
  });
  if (w.shop.length === 0) wrap.appendChild(el("p", { class: "muted" }, "今は売り切れです。"));
  wrap.appendChild(grid);
  return wrap;
}

function renderOrders() {
  const wrap = el("div");
  wrap.appendChild(el("h2", {}, "顧客からの依頼"));
  wrap.appendChild(el("p", { class: "muted small" }, "指定された特徴を持つ個体を手持ちから納品すると報酬がもらえます。"));
  const w = loadWorld();
  const mine = myCollectionSnakes();
  const list = el("div", { class: "order-list" });
  for (const order of w.orders) {
    const card = el("div", { class: "order-card" });
    card.appendChild(el("div", { class: "order-title" }, order.req.label));
    card.appendChild(el("div", { class: "order-reward" }, `報酬 ¥${order.reward.toLocaleString()}`));
    const matches = mine.filter((s) => snakeMatchesOrder(s, order));
    if (matches.length === 0) {
      card.appendChild(el("div", { class: "muted small" }, "条件に合う個体がまだいません"));
    } else {
      const matchList = el("div", { class: "order-matches" });
      for (const s of matches) {
        matchList.appendChild(
          el(
            "button",
            {
              class: "btn-primary",
              onclick: () => {
                fulfillOrder(order.id, s.id);
                showToast(`${snakeLabel(s)}を納品して ¥${order.reward.toLocaleString()} を得た`);
                render();
              },
            },
            `${snakeLabel(s)}を納品`
          )
        );
      }
      card.appendChild(matchList);
    }
    list.appendChild(card);
  }
  wrap.appendChild(list);
  return wrap;
}

function geneTypeLabel(type) {
  if (type === GENE_TYPE.RECESSIVE) return "潜性（劣性）";
  if (type === GENE_TYPE.DOMINANT) return "顕性（優性）";
  return "不完全顕性・共優性";
}

function renderDex() {
  const wrap = el("div");
  wrap.appendChild(el("h2", {}, "図鑑"));
  const w = loadWorld();
  wrap.appendChild(el("p", { class: "muted small" }, `発見済み ${w.discovered.length} / ${dexTotalCount()}（購入・交配で見た目に出た形質が記録されていく）`));
  const grid = el("div", { class: "dex-grid" });
  for (const g of GENES) {
    const found = w.discovered.includes(g.id);
    const card = el("div", { class: "dex-card" + (found ? "" : " undiscovered") });
    card.appendChild(el("div", { class: "dex-swatch", style: `background:${found ? g.color : "#cfcac0"}` }));
    card.appendChild(el("div", { class: "dex-name" }, found ? `${g.nameJa}（${g.nameEn}）` : "？？？"));
    card.appendChild(el("div", { class: "dex-type" }, geneTypeLabel(g.type)));
    card.appendChild(el("div", { class: "dex-note" }, found ? g.note : "まだ発見していません"));
    grid.appendChild(card);
  }
  for (const a of BEL_LOCUS.alleles) {
    const found = w.discovered.includes("bel-het-" + a.id);
    const card = el("div", { class: "dex-card" + (found ? "" : " undiscovered") });
    card.appendChild(el("div", { class: "dex-swatch", style: `background:${found ? a.color : "#cfcac0"}` }));
    card.appendChild(el("div", { class: "dex-name" }, found ? `${a.nameJa}（${a.nameEn}）` : "？？？"));
    card.appendChild(el("div", { class: "dex-type" }, "不完全顕性・共優性（複対立）"));
    card.appendChild(el("div", { class: "dex-note" }, found ? BEL_LOCUS.belNote : "まだ発見していません"));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
}

function punnettTable(p) {
  const table = el("table", { class: "punnett" });
  const headRow = el("tr", {}, [el("th"), ...p.top.map((t) => el("th", {}, t))]);
  table.appendChild(headRow);

  for (const l of p.left) {
    const cells = [el("th", {}, l)];
    for (const t of p.top) {
      const key = l + t;
      const label = p.labels[key] || p.labels[t + l] || key;
      const color = (p.colors && (p.colors[key] || p.colors[t + l])) || null;
      const cellChildren = [];
      if (color) cellChildren.push(el("span", { class: "punnett-dot", style: `background:${color}` }));
      cellChildren.push(el("div", { class: "punnett-genotype" }, `${l}${t}`));
      cellChildren.push(el("div", { class: "punnett-label" }, label));
      cells.push(el("td", {}, cellChildren));
    }
    table.appendChild(el("tr", {}, cells));
  }
  return table;
}

function gameteDiagram(leftAlleles, topAlleles, leftColor, topColor) {
  const wrap = el("div", { class: "gamete-diagram" });

  function parentBlock(label, alleles, color) {
    const block = el("div", { class: "gamete-parent" });
    block.appendChild(el("div", { class: "gamete-parent-label" }, label));
    const dot = el("div", { class: "gamete-dot-row" });
    for (const a of alleles) dot.appendChild(el("div", { class: "gamete-dot", style: `background:${color}` }, a));
    block.appendChild(dot);
    return block;
  }

  const row = el("div", { class: "gamete-row" });
  row.appendChild(parentBlock("親A", leftAlleles, leftColor));
  row.appendChild(el("div", { class: "gamete-arrow" }, "→"));
  row.appendChild(el("div", { class: "gamete-egg" }, "🥚 卵"));
  row.appendChild(el("div", { class: "gamete-arrow" }, "←"));
  row.appendChild(parentBlock("親B", topAlleles, topColor));
  wrap.appendChild(row);
  wrap.appendChild(el("p", { class: "muted small center" }, "それぞれの親は、持っている2つの対立遺伝子のうち「どちらか1つ」をランダムに卵へ渡す"));
  return wrap;
}

function renderTutorial() {
  const wrap = el("div", { class: "tutorial" });
  wrap.appendChild(el("h2", {}, "チュートリアル：遺伝のきほん"));
  wrap.appendChild(
    el(
      "button",
      {
        class: "btn-primary",
        style: "margin-bottom:16px;",
        onclick: () => {
          resetOnboardingState();
          replayingTutorial = true;
          render();
        },
      },
      "▶ ガイド付きレッスンをもう一度あそぶ"
    )
  );
  wrap.appendChild(el("p", { class: "muted small" }, "下の読み物はまとめです。実際に手を動かして学びたい時は上のボタンから。"));
  for (const step of TUTORIAL_STEPS) {
    const section = el("section", { class: "tutorial-step" });
    section.appendChild(el("h3", {}, step.title));
    for (const para of step.paragraphs) section.appendChild(el("p", {}, para));
    if (step.diagram === "gamete") section.appendChild(gameteDiagram(["A", "a"], ["A", "a"], "#f2c9a0", "#f2c9a0"));
    if (step.punnett) {
      if (step.punnettDiagram) {
        section.appendChild(gameteDiagram(step.punnett.left, step.punnett.top, step.punnettDiagram.leftColor, step.punnettDiagram.topColor));
      }
      section.appendChild(punnettTable(step.punnett));
    }
    wrap.appendChild(section);
  }

  const aboutCard = el("section", { class: "about-card" });
  aboutCard.appendChild(el("h3", {}, "保護者・先生の方へ"));
  aboutCard.appendChild(el("p", {}, "このアプリの遺伝の説明は、2021年度から学校の理科で使われている「顕性・潜性」という正式な用語に沿っています。"));
  aboutCard.appendChild(el("p", {}, "広告は表示されず、個人情報の入力・送信も一切ありません。データはこの端末のブラウザ内だけに保存されます。"));
  wrap.appendChild(aboutCard);

  return wrap;
}

function pedigreeNode(node, label) {
  if (!node) return el("div", { class: "pedigree-node empty" }, "？");
  const box = el("div", { class: "pedigree-node" });
  box.appendChild(el("div", { class: "pedigree-art", html: svgSnake(node.snake.genotype, 70, node.snake) }));
  box.appendChild(el("div", { class: "pedigree-label" }, `${label ? label + ": " : ""}${specimenNumber(node.snake)}`));
  box.appendChild(el("div", { class: "pedigree-morph" }, morphLabel(node.snake.genotype)));
  return box;
}

function renderPedigreeModal(snakeId) {
  const tree = pedigreeOf(snakeId, 2);
  const overlay = el("div", {
    class: "modal-overlay",
    onclick: (e) => {
      if (e.target === overlay) {
        selectedForPedigree = null;
        render();
      }
    },
  });
  const modal = el("div", { class: "modal" });
  modal.appendChild(el("h3", {}, `${specimenNumber(tree.snake)}の家系図`));

  const grid = el("div", { class: "pedigree-grid" });
  grid.appendChild(pedigreeNode(tree.father && tree.father.father, "祖父(父方)"));
  grid.appendChild(pedigreeNode(tree.father && tree.father.mother, "祖母(父方)"));
  grid.appendChild(pedigreeNode(tree.mother && tree.mother.father, "祖父(母方)"));
  grid.appendChild(pedigreeNode(tree.mother && tree.mother.mother, "祖母(母方)"));
  grid.appendChild(pedigreeNode(tree.father, "父"));
  grid.appendChild(pedigreeNode(tree.mother, "母"));
  grid.appendChild(pedigreeNode(tree, "本人"));

  modal.appendChild(grid);
  modal.appendChild(
    el(
      "button",
      {
        class: "btn-secondary",
        onclick: () => {
          selectedForPedigree = null;
          render();
        },
      },
      "閉じる"
    )
  );
  overlay.appendChild(modal);
  return overlay;
}

function renderTitleScreen() {
  const wrap = el("div", { class: "title-screen" });
  wrap.appendChild(
    el(
      "button",
      {
        class: "btn-secondary title-btn",
        onclick: () => {
          titleScreenActive = false;
          render();
        },
      },
      "つづきから"
    )
  );
  wrap.appendChild(
    el(
      "button",
      {
        class: "btn-primary title-btn",
        onclick: () => {
          resetWorld();
          resetOnboardingState();
          replayingTutorial = false;
          titleScreenActive = false;
          render();
        },
      },
      "はじめから"
    )
  );
  wrap.appendChild(el("p", { class: "muted small center" }, "「はじめから」を選ぶと、今のコレクション・資金はすべて消えて新しく始まります。"));
  return wrap;
}

// ---- ガイド付きチュートリアル(オンボーディング) ----

function demoSnakeCard(genotype, label) {
  const box = el("div", { class: "snake-card" });
  box.appendChild(el("div", { class: "snake-art", html: svgSnake(genotype, 120) }));
  if (label) box.appendChild(el("div", { class: "snake-name" }, label));
  box.appendChild(el("div", { class: "snake-morph" }, morphLabel(genotype)));
  return box;
}

function obGoTo(index) {
  obIndex = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, index));
  render();
}

function obNavButtons(canNext) {
  const row = el("div", { class: "ob-nav" });
  if (obIndex > 0) row.appendChild(el("button", { class: "btn-secondary", onclick: () => obGoTo(obIndex - 1) }, "もどる"));
  if (canNext) row.appendChild(el("button", { class: "btn-primary", onclick: () => obGoTo(obIndex + 1) }, "つぎへ"));
  return row;
}

function renderOnboarding() {
  const step = ONBOARDING_STEPS[obIndex];
  const wrap = el("div", { class: "onboarding" });

  const topRow = el("div", { class: "ob-top" });
  topRow.appendChild(el("div", { class: "ob-progress" }, `レッスン ${obIndex + 1} / ${ONBOARDING_STEPS.length}`));
  topRow.appendChild(
    el(
      "button",
      {
        class: "btn-secondary",
        onclick: () => {
          completeOnboarding();
          replayingTutorial = false;
          render();
        },
      },
      "スキップ"
    )
  );
  wrap.appendChild(topRow);

  const card = el("div", { class: "ob-card" });
  card.appendChild(el("h2", {}, step.title));
  for (const p of step.paragraphs) card.appendChild(el("p", {}, p));
  if (step.diagram === "gamete") card.appendChild(gameteDiagram(["A", "a"], ["A", "a"], "#f2c9a0", "#f2c9a0"));

  if (step.type === "read") {
    card.appendChild(obNavButtons(true));
  }

  if (step.type === "breed-demo") {
    if (step.review) card.appendChild(el("div", { class: "ob-review-badge" }, "復習"));
    const parentRow = el("div", { class: "grid" });
    parentRow.appendChild(demoSnakeCard(step.setup.motherGenotype, "母親"));
    parentRow.appendChild(demoSnakeCard(step.setup.fatherGenotype, "父親"));
    card.appendChild(parentRow);

    if (step.predictText) card.appendChild(el("div", { class: "ob-predict" }, step.predictText));

    const result = obDemoResults[step.key];
    if (!result) {
      card.appendChild(
        el(
          "button",
          {
            class: "btn-primary",
            onclick: () => {
              const babies = [];
              for (let i = 0; i < step.setup.clutchSize; i++) babies.push(breed(step.setup.motherGenotype, step.setup.fatherGenotype));
              obDemoResults[step.key] = babies;
              render();
            },
          },
          step.breedLabel || `交配して卵を${step.setup.clutchSize}個孵化させる`
        )
      );
    } else {
      const grid = el("div", { class: "grid" });
      for (const g of result) grid.appendChild(demoSnakeCard(g));
      card.appendChild(grid);
      for (const line of step.explain(result)) card.appendChild(el("p", { class: "ob-explain" }, line));
      card.appendChild(obNavButtons(true));
    }
  }

  if (step.type === "predict") {
    const parentRow = el("div", { class: "grid" });
    parentRow.appendChild(demoSnakeCard(step.setup.motherGenotype, "母親"));
    parentRow.appendChild(demoSnakeCard(step.setup.fatherGenotype, "父親"));
    card.appendChild(parentRow);

    const optList = el("div", { class: "ob-options" });
    for (const opt of step.options) {
      const checked = obPredictSelection.has(opt.id);
      const btn = el(
        "button",
        {
          class: "ob-option" + (checked ? " checked" : "") + (obPredictRevealed ? (step.correctIds.includes(opt.id) ? " correct" : checked ? " wrong" : "") : ""),
          onclick: () => {
            if (obPredictRevealed) return;
            if (obPredictSelection.has(opt.id)) obPredictSelection.delete(opt.id);
            else obPredictSelection.add(opt.id);
            render();
          },
        },
        opt.label
      );
      optList.appendChild(btn);
    }
    card.appendChild(optList);

    if (!obPredictRevealed) {
      card.appendChild(
        el(
          "button",
          {
            class: "btn-primary",
            onclick: () => {
              obPredictRevealed = true;
              render();
            },
          },
          "これで決定"
        )
      );
    } else {
      card.appendChild(
        el(
          "p",
          { class: "ob-explain" },
          "緑＝実際に生まれうる見た目、赤＝選んだが実際には生まれない見た目です。パステルもアルビノも両親のどちらかしか持っていないため、2つ揃わないと見た目には出ません。"
        )
      );
      if (!obPredictActual) {
        card.appendChild(
          el(
            "button",
            {
              class: "btn-primary",
              onclick: () => {
                const babies = [];
                for (let i = 0; i < step.setup.clutchSize; i++) babies.push(breed(step.setup.motherGenotype, step.setup.fatherGenotype));
                obPredictActual = babies;
                render();
              },
            },
            "実際に交配してみる"
          )
        );
      } else {
        const grid = el("div", { class: "grid" });
        for (const g of obPredictActual) grid.appendChild(demoSnakeCard(g));
        card.appendChild(grid);
        card.appendChild(obNavButtons(true));
      }
    }
  }

  if (step.type === "done") {
    card.appendChild(
      el(
        "button",
        {
          class: "btn-primary",
          onclick: () => {
            for (const key of Object.keys(obDemoResults)) {
              for (const g of obDemoResults[key]) grantSnakeFromGenotype(g);
            }
            if (obPredictActual) for (const g of obPredictActual) grantSnakeFromGenotype(g);
            completeOnboarding();
            replayingTutorial = false;
            render();
          },
        },
        "はじめる！"
      )
    );
  }

  wrap.appendChild(card);
  return wrap;
}

render();
