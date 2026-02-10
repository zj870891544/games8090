(() => {
  const CATEGORY_META = Object.freeze({
    all: { label: "全部", icon: "✨" },
    puzzle: { label: "益智", icon: "🧠" },
    action: { label: "动作", icon: "⚡" },
    classic: { label: "经典", icon: "🎮" },
    casual: { label: "休闲", icon: "🍀" }
  });

  const GAMES = Object.freeze([
    { name: "Flappy Bird", file: "Flappy_Bird.html", category: "casual", icon: "🐤", desc: "控制小鸟穿越管道，考验节奏与反应。" },
    { name: "Infinite Defense", file: "InfiniteDefense.html", category: "action", icon: "🛡️", desc: "2D 防守战斗，抵御一波波敌人推进。" },
    { name: "Infinite Shooting", file: "InfiniteShooting.html", category: "action", icon: "🚀", desc: "2D 生存射击玩法，强化火力并坚持更久。" },
    { name: "数字华容道", file: "number_slide_puzzle.html", category: "puzzle", icon: "🔢", desc: "滑动数字方块还原顺序，锻炼逻辑思维。" },
    { name: "生态瓶工程师", file: "Sphere_Engineer.html", category: "casual", icon: "🌍", desc: "构建微型生态系统，观察环境与生物平衡。" },
    { name: "生态瓶工程师（新版）", file: "Sphere_Engineer_new.html", category: "casual", icon: "🧪", desc: "新版生态模拟体验，打造你的微型生态圈。" },
    { name: "贪吃蛇经典版", file: "Snake_Classic.html", category: "classic", icon: "🐍", desc: "经典贪吃蛇玩法，支持键盘与触控操作。" },
    { name: "2048 经典版", file: "Game2048.html", category: "puzzle", icon: "🔢", desc: "滑动合并数字，挑战更高分与更大数字。" },
    { name: "记忆翻牌", file: "Memory_Match.html", category: "casual", icon: "🧩", desc: "翻开卡牌寻找配对，考验短时记忆与专注。" },
    { name: "打砖块经典版", file: "Breakout_Classic.html", category: "action", icon: "🧱", desc: "弹球击碎砖块，闯关挑战越来越快。" },
    { name: "井字棋 AI 对战", file: "TicTacToe_AI.html", category: "puzzle", icon: "⭕", desc: "经典井字棋玩法，支持双人和人机对战。" },
    { name: "乒乓对战经典版", file: "Pong_Classic.html", category: "action", icon: "🏓", desc: "与 AI 展开乒乓对战，先到目标分数获胜。" },
    { name: "推箱子迷你版", file: "Sokoban_Mini.html", category: "puzzle", icon: "📦", desc: "推动箱子到目标点，挑战多关卡逻辑谜题。" },
    { name: "Simon 记忆灯", file: "Simon_Lights.html", category: "casual", icon: "🟢", desc: "记住并复现灯光顺序，轮次会逐步加长。" },
    { name: "小行星闪避", file: "Asteroid_Dodge.html", category: "action", icon: "☄️", desc: "驾驶飞船躲避不断坠落的小行星，尽量生存更久。" },
    { name: "中国象棋", file: "中国象棋.html", category: "classic", icon: "♟️", desc: "传统策略棋类对战，体验将帅博弈。" },
    { name: "五子棋", file: "五子棋.html", category: "puzzle", icon: "⚪", desc: "黑白落子，先连成五子者获胜。" },
    { name: "俄罗斯方块", file: "俄罗斯方块.html", category: "classic", icon: "🧱", desc: "拼接方块消行，经典耐玩。" },
    { name: "四子棋智能版", file: "四子棋智能版.html", category: "puzzle", icon: "🔴", desc: "与智能对手进行四子连线对战。" },
    { name: "四字棋", file: "四字棋.html", category: "puzzle", icon: "🟡", desc: "快节奏连线棋，规则简单上手快。" },
    { name: "坦克大战", file: "坦克大战.html", category: "action", icon: "🛡️", desc: "驾驶坦克躲避炮火并击败敌人。" },
    { name: "多形态生命游戏", file: "多形态生命游戏.html", category: "puzzle", icon: "🧬", desc: "探索不同网格下的生命演化规则。" },
    { name: "天天跑酷", file: "天天跑酷.html", category: "action", icon: "🏃", desc: "快速反应跳跃躲避障碍，挑战更远距离。" },
    { name: "打地鼠", file: "打地鼠.html", category: "casual", icon: "🔨", desc: "地鼠随机冒头，拼手速拿高分。" },
    { name: "扫雷", file: "扫雷.html", category: "classic", icon: "💣", desc: "根据数字推理排雷，经典逻辑玩法。" },
    { name: "指尖钢琴", file: "指尖钢琴.html", category: "casual", icon: "🎹", desc: "按键演奏旋律，轻松体验音乐乐趣。" },
    { name: "消灭星星", file: "消灭星星.html", category: "casual", icon: "⭐", desc: "点击同色星星消除，连击更高分。" },
    { name: "炸弹人", file: "炸弹人.html", category: "action", icon: "💥", desc: "放置炸弹开路，击败对手与怪物。" },
    { name: "生命游戏", file: "生命游戏.html", category: "puzzle", icon: "🌱", desc: "观察细胞自动机在规则下生灭演化。" },
    { name: "超级马里奥", file: "超级马里奥.html", category: "classic", icon: "🍄", desc: "横版闯关冒险，跳跃与收集并行。" },
    { name: "魂斗罗", file: "魂斗罗.html", category: "classic", icon: "🔫", desc: "街机风横版射击，爽快火力输出。" }
  ]);

  window.GAMES8090_DATA = Object.freeze({
    CATEGORY_META,
    GAMES
  });
})();
