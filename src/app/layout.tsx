import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ClaimPilot — Turn Statements into Reimbursement Reports",
  description: "Import your credit card statement, tag transactions, track reimbursements, and export finance-ready reports. Stop paying interest for points.",
  keywords: ["reimbursement tracker", "expense management", "credit card", "consultant expenses", "expense tracking"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "ClaimPilot — Stop paying interest on money your company owes you",
    description: "Import your credit card statement. Tag reimbursables in 2 minutes. Export a finance-ready report. Know exactly what to pay.",
    url: "https://www.personal-fin-ai.com",
    siteName: "ClaimPilot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClaimPilot — Stop paying interest on money your company owes you",
    description: "Import your credit card statement. Tag reimbursables in 2 minutes. Export a finance-ready report.",
  },
  metadataBase: new URL("https://www.personal-fin-ai.com"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClaimPilot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} antialiased font-sans`}
        style={{ fontFamily: 'var(--font-manrope), "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
