import PlanesClub from "../club/PlanesClub";

export default function VisionaryClub() {
  return (
    <section id="club" className="bg-dark section-padding border-t border-dark-border">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <p className="text-gold text-xs tracking-[4px] uppercase mb-4">Exclusivo</p>
          <h2 className="text-white font-black uppercase leading-none text-4xl md:text-5xl">
            💎 Visionary Club
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mt-4 leading-relaxed">
            Membresías exclusivas para clientes frecuentes
          </p>
        </div>

        <PlanesClub showCta showSteps />
      </div>
    </section>
  );
}
