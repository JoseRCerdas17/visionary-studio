"use client";
import Link from "next/link";


export default function Hero() {
  return (
    <section className="min-h-screen bg-dark relative overflow-hidden flex flex-col">

      {/* Contenido principal */}
      <div className="flex-1 flex items-center relative pt-20">

        {/* Imagen de fondo derecha - solo desktop */}
        <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80"
            alt="Barbería Evolution X"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/70 to-transparent" />
        </div>

        {/* Imagen de fondo móvil */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80"
            alt="Barbería Evolution X"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-dark/80" />
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 w-full relative z-10 py-16">
          <div className="max-w-2xl">

            {/* Badge */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-px bg-gold" />
              <p className="text-gray-400 text-xs tracking-[4px] uppercase">
                Excelencia desde 2021
              </p>
            </div>

            {/* Título */}
                        <h1 className="text-white font-black uppercase leading-[0.9] text-[2.4rem] sm:text-5xl md:text-7xl lg:text-8xl">
              Donde el Estilo
            </h1>
            <h1
              className="font-black uppercase leading-none text-[2.4rem] sm:text-5xl md:text-7xl lg:text-8xl mb-8"
              style={{
                background: "linear-gradient(45deg, #B8872E, #F0C95A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Se Vuelve Arte
            </h1>

            {/* Descripción */}
            <p className="text-gray-400 text-sm md:text-base max-w-lg leading-relaxed mb-10">
            Precisión, estilo y buen ambiente.
            Todo lo que esperás de un buen corte, sin complicaciones.
            Tu estilo empieza aquí.
            </p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/reservar"
                className="btn-gold text-center uppercase tracking-widest text-sm px-8 py-4"
              >
                Reservar Cita
              </Link>
              <button
                onClick={() => {
                  const element = document.getElementById("servicios");
                  if (element) {
                    const navbarHeight = document.querySelector("nav")?.offsetHeight || 100;
                    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({ top: elementPosition - navbarHeight, behavior: "smooth" });
                  }
                }}
                className="btn-outline text-center uppercase tracking-widest text-sm px-8 py-4"
              >
                Ver Servicios
              </button>
            </div>

          </div>
        </div>
      </div>

      

    </section>
  );
}
