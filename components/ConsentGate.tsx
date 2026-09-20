"use client";
import { useEffect, useState } from "react";
import { requestPrivacySettings } from "../lib/consent";
import { useHydrated } from "./useHydrated";
// Site-owned player permission bridge, also compatible with an external CMP.
export function ConsentGate({
  required,
  children,
  onRevoke,
}: {
  required: boolean;
  children: React.ReactNode;
  onRevoke?: () => void;
}) {
  const hydrated = useHydrated();
  const [allowed, setAllowed] = useState(!required);
  useEffect(() => {
    if (!required) return;
    let unsubscribe: (() => void) | undefined;
    const update = () => {
      const permitted = window.arcadeConsent?.hasConsent() === true;
      setAllowed(permitted);
      if (!permitted) onRevoke?.();
    };
    const connect = () => {
      unsubscribe?.();
      update();
      unsubscribe = window.arcadeConsent?.subscribe(update);
    };
    connect();
    window.addEventListener("arcade:cmp-ready", connect);
    return () => {
      unsubscribe?.();
      window.removeEventListener("arcade:cmp-ready", connect);
    };
  }, [required, onRevoke]);
  if (allowed) return <>{children}</>;
  return (
    <div className="consent-gate">
      <span className="eyebrow">YOU’RE IN CONTROL</span>
      <h2>Before we play</h2>
      <p>
        This game loads a third-party player that may use advertising cookies.
        Open the site’s privacy settings to choose your preferences.
      </p>
      <button
        className="button primary"
        disabled={!hydrated}
        onClick={requestPrivacySettings}
      >
        Privacy settings
      </button>
      <p className="muted">
        You can change your choice anytime in Privacy settings.
      </p>
    </div>
  );
}
