"use client";

import { useState } from "react";
import Link from "next/link";

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    const navbarHeight = document.querySelector("nav")?.offsetHeight || 80;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: elementPosition - navbarHeight - 12, behavior: "smooth" });
  }
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-dark/90 backdrop-blur-sm border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-30 md:h-34">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Visionary Studio Barber Shop" className="h-40 w-auto" />
            <div className="hidden sm:block">
              <p className="text-white font-black text-sm tracking-widest uppercase leading-none">Visionary Studio</p>
              <p className="font-bold text-xs tracking-widest italic leading-none mt-1" style={{background: "linear-gradient(45deg, #B8872E, #F0C95A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"}}>Barber Shop</p>
            </div>
          </Link>

          {/* Links escritorio */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("servicios")} className="text-white hover:text-gold transition-colors duration-300 text-sm uppercase tracking-wider">Servicios</button>
            <button onClick={() => scrollToSection("galeria")} className="text-white hover:text-gold transition-colors duration-300 text-sm uppercase tracking-wider">Galería</button>
            <button onClick={() => scrollToSection("equipo")} className="text-white hover:text-gold transition-colors duration-300 text-sm uppercase tracking-wider">Equipo</button>
            <button onClick={() => scrollToSection("contacto")} className="text-white hover:text-gold transition-colors duration-300 text-sm uppercase tracking-wider">Contacto</button>
            <Link href="/reservar" className="btn-gold text-sm uppercase tracking-wider px-6 py-2">Reservar Cita</Link>
          </div>

          {/* Botón hamburguesa */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden flex flex-col gap-1.5 p-2">
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>

        </div>
      </div>

      {/* Menú móvil */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${isOpen ? "max-h-96" : "max-h-0"}`}>
        <div className="flex flex-col px-4 pb-6 gap-4 bg-dark-card border-t border-dark-border">
          <button onClick={() => { scrollToSection("servicios"); setIsOpen(false); }} className="text-white hover:text-gold transition-colors py-2 uppercase tracking-wider text-sm text-left">Servicios</button>
          <button onClick={() => { scrollToSection("galeria"); setIsOpen(false); }} className="text-white hover:text-gold transition-colors py-2 uppercase tracking-wider text-sm text-left">Galería</button>
          <button onClick={() => { scrollToSection("equipo"); setIsOpen(false); }} className="text-white hover:text-gold transition-colors py-2 uppercase tracking-wider text-sm text-left">Equipo</button>
          <button onClick={() => { scrollToSection("contacto"); setIsOpen(false); }} className="text-white hover:text-gold transition-colors py-2 uppercase tracking-wider text-sm text-left">Contacto</button>
          <Link href="/reservar" onClick={() => setIsOpen(false)} className="btn-gold text-center uppercase tracking-wider text-sm">Reservar Cita</Link>
        </div>
      </div>
    </nav>
  );
}