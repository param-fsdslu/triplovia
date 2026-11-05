import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/lib/providers/query-provider";
import { FloatingCartBar } from "@/components/hotel/FloatingCartBar";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://triplovia.com";

export const metadata: Metadata = {
  title: {
    default: "Triplovia — Hotels, Boats & More in Coastal Karnataka",
    template: "%s | Triplovia",
  },
  description:
    "Book hotels, boat rides, and explore the beautiful coastal Karnataka with Triplovia. Verified properties, secure payments, and the best local experiences.",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/company-logo-only.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Triplovia",
    title: "Triplovia — Hotels, Boats & More in Coastal Karnataka",
    description:
      "Book hotels, boat rides, and explore the beautiful coastal Karnataka with Triplovia. Verified properties, secure payments, and the best local experiences.",
    url: SITE_URL,
    images: [
      {
        url: "/company-logo-only.svg",
        width: 512,
        height: 512,
        alt: "Triplovia Logo",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Triplovia — Hotels, Boats & More in Coastal Karnataka",
    description:
      "Book hotels, boat rides, and explore the beautiful coastal Karnataka with Triplovia.",
    images: ["/company-logo-only.svg"],
  },
  keywords: [
    "Triplovia",
    "coastal Karnataka hotels",
    "boat rides Karnataka",
    "Honnavar hotels",
    "Murudeshwar hotels",
    "Gokarna hotels",
    "Karnataka tourism",
    "backwater boating",
    "beach stays Karnataka",
  ],
  authors: [{ name: "Triplovia" }],
  creator: "Triplovia",
  publisher: "Triplovia",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables}>
      <body className="antialiased">
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <FloatingCartBar />
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
