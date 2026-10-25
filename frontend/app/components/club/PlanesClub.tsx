"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type PlanPublico = {
  id: number;
  nombre: string;
  precio: number;
  servicios: {
    cortes: number;
    barbas: number;
    mascarilla: boolean;
  };
};

const DESCRIPCIONES: Record<string, string> = {
  Essential: "Lo esencial para mantener tu corte al día todos los meses.",
  Grooming: "Corte y barba en un solo plan para un estilo completo y cuidado.",
  Premium: "El plan completo para clientes frecuentes que lo quieren todo.",
  Student: "Pensado para estudiantes que quieren verse bien sin gastar de más.",
  "Visionary Black": "Acceso exclusivo con cupo limitado para los más leales.",
  "Visionary Friends 5": "Membresía grupal para compartir con tus amigos.",
};

const PASOS = [
  "Visita Visionary Studio y pregunta por tu membresía",
  "Lobo registra tu pago y activa tu membresía",
  "Accede a tu tarjeta en visionarystudiobarbershop.com/club",
  "Muestra tu QR en cada visita para registrar tu servicio",
];

function descripcionPlan(nombre: string) {
  return DESCRIPCIONES[nombre] ?? "Membresía mensual de Visionary Club con servicios incluidos.";
}

function formatearPrecio(precio: number) {
  return `₡${precio.toLocaleString("es-CR")}`;
}

type PlanesClubProps = {
  showCta?: boolean;
  showSteps?: boolean;
};

export default function PlanesClub({ showCta = true, showSteps = true }: PlanesClubProps) {
  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    fetch(`${API}/club/planes/publico`)
      .then((r) => r.json())
      .then((data) => {
        if (activo) setPlanes(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div>
      {cargando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-dark-card border border-dark-border" />
          ))}
        </div>
      ) : planes.length === 0 ? (
        <p className="text-center text-gray-500 text-sm">
          Próximamente publicaremos nuestras membresías.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {planes.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-dark-border bg-dark-card p-6 transition-colors duration-300 hover:border-gold"
              >
                <h3 className="text-white font-black text-xl uppercase tracking-wide">{plan.nombre}</h3>
                <p className="mt-3 text-3xl font-black text-gold">
                  {formatearPrecio(plan.precio)}
                  <span className="ml-1 text-sm font-bold text-gray-500">/ mes</span>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{descripcionPlan(plan.nombre)}</p>

                <ul className="mt-5 flex flex-1 flex-col gap-2 border-t border-dark-border pt-5 text-sm text-gray-300">
                  <li>✂️ {plan.servicios.cortes} {plan.servicios.cortes === 1 ? "corte" : "cortes"} al mes</li>
                  {plan.servicios.barbas > 0 && (
                    <li>
                      🪒 {plan.servicios.barbas} {plan.servicios.barbas === 1 ? "barba" : "barbas"} al mes
                    </li>
                  )}
                  {plan.servicios.mascarilla && <li>🧖 Mascarilla facial de cortesía</li>}
                  <li>💎 Tarjeta digital con código QR</li>
                </ul>
              </div>
            ))}
          </div>

          {showSteps && (
            <div className="mt-12 rounded-2xl border border-dark-border bg-dark-card p-6 md:p-8">
              <h3 className="text-center text-white font-black uppercase tracking-widest text-lg md:text-xl">
                ¿Cómo funciona?
              </h3>
              <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PASOS.map((paso, i) => (
                  <li key={i} className="flex flex-col items-center text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-black text-black">
                      {i + 1}
                    </span>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">{paso}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {showCta && (
            <div className="mt-10 text-center">
              <Link
                href="/club"
                className="btn-gold inline-block uppercase tracking-widest text-sm px-10 py-4"
              >
                Ver mi tarjeta
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
