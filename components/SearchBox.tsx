"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "./useHydrated";
import { Search, ArrowUpLeft } from "lucide-react";
import type { GameCardData } from "../lib/types";
export function SearchBox() {
  const hydrated = useHydrated();
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<GameCardData[]>([]),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    if (query.trim().length < 2) return;
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: abort.signal,
      })
        .then((r) => r.json() as Promise<{ games: GameCardData[] }>)
        .then((v: { games: GameCardData[] }) => setResults(v.games || []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [query]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const suggestions = query.trim().length >= 2 ? results : [];
  return (
    <form
      className="search-box"
      role="search"
      action="/search"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        router.push(
          active >= 0 && suggestions[active]
            ? `/game/${suggestions[active].slug}`
            : `/search?q=${encodeURIComponent(query)}`,
        );
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Search size={18} />
      <input
        ref={input}
        disabled={!hydrated}
        name="q"
        type="search"
        placeholder="Find a game, take a break"
        value={query}
        autoComplete="off"
        aria-label="Search games"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="search-suggestions"
        aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setResults([]);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((v) => Math.min(v + 1, suggestions.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) => Math.max(v - 1, -1));
          }
        }}
      />
      <kbd>/</kbd>
      {open && suggestions.length > 0 && (
        <ul id="search-suggestions" role="listbox" className="suggestions">
          {suggestions.map((g, i) => (
            <li
              key={g.id}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={active === i}
            >
              <button
                type="button"
                onClick={() => {
                  router.push(`/game/${g.slug}`);
                  setOpen(false);
                }}
              >
                <span>{g.title}</span>
                <ArrowUpLeft size={16} />
              </button>
            </li>
          ))}
          <li className="suggestion-all">
            <button type="submit">See all results for “{query}”</button>
          </li>
        </ul>
      )}
    </form>
  );
}
