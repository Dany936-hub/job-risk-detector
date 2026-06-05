import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "岗位避坑检测器 — 投递前先检测风险",
  description:
    "粘贴岗位描述或招聘聊天内容，帮你识别收费陷阱、培训贷、刷单返利、站外引流等高危信号，并生成安全追问话术。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBFAFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
