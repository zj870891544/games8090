import { writeFileSync } from "node:fs";
const catalog = [
  ["Neon Drift", "racing", "Mint Circuit Studio", "#135c63", "#b3f66e", "car"],
  [
    "Pocket Planet",
    "adventure",
    "Little Orbit",
    "#4246a0",
    "#ffbd69",
    "planet",
  ],
  ["Block Party", "puzzle", "Grid Works", "#804de1", "#a8f36f", "blocks"],
  ["Court Kings", "sports", "Half Court", "#e87939", "#ffd54e", "ball"],
  ["Skybound", "platform", "Cloud Nine", "#39a4c1", "#ffe1b0", "island"],
  ["Orbit Rush", "arcade", "Little Orbit", "#393080", "#f6a3ec", "rocket"],
  ["Tiny Tactics", "strategy", "Pawn House", "#375c4c", "#bfdf83", "chess"],
  ["Matcha Match", "puzzle", "Soft Serve", "#74a879", "#ffdba0", "gems"],
  [
    "Turbo Trail",
    "driving",
    "Mint Circuit Studio",
    "#c85d50",
    "#ffdb82",
    "car",
  ],
  [
    "Table for Two",
    "2 Player",
    "Side by Side",
    "#4656a8",
    "#ffb399",
    "paddles",
  ],
  ["Bubble Lagoon", "casual", "Soft Serve", "#1999aa", "#c9fff0", "bubbles"],
  ["Pixel Quest", "action", "Bit Foundry", "#525067", "#f7c957", "sword"],
  ["Cosmic Rally", "racing", "Star Garage", "#2d3265", "#cb99f2", "car"],
  ["Garden Tiles", "board", "Moss Studio", "#25685a", "#e1ea9a", "blocks"],
  [
    "Co-op Cosmos",
    "multiplayer",
    "Little Orbit",
    "#7a528c",
    "#fecc85",
    "planet",
  ],
  ["Goal Rush", "sports", "Half Court", "#268d65", "#e8fbbe", "football"],
  ["Neon Drift", "racing", "Different Studio", "#385268", "#fed363", "car"],
  ["Moon Kitchen", "cooking", "Soft Serve", "#535aa2", "#ffdea6", "donut"],
  ["Dungeon Dash", "adventure", "Bit Foundry", "#674581", "#dd99ae", "sword"],
  ["Solitaire After Dark", "card", "Pawn House", "#267062", "#ffd582", "cards"],
  ["Mecha Arena", "shooter", "Bit Foundry", "#28406a", "#6af3de", "robot"],
  ["City Builder", "simulation", "Moss Studio", "#669aac", "#f9e495", "city"],
  ["Dots Together", "io", "Side by Side", "#3e3c7e", "#e9a5ef", "bubbles"],
  ["Midnight Manor", "horror", "Night Window", "#3c4b63", "#cfddaa", "city"],
];
const descriptions = {
  car: "Find your line, time each turn, and keep your momentum through a winding course.",
  planet:
    "Explore a tiny world full of unexpected paths and colorful discoveries.",
  blocks:
    "Arrange colorful pieces, complete the grid, and make room for your next move.",
  ball: "Find the perfect angle and make your next shot count.",
  island:
    "Hop between floating islands and discover what lies above the clouds.",
  rocket: "Navigate a twisting route through a colorful galaxy.",
  chess: "Think a move ahead and bring your best strategy to the board.",
  gems: "Match bright pieces and work your way through a satisfying puzzle.",
  paddles: "Share a screen and challenge a friend to a quick rally.",
  bubbles: "Connect colorful bubbles and find a moment of flow.",
  sword:
    "Explore mysterious rooms and face a new challenge around every corner.",
  football: "Aim for the open space and send the ball toward the goal.",
  donut: "Prepare colorful treats and keep your tiny kitchen running.",
  cards: "Sort your cards and plan the perfect sequence.",
  robot: "Make quick decisions in a vivid mechanical arena.",
  city: "Discover a miniature world with stories around every corner.",
};
const providers = {
  playgama: [],
  gamepix: [],
  gamemonetize: [],
  wgplayground: [],
};
const normalized = [];
function add(entry, i, pid, overrideTitle) {
  const [title, category, developer] = entry;
  const slug =
    title.toLowerCase().replaceAll(" ", "-") + (i === 16 ? "-alt" : "");
  const common = {
    id: `demo-${i + 1}`,
    title: overrideTitle || title,
    description: descriptions[entry[5]],
    width: 960,
    height: 540,
    tags: [entry[5], "quick play"],
    ...(i === 1 ? { orientation: "portrait", width: 450, height: 800 } : {}),
  };
  const url = `/fixtures/player?game=${slug}&source=${pid}`;
  const thumb = i === 0 ? "/art/night-drift.webp" : `/art/${slug}.svg`;
  if (pid === "playgama")
    providers[pid].push({
      ...common,
      developer,
      gameURL: url,
      thumbnail: thumb,
      categories: [category, "Arcade"],
      mobile: true,
      touch: true,
      keyboard: true,
      rank: 100 - i,
      controls:
        "Demo preview: use the on-screen button. Live controls require publisher verification.",
    });
  if (pid === "gamepix")
    providers[pid].push({
      ...common,
      author: developer,
      url,
      thumbnailUrl: thumb,
      categories: [category, "Arcade"],
      responsive: true,
      touch: true,
      hwcontrols: true,
      rkScore: 100 - i,
    });
  if (pid === "gamemonetize")
    providers[pid].push({
      ...common,
      author: developer,
      url,
      thumb,
      category: [category, "Casual"],
      mobile: 1,
    });
  if (pid === "wgplayground")
    providers[pid].push({
      ...common,
      developer,
      url,
      thumbnail: thumb,
      categories: [category, "Arcade"],
      mobile: true,
    });
}
for (let i = 0; i < catalog.length; i++) {
  const e = catalog[i];
  add(e, i, Object.keys(providers)[i % 4]);
  normalized.push({
    title: e[0],
    slug: e[0].toLowerCase().replaceAll(" ", "-"),
    art: e[5],
  });
}
add(catalog[0], 0, "gamepix", "NEON-DRIFT");
add(catalog[0], 0, "gamemonetize", "Neon Drift ");
add(catalog[2], 2, "wgplayground");
writeFileSync(
  "fixtures/providers.json",
  JSON.stringify(providers, null, 2) + "\n",
);
const rect = (x, y, w, h, fill, rx = 10) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const circle = (x, y, r, fill) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
for (let i = 0; i < catalog.length; i++) {
  const [title, , , bg, accent, type] = catalog[i];
  let s = "";
  if (type === "car")
    s = `<path d="M-80 410 Q270 30 790 255" stroke="#202b3e" stroke-width="125" fill="none"/><path d="M-80 410 Q270 30 790 255" stroke="${accent}" stroke-dasharray="30 25" stroke-width="4" fill="none"/><g transform="translate(305 140) rotate(-17)">${rect(-115, 30, 255, 70, accent, 20)}${rect(-70, -10, 150, 65, accent, 22)}${rect(-54, 0, 117, 37, "#1c3142", 10)}${circle(-60, 94, 28, "#18202b")}${circle(88, 94, 28, "#18202b")}${circle(-60, 94, 13, "#b2c8d1")}${circle(88, 94, 13, "#b2c8d1")}${rect(103, 52, 26, 14, "#fffacc", 4)}</g>`;
  if (type === "planet")
    s = `<g transform="translate(330 165) rotate(-20)">${circle(0, 0, 104, accent)}<ellipse rx="170" ry="42" fill="none" stroke="#e3b8ef" stroke-width="24"/>${circle(-28, -42, 26, "#ffffff30")}${circle(40, 20, 14, "#8064ae35")}</g>${circle(115, 79, 17, "#faf0b1")}${circle(516, 250, 32, "#a8e8df")}`;
  if (type === "blocks" || type === "gems") {
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++) {
        const colors = [accent, "#fc93a5", "#78dae3", "#eeac68"];
        s += `<g transform="translate(${172 + x * 78} ${67 + y * 76}) rotate(${type === "gems" ? 15 : 0})">${rect(4, 10, 65, 65, "#00000030", type === "gems" ? 18 : 9)}${rect(0, 0, 65, 65, colors[(x + y + i) % 4], type === "gems" ? 18 : 9)}${rect(8, 7, 49, 6, "#ffffff55", 3)}</g>`;
      }
  }
  if (type === "ball" || type === "football")
    s = `<path d="M0 280 L620 125 M110 360 L470 0" stroke="#ffffff33" stroke-width="3"/><g transform="translate(330 170) rotate(-25)">${circle(0, 10, 98, "#00000022")}${circle(0, 0, 98, type === "ball" ? "#ffa04c" : "#ebf6ed")}${type === "ball" ? '<path d="M-97 0H97M0 -98V98M-70 -67Q10 0 -70 67M70 -67Q-10 0 70 67" stroke="#733b24" stroke-width="7" fill="none"/>' : '<path d="M0 -43L43 -15 27 37 -27 37 -43 -15Z" fill="#253f43"/><path d="M0 -98L0 -70M88 -40L sixty -40" stroke="#253f43"/>'}</g>`;
  if (type === "island")
    s = `${circle(430, 70, 47, accent)}<path d="M140 190L315 110 485 190 315 278Z" fill="#80d9a0"/><path d="M140 190L315 278 485 190 340 335 275 330Z" fill="#817096"/>${rect(290, 79, 45, 90, "#e9d9b5", 3)}<path d="M262 90L313 30 361 90Z" fill="#f0aa77"/>${circle(175, 125, 27, "#5da78a")}${rect(172, 130, 7, 51, "#5d7969", 2)}`;
  if (type === "rocket")
    s = `<g transform="translate(335 165) rotate(35)"><path d="M-28 74L0 156 28 74" fill="#ffb860"/><path d="M-49 38L-79 92 -24 67M49 38L79 92 24 67" fill="${accent}"/><path d="M0 -122Q85 -37 35 80H-35Q-85 -37 0 -122" fill="#f0eef8"/>${circle(0, -22, 27, "#32396c")}${circle(0, -22, 18, "#7ededc")}<path d="M-28 79L0 124 28 79" fill="#fff1b0"/></g>`;
  if (type === "chess")
    s = `<path d="M125 259L315 147 516 259 315 354Z" fill="#bcc79e"/><g fill="${accent}" stroke="#293e37" stroke-width="4"><path d="M285 238L284 183 258 164 290 97 323 85 351 130 331 184 338 238Z"/><ellipse cx="312" cy="241" rx="63" ry="23"/></g>${circle(318, 121, 5, "#324b40")}`;
  if (type === "paddles")
    s = `<g transform="translate(245 146) rotate(-35)">${rect(-14, 60, 28, 101, "#edc291", 5)}<ellipse rx="68" ry="85" fill="#f9978a"/><ellipse cy="-7" rx="60" ry="74" fill="#ee716e"/></g><g transform="translate(425 181) rotate(32)">${rect(-14, 60, 28, 101, "#edc291", 5)}<ellipse rx="68" ry="85" fill="#88d8ca"/></g>${circle(326, 77, 21, "#fff6de")}`;
  if (type === "bubbles") {
    for (let j = 0; j < 12; j++) {
      const x = 143 + (j % 4) * 108 + (j % 2) * 14,
        y = 70 + Math.floor(j / 4) * 99;
      const colors = [accent, "#ecb0d5", "#87dbe0", "#b2acf2"];
      s +=
        circle(x, y, 32 + (j % 3) * 6, colors[j % 4]) +
        circle(x - 10, y - 13, 8, "#ffffff66");
    }
  }
  if (type === "sword")
    s = `<g transform="translate(325 180) rotate(32)"><path d="M0 -137L27 -87 18 54H-18L-27 -87Z" fill="#d9f0e8"/><path d="M0 -129V53" stroke="#9faebf" stroke-width="4"/>${rect(-65, 40, 130, 20, accent, 5)}${rect(-12, 58, 24, 70, "#ca8e73", 3)}${circle(0, 128, 20, accent)}</g>${circle(125, 100, 12, accent)}<path d="M500 90v40m-20 -20h40" stroke="${accent}" stroke-width="5"/>`;
  if (type === "donut")
    s = `${circle(323, 175, 109, "#d99066")}${circle(323, 162, 105, accent)}${circle(323, 160, 35, bg)}${Array.from(
      { length: 16 },
      (_, j) => {
        const a = (j / 16) * Math.PI * 2;
        return `<path d="M${323 + 75 * Math.cos(a)} ${160 + 75 * Math.sin(a)}l8 9" stroke="${["#fff6dd", "#ef85a4", "#7bb9c1"][j % 3]}" stroke-width="8" stroke-linecap="round"/>`;
      },
    ).join("")}`;
  if (type === "cards")
    s = `<g transform="translate(285 165) rotate(-18)">${rect(-72, -105, 144, 210, "#dcebd8", 13)}<path d="M0 -35L32 6 0 50 -32 6Z" fill="#dd6864"/></g><g transform="translate(372 172) rotate(14)">${rect(-72, -105, 144, 210, "#fff4d9", 13)}<path d="M0 -40Q-60 5 0 43Q60 5 0 -40M0 28L-20 60H20Z" fill="#334b50"/></g>`;
  if (type === "robot")
    s = `${rect(228, 99, 190, 153, accent, 28)}${rect(251, 132, 144, 55, "#233852", 16)}${circle(285, 159, 12, "#ecbafc")}${circle(362, 159, 12, "#ecbafc")}${rect(289, 207, 67, 10, "#233852", 5)}${rect(313, 58, 13, 43, "#c1cae0", 5)}${circle(320, 51, 15, "#f4bcf0")}${rect(193, 149, 24, 65, "#afd0d0", 9)}${rect(429, 149, 24, 65, "#afd0d0", 9)}`;
  if (type === "city")
    s = `<path d="M115 245L315 135 530 245 320 357Z" fill="#3e6676"/>${[
      0, 1, 2, 3,
    ]
      .map((j) => {
        let x = 185 + j * 64,
          y = 80 + (j % 2) * 50;
        return (
          rect(x, y, 63, 180, ["#92c0ba", accent, "#b0a3c7", "#789bad"][j], 2) +
          [0, 1, 2, 3]
            .map((k) => rect(x + 15, y + 20 + k * 32, 30, 14, "#ffffc4", 2))
            .join("")
        );
      })
      .join("")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><radialGradient id="bg"><stop stop-color="${bg}"/><stop offset="1" stop-color="${bg}" stop-opacity=".65"/></radialGradient><filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-opacity=".18"/></filter></defs><rect width="640" height="360" fill="${bg}"/><rect width="640" height="360" fill="url(#bg)"/>${circle(525, 15, 180, "#ffffff07")}${circle(50, 340, 120, "#ffffff06")}<g filter="url(#shadow)">${s}</g></svg>`;
  const slug =
    title.toLowerCase().replaceAll(" ", "-") + (i === 16 ? "-alt" : "");
  writeFileSync(`public/art/${slug}.svg`, svg);
}
writeFileSync(
  "public/art/fallback.svg",
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#1c2e35"/><path d="M265 110v140l130-70z" fill="#c4f478"/></svg>',
);
