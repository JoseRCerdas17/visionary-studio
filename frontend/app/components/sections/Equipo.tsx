export default function Equipo() {
    const barberos = [
      { nombre: "Kendall Facey", especialidad: "Master Barbero", experiencia: "15+ años", descripcion: "Barbero con más de 15 años de experiencia en Liberia, Guanacaste.", iniciales: "KF" },
      { nombre: "Aryel López", especialidad: "Especialista en Fades", experiencia: "Barbero experto", descripcion: "Experto en cortes de precisión y técnicas modernas de fade.", iniciales: "AL" },
      { nombre: "Dylan Díaz", especialidad: "Estilista de Barba", experiencia: "Barbero experto", descripcion: "Especialista en diseño y perfilado de barba con técnicas clásicas y modernas.", iniciales: "DD" },
      { nombre: "Alonso Lobo", especialidad: "Cortes Clásicos", experiencia: "Barbero experto", descripcion: "Maestro de los cortes clásicos y contemporáneos con gran atención al detalle.", iniciales: "ALo" },
      { nombre: "Eric Acuña", especialidad: "Tendencias Modernas", experiencia: "Barbero experto", descripcion: "Apasionado por las últimas tendencias en barbería y estilos innovadores.", iniciales: "EA" },
    ];
  
    return (
      <section className="bg-dark section-padding">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">
              ✦ Conoce a los artistas ✦
            </p>
            <h2 className="text-white font-black uppercase text-4xl md:text-5xl mb-4">
              Nuestro <span className="text-gold italic">Equipo</span>
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Barberos expertos seleccionados por su precisión técnica y compromiso con la excelencia.
            </p>
          </div>
  
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {barberos.map((barbero) => (
              <div key={barbero.nombre} className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-gold transition-all duration-300 group">
                <div className="w-20 h-20 rounded-full bg-dark-surface border-2 border-gold flex items-center justify-center mx-auto mb-4 group-hover:bg-gold transition-all duration-300">
                  <span className="text-gold font-black text-xl group-hover:text-black transition-all duration-300">
                    {barbero.iniciales}
                  </span>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-lg mb-1 group-hover:text-gold transition-colors duration-300">
                    {barbero.nombre}
                  </h3>
                  <p className="text-gold text-xs tracking-widest uppercase mb-1">
                    {barbero.especialidad}
                  </p>
                  <p className="text-gray-600 text-xs mb-4">
                    {barbero.experiencia}
                  </p>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {barbero.descripcion}
                  </p>
                </div>
                <div className="mt-6">
                  <a href="/reservar" className="block text-center btn-outline text-xs uppercase tracking-widest py-3">
                    Reservar ahora
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }