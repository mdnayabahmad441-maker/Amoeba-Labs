import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./groenics.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.groenics.online"),
  title: {
    default: "Groenics | AI Automation, ERP, CRM & Business Systems",
    template: "%s | Groenics",
  },
  description:
    "Groenics builds practical AI automation, ERP, CRM, dashboards, websites, and custom business systems for growing businesses.",
  keywords: ["AI automation India", "ERP development", "CRM systems", "business automation", "custom software company"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Groenics",
    title: "Groenics | Practical Business Systems",
    description: "AI automation, ERP, CRM, dashboards and custom software built around real business problems.",
    url: "https://www.groenics.online",
  },
  twitter: { card: "summary_large_image", title: "Groenics | Practical Business Systems", description: "AI automation, ERP, CRM and software for growing businesses." },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
