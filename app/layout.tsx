import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { GenerationProvider } from "@/components/GenerationProvider";
import { LayoutContent } from "@/components/LayoutContent";
import { SetupWizard } from "@/components/SetupWizard";

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
    <html lang="en" suppressHydrationWarning>
      {/* Avoid next/font/google during Docker/CI builds (can fail due to blocked/slow Google Fonts). Use system font stack. */}
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
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
