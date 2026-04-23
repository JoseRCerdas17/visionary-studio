export default function Galeria() {
  return (
    <section id="galeria" className="relative overflow-hidden">

      {/* Video de fondo */}
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover">
          <source src="/barberia.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-dark/85" />
      </div>

      {/* Contenido encima del video */}
      <div className="relative z-10 section-padding">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-14">
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">El Templo</p>
            <h2 className="text-white font-black uppercase text-4xl md:text-5xl mb-4">
              Un Ambiente de Distinción
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Sumérgete en un espacio diseñado para tu confort, donde el tiempo
              se detiene y la elegancia es la norma.
            </p>
          </div>

          {/* Grid asimétrico desktop */}
          <div className="hidden md:grid grid-cols-3 grid-rows-2 gap-3 h-[520px]">
            <div className="col-span-2 row-span-2 relative overflow-hidden rounded-lg group">
              <img src="/cliente1.jpeg" alt="Interior de Visionary Studio" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-dark/20 group-hover:bg-dark/10 transition-all duration-300" />
            </div>
            <div className="relative overflow-hidden rounded-lg group">
              <img src="/cliente4.jpeg" alt="Herramientas profesionales" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-dark/20 group-hover:bg-dark/10 transition-all duration-300" />
            </div>
            <div className="relative overflow-hidden rounded-lg group">
              <img src="/cliente3.jpeg" alt="Resultado de corte" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-dark/20 group-hover:bg-dark/10 transition-all duration-300" />
            </div>
          </div>

          {/* Grid móvil */}
          <div className="md:hidden grid grid-cols-2 gap-3">
            <div className="col-span-2 h-64 relative overflow-hidden rounded-lg">
              <img src="/cliente1.jpeg" alt="Interior de Visionary Studio" className="w-full h-full object-cover" />
            </div>
            <div className="h-44 relative overflow-hidden rounded-lg">
              <img src="/cliente4.jpeg" alt="Herramientas profesionales" className="w-full h-full object-cover" />
            </div>
            <div className="h-44 relative overflow-hidden rounded-lg">
              <img src="/cliente3.jpeg" alt="Resultado de corte" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-gray-400 text-sm mb-5">Síguenos en Instagram para ver más de nuestro trabajo</p>
            <a href="https://www.instagram.com/lobo_barbero" target="_blank" className="btn-outline uppercase tracking-widest text-xs px-8 py-3">
              @lobo_barbero
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}