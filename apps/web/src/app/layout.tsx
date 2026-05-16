import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@famm/ui/tokens.css";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FAMM — Operating system for personal trainers",
  description:
    "Bookings, clients, payments, and live session mode — built for trainers on the gym floor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // theme-color must be a literal hex/rgb at build time per the spec; tokens
  // can't reach this Next.js metadata field. Keep the values in lockstep with
  // the surface tokens in packages/ui/src/tokens/tokens.json.
  themeColor: [
    // eslint-disable-next-line no-restricted-syntax
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    // eslint-disable-next-line no-restricted-syntax
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-surface font-sans text-text-primary antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
