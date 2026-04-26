"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CancelarCita() {
  const [estado, setEstado] = useState<"cargando" | "exito" | "error" | "ya_cancelada">("cargando");
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!id) { setEstado("error"); return; }
    fetch(`${API}/reservas/cancelar/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message === "Reserva cancelada exitosamente") setEstado("exito");
        else if (data.message === "La reserva ya fue cancelada") setEstado("ya_cancelada");
        else setEstado("error");
      })
      .catch(() => setEstado("error"));
  }, [id, API]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="bg-dark-card border border-dark-border rounded-xl p-8 max-w-md w-full text-center">

        {estado === "cargando" && (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-gold border-t-transparent animate-spin mx-auto mb-6" />
            <p className="text-gray-500 text-sm">Procesando tu solicitud...</p>
          </>
        )}

        {estado === "exito" && (
          <>
            <div className="w-16 h-16 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h1 className="text-white font-black text-2xl uppercase mb-2" style={{fontFamily: "Georgia, serif"}}>
              Cita <span className="text-gold">Cancelada</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Tu cita ha sido cancelada exitosamente. El horario quedará disponible para otros clientes.
            </p>
            <div className="bg-dark rounded-xl p-4 mb-8 border border-dark-border">
              <p className="text-gray-500 text-xs leading-relaxed">
                Si deseas reagendar tu cita puedes hacerlo en cualquier momento desde nuestra página web o contactándonos por WhatsApp.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/reservar" className="btn-gold w-full uppercase tracking-widest text-sm py-3 block text-center">
                Agendar Nueva Cita
              </Link>
              <a href="https://wa.me/50662009558" target="_blank" className="btn-outline w-full uppercase tracking-widest text-sm py-3 block text-center">
                Contactar por WhatsApp
              </a>
              <Link href="/" className="text-gray-600 text-xs uppercase tracking-wider hover:text-gold transition-colors">
                Volver al inicio
              </Link>
            </div>
          </>
        )}

        {estado === "ya_cancelada" && (
          <>
            <div className="w-16 h-16 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">ℹ️</span>
            </div>
            <h1 className="text-white font-black text-2xl uppercase mb-2" style={{fontFamily: "Georgia, serif"}}>
              Ya <span className="text-gold">Cancelada</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Esta cita ya fue cancelada anteriormente.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/reservar" className="btn-gold w-full uppercase tracking-widest text-sm py-3 block text-center">
                Agendar Nueva Cita
              </Link>
              <Link href="/" className="text-gray-600 text-xs uppercase tracking-wider hover:text-gold transition-colors">
                Volver al inicio
              </Link>
            </div>
          </>
        )}

        {estado === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-dark-surface border border-red-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✕</span>
            </div>
            <h1 className="text-white font-black text-2xl uppercase mb-2" style={{fontFamily: "Georgia, serif"}}>
              Error
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              No pudimos procesar tu solicitud. Por favor contáctanos directamente por WhatsApp.
            </p>
            <div className="flex flex-col gap-3">
              <a href="https://wa.me/50662009558" target="_blank" className="btn-gold w-full uppercase tracking-widest text-sm py-3 block text-center">
                Contactar por WhatsApp
              </a>
              <Link href="/" className="text-gray-600 text-xs uppercase tracking-wider hover:text-gold transition-colors">
                Volver al inicio
              </Link>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-dark-border">
          <p className="text-gold font-black text-sm tracking-widest uppercase">Visionary Studio</p>
          <p className="text-gray-600 text-xs mt-1">Barber Shop · Liberia, Guanacaste</p>
        </div>

      </div>
    </div>
  );
}