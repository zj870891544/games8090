"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Heart, Gamepad2 } from "lucide-react";
import { SearchBox } from "./SearchBox";
import { CategoryIcon } from "./Icons";
import { ContinuePlaying } from "./Library";
import { PrivacySettings } from "./PrivacySettings";
export function Shell({
  children,
  sitePermission,
  analyticsEnabled = false,
}: {
  children: React.ReactNode;
  sitePermission: boolean;
  analyticsEnabled?: boolean;
}) {
  const path = usePathname();
  if (path === "/admin" || path.startsWith("/admin/")) {
    return (
      <div className="admin-site-shell" lang="zh-CN">
        <a className="skip-link" href="#main">
          跳转到管理内容
        </a>
        <header className="admin-topbar">
          <Link href="/admin" className="brand" aria-label="8090 管理后台首页">
            <span className="brand-mark">
              <Gamepad2 size={24} />
            </span>
            80<span className="brand-outline">90</span>
          </Link>
          <span className="admin-topbar-title">管理后台</span>
          <Link href="/" className="button">
            返回网站 <ArrowUpRight size={16} />
          </Link>
        </header>
        <main id="main">{children}</main>
        <footer>
          <span>© {new Date().getFullYear()} 8090 · 游戏运营管理</span>
          <span>北京时间</span>
        </footer>
      </div>
    );
  }
  const nav = (href: string, label: string, icon: string, utility = false) => (
    <Link
      href={href}
      className={`rail-link ${path === href ? "active" : ""} ${utility ? "rail-utility" : ""}`}
      key={href}
      title={label}
      aria-label={label}
      aria-current={path === href ? "page" : undefined}
    >
      <span className="rail-icon">
        <CategoryIcon name={icon} size={24} />
      </span>
      <span>{label}</span>
    </Link>
  );
  return (
    <div className="site-shell arcade-shell">
      <a className="skip-link" href="#main">
        Skip to games
      </a>
      <header className="arcade-header">
        <Link href="/" className="arcade-wordmark" aria-label="8090 home">
          80<span>90</span>
        </Link>
        <SearchBox />
        <div className="arcade-header-actions">
          <ContinuePlaying />
          <Link
            href="/favorites"
            className="arcade-favorites"
            aria-label="My favorites"
          >
            <Heart size={23} strokeWidth={1.7} />
            <span>My favorites</span>
          </Link>
        </div>
      </header>
      <aside className="arcade-rail">
        <Link href="/" className="rail-brand" aria-label="8090 arcade home">
          <span className="brand-mark">
            <Gamepad2 size={24} strokeWidth={2.2} />
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {nav("/", "Discover", "home")}
          {nav("/popular", "Popular", "popular")}
          {nav("/new", "New", "new")}
          {nav("/games", "All games", "games")}
          <div className="rail-divider" />
          {nav("/favorites", "Favorites", "favorites", true)}
          {nav("/recent", "Recent", "recent", true)}
        </nav>
      </aside>
      <div className="content-wrap">
        <main id="main">{children}</main>
        <footer>
          <Link href="/" className="footer-brand">
            8090<span>Life needs a little play.</span>
          </Link>
          <nav aria-label="Footer">
            {[
              "about",
              "privacy",
              "terms",
              "cookies",
              "contact",
              "copyright",
            ].map((p) => (
              <Link key={p} href={`/${p}`}>
                {p === "copyright"
                  ? "Content & copyright"
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </Link>
            ))}
            <Link href="/admin">Studio</Link>
            <PrivacySettings
              sitePermission={sitePermission}
              analyticsEnabled={analyticsEnabled}
            />
          </nav>
          <small>
            © {new Date().getFullYear()} 8090 · Pick a game. Find your flow.
          </small>
        </footer>
      </div>
    </div>
  );
}
