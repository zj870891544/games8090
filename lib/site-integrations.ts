type IntegrationEnv = Pick<CloudflareEnv,
  "APP_ENV" | "GA4_MEASUREMENT_ID" | "GOOGLE_SITE_VERIFICATION" | "BING_SITE_VERIFICATION"
>;

export function siteIntegrations(env: IntegrationEnv) {
  const production = env.APP_ENV === "production";
  const ga = env.GA4_MEASUREMENT_ID?.trim() || "";
  const google = env.GOOGLE_SITE_VERIFICATION?.trim() || "";
  const bing = env.BING_SITE_VERIFICATION?.trim() || "";
  return {
    ga4Id: production && /^G-[A-Z0-9]{6,20}$/.test(ga) ? ga : "",
    google: production && /^[\w-]{20,200}$/.test(google) ? google : "",
    bing: production && /^[a-fA-F0-9]{32}$/.test(bing) ? bing : "",
  };
}

export function isAnalyticsPage(path: string) {
  return !/^\/(admin|api|fixtures)(\/|$)/.test(path);
}

/** Search text, fragments and credentials must never enter an analytics URL. */
export function analyticsUrl(input: string) {
  try {
    const url = new URL(input);
    return /^https?:$/.test(url.protocol) ? `${url.origin}${url.pathname}` : "";
  } catch {
    return "";
  }
}
