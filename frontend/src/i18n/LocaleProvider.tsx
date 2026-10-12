"use client";

import { createContext, useContext } from "react";
import type { AppLocale } from "./locale";
import { appText } from "./copy";

const LocaleContext = createContext<AppLocale>("zh");

export function LocaleProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: AppLocale;
}): React.JSX.Element {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): AppLocale {
  return useContext(LocaleContext);
}

export function useAppText(): (chinese: string) => string {
  const locale = useLocale();
  return (chinese) => appText(locale, chinese);
}
