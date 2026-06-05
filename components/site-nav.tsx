"use client";

// 全站共享顶部导航：首页 / 使用说明 / 风险知识库 / 隐私说明 / 关于我们
// 首页与各内容页统一引用，保证导航一致。
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "./icons";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/guide", label: "使用说明" },
  { href: "/knowledge", label: "风险知识库" },
  { href: "/privacy", label: "隐私说明" },
  { href: "/about", label: "关于我们" },
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-4 z-20 mx-auto mt-4 flex w-[min(94%,820px)] items-center gap-3 rounded-pill border border-border bg-[rgba(255,255,255,0.75)] px-3 py-2.5 backdrop-blur-xl shadow-[0_8px_28px_rgba(60,50,90,0.08)] sm:px-4">
      <Link href="/" className="flex items-center gap-2 text-text shrink-0">
        <ShieldCheck width={22} height={22} className="text-brand-300" />
        <span className="font-display font-700 text-[15px]">岗位避坑检测器</span>
      </Link>
      <div className="ml-auto flex items-center gap-1 sm:gap-2 overflow-x-auto">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-pill px-2.5 py-1.5 text-[14px] font-600 transition-colors"
              style={
                active
                  ? { background: "var(--brand-soft)", color: "var(--brand-deep)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
