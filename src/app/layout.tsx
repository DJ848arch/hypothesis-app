import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifePlanner AI",
  description: "AI-powered daily planner, project manager, and habit tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
