"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsAllowed, analyticsPageView, setAnalyticsAllowed,
  stopAnalytics, subscribeAnalytics,
} from "../lib/google-analytics";

const serverConsent = () => false;

export function GoogleAnalytics({ id, nonce }: { id: string; nonce: string }) {
  const path = usePathname();
  const allowed = useSyncExternalStore(subscribeAnalytics, analyticsAllowed, serverConsent);
  useEffect(() => {
    analyticsPageView(id, path, nonce);
  }, [id, path, nonce, allowed]);
  useEffect(() => () => stopAnalytics(), []);
  return null;
}

export function AnalyticsChoice() {
  const allowed = useSyncExternalStore(subscribeAnalytics, analyticsAllowed, serverConsent);
  return (
    <section className="analytics-choice">
      <h3>可选访问统计</h3>
      <p>允许后，Google Analytics 会使用 Cookie 统计页面浏览及游戏点击。此选项独立于游戏加载，仅保存在当前标签页，随时可撤回。</p>
      <button className="button" aria-pressed={allowed} onClick={() => setAnalyticsAllowed(!allowed)}>
        {allowed ? "已允许访问统计 · 点击撤回" : "允许访问统计"}
      </button>
    </section>
  );
}
