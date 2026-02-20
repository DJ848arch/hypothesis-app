import "./globals.css";
import { Navigation } from "./navigation";
import { ThemeProvider } from "./theme-provider";

export const metadata = {
  title: "Hypothesis",
  description: "Publish hypotheses and peer review repeatability",
};

import { AuthProvider } from "../components/auth-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 min-h-screen">
        <AuthProvider>
          <ThemeProvider>
            <Navigation />
            <main className="mx-auto max-w-5xl p-6">{children}</main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

