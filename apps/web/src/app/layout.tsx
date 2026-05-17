import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@famm/ui/tokens.css";
import "./globals.css";
import { MountedRoot } from "../components/mounted-root";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FAMM — Multi-Tenant Marketplace OS",
  description: "Production-grade marketplace operating system",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <MountedRoot />
        {children}
      </body>
    </html>
  );
}
