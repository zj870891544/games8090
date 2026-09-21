"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { taxonomy, categorySlug } from "../lib/normalize";
import { CategoryIcon } from "./Icons";

const primary = ["Action", "Adventure", "Puzzle", "Racing", "Sports"];

export function CategoryNav() {
  const path = usePathname();
  const more = useRef<HTMLDetailsElement>(null);
  const activeExtra = taxonomy.find(
    (name) =>
      !primary.includes(name) && path === `/category/${categorySlug(name)}`,
  );
  return (
    <nav className="category-nav" aria-label="Browse by category">
      <div className="category-primary">
        <Link
          href="/games"
          className={path === "/" || path === "/games" ? "selected" : ""}
          aria-current={path === "/games" ? "page" : undefined}
        >
          All games
        </Link>
        {primary.map((name) => {
          const href = `/category/${categorySlug(name)}`;
          return (
            <Link
              href={href}
              key={name}
              className={path === href ? "selected" : ""}
              aria-current={path === href ? "page" : undefined}
            >
              {name}
            </Link>
          );
        })}
      </div>
      <details
        ref={more}
        className="category-more"
        onKeyDown={(e) => {
          if (e.key === "Escape" && more.current) {
            more.current.open = false;
            more.current.querySelector("summary")?.focus();
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget))
            e.currentTarget.open = false;
        }}
      >
        <summary className={activeExtra ? "selected" : ""}>
          {activeExtra || "More"}
          <ChevronDown size={15} />
        </summary>
        <div className="category-menu">
          {taxonomy
            .filter((name) => !primary.includes(name))
            .map((name) => {
              const href = `/category/${categorySlug(name)}`;
              return (
                <Link
                  href={href}
                  key={name}
                  aria-current={path === href ? "page" : undefined}
                  onClick={() => {
                    if (more.current) more.current.open = false;
                  }}
                >
                  <CategoryIcon name={categorySlug(name)} size={17} />
                  {name}
                </Link>
              );
            })}
        </div>
      </details>
    </nav>
  );
}
