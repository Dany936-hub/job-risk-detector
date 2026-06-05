// 内联 SVG 图标集（DESIGN.md：风险表达禁用 emoji，统一用克制的线性图标）
import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const ShieldCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const ImageUp = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5.3" /><path d="m4 16 4.5-4.5a2 2 0 0 1 2.8 0L14 14" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M16 18h6" /><path d="M19 15v6" /></svg>
);
export const ExternalLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);
export const AlertTriangle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
);
export const OctagonStop = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9L7.9 2Z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
);
export const Info = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);
export const Copy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);
export const Check = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m5 12 5 5L20 7" /></svg>
);
export const CheckCircle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const Lock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const MessageQuestion = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /><path d="M9.5 9a2.5 2.5 0 0 1 4 1.5c0 1.5-2 1.8-2 3" /><path d="M11.5 16h.01" /></svg>
);
export const ListChecks = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m3 7 2 2 3-3" /><path d="m3 16 2 2 3-3" /><path d="M12 6h9" /><path d="M12 15h9" /></svg>
);
export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);
export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></svg>
);
export const Refresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
);
export const Sparkle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
