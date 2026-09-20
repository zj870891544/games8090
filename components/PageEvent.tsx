"use client";
import { useEffect } from "react";
import { track } from "../lib/browser-library";
export function PageEvent({ event }: { event: string }) {
  useEffect(() => track(event), [event]);
  return null;
}
