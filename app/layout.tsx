import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { GenerationProvider } from "@/components/GenerationProvider";
import { DM_Sans } from 'next/font/google';
import { LayoutContent } from "@/components/LayoutContent";
import { SetupWizard } from "@/components/SetupWizard";

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ImageBox",
  description: "A local-first AI image generation tool",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <body className={`bg-background text-foreground min-h-screen font-[var(--font-dm-sans)] antialiased`}>
        <LanguageProvider>
          <ThemeProvider>
            <GenerationProvider>
              <SidebarProvider>
                <SetupWizard />
                <Sidebar />
                <LayoutContent>
                  {children}
                </LayoutContent>
              </SidebarProvider>
            </GenerationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
