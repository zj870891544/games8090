import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getGame,
  getProviders,
  getContracts,
  browse,
  getRedirect,
} from "../../../lib/db/repository";
import { getEnv } from "../../../lib/db/client";
import { selectSources } from "../../../lib/source-selection";
import { createProvider } from "../../../lib/providers/adapters";
import type { ProviderId, EmbedConfig } from "../../../lib/types";
import { GameContent } from "../../../components/GameContent";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) return { title: "Game unavailable", robots: { index: false } };
  const description = (game.editorialDescription || game.description).slice(
    0,
    160,
  );
  return {
    title: `${game.title} — Play online`,
    description,
    alternates: { canonical: `/game/${game.slug}` },
    robots: {
      index:
        game.indexStatus === "index" &&
        !game.isFixture &&
        getEnv().APP_ENV === "production",
      follow: true,
    },
    openGraph: {
      title: game.title,
      description,
      type: "website",
      url: `/game/${game.slug}`,
      images: [game.thumbnail],
    },
  };
}
export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getGame(slug);
  if (!game) {
    const alias = await getRedirect(slug);
    if (alias) permanentRedirect(`/game/${alias.slug}`);
    notFound();
  }
  const [providers, contracts, related, requestHeaders] = await Promise.all([
    getProviders(),
    getContracts(),
    browse({ category: game.categories[0], limit: 7 }),
    headers(),
  ]);
  const env = getEnv();
  const sources: EmbedConfig[] = selectSources(
    game.sources,
    providers,
    contracts,
  ).flatMap((s) => {
    try {
      return [
        createProvider(s.providerId as ProviderId, env).getEmbedConfig(s),
      ];
    } catch {
      return [];
    }
  });
  const more = related.filter((g) => g.id !== game.id).slice(0, 6);
  return (
    <GameContent
      game={game}
      sources={sources}
      more={more}
      siteUrl={env.SITE_URL}
      consentRequired={env.CONSENT_REQUIRED !== "false"}
      nonce={requestHeaders.get("x-nonce") || undefined}
    />
  );
}
