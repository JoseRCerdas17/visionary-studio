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
                Excelencia desde 2024
              </p>
            </div>

            {/* Título */}
            <h1 className="text-white font-black uppercase leading-[0.9] text-[2.4rem] sm:text-5xl md:text-7xl lg:text-8xl">
              Tu Estilo,
            </h1>
            <h1 className="text-gold font-black uppercase italic leading-[0.9] text-[2.4rem] sm:text-5xl md:text-7xl lg:text-8xl mb-8">
              Evolucionado
            </h1>

            {/* Descripción */}
            <p className="text-gray-400 text-sm md:text-base max-w-lg leading-relaxed mb-10">
              Grooming premium para el caballero moderno. Experimenta cortes de
              precisión y tratamientos de lujo en un ambiente de distinción total.
            </p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/reservar"
                className="btn-gold text-center uppercase tracking-widest text-sm px-8 py-4"
              >
                Reservar Cita
              </Link>
              <Link
                href="#servicios"
                className="btn-outline text-center uppercase tracking-widest text-sm px-8 py-4"
              >
                Ver Servicios
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* Barra de stats */}
      <div className="relative z-10 border-t border-dark-border bg-dark-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 divide-x divide-dark-border">

            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-8 lg:px-12 py-4 sm:py-6">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="min-w-0">
                <p className="text-white font-black text-lg sm:text-2xl leading-none">5.0</p>
                <p className="text-gray-600 text-[9px] sm:text-xs tracking-[1px] sm:tracking-[2px] uppercase mt-0.5 truncate">Google Maps</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-8 lg:px-12 py-4 sm:py-6">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <div className="min-w-0">
                <p className="text-white font-black text-lg sm:text-2xl leading-none">15+</p>
                <p className="text-gray-600 text-[9px] sm:text-xs tracking-[1px] sm:tracking-[2px] uppercase mt-0.5 truncate">Expertos</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-8 lg:px-12 py-4 sm:py-6">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <div className="min-w-0">
                <p className="text-white font-black text-lg sm:text-2xl leading-none">10k+</p>
                <p className="text-gray-600 text-[9px] sm:text-xs tracking-[1px] sm:tracking-[2px] uppercase mt-0.5 truncate">Clientes</p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
}
