import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "璃记 · 语音记账",
  description: "说话，就记账。界面演示，金额均为虚构示例。",
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hans">
      <body>
        <div className="wallpaper" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
