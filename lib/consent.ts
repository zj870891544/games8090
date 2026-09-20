export interface ConsentProvider {
  hasConsent: () => boolean;
  subscribe: (listener: () => void) => () => void;
  requestConsent?: () => void;
}

declare global {
  interface Window {
    arcadeConsent?: ConsentProvider;
  }
}

export function requestPrivacySettings() {
  window.dispatchEvent(new Event("arcade:privacy-settings"));
}

const permissionKey = "8090:player-permission:v1";

/** Site player permission only; never a provider advertising consent signal. */
export function createPlayerConsent(
  openSettings: () => void,
  storage: () => Pick<Storage, "getItem" | "setItem">,
) {
  let allowed = false;
  try {
    allowed = storage().getItem(permissionKey) === "allow";
  } catch {
    // Storage restrictions must not prevent choosing in the current page.
  }
  const listeners = new Set<() => void>();
  const bridge: ConsentProvider = {
    hasConsent: () => allowed,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    requestConsent: openSettings,
  };
  return {
    bridge,
    setAllowed(value: boolean) {
      allowed = value;
      try {
        storage().setItem(permissionKey, value ? "allow" : "deny");
      } catch {
        // The choice still applies in memory, including immediate revocation.
      }
      listeners.forEach((listener) => listener());
    },
  };
}
