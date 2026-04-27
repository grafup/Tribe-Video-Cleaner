import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";
import "./globals.css";
import { Toaster } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Tribe Video Cleaner",
  description: "Automatically detect and remove filler words, double takes, and silences from your videos.",
};

// Inline script prevents flash of wrong theme before React hydrates
const themeScript = `
(function(){try{var s=localStorage.getItem("tvc-theme");var t=s?JSON.parse(s).state?.theme:null;if(t!=="light")document.documentElement.classList.add("dark");}catch(e){document.documentElement.classList.add("dark");}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[--background] text-[--foreground] antialiased">
        <ThemeProvider />

        {/* Navigation */}
        <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#0f0f1a]/95 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
                  ✂
                </span>
                Tribe Video Cleaner
              </Link>

              {/* Brand links */}
              <div className="hidden sm:flex items-center gap-1 border-l border-gray-300 dark:border-gray-700 pl-4">
                <a
                  href="https://automation-tribe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  by Automation Tribe
                </a>
                <span className="text-gray-300 dark:text-gray-700 mx-1">·</span>
                <a
                  href="https://www.skool.com/automation-tribe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Community
                </a>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/settings"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="mx-auto max-w-screen-2xl px-4 py-6">
          {children}
        </main>

        <Toaster />
      </body>
    </html>
  );
}
