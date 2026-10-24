"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tarjeta = {
  id: number;
  nombre: string;
  telefono: string;
  plan_nombre: string | null;
  plan_precio: number | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  qr_token: string | null;
  balance: {
    cortes: number;
    barbas: number;
    mascarilla: number;
  };
  pagos?: { monto: number; metodo: string; fecha: string | null }[];
};

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activa",
  pendiente: "Pendiente",
  vencido: "Vencida",
  suspendido: "Suspendida",
};

function formatearFecha(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

export default function ClubPage() {
  const [telefono, setTelefono] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const guardado = localStorage.getItem("club_telefono");
    if (guardado) {
      setTelefono(guardado);
      buscar(guardado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = async (tel?: string) => {
    const valor = (tel ?? telefono).trim();
    if (!valor) return;
    setBuscando(true);
    setError("");
    try {
      const response = await fetch(`${API}/club/tarjeta/${encodeURIComponent(valor)}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setTarjeta(null);
        setError("No tienes una membresía activa. Visítanos en Visionary Studio.");
        return;
      }
      localStorage.setItem("club_telefono", valor);
      setTarjeta(data as Tarjeta);
    } catch {
      setTarjeta(null);
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  };

  const salir = () => {
    localStorage.removeItem("club_telefono");
    setTarjeta(null);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-5 py-8 text-white">
      <section className="mx-auto max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0B84C]">Visionary Studio</p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-widest">💎 Visionary Club</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Consulta tu tarjeta de miembro, tu balance de servicios y tu código QR.
          </p>
        </div>

        {!tarjeta ? (
          <div className="mt-8 rounded-[2rem] border border-[#E0B84C]/25 bg-[#1A1A1A] p-5">
            <label className="text-xs font-bold uppercase tracking-widest text-white/60">Número de teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              inputMode="tel"
              placeholder="8888-8888"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#E0B84C]"
            />
            {error && <p className="mt-4 text-sm text-[#E0B84C]">{error}</p>}
            <button
              onClick={() => buscar()}
              disabled={buscando || !telefono.trim()}
              className="mt-6 w-full rounded-full bg-[#E0B84C] px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-[#F0C95A] disabled:opacity-50"
            >
              {buscando ? "Buscando..." : "Ver mi tarjeta"}
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <div className="rounded-[2rem] border border-[#E0B84C]/30 bg-[#1A1A1A] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50">Miembro</p>
                  <p className="text-xl font-black">{tarjeta.nombre}</p>
                  <p className="text-sm text-white/60">{tarjeta.telefono}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                    tarjeta.estado === "activo"
                      ? "bg-[#E0B84C] text-black"
                      : tarjeta.estado === "vencido"
                      ? "bg-red-900 text-red-300"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  {ESTADO_LABEL[tarjeta.estado] || tarjeta.estado}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-black/30 p-4">
                <p className="text-xs uppercase tracking-widest text-white/50">Plan</p>
                <p className="text-lg font-black text-[#E0B84C]">{tarjeta.plan_nombre || "—"}</p>
                <p className="mt-3 text-xs uppercase tracking-widest text-white/50">Vigencia</p>
                <p className="text-sm text-white/80">
                  {formatearFecha(tarjeta.fecha_inicio)} → {formatearFecha(tarjeta.fecha_vencimiento)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 text-center">
                <p className="text-2xl">✂️</p>
                <p className="mt-1 text-3xl font-black text-[#E0B84C]">{tarjeta.balance.cortes}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Cortes</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 text-center">
                <p className="text-2xl">🪒</p>
                <p className="mt-1 text-3xl font-black text-[#E0B84C]">{tarjeta.balance.barbas}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Barbas</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 text-center">
                <p className="text-2xl">🧖</p>
                <p className="mt-1 text-3xl font-black text-[#E0B84C]">{tarjeta.balance.mascarilla}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Mascarilla</p>
              </div>
            </div>

            {tarjeta.pagos && tarjeta.pagos.length > 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-[#1A1A1A] p-6">
                <p className="text-xs uppercase tracking-widest text-white/50">Historial de pagos</p>
                <div className="mt-3 flex flex-col gap-2">
                  {tarjeta.pagos.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{p.fecha ? formatearFecha(p.fecha) : "—"} · {p.metodo}</span>
                      <span className="font-black text-[#E0B84C]">₡{p.monto.toLocaleString("es-CR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tarjeta.qr_token && (
              <div className="rounded-[2rem] border border-[#E0B84C]/30 bg-[#1A1A1A] p-6 text-center">
                <p className="text-xs uppercase tracking-widest text-white/50">Tu código QR</p>
                <div className="mx-auto mt-4 w-full max-w-[240px] rounded-2xl bg-white p-4">
                  <QRCode value={`${window.location.origin}/club/qr/${tarjeta.qr_token}`} className="h-auto w-full" />
                </div>
                <p className="mt-3 text-xs text-white/50">Muéstralo en recepción para registrar tus servicios.</p>
              </div>
            )}

            <button
              onClick={salir}
              className="rounded-full border border-white/15 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/60 transition hover:border-[#E0B84C] hover:text-[#E0B84C]"
            >
              Cerrar sesión de tarjeta
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs uppercase tracking-widest text-[#E0B84C]">
            ← Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
