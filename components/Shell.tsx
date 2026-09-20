"use client";
import { useState } from "react";
import { useHydrated } from "./useHydrated";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronLeft,
  Menu,
  Heart,
  History,
  Gamepad2,
} from "lucide-react";
import { SearchBox } from "./SearchBox";
import { CategoryIcon } from "./Icons";
import { taxonomy, categorySlug } from "../lib/normalize";
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
  const hydrated = useHydrated();
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false);
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
  const nav = (href: string, label: string, icon: string) => (
    <Link
      onClick={() => setMobileOpen(false)}
      href={href}
      className={`nav-link ${path === href ? "active" : ""}`}
      key={href}
      title={collapsed ? label : undefined}
    >
      <CategoryIcon name={icon} />
      <span>{label}</span>
      {path === href && <i />}
    </Link>
  );
  return (
    <div
      className={`site-shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "menu-open" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to games
      </a>
      <header className="topbar">
        <div className="brand-area">
          <button
            className="icon-button mobile-menu"
            disabled={!hydrated}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu size={21} />
          </button>
          <Link href="/" className="brand" aria-label="8090 home">
            <span className="brand-mark">
              <Gamepad2 size={24} />
            </span>
            80<span className="brand-outline">90</span>
            <sup>PLAY</sup>
          </Link>
        </div>
        <SearchBox />
        <div className="header-actions">
          <Link
            href="/recent"
            className="icon-button"
            aria-label="Recently played"
          >
            <History size={21} />
          </Link>
          <Link href="/favorites" className="library-button">
            <Heart size={18} />
            <span>My favorites</span>
          </Link>
        </div>
      </header>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span>YOUR PLAYGROUND</span>
          <button
            className="icon-button collapse-toggle"
            disabled={!hydrated}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {nav("/", "Discover", "home")}
          {nav("/popular", "Popular", "popular")}
          {nav("/new", "New releases", "new")}
          {nav("/games", "All games", "games")}
          <div className="nav-divider" />
          <span className="nav-label">FIND YOUR MOOD</span>
          {taxonomy
            .filter((t) => !["Kids", "Educational", "Dress Up"].includes(t))
            .map((t) =>
              nav(`/category/${categorySlug(t)}`, t, categorySlug(t)),
            )}
          <div className="nav-divider" />
          {nav("/favorites", "My favorites", "favorites")}
          {nav("/recent", "Recently played", "recent")}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-led" /> LITTLE BREAKS.
          <br />
          <strong>BIG PLAY ENERGY.</strong>
          <Link href="/about">
            Meet your arcade <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
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
            <PrivacySettings sitePermission={sitePermission} analyticsEnabled={analyticsEnabled} />
          </nav>
          <small>
            © {new Date().getFullYear()} 8090 · Pick a game. Find your flow.
          </small>
        </footer>
      </div>
    </div>
  );
}
