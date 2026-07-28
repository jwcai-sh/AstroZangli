"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/cal", icon: "/cond/cal.png", label: "日历" },
  { href: "/earth", icon: "/cond/globe.png", label: "天文图" },
  { href: "/chat", icon: "/cond/chat.png", label: "聊天" },
  { href: "/docs", icon: "/cond/book.png", label: "文档" },
  { href: "/user", icon: "/cond/user.png", label: "用户" },
];

export default function FooterBar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <footer
      className="h-[clamp(60px,15vw,68px)] border-t border-gray-700 bg-[#07111f]/95 shadow-[0_-8px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav
        aria-label="主导航"
        className="mx-auto grid h-full w-full max-w-md grid-cols-5 items-center px-4"
      >
        {NAV_ITEMS.map((item, index) => {
          const isActive = pathname === item.href;
          const isChat = index === 2;

          if (isChat) {
            return (
              <Link
                href={item.href}
                key={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="mx-auto flex h-[clamp(54px,14vw,62px)] w-[clamp(54px,14vw,62px)] -translate-y-3 items-center justify-center rounded-full bg-[#0051fe] shadow-[0_10px_28px_rgba(0,81,254,0.38)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={32}
                  height={32}
                  className="h-[clamp(28px,7vw,32px)] w-[clamp(28px,7vw,32px)] object-contain"
                />
              </Link>
            );
          }

          return (
            <Link
              href={item.href}
              key={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`mx-auto flex h-[clamp(40px,10.5vw,46px)] w-[clamp(40px,10.5vw,46px)] items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                isActive ? "bg-slate-600/80" : "hover:bg-slate-700/70"
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className="h-[clamp(20px,5.5vw,24px)] w-[clamp(20px,5.5vw,24px)] object-contain"
              />
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
