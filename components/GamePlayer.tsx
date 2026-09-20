"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  Maximize,
  Shuffle,
  TriangleAlert,
  Gamepad2,
} from "lucide-react";
import { useHydrated } from "./useHydrated";
import { Artwork } from "./Artwork";
import { ConsentGate } from "./ConsentGate";
import { addRecent, track } from "../lib/browser-library";
import type { EmbedConfig } from "../lib/types";
export function GamePlayer({
  id,
  slug,
  title,
  thumbnail,
  sources,
  consentRequired,
}: {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  sources: EmbedConfig[];
  consentRequired: boolean;
}) {
  const hydrated = useHydrated();
  const [started, setStarted] = useState(false),
    [index, setIndex] = useState(0),
    [reload, setReload] = useState(0),
    [state, setState] = useState<"idle" | "loading" | "loaded" | "timeout">(
      "idle",
    ),
    [help, setHelp] = useState(false),
    [notice, setNotice] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const source = sources[index];
  const stop = useCallback(() => {
    setStarted(false);
    setState("idle");
    setHelp(false);
  }, []);
  useEffect(() => {
    track("game_page_view", id);
    let visible = 0,
      last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === "visible")
        visible += Math.min(15, (now - last) / 1000);
      last = now;
      if (visible >= 30) {
        track("active_page_time", id, undefined, Math.floor(visible));
        visible = 0;
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => {
    if (!started) return;
    const timeout = setTimeout(
      () => setState((v) => (v === "loading" ? "timeout" : v)),
      12000,
    );
    return () => clearTimeout(timeout);
  }, [started, index, reload]);
  const mount = () => {
    setState("loading");
    setStarted(true);
    addRecent(slug);
    track("game_start", id, source.sourceId);
  };
  const retry = () => {
    setReload((v) => v + 1);
    setState("loading");
    setHelp(false);
    track("game_reload", id, source.sourceId);
  };
  const fallback = () => {
    if (sources.length < 2) return;
    track("game_source_fallback", id, source.sourceId);
    setIndex((index + 1) % sources.length);
    setReload((v) => v + 1);
    setState("loading");
    setHelp(false);
    setStarted(true);
    addRecent(slug);
    track("game_start", id, sources[(index + 1) % sources.length].sourceId);
  };
  return (
    <div className="player-block">
      <div
        ref={container}
        className={`player-container ${source?.orientation === "portrait" ? "portrait-player" : ""}`}
      >
        <div className="player-inner">
          {!source ? (
            <div className="player-empty">
              <TriangleAlert size={35} />
              <h2>This game is currently unavailable.</h2>
              <p>
                We’re checking its playable sources. Discover something else in
                the meantime.
              </p>
              <Link className="button primary" href="#related">
                Play a similar game
              </Link>
            </div>
          ) : !started ? (
            <>
              <Artwork
                src={thumbnail}
                alt=""
                priority
                className="player-cover"
              />
              <div className="player-shade" />
              <div className="player-start">
                <span className="eyebrow">
                  <Gamepad2 size={16} /> YOUR NEXT GOOD BREAK
                </span>
                <h2>{title}</h2>
                <ConsentGate required={consentRequired && !source.fixture}>
                  <button
                    className="play-button"
                    disabled={!hydrated}
                    onClick={mount}
                  >
                    <Play size={22} fill="currentColor" />
                    Play now
                  </button>
                </ConsentGate>
                <p>
                  {source.fixture
                    ? "Development player preview · no third-party requests"
                    : "Instant play · no download"}
                </p>
              </div>
            </>
          ) : (
            <ConsentGate
              required={consentRequired && !source.fixture}
              onRevoke={stop}
            >
              <iframe
                key={`${source.sourceId}-${reload}`}
                title={`${title} game player`}
                src={source.url}
                allow={source.allow}
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => {
                  setState("loaded");
                  track("game_iframe_load", id, source.sourceId);
                }}
              />
              {state === "loading" && (
                <div className="loading-pill" role="status">
                  <span className="spinner" />
                  Opening your game…
                </div>
              )}
              {(state === "timeout" || help) && (
                <div className="player-problem" role="status">
                  <TriangleAlert size={23} />
                  <h3>This game is having trouble loading.</h3>
                  <p>
                    An iframe load does not confirm gameplay. Try again or
                    switch sources.
                  </p>
                  <div className="button-row">
                    <button className="button primary" onClick={retry}>
                      Try Again
                    </button>
                    {sources.length > 1 && (
                      <button className="button" onClick={fallback}>
                        Try Another Source
                      </button>
                    )}
                    <Link className="button" href="#related">
                      Play Similar Game
                    </Link>
                    <button
                      className="text-button"
                      onClick={() => {
                        setHelp(false);
                        setState("loaded");
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </ConsentGate>
          )}
        </div>
      </div>
      <div className="player-toolbar">
        <span>
          <span className={`tiny-led ${started ? "" : "dim"}`} />
          {started ? "Enjoy your break" : "Ready when you are"}
        </span>
        <div>
          <button
            className="text-button"
            disabled={!started}
            onClick={retry}
            aria-label="Reload game"
          >
            <RotateCcw size={17} />
            <span>Reload</span>
          </button>
          <button
            className="text-button"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else if (container.current?.requestFullscreen)
                  await container.current.requestFullscreen();
                else setNotice("Fullscreen is not supported by this browser.");
              } catch {
                setNotice(
                  "Fullscreen could not be opened. Try your browser fullscreen control.",
                );
              }
            }}
            aria-label="Fullscreen"
          >
            <Maximize size={17} />
            <span>Fullscreen</span>
          </button>
          {sources.length > 1 && (
            <button
              className="text-button"
              disabled={!started}
              onClick={fallback}
              aria-label="Try another source"
            >
              <Shuffle size={17} />
              <span>Switch source</span>
            </button>
          )}
        </div>
      </div>
      {started && (
        <div className="player-credits">
          <span>
            Player provided by {source.providerName} · source {index + 1} of{" "}
            {sources.length}
          </span>
          <button className="text-button" onClick={() => setHelp(!help)}>
            Game not loading?
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
