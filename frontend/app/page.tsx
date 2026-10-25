import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/Hero";
import Servicios from "./components/sections/Servicios";
import Galeria from "./components/sections/Galeria";
import Equipo from "./components/sections/Equipo";
import VisionaryClub from "./components/sections/VisionaryClub";
import Contacto from "./components/sections/Contacto";
import Footer from "./components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Servicios />
      <Galeria />
      <Equipo />
      <VisionaryClub />
      <Contacto />
      <Footer />
    </main>
  );
}
import type { Metadata } from "next";

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