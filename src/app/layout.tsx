import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { Providers } from "@/context/Providers";
import LayoutContent from "@/components/LayoutContent";

const caveat = localFont({
  src: [
    {
      path: "./fonts/Caveat-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Caveat-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Spotilark",
  description: "Your offline and online music player.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${caveat.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <SettingsProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </SettingsProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

