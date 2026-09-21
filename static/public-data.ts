import type { GameDetail, EmbedConfig } from "../lib/types";
import type { PublicGameDetail } from "../components/GameContent";

export function publicGame(
  game: Omit<GameDetail, "sources">,
): PublicGameDetail {
  const {
    id,
    slug,
    title,
    description,
    editorialDescription,
    developer,
    orientation,
    supportsMobile,
    supportsDesktop,
    supportsTouch,
    supportsKeyboard,
    supportsGamepad,
    isMultiplayer,
    controls,
    howToPlay,
    isFixture,
    categories,
    thumbnail,
    plays,
  } = game;
  return {
    id,
    slug,
    title,
    description,
    editorialDescription,
    developer,
    orientation,
    supportsMobile,
    supportsDesktop,
    supportsTouch,
    supportsKeyboard,
    supportsGamepad,
    isMultiplayer,
    controls,
    howToPlay,
    isFixture,
    categories,
    thumbnail,
    plays,
  };
}
export function playableSources(sources: EmbedConfig[]) {
  return sources.filter((s) => !s.fixture && s.url.startsWith("https://"));
}

export function jsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
