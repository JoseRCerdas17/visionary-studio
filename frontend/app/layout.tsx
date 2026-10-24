"use client";

import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "./components/ui/WhatsAppButton";
import LocationButton from "./components/ui/LocationButton";
import StampCardButton from "./components/ui/StampCardButton";
import { usePathname } from "next/navigation";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const esAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/login");
  const esHome = pathname === "/";

  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className={`${montserrat.variable} ${playfair.variable} ${montserrat.className} bg-dark text-white antialiased`}>
        {children}
        {esHome && <StampCardButton />}
        {!esAdmin && <LocationButton />}
        {!esAdmin && <WhatsAppButton />}
      </body>
    </html>
  );
}
