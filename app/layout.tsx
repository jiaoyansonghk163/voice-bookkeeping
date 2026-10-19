import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "璃记 · 语音记账",
  description: "说话，就记账。液态玻璃风格的语音记账界面演示，金额均为虚构示例。",
};

export const viewport: Viewport = {
  themeColor: "#08131c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hans">
      <body className={outfit.variable}>
        <div className="wallpaper" aria-hidden="true">
          <span className="bloom bloom-a" />
          <span className="bloom bloom-b" />
          <span className="grain" />
          <span className="vignette" />
        </div>
        {children}
      </body>
    </html>
  );
}
