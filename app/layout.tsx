import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ImageBox 图像盒",
  description: "本地优先的 AI 图像管理工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`bg-background text-foreground min-h-screen font-sans`}>
        <Sidebar />
        <main className="pl-64 min-h-screen">
          <div className="w-full max-w-7xl p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
