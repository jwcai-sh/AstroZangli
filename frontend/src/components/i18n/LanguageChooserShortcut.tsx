"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { appText } from "@/i18n/copy";

export default function LanguageChooserShortcut(): React.JSX.Element | null {
  const pathname = usePathname();
  const contextLocale = useLocale();
  const locale = pathname === "/bo" || pathname?.startsWith("/bo/") ? "bo" : contextLocale;
  if (!pathname || pathname === "/") return null;

  return (
    <Link
      href="/"
      className="fixed right-3 top-3 z-[80] rounded-full border border-white/25 bg-slate-950/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      aria-label={appText(locale, "返回语言选择")}
    >
      {appText(locale, "语言")}
    </Link>
  );
}
