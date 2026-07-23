import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { Toaster } from "@/ui/toast";
import { ThemeProvider } from "@/ui/theme";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-public-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roster — AI Employees",
  description: "Hire specialized AI employees that perform like experts on any LLM you bring.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading the theme cookie server-side means the very first response already
  // has the correct data-theme attribute — no flash of the wrong theme.
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html lang="en" data-theme={theme} className={`${publicSans.variable} ${ibmPlexMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider initialTheme={theme}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
