import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "./components/ui/WhatsAppButton";
import LocationButton from "./components/ui/LocationButton";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Visionary Studio Barber Shop",
  description: "Barbería premium en Liberia, Guanacaste, Costa Rica.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${playfair.variable} ${montserrat.className} bg-dark text-white antialiased`}>
        {children}
        <LocationButton />
        <WhatsAppButton />
      </body>
    </html>
  );
}