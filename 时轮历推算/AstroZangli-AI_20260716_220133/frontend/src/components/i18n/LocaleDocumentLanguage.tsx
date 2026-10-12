"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function LocaleDocumentLanguage(): null {
  const pathname = usePathname();

  useEffect(() => {
    const isTibetan = pathname === "/bo" || pathname.startsWith("/bo/");
    document.documentElement.lang = isTibetan ? "bo" : "zh-CN";
    document.title = isTibetan ? "བོད་ལོའི་སྐར་རིས།" : "藏历星图";
  }, [pathname]);

  return null;
}
