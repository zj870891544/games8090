(() => {
  const data = window.GAMES8090_DATA;

  if (!data || !Array.isArray(data.GAMES)) {
    console.error("Missing GAMES8090_DATA.");
    return;
  }

  const { CATEGORY_META, GAMES } = data;
  const categoryOrder = ["all", "puzzle", "action", "classic", "casual"];
  const state = {
    keyword: "",
    category: "all"
  };

  const nodes = {
    searchInput: document.getElementById("searchInput"),
    totalCount: document.getElementById("totalCount"),
    visibleCount: document.getElementById("visibleCount"),
    filterSummary: document.getElementById("filterSummary"),
    categoryFilters: document.getElementById("categoryFilters"),
    gamesGrid: document.getElementById("gamesGrid"),
    emptyState: document.getElementById("emptyState"),
    year: document.getElementById("year")
  };

  if (!nodes.searchInput || !nodes.categoryFilters || !nodes.gamesGrid) {
    console.error("Required UI nodes are missing.");
    return;
  }

  const allCategories = new Set(["all"]);
  GAMES.forEach((game) => {
    if (game.category) {
      allCategories.add(game.category);
    }
  });

  const categories = categoryOrder
    .filter((key) => allCategories.has(key))
    .concat(Array.from(allCategories).filter((key) => !categoryOrder.includes(key)));

  const normalize = (value) => String(value || "").toLowerCase().trim();

  function categoryLabel(key) {
    return CATEGORY_META[key]?.label || key;
  }

  function categoryIcon(key) {
    return CATEGORY_META[key]?.icon || "🏷️";
  }

  function categoryCount(key) {
    if (key === "all") {
      return GAMES.length;
    }
    return GAMES.filter((game) => game.category === key).length;
  }

  function getVisibleGames() {
    const keyword = normalize(state.keyword);
    return GAMES.filter((game) => {
      const byCategory = state.category === "all" || game.category === state.category;
      if (!byCategory) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const target = normalize(`${game.name} ${game.desc} ${game.file}`);
      return target.includes(keyword);
    });
  }

  function renderFilters() {
    nodes.categoryFilters.innerHTML = "";
    const fragment = document.createDocumentFragment();

    categories.forEach((key) => {
      const button = document.createElement("button");
      const icon = document.createElement("span");
      const label = document.createElement("span");
      const count = document.createElement("em");

      button.type = "button";
      button.className = "filter-btn";
      button.dataset.category = key;
      button.dataset.active = String(state.category === key);
      button.setAttribute("aria-pressed", String(state.category === key));

      icon.textContent = categoryIcon(key);
      label.textContent = categoryLabel(key);
      count.textContent = String(categoryCount(key));

      button.append(icon, label, count);
      fragment.appendChild(button);
    });

    nodes.categoryFilters.appendChild(fragment);
  }

  function renderSummary(visibleCount) {
    const summary = [];

    if (state.category === "all") {
      summary.push("全部分类");
    } else {
      summary.push(categoryLabel(state.category));
    }

    if (state.keyword) {
      summary.push(`关键词: ${state.keyword}`);
    }

    summary.push(`结果: ${visibleCount}`);
    nodes.filterSummary.textContent = summary.join(" | ");
  }

  function buildCard(game, index) {
    const wrapper = document.createElement("a");
    const card = document.createElement("article");
    const head = document.createElement("div");
    const icon = document.createElement("div");
    const titleBox = document.createElement("div");
    const title = document.createElement("h3");
    const file = document.createElement("p");
    const desc = document.createElement("p");
    const foot = document.createElement("div");
    const tag = document.createElement("span");
    const action = document.createElement("span");

    wrapper.className = "game-link";
    wrapper.href = `play.html?game=${encodeURIComponent(game.file)}`;
    wrapper.setAttribute("aria-label", `打开 ${game.name}`);

    card.className = "game-card";
    card.style.setProperty("--stagger", String(index));

    head.className = "game-head";
    icon.className = "game-icon";
    icon.textContent = game.icon || "🎲";

    titleBox.className = "game-meta";
    title.className = "game-title";
    title.textContent = game.name;
    file.className = "game-file";
    file.textContent = game.file;

    titleBox.append(title, file);
    head.append(icon, titleBox);

    desc.className = "game-desc";
    desc.textContent = game.desc || "点击进入游戏。";

    foot.className = "card-foot";
    tag.className = "game-tag";
    tag.textContent = categoryLabel(game.category);
    action.className = "open-label";
    action.textContent = "开始游戏 →";
    foot.append(tag, action);

    card.append(head, desc, foot);
    wrapper.appendChild(card);
    return wrapper;
  }

  function renderGames() {
    const visibleGames = getVisibleGames();
    nodes.gamesGrid.innerHTML = "";

    const fragment = document.createDocumentFragment();
    visibleGames.forEach((game, index) => {
      fragment.appendChild(buildCard(game, index));
    });
    nodes.gamesGrid.appendChild(fragment);

    nodes.emptyState.hidden = visibleGames.length > 0;
    nodes.totalCount.textContent = String(GAMES.length);
    nodes.visibleCount.textContent = String(visibleGames.length);
    renderSummary(visibleGames.length);
  }

  function render() {
    renderFilters();
    renderGames();
  }

  nodes.searchInput.addEventListener("input", (event) => {
    state.keyword = event.target.value.trim();
    renderGames();
  });

  nodes.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) {
      return;
    }

    state.category = button.dataset.category || "all";
    render();
  });

  if (nodes.year) {
    nodes.year.textContent = String(new Date().getFullYear());
  }

  render();
})();
