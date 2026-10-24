"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Miembro = {
  id: number;
  nombre: string;
  telefono: string;
  plan_nombre: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  balance: { cortes: number; barbas: number; mascarilla: number };
  error?: string;
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

export default function ClubQrPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();

  const [miembro, setMiembro] = useState<Miembro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const response = await fetch(`${API}/club/qr/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || "QR inválido");
      setMiembro(data as Miembro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR inválido");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const registrar = async (servicio: string) => {
    if (!miembro) return;
    setProcesando(servicio);
    setError("");
    setMensaje("");
    try {
      const response = await fetch(`${API}/club/miembros/${miembro.id}/consumo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ servicio }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || "No se pudo registrar el consumo");
      setMiembro(data as Miembro);
      setMensaje(`${servicio === "corte" ? "Corte" : servicio === "barba" ? "Barba" : "Mascarilla"} registrado correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el consumo");
    } finally {
      setProcesando(null);
    }
  };

  if (cargando) {
    return <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white">Cargando miembro...</main>;
  }

  if (error && !miembro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A0A0A] px-5 text-white">
        <div className="text-center">
          <p className="text-4xl">💎</p>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-widest">QR no encontrado</h1>
          <p className="mt-2 text-sm text-white/60">{error}</p>
        </div>
      </main>
    );
  }

  const bloquear = !miembro || miembro.estado !== "activo";

  return (
    <main className="relative min-h-screen bg-[#0A0A0A] px-5 py-8 text-white">
      <button
        onClick={() => router.back()}
        aria-label="Cerrar"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#E0B84C] text-lg font-bold text-[#E0B84C] transition hover:bg-[#E0B84C] hover:text-black"
      >
        ✕
      </button>
      <section className="mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0B84C]">Visionary Studio</p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-widest">Registrar servicios</h1>

        {miembro && (
          <div className="mt-8 rounded-[2rem] border border-[#E0B84C]/30 bg-[#1A1A1A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-black">{miembro.nombre}</p>
                <p className="text-sm text-white/60">{miembro.telefono}</p>
                <p className="mt-1 text-sm font-bold text-[#E0B84C]">{miembro.plan_nombre || "—"}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                  miembro.estado === "activo" ? "bg-[#E0B84C] text-black" : "bg-red-900 text-red-300"
                }`}
              >
                {ESTADO_LABEL[miembro.estado] || miembro.estado}
              </span>
            </div>

            <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Vigencia</p>
            <p className="text-sm text-white/80">
              {formatearFecha(miembro.fecha_inicio)} → {formatearFecha(miembro.fecha_vencimiento)}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 p-4 text-center">
                <p className="text-xl">✂️</p>
                <p className="mt-1 text-2xl font-black text-[#E0B84C]">{miembro.balance.cortes}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Cortes</p>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 text-center">
                <p className="text-xl">🪒</p>
                <p className="mt-1 text-2xl font-black text-[#E0B84C]">{miembro.balance.barbas}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Barbas</p>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 text-center">
                <p className="text-xl">🧖</p>
                <p className="mt-1 text-2xl font-black text-[#E0B84C]">{miembro.balance.mascarilla}</p>
                <p className="text-xs uppercase tracking-widest text-white/50">Mascarilla</p>
              </div>
            </div>

            {bloquear ? (
              <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-center">
                <p className="text-sm font-bold text-red-300">
                  {miembro.estado === "vencido"
                    ? "La membresía está vencida."
                    : miembro.estado === "suspendido"
                    ? "La membresía está suspendida."
                    : "La membresía no está activa."}
                </p>
                <p className="mt-1 text-xs text-red-300/70">No se pueden registrar servicios.</p>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => registrar("corte")}
                  disabled={miembro.balance.cortes <= 0 || procesando !== null}
                  className="w-full rounded-full bg-[#E0B84C] px-6 py-3 text-sm font-black uppercase tracking-widest text-black transition hover:bg-[#F0C95A] disabled:opacity-40"
                >
                  {procesando === "corte" ? "Registrando..." : "Registrar Corte"}
                </button>
                <button
                  onClick={() => registrar("barba")}
                  disabled={miembro.balance.barbas <= 0 || procesando !== null}
                  className="w-full rounded-full border border-[#E0B84C] px-6 py-3 text-sm font-black uppercase tracking-widest text-[#E0B84C] transition hover:bg-[#E0B84C] hover:text-black disabled:opacity-40"
                >
                  {procesando === "barba" ? "Registrando..." : "Registrar Barba"}
                </button>
                <button
                  onClick={() => registrar("mascarilla")}
                  disabled={miembro.balance.mascarilla <= 0 || procesando !== null}
                  className="w-full rounded-full border border-white/15 px-6 py-3 text-sm font-black uppercase tracking-widest text-white/70 transition hover:border-[#E0B84C] hover:text-[#E0B84C] disabled:opacity-40"
                >
                  {procesando === "mascarilla" ? "Registrando..." : "Registrar Mascarilla"}
                </button>
              </div>
            )}

            {mensaje && <p className="mt-4 rounded-2xl bg-green-950/40 p-3 text-sm font-bold text-green-300">{mensaje}</p>}
            {error && <p className="mt-4 rounded-2xl bg-red-950/40 p-3 text-sm font-bold text-red-300">{error}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
