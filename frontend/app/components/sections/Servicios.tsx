const servicios = [
  {
    nombre: "Corte de Cabello",
    precio: "₡4,000",
    duracion: "30 min",
    descripcion: "Corte de cabello personalizado con las mejores herramientas con acabado premium y asesoría de imagen.",
    imagen: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
    tag: "01",
  },
  {
    nombre: "Corte y Barba",
    precio: "₡5,000",
    duracion: "30 min",
    descripcion: "Combo completo: corte de cabello y arreglo de barba para una imagen impecable de pies a cabeza.",
    imagen: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
    tag: "02",
  },
  {
    nombre: "Marcado y/o Barba",
    precio: "₡2,000",
    duracion: "15 min",
    descripcion: "Definición de líneas y contornos, arreglo de barba con acabado profesional y limpio.",
    imagen: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=600&q=80",
    tag: "03",
  },
  {
    nombre: "Cejas",
    precio: "₡1,000",
    duracion: "5 min",
    descripcion: "Diseño y depilación de cejas para un look limpio, definido y con acabado de detalle.",
    imagen: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80",
    tag: "04",
  },
];

export default function Servicios() {
  return (
    <section id="servicios" className="bg-dark section-padding">
      <div className="max-w-7xl mx-auto">

        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">
              Nuestros Servicios
            </p>
            <h2 className="text-white font-black uppercase text-4xl md:text-5xl leading-none">
              Nuestra Maestría
            </h2>
            <p className="text-gray-500 text-sm max-w-md mt-4 leading-relaxed">
              Servicios diseñados para el hombre que no compromete su imagen.
              Cada técnica es un ritual de perfección ejecutado por Lobo.
            </p>
          </div>
          <a href="/reservar" className="text-gold text-sm tracking-wider hover:text-gold-light transition-colors flex items-center gap-2 flex-shrink-0">
            Reservar ahora
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {servicios.map((servicio) => (
            <div
              key={servicio.nombre}
              className="bg-dark-card border border-dark-border rounded-lg overflow-hidden group hover:border-gold transition-all duration-300"
            >
              {/* Imagen */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={servicio.imagen}
                  alt={servicio.nombre}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent" />
                {/* Tag */}
                <div className="absolute top-4 right-4 bg-gold text-white text-xs font-black tracking-widest px-3 py-1 rounded-sm">
                  {servicio.tag}
                </div>
                {/* Duración */}
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-gray-300 text-xs">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {servicio.duracion}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-5">
                <p className="text-gold font-black text-2xl mb-1">{servicio.precio}</p>
                <h3 className="text-white font-bold text-lg mb-3 group-hover:text-gold transition-colors duration-300">
                  {servicio.nombre}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  {servicio.descripcion}
                </p>
                <a
                  href="/reservar"
                  className="text-gold text-xs tracking-widest uppercase font-bold hover:text-gold-light transition-colors flex items-center gap-2"
                >
                  Reservar Ahora
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Nota de precios */}
        <p className="text-center text-gray-600 text-xs mt-10 tracking-wider">
          * Precios en colones costarricenses. Pago al asistir.
        </p>

      </div>
    </section>
  );
}
