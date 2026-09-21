import { createContext, useContext, type AnchorHTMLAttributes } from "react";

export const PathContext = createContext("/");
export const usePathname = () =>
  useContext(PathContext).replace(/\/page\/\d+$/, "");
export const useRouter = () => ({
  push: (href: string) => {
    window.location.assign(href);
  },
});
export default function Link({
  href,
  children,
  prefetch: _prefetch,
  scroll: _scroll,
  replace: _replace,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
}) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
