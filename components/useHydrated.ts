"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
/** Keep JS-only controls disabled until React can handle the first interaction. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
