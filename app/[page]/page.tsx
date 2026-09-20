import { notFound } from "next/navigation";
import Link from "next/link";
import { BrowsePage } from "../../components/BrowsePage";
import { LibraryGrid, ClearLibraryButton } from "../../components/Library";
import { getEnv } from "../../lib/db/client";
const titles: Record<string, string> = {
  games: "All games",
  new: "Fresh off the press",
  popular: "The crowd favorites",
  favorites: "Your favorites",
  recent: "Recently played",
  about: "A little more play.",
  privacy: "Privacy",
  terms: "Terms of use",
  cookies: "Cookies & your choices",
  contact: "Say hello",
  copyright: "Content & copyright",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return {
    title: titles[page] || "Page not found",
    alternates: { canonical: `/${page}` },
    robots: {
      index:
        getEnv().APP_ENV === "production" &&
        !["favorites", "recent"].includes(page),
      follow: true,
    },
  };
}
export default async function StaticPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await params;
  if (!titles[page]) notFound();
  if (["games", "new", "popular"].includes(page)) {
    const query = await searchParams;
    return (
      <BrowsePage
        title={titles[page]}
        description={
          page === "new"
            ? "New discoveries. Fresh challenges. Your next “just one more.”"
            : "From quick little escapes to your next big obsession."
        }
        options={{ sort: page }}
        page={Math.max(1, Math.min(1000, Number(query.page) || 1))}
        basePath={`/${page}`}
      />
    );
  }
  if (page === "favorites" || page === "recent")
    return (
      <div className="page">
        <header className="page-heading">
          <span className="eyebrow">YOUR CORNER OF THE ARCADE</span>
          <h1>{titles[page]}</h1>
          <p>No account. Just the games you love, saved on this browser.</p>
        </header>
        <LibraryGrid kind={page} />
      </div>
    );
  const email = getEnv().CONTACT_EMAIL;
  return (
    <div className="page prose-page">
      <span className="eyebrow">8090 · THE NIGHT ARCADE</span>
      <h1>{titles[page]}</h1>
      {page === "about" ? (
        <>
          <p className="lead">
            Life moves fast. Sometimes, all you need is a good game.
          </p>
          <p>
            8090 is a place to find your next favorite browser game. Explore a
            carefully organized collection, save the games you love, and pick up
            where you left off.
          </p>
          <h2>One game. Your way to play.</h2>
          <p>
            Games are hosted by distribution partners. Our catalog brings
            different sources together, so each game has one home. If a source
            has trouble loading, you can try another from the same page.
          </p>
          <Link className="button primary" href="/games">
            Find your next game →
          </Link>
        </>
      ) : page === "privacy" ? (
        <>
          <p>
            8090 stores favorites and recently played titles in this browser. No
            player account is required.
          </p>
          <h2>Site activity</h2>
          <p>
            We count page views, game starts, favorites, searches, and source
            switches to understand the collection. These counts do not reveal
            actions inside a third-party game. Visible time on this page is
            measured separately from gameplay.
          </p>
          <h2>Optional analytics</h2>
          <p>
            If you opt into optional visit analytics in Privacy settings, Google
            Analytics uses cookies to measure page visits and game interactions.
            Your choice is separate from permission to load games and is saved
            for the current tab. We do not load Google Analytics before you opt
            in. You can withdraw at any time to stop further analytics; this
            does not erase previously collected data. Analytics excludes admin
            pages and strips query strings from page URLs. Google advertising
            signals and ad personalization are disabled.
          </p>
          <h2>Third-party games</h2>
          <p>
            A game player is only requested after you allow third-party games
            in Privacy settings and choose to play. Distribution partners
            receive your network address and may use their own cookies and
            advertising technologies. Their own privacy and advertising choices
            remain available inside the player.
          </p>
          <h2>Your choices</h2>
          <p>
            You can clear local history and favorites below. Browser storage
            restrictions may prevent saving these preferences.
          </p>
          <p>
            Use Privacy settings in the footer to change player permissions.
            Withdrawing permission closes the game player.
          </p>
          <p>
            Player permission is stored in sessionStorage for this tab. It
            controls whether the external player loads and does not replace
            the game provider’s own privacy choices. If storage is blocked,
            the choice lasts only until the page is reloaded. Closing the player
            stops it from running here; it does not delete cookies already set
            by a third party.
          </p>
          <ClearLibraryButton />
          <p>
            Infrastructure may process IP addresses for security and request
            throttling. Product counters contain no stored IP address.
          </p>
        </>
      ) : page === "cookies" ? (
        <>
          <p>
            Favorites and recent games use local browser storage under a
            versioned 8090 key. The administration area uses a separate HttpOnly
            session cookie that expires after eight hours.
          </p>
          <p>
            Your choice to load third-party games is stored for the current tab
            under 8090:player-permission:v1. Third-party game cookies and
            advertising preferences are managed by the relevant provider. Use
            its privacy controls or your browser settings to manage them;
            blocking these technologies may prevent some games from loading.
          </p>
          <p>
            Optional Google Analytics is disabled until you allow visit analytics
            in Privacy settings. The choice uses sessionStorage under
            8090:analytics-permission:v1. When allowed, Google Analytics may set
            _ga cookies. Withdrawing stops future collection; existing cookies
            can be removed using your browser settings.
          </p>
          <ClearLibraryButton />
        </>
      ) : page === "terms" ? (
        <>
          <p>
            Use 8090 for personal browser-based play. Game content, artwork, and
            trademarks belong to their respective owners or licensors.
          </p>
          <h2>Availability</h2>
          <p>
            Games are delivered by third-party providers and may change or
            become unavailable. Do not interfere with their advertising,
            security, or monetization systems.
          </p>
          <h2>Responsible use</h2>
          <p>
            Do not use this site unlawfully, attempt unauthorized access, or
            distribute harmful content. This service is not specifically
            directed at children.
          </p>
          <p>
            Individual games may have additional provider terms. The site
            operator must finalize these terms for the intended launch
            jurisdiction.
          </p>
        </>
      ) : page === "copyright" ? (
        <>
          <p>
            We respect the work of game developers and artists. Distribution
            requires appropriate publisher authorization. Development samples
            are labeled and excluded from production discovery.
          </p>
          <h2>Report a concern</h2>
          <p>
            Send the game URL, a description of the copyrighted work, your
            contact information, and evidence of your authority to act. We will
            review substantiated reports and can disable affected sources.
          </p>
        </>
      ) : (
        <>
          <p className="lead">
            A game suggestion, a loading problem, or a partnership idea?
          </p>
          <p>
            Include the game URL and your browser or device when reporting a
            problem. Never send account passwords or provider credentials.
          </p>
        </>
      )}
      {["contact", "copyright", "privacy", "terms"].includes(page) && (
        <div className="contact-panel">
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <p>
              Contact details are being prepared by the site operator before
              launch.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
