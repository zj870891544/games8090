import { describe, expect, it } from "vitest";
import { createPlayerConsent } from "../lib/consent";

describe("site player permission", () => {
  it("requires an explicit choice, remembers it for the tab and notifies revocation", () => {
    const saved = new Map<string, string>();
    const storage = () => ({
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    });
    let opened = 0;
    const consent = createPlayerConsent(() => {
      opened++;
    }, storage);
    expect(consent.bridge.hasConsent()).toBe(false);
    consent.bridge.requestConsent?.();
    expect(opened).toBe(1);
    const changes: boolean[] = [];
    const unsubscribe = consent.bridge.subscribe(() =>
      changes.push(consent.bridge.hasConsent()),
    );
    consent.setAllowed(true);
    expect(createPlayerConsent(() => {}, storage).bridge.hasConsent()).toBe(
      true,
    );
    consent.setAllowed(false);
    expect(createPlayerConsent(() => {}, storage).bridge.hasConsent()).toBe(
      false,
    );
    expect(changes).toEqual([true, false]);
    unsubscribe();
    consent.setAllowed(true);
    expect(changes).toEqual([true, false]);
  });

  it("allows in-memory choices and revocation when browser storage is unavailable", () => {
    const consent = createPlayerConsent(
      () => {},
      () => {
        throw new Error("Storage blocked");
      },
    );
    expect(consent.bridge.hasConsent()).toBe(false);
    consent.setAllowed(true);
    expect(consent.bridge.hasConsent()).toBe(true);
    consent.setAllowed(false);
    expect(consent.bridge.hasConsent()).toBe(false);
  });

  it("does not reuse a development preview choice or accept an invalid choice", () => {
    for (const saved of [
      new Map([["8090:preview-player-permission:v1", "allow"]]),
      new Map([["8090:player-permission:v1", "true"]]),
    ]) {
      const consent = createPlayerConsent(() => {}, () => ({
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => { saved.set(key, value); },
      }));
      expect(consent.bridge.hasConsent()).toBe(false);
    }
  });
});
