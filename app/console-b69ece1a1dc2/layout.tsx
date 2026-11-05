import { QueryProvider } from "@/lib/providers/query-provider";
import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

// Root layout of the admin area: the panel ((panel)/layout.tsx checks the session and role)
// and its own sign-in page (login/)
export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard — Triplovia",
    template: "%s | Triplovia Admin",
  },
  description: "Admin panel for Triplovia hotel booking platform",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
