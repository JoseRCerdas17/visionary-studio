import Image from "next/image";

export default function Equipo() {
  return (
    <section id="equipo" className="bg-dark section-padding">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Columna Barbero */}
          <div>
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">
              Conoce al artista
            </p>
            <h2 className="text-white font-black uppercase text-4xl md:text-5xl mb-4">
              El Maestro
            </h2>
            <p className="text-gray-500 text-sm mb-10 max-w-md leading-relaxed">
            Barbero con más de 5 años de experiencia, especializado en cortes modernos, clásicos y freestyle.
            Carisma en el trato, precisión en cada detalle.
            Joven emprendedor y visionario, enfocado en ofrecer que cada corte destaque.
            </p>

            {/* Foto */}
<div className="relative w-100 aspect-square rounded-xl overflow-hidden border border-dark-border group">
  <Image
    src="/lobo2.jpeg"
    alt="Alonso Lobo"
    fill
    className="object-cover transition-transform duration-500 group-hover:scale-105"
  />
</div>

{/* Nombre y cargo debajo de la foto */}
<div className="mt-4 mb-4">
  <h3 className="text-white font-black text-xl mb-1">
    Alonso <span className="text-gold">&quot;Lobo&quot;</span> Lobo
  </h3>
  <p className="text-gold text-xs tracking-wider uppercase">Owner & Master Barber</p>
</div>

<a href="/reservar" className="btn-gold w-full text-center uppercase tracking-widest text-sm py-4 block mb-6">
  Reservar con Lobo
</a>

{/* Stats */}
<div className="grid grid-cols-3 gap-4">
  <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-center">
    <p className="text-gold font-black text-2xl">5+</p>
    <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Años</p>
  </div>
  <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-center">
    <p className="text-gold font-black text-2xl">100%</p>
    <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Dedicación</p>
  </div>
  <div className="bg-dark-card border border-dark-border rounded-lg p-4 text-center">
    <p className="text-gold font-black text-2xl">4</p>
    <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Servicios</p>
  </div>
</div>
          </div>

          {/* Columna Opiniones */}
          <div>
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">
              Lo que dicen
            </p>
            <h2 className="text-white font-black uppercase text-4xl md:text-5xl mb-8">
              Voces de Distinción
            </h2>

            <div className="bg-dark-card border border-dark-border rounded-xl p-6 md:p-8">
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                La satisfacción de nuestros clientes es el único estándar que aceptamos.
                Las opiniones se irán agregando conforme crezca nuestra comunidad.
              </p>

              {/* Espacio vacío con mensaje */}
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-dark-border rounded-lg">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-6 h-6 text-dark-border" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm text-center max-w-xs leading-relaxed">
                  Las primeras opiniones de nuestros clientes aparecerán aquí muy pronto.
                </p>
              </div>

              {/* Llamado a dejar opinión */}
              <div className="mt-6 pt-6 border-t border-dark-border text-center">
                <p className="text-gray-500 text-xs mb-3">¿Ya visitaste Visionary Studio?</p>
                <a href="https://wa.me/50662009558" target="_blank" className="text-gold text-xs uppercase tracking-widest font-bold hover:text-gold-light transition-colors duration-300 border-b border-gold pb-0.5">
                  Comparte tu experiencia por WhatsApp →
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}