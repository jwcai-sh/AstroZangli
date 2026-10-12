"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { useLocale } from "./LocaleProvider";
import { localizePath } from "./locale";

type LocaleLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<LinkProps, "href"> & { href: string };

export default function LocaleLink({ href, ...props }: LocaleLinkProps): React.JSX.Element {
  const locale = useLocale();
  return <Link href={localizePath(locale, href)} {...props} />;
}
