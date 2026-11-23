"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

const FOOTER_ROUTES = new Set(["/cal", "/earth", "/chat", "/docs", "/user", "/five-elements"]);

export default function LanguageChooserShortcut({ inFooter = false }: { inFooter?: boolean }): React.JSX.Element | null {
  const pathname = usePathname();
  const contextLocale = useLocale();
  const locale = pathname === "/bo" || pathname?.startsWith("/bo/") ? "bo" : contextLocale;
  if (!pathname || pathname === "/") return null;
  const unlocalizedPath = pathname.replace(/^\/bo(?=\/|$)/, "") || "/";
  if (!inFooter && (FOOTER_ROUTES.has(unlocalizedPath) || unlocalizedPath.startsWith("/details/"))) return null;

  return (
    <Link
      href="/"
      className={inFooter
        ? "mx-auto flex h-[clamp(40px,10.5vw,46px)] items-center justify-center whitespace-nowrap rounded-xl border border-white/25 bg-slate-800/70 px-1.5 text-[11px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        : "fixed right-3 bottom-3 z-[80] rounded-full border border-white/25 bg-slate-950/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"}
      aria-label={appText(locale, "返回语言选择")}
    >
      {appText(locale, "语言")}
    </Link>
  );
}
