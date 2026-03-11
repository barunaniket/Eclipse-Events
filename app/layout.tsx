// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PREVENTS iOS Safari from auto-zooming on inputs
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, 
  userScalable: false,
  themeColor: "#050505",
};

export const metadata: Metadata = {
  title: "Eclipse | CodeChef PESU ECC",
  description: "Official Event Management Portal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eclipse Portal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505]`}>
        {children}
      </body>
    </html>
  );
}