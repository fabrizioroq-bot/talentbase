"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/candidates", label: "Candidates" },
  { href: "/upload", label: "Upload" },
  { href: "/chat", label: "Chat" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
        <Link href="/candidates" className="text-lg font-semibold tracking-tight">
          TalentBase
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
