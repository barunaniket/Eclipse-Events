// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="antialiased bg-[#050505]">
        {children}
      </body>
    </html>
  );
}
