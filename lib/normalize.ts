export const taxonomy = [
  "Action",
  "Adventure",
  "Arcade",
  "Puzzle",
  "Racing",
  "Driving",
  "Sports",
  "Shooter",
  "Strategy",
  "Simulation",
  "Casual",
  "Multiplayer",
  "2 Player",
  "Platform",
  ".io",
  "Horror",
  "Card",
  "Board",
  "Kids",
  "Educational",
  "Dress Up",
  "Cooking",
] as const;
export function normalizeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`´']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function slugify(value: string): string {
  return normalizeTitle(value).replace(/ /g, "-") || "game";
}
export const categorySlug = (name: string) =>
  name === ".io" ? "io" : slugify(name);
const aliases: Record<string, string[]> = {
  car: ["Driving", "Racing"],
  cars: ["Driving", "Racing"],
  driving: ["Driving", "Racing"],
  race: ["Racing"],
  puzzles: ["Puzzle"],
  puzzle: ["Puzzle"],
  cards: ["Card"],
  tabletop: ["Board"],
  "card board": ["Card", "Board"],
  "2players": ["2 Player", "Multiplayer"],
  "2 player": ["2 Player", "Multiplayer"],
  "2 players": ["2 Player", "Multiplayer"],
  platformer: ["Platform"],
  simulator: ["Simulation"],
  hypercasual: ["Casual"],
  match3: ["Puzzle"],
  "match 3": ["Puzzle"],
  horrors: ["Horror"],
  "dress up and fashion": ["Dress Up"],
  "cooking food": ["Cooking"],
  "quiz trivia": ["Educational"],
  quiz: ["Educational"],
  io: [".io"],
};
export function normalizeCategories(values: string[]): string[] {
  return [
    ...new Set(
      values.flatMap((value) => {
        const normalized = normalizeTitle(value);
        return (
          aliases[normalized] ||
          taxonomy.filter((t) => normalizeTitle(t) === normalized)
        );
      }),
    ),
  ];
}
export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const pairs = (s: string) =>
    new Set(Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2)));
  const x = pairs(a),
    y = pairs(b);
  return (2 * [...x].filter((p) => y.has(p)).length) / (x.size + y.size || 1);
}
export function dedupeConfidence(
  a: { title: string; developer: string | null; description: string },
  b: { title: string; developer: string | null; description: string },
) {
  const title = similarity(normalizeTitle(a.title), normalizeTitle(b.title));
  const developer =
    a.developer && b.developer
      ? similarity(normalizeTitle(a.developer), normalizeTitle(b.developer))
      : 0;
  const description = similarity(
    normalizeTitle(a.description),
    normalizeTitle(b.description),
  );
  if (title === 1 && developer >= 0.96)
    return {
      confidence: 0.99,
      autoMerge: true,
      candidate: true,
      reason: "Exact title and verified matching developer",
    };
  if (title >= 0.96 && developer === 1 && description >= 0.9)
    return {
      confidence: 0.97,
      autoMerge: true,
      candidate: true,
      reason: "Very close title, same developer, and matching description",
    };
  return {
    confidence: Math.min(
      0.94,
      title * 0.65 + developer * 0.2 + description * 0.15,
    ),
    autoMerge: false,
    candidate: title >= 0.8,
    reason:
      developer === 0
        ? "Similar title; developer missing or different. Manual review required."
        : "Similar title; insufficient corroborating metadata.",
  };
}
