import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "有鹿机器人客户帮助中心",
  description: "有鹿机器人客户售后知识库与工单系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
