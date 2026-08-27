import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import webPackageJson from "../package.json";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Subscription Tracker",
  description: "Track whether your subscriptions are worth it.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col"
        style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)" }}
      >
        <AuthProvider>
          <div className="flex flex-1 flex-col">{children}</div>
        </AuthProvider>
        <footer
          className="text-center text-xs"
          style={{ padding: "var(--space-4)", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
        >
          Subscription Tracker v{webPackageJson.version}
        </footer>
      </body>
    </html>
  );
}
