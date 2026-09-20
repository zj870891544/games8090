import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Keyboard,
  Monitor,
  Smartphone,
  Gamepad2,
  Info,
} from "lucide-react";
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
import { GamePlayer } from "../../../components/GamePlayer";
import { FavoriteButton } from "../../../components/Library";
import { GameCard } from "../../../components/GameCard";
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
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: `${env.SITE_URL}/game/${game.slug}`,
    description: game.editorialDescription || game.description,
    genre: game.categories,
    gamePlatform: "Web browser",
    ...(game.developer
      ? { author: { "@type": "Organization", name: game.developer } }
      : {}),
  };
  return (
    <div className="page game-page">
      <div className="breadcrumbs">
        <Link href="/games">
          <ArrowLeft size={14} />
          All games
        </Link>
        <span>/</span>
        {game.categories[0] && (
          <Link href={`/category/${game.categories[0]}`}>
            {game.categories[0].replaceAll("-", " ")}
          </Link>
        )}
        <span>/</span>
        <span>{game.title}</span>
      </div>
      <GamePlayer
        id={game.id}
        slug={game.slug}
        title={game.title}
        thumbnail={game.thumbnail}
        sources={sources}
        consentRequired={env.CONSENT_REQUIRED !== "false"}
      />
      <div className="game-title-row">
        <div>
          <h1>{game.title}</h1>
          <p>
            {game.plays > 0
              ? `${game.plays.toLocaleString()} starts on 8090`
              : "Be among the first to play"}
            <span>·</span>
            {game.isMultiplayer ? "Play together" : "Your own little escape"}
          </p>
        </div>
        <FavoriteButton id={game.id} slug={game.slug} />
      </div>
      {game.isFixture && (
        <div className="fixture-note">
          <Info size={17} />
          <span>
            This is a development catalog sample. The player demonstrates
            loading and source switching; real gameplay will be available after
            a licensed provider is connected.
          </span>
        </div>
      )}
      <div className="game-info-grid">
        <article>
          <span className="eyebrow">GET TO KNOW YOUR NEXT FAVORITE</span>
          <h2>About {game.title}</h2>
          <p>
            {game.editorialDescription ||
              game.description ||
              "More details are being prepared for this game."}
          </p>
          <h3>How to play</h3>
          <p>
            {game.howToPlay ||
              "Follow the instructions shown inside the game. Detailed instructions will be added after editorial review."}
          </p>
          <h3>Controls</h3>
          <p>
            {game.controls ||
              "Check the game’s own instructions for supported controls."}
          </p>
          <div className="tag-list">
            {game.categories.map((c) => (
              <Link key={c} href={`/category/${c}`}>
                {c.replaceAll("-", " ")}
              </Link>
            ))}
          </div>
        </article>
        <aside className="details-panel">
          <h3>The essentials</h3>
          <dl>
            {game.developer && (
              <>
                <dt>Made by</dt>
                <dd>{game.developer}</dd>
              </>
            )}
            <dt>Play on</dt>
            <dd className="device-list">
              {game.supportsDesktop && (
                <span>
                  <Monitor size={16} />
                  Desktop
                </span>
              )}
              {game.supportsMobile && (
                <span>
                  <Smartphone size={16} />
                  Mobile
                </span>
              )}
            </dd>
            <dt>Input support</dt>
            <dd className="device-list">
              {game.supportsKeyboard && (
                <span>
                  <Keyboard size={16} />
                  Keyboard
                </span>
              )}
              {game.supportsTouch && (
                <span>
                  <Smartphone size={16} />
                  Touch
                </span>
              )}
              {game.supportsGamepad && (
                <span>
                  <Gamepad2 size={16} />
                  Gamepad
                </span>
              )}
              {!game.supportsKeyboard &&
                !game.supportsTouch &&
                !game.supportsGamepad &&
                "See game instructions"}
            </dd>
            <dt>Orientation</dt>
            <dd>
              {game.orientation === "any" ? "Flexible" : game.orientation}
            </dd>
            <dt>Game credits</dt>
            <dd>
              {[...new Set(sources.map((s) => s.providerName))].join(" · ") ||
                "No available provider"}
            </dd>
          </dl>
        </aside>
      </div>
      <section id="related" className="section">
        <div className="section-heading">
          <h2>More like this</h2>
          <Link href="/games">
            Explore more <ArrowRight size={16} />
          </Link>
        </div>
        <div className="game-grid">
          {more.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>
      <script
        nonce={requestHeaders.get("x-nonce") || undefined}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
