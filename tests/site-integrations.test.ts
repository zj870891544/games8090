import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { analyticsUrl, isAnalyticsPage, siteIntegrations } from "../lib/site-integrations";

describe("production analytics and webmaster configuration", () => {
  const config = { APP_ENV: "production", GA4_MEASUREMENT_ID: "G-ABC1234567", GOOGLE_SITE_VERIFICATION: "a_valid_google_verification_token", BING_SITE_VERIFICATION: "A".repeat(32) };
  it("keeps real production identifiers out of local and preview pages", () => {
    expect(siteIntegrations(config).ga4Id).toBe(config.GA4_MEASUREMENT_ID);
    for (const APP_ENV of ["local", "preview"]) {
      expect(siteIntegrations({ ...config, APP_ENV })).toEqual({ ga4Id: "", google: "", bing: "" });
    }
    expect(siteIntegrations({ ...config, GA4_MEASUREMENT_ID: '<script>alert(1)</script>', BING_SITE_VERIFICATION: "invalid" })).toMatchObject({ ga4Id: "", bing: "" });
  });
  it("excludes private routes and strips search terms, fragments and credentials", () => {
    for (const path of ["/admin", "/admin/login", "/api/events", "/fixtures/demo"]) expect(isAnalyticsPage(path)).toBe(false);
    expect(isAnalyticsPage("/game/2048")).toBe(true);
    expect(analyticsUrl("https://user:password@games8090.online/search?q=personal@email.test#token")).toBe("https://games8090.online/search");
    expect(analyticsUrl("javascript:alert(1)")).toBe("");
  });
});

describe("GA consent and SPA navigation", () => {
  let scripts: Record<string, unknown>[];
  let browser: Record<string, unknown>;
  beforeEach(() => {
    vi.resetModules();
    scripts = [];
    browser = { location: { origin: "https://games8090.online", pathname: "/games", href: "https://games8090.online/games?q=private" } };
    const stored = new Map<string, string>();
    vi.stubGlobal("window", browser);
    vi.stubGlobal("sessionStorage", { getItem: (key: string) => stored.get(key), setItem: (key: string, value: string) => stored.set(key, value) });
    vi.stubGlobal("document", { title: "8090", referrer: "https://example.com/?private=value", createElement: () => ({}), head: { appendChild: (script: Record<string, unknown>) => scripts.push(script) } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads nothing before permission, tracks each route once and stops immediately on withdrawal", async () => {
    const ga = await import("../lib/google-analytics");
    ga.analyticsPageView("G-ABC1234567", "/games", "test-nonce");
    expect(scripts).toHaveLength(0);
    ga.setAnalyticsAllowed(true);
    ga.analyticsPageView("G-ABC1234567", "/games", "test-nonce");
    ga.analyticsPageView("G-ABC1234567", "/games", "test-nonce");
    ga.analyticsPageView("G-ABC1234567", "/game/2048", "test-nonce");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].nonce).toBe("test-nonce");
    const events = () => (browser.dataLayer as unknown[][]).filter((entry) => entry[0] === "event");
    expect(events().map((entry) => entry[1])).toEqual(["page_view", "page_view"]);
    expect(events()[1][2]).toMatchObject({ page_referrer: "https://games8090.online/games", page_location: "https://games8090.online/game/2048" });
    ga.analyticsGameEvent("game_start", "2048");
    expect(events()).toHaveLength(3);
    ga.setAnalyticsAllowed(false);
    ga.analyticsGameEvent("game_start", "2048");
    ga.analyticsPageView("G-ABC1234567", "/", "test-nonce");
    expect(events()).toHaveLength(3);
    expect(browser["ga-disable-G-ABC1234567"]).toBe(true);
    ga.setAnalyticsAllowed(true);
    ga.analyticsPageView("G-ABC1234567", "/games", "test-nonce");
    expect(events()).toHaveLength(4);
    expect(scripts).toHaveLength(1);
    ga.analyticsPageView("G-ABC1234567", "/admin/login", "test-nonce");
    expect(events()).toHaveLength(4);
    expect(browser["ga-disable-G-ABC1234567"]).toBe(true);
  });

  it("does not interpret player permission as analytics permission, including blocked storage", async () => {
    sessionStorage.setItem("8090:player-permission:v1", "allow");
    const ga = await import("../lib/google-analytics");
    expect(ga.analyticsAllowed()).toBe(false);
    vi.stubGlobal("sessionStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } });
    ga.setAnalyticsAllowed(true);
    expect(ga.analyticsAllowed()).toBe(true);
    ga.setAnalyticsAllowed(false);
    expect(ga.analyticsAllowed()).toBe(false);
  });
});
