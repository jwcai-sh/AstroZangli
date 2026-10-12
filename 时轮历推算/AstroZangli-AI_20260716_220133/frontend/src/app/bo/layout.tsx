import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "བོད་ལོའི་སྐར་རིས།",
  description: "བོད་ལོ་དང་རྒྱུ་སྐར་རིག་པ་ལ་རྟོག་ཞིབ་བྱེད།",
};

export default function TibetanLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <LocaleProvider locale="bo">{children}</LocaleProvider>;
}
