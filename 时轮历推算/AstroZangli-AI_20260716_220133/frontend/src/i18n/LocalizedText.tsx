"use client";

import { useLocale } from "./LocaleProvider";
import { appText } from "./copy";

export default function LocalizedText({ text }: { text: string }): React.JSX.Element {
  const locale = useLocale();
  return <>{appText(locale, text)}</>;
}
