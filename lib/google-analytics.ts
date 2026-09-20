import { analyticsUrl, isAnalyticsPage } from "./site-integrations";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const consentKey = "8090:analytics-permission:v1";
let allowed: boolean | undefined;
const listeners = new Set<() => void>();
let measurementId = "";
let previousPage = "";
let active = false;

export function analyticsAllowed() {
  if (allowed === undefined) {
    try { allowed = sessionStorage.getItem(consentKey) === "allow"; }
    catch { allowed = false; }
  }
  return allowed;
}

export function subscribeAnalytics(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setAnalyticsAllowed(value: boolean) {
  allowed = value;
  try { sessionStorage.setItem(consentKey, value ? "allow" : "deny"); } catch {}
  if (!value) stopAnalytics();
  listeners.forEach((listener) => listener());
}

function disableGoogle(disabled: boolean) {
  if (measurementId) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = disabled;
  }
}

export function stopAnalytics() {
  active = false;
  previousPage = "";
  disableGoogle(true);
  if (measurementId) window.gtag?.("consent", "update", { analytics_storage: "denied" });
}

export function analyticsPageView(id: string, path: string, nonce: string) {
  if (!id || !analyticsAllowed() || !isAnalyticsPage(path)) {
    stopAnalytics();
    return;
  }
  if (!measurementId) {
    measurementId = id;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("consent", "default", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    // Enhanced measurement history page views are disabled in this web stream.
    window.gtag("config", id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement("script");
    script.id = "8090-google-analytics";
    script.async = true;
    script.nonce = nonce;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    // Allow a retry after a transient network failure without double-initializing.
    script.onerror = () => { script.remove(); measurementId = ""; previousPage = ""; active = false; };
    document.head.appendChild(script);
  }
  disableGoogle(false);
  if (!active) window.gtag?.("consent", "update", { analytics_storage: "granted" });
  active = true;
  const location = analyticsUrl(`${window.location.origin}${path}`);
  if (previousPage === location) return;
  const referrer = previousPage || analyticsUrl(document.referrer);
  previousPage = location;
  window.gtag?.("event", "page_view", {
    send_to: id, page_location: location, page_referrer: referrer,
    page_title: document.title,
  });
}

export function analyticsGameEvent(event: string, gameId?: string, sourceId?: string, value?: number) {
  if (!active || !analyticsAllowed() || !isAnalyticsPage(window.location.pathname)) return;
  if (!/^(game_start|game_reload|game_source_fallback|game_card_click|favorite_add)$/.test(event)) return;
  window.gtag?.("event", event, {
    send_to: measurementId, game_id: gameId, source_id: sourceId, value,
    page_location: analyticsUrl(window.location.href),
  });
}
