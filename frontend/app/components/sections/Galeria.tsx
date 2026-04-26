export default function Galeria() {
  const imagenesGaleria = [
    { src: "/cliente1.jpeg", alt: "Interior de Visionary Studio" },
    { src: "/cliente2.jpeg", alt: "Herramientas profesionales" },
    { src: "/cliente6.jpeg", alt: "Resultado de corte" },
    { src: "/cliente4.jpeg", alt: "Experiencia en barberia" },
    { src: "/cliente5.jpeg", alt: "Detalle del espacio" },
    { src: "/cliente3.jpeg", alt: "Ambiente premium" },
  ];

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

          {/* Grid uniforme de 6 imagenes */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {imagenesGaleria.map((imagen, index) => (
              <div key={`${imagen.src}-${index}`} className="relative overflow-hidden rounded-lg group aspect-4/5">
                <img
                  src={imagen.src}
                  alt={imagen.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-dark/20 group-hover:bg-dark/10 transition-all duration-300" />
              </div>
            ))}
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