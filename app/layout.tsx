import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/lib/trpc-client";
import { AppShell } from "@/components/ui/AppShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDGE",
  description: "Personal sports prediction platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0D1B2A]">
        <TRPCProvider>
          <AppShell>{children}</AppShell>
        </TRPCProvider>
      </body>
    </html>
  );
}
