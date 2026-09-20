import type { Metadata } from "next";
import "@fontsource-variable/outfit";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { Shell } from "../components/Shell";
import { getEnv } from "../lib/db/client";
import { headers } from "next/headers";
import { siteIntegrations } from "../lib/site-integrations";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
export async function generateMetadata(): Promise<Metadata> {
  const env = getEnv();
  return {
    metadataBase: new URL(env.SITE_URL),
    title: {
      default: "8090 — Find your next favorite game",
      template: "%s · 8090",
    },
    description:
      "Little breaks. Big play energy. Discover instant browser games across racing, puzzles, action, and more.",
    robots:
      env.APP_ENV === "production"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = getEnv();
  const integrations = siteIntegrations(env);
  const nonce = (await headers()).get("x-nonce") || "";
  return (
    <html lang="en">
      <head>
        {integrations.google && <meta name="google-site-verification" content={integrations.google} />}
        {integrations.bing && <meta name="msvalidate.01" content={integrations.bing} />}
      </head>
      <body>
        {integrations.ga4Id && <GoogleAnalytics id={integrations.ga4Id} nonce={nonce} />}
        <Shell sitePermission={env.PLAYER_PERMISSION_MODE === "site"} analyticsEnabled={!!integrations.ga4Id}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
