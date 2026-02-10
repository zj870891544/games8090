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

  function showError(message) {
    if (loadingTip) {
      loadingTip.hidden = true;
    }
    frame.hidden = true;
    errorNode.hidden = false;
    errorNode.innerHTML = `${message}<br><a href=\"index.html\">返回首页重新选择</a>`;
    titleNode.textContent = "无法加载游戏";
    document.title = "加载失败 | Games8090";
  }

  const params = new URLSearchParams(window.location.search);
  const requestedFile = params.get("game");

  if (!requestedFile) {
    showError("URL 缺少 game 参数。");
    return;
  }

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
