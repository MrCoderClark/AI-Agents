import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agents Builder",
  description: "Compose coding agents on a visual canvas.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans text-base text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
