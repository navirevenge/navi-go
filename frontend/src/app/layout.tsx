import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVI語 — Japanese, with a private tutor",
  description: "AI-powered Japanese learning: grammar, vocabulary, spaced repetition and conversation.",
  appleWebApp: { capable: true, title: "NAVI語", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
