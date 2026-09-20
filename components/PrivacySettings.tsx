"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPlayerConsent, requestPrivacySettings } from "../lib/consent";
import { useHydrated } from "./useHydrated";
import { AnalyticsChoice } from "./GoogleAnalytics";

export function PrivacySettings({ sitePermission, analyticsEnabled = false }: { sitePermission: boolean; analyticsEnabled?: boolean }) {
  const hydrated = useHydrated();
  const dialog = useRef<HTMLDialogElement>(null);
  const permission = useRef<ReturnType<typeof createPlayerConsent> | null>(null);
  const [isSitePermission, setIsSitePermission] = useState(false);

  useEffect(() => {
    const openDialog = () => {
      setIsSitePermission(
        !!permission.current && window.arcadeConsent === permission.current.bridge,
      );
      dialog.current?.showModal();
    };
    // The site dialog controls iframe loading, not the provider's ad consent.
    // An external privacy manager always keeps its own decisions and settings.
    if (sitePermission && !window.arcadeConsent) {
      permission.current = createPlayerConsent(openDialog, () => sessionStorage);
      window.arcadeConsent = permission.current.bridge;
      window.dispatchEvent(new Event("arcade:cmp-ready"));
    }
    const request = () => {
      if (window.arcadeConsent?.requestConsent) {
        window.arcadeConsent.requestConsent();
      } else {
        openDialog();
      }
    };
    window.addEventListener("arcade:privacy-settings", request);
    return () => {
      window.removeEventListener("arcade:privacy-settings", request);
      if (permission.current && window.arcadeConsent === permission.current.bridge) {
        delete window.arcadeConsent;
        window.dispatchEvent(new Event("arcade:cmp-ready"));
      }
      permission.current = null;
    };
  }, [sitePermission]);

  function choose(allow: boolean) {
    if (permission.current && window.arcadeConsent === permission.current.bridge) {
      permission.current.setAllowed(allow);
    }
    dialog.current?.close();
  }

  return (
    <>
      <button
        className="privacy-settings-link"
        disabled={!hydrated}
        onClick={requestPrivacySettings}
      >
        Privacy settings · 隐私设置
      </button>
      <dialog
        ref={dialog}
        className="privacy-dialog"
        aria-labelledby="privacy-title"
        lang="zh-CN"
      >
        <h2 id="privacy-title">隐私设置</h2>
        {analyticsEnabled && <AnalyticsChoice />}
        {isSitePermission ? (
          <>
            <p>
              允许后，点击开始游戏才会连接第三方游戏平台。平台可能加载广告、使用
              Cookie，并接收你的网络地址等信息。
            </p>
            <p>
              选择保存在当前标签页。你随时可以在页面底部的“隐私设置”中撤回，已打开的游戏会立即关闭。游戏平台内的广告和隐私选项仍由该平台提供。
            </p>
            <div className="button-row">
              <button className="button" onClick={() => choose(false)}>
                暂不加载 / 撤回允许
              </button>
              <button className="button primary" onClick={() => choose(true)}>
                允许加载第三方游戏
              </button>
            </div>
            <Link href="/privacy" onClick={() => dialog.current?.close()}>
              查看隐私说明
            </Link>
          </>
        ) : (
          <>
            <p>
              本站的隐私管理服务暂未就绪，游戏播放器会保持暂停。请稍后重试。
            </p>
            <Link href="/privacy" onClick={() => dialog.current?.close()}>
              查看隐私说明
            </Link>
          </>
        )}
        <form method="dialog">
          <button className="text-button">关闭</button>
        </form>
      </dialog>
    </>
  );
}
