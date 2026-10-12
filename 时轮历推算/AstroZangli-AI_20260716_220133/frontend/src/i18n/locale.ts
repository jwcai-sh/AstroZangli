export type AppLocale = "zh" | "bo";

const LOCALE_PREFIXES = ["/zh", "/bo"] as const;

export function localeFromPath(pathname: string): AppLocale {
  return pathname === "/bo" || pathname.startsWith("/bo/") ? "bo" : "zh";
}

export function stripLocalePrefix(pathname: string): string {
  for (const prefix of LOCALE_PREFIXES) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname || "/";
}

export function localizePath(locale: AppLocale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [pathname, query = ""] = pathAndQuery.split("?", 2);
  const basePath = stripLocalePrefix(pathname || "/");
  const localePath = locale === "bo"
    ? basePath === "/" ? "/bo" : `/bo${basePath}`
    : basePath === "/" ? "/zh" : basePath;

  return `${localePath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
