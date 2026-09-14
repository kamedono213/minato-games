// 画面遷移・描画ロジック

const APP = document.getElementById("app");
const TABS = [
  { id: "collection", label: "マイコレクション" },
  { id: "breed", label: "交配" },
  { id: "shop", label: "ショップ" },
  { id: "orders", label: "依頼" },
  { id: "dex", label: "図鑑" },
  { id: "tutorial", label: "チュートリアル" },
];

let currentTab = "collection";
let selectedForPedigree = null;
let breedSelection = { motherId: null, fatherId: null, clutchSize: 4 };
let lastClutch = null;
let toast = null;

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
  const nav = el("nav", { class: "tabbar" });
  for (const t of TABS) {
    nav.appendChild(
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
  return nav;
}

function snakeLabel(snake) {
  return `${specimenNumber(snake)}（${snake.sex === "male" ? "♂" : "♀"}）`;
}

function snakeCard(snake, opts = {}) {
  const wrapper = el("div", { class: "snake-card" });
  wrapper.appendChild(el("div", { class: "snake-art", html: svgSnake(snake.genotype, 160) }));
  wrapper.appendChild(el("div", { class: "snake-name" }, snakeLabel(snake)));
  wrapper.appendChild(el("div", { class: "snake-morph" }, morphLabel(snake.genotype)));
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
  return wrap;
}

function pedigreeNode(node, label) {
  if (!node) return el("div", { class: "pedigree-node empty" }, "？");
  const box = el("div", { class: "pedigree-node" });
  box.appendChild(el("div", { class: "pedigree-art", html: svgSnake(node.snake.genotype, 70) }));
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

render();
