import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import WhatsAppButton from "./components/ui/WhatsAppButton";

const montserrat = Montserrat({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Evolution X Barbershop",
  description: "Barbería premium en Liberia, Guanacaste, Costa Rica.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${montserrat.className} bg-dark text-white antialiased`}>
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}