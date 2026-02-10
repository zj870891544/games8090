(() => {
  const data = window.GAMES8090_DATA;
  const games = Array.isArray(data?.GAMES) ? data.GAMES : [];

  const frame = document.getElementById("gameFrame");
  const titleNode = document.getElementById("playerTitle");
  const loadingTip = document.getElementById("loadingTip");
  const errorNode = document.getElementById("playerError");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  if (!frame || !titleNode || !errorNode || !fullscreenBtn) {
    console.error("Required player UI nodes are missing.");
    return;
  }

  const LEGACY_FILE_ALIASES = Object.freeze({
    "Flappy Bird .html": "Flappy_Bird.html"
  });

  function showError(message) {
    if (loadingTip) {
      loadingTip.hidden = true;
    }
    frame.hidden = true;
    errorNode.hidden = false;
    errorNode.innerHTML = `${message}<br><a href="index.html">返回首页重新选择</a>`;
    titleNode.textContent = "无法加载游戏";
    document.title = "加载失败 | Games8090";
  }

  const params = new URLSearchParams(window.location.search);
  const requestedRaw = params.get("game");

  if (!requestedRaw) {
    showError("URL 缺少 game 参数。");
    return;
  }

  const requestedFile = LEGACY_FILE_ALIASES[requestedRaw] || requestedRaw;
  const isSafeGameFile =
    /^[^\\/]+\.html$/i.test(requestedFile) &&
    !requestedFile.includes("..");

  const mappedGame = games.find((item) => item.file === requestedFile);
  const fallbackGame = isSafeGameFile
    ? {
        name: requestedFile
          .replace(/\.html$/i, "")
          .replace(/[_-]+/g, " ")
          .trim(),
        file: requestedFile
      }
    : null;

  const game = mappedGame || fallbackGame;
  if (!game) {
    showError("参数中的游戏文件名无效。请从首页进入游戏。");
    return;
  }

  frame.addEventListener("load", () => {
    if (loadingTip) {
      loadingTip.hidden = true;
    }

    // Cloudflare Pages 在找不到文件时可能返回首页内容，避免把首页误显示在游戏容器内。
    try {
      const loadedTitle = frame.contentDocument?.title || "";
      const loadedPath = frame.contentWindow?.location?.pathname || "";
      if (loadedPath.startsWith("/games/") && loadedTitle.includes("Games8090 | HTML")) {
        showError("游戏文件未找到。请确认该文件名已同步到线上部署。");
      }
    } catch (error) {
      console.warn("Could not inspect iframe content:", error);
    }
  });

  titleNode.textContent = game.name;
  document.title = `${game.name} | Games8090`;
  frame.title = game.name;
  frame.src = `games/${encodeURIComponent(game.file)}`;

  function syncFullscreenState() {
    const inFullscreen = Boolean(document.fullscreenElement);
    fullscreenBtn.textContent = inFullscreen ? "退出全屏" : "进入全屏";
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  }

  fullscreenBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenState);
  syncFullscreenState();
})();
