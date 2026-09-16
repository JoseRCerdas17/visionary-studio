"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type QrData = {
  token: string;
  qr_url: string;
  expira_en: string;
  segundos_validos: number;
};

type BarberoId = "Lobo" | "Ian";

function esCuentaIan(username: string, barbero: string | null) {
  const normalized = username.trim().toLowerCase();
  return barbero === "Ian Bustos Navarrete" || normalized.includes("ian") || normalized === "admin2";
}

export default function BarberoQrPage() {
  const [barbero, setBarbero] = useState<BarberoId | null>(null);
  const [estado, setEstado] = useState<"cargando" | "sin_sesion" | "listo">("cargando");
  const [qr, setQr] = useState<QrData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setEstado("sin_sesion");
      return;
    }
    fetch(`${API}/auth/verificar`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalido");
        return res.json();
      })
      .then((data: { username: string; rol: string; barbero: string | null }) => {
        const id: BarberoId = esCuentaIan(data.username, data.barbero) ? "Ian" : "Lobo";
        setBarbero(id);
        setEstado("listo");
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        setEstado("sin_sesion");
      });
  }, []);

  const loadQr = useCallback(async (barberoActual: BarberoId) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/stamps/qr?barbero=${encodeURIComponent(barberoActual)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo generar el QR");
      const data: QrData = await response.json();
      setQr(data);
      setSecondsLeft(data.segundos_validos);
    } catch {
      setError("No se pudo generar el QR. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!barbero) return;
    setQr(null);
    loadQr(barbero);
  }, [barbero, loadQr]);

  useEffect(() => {
    if (!qr) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => {
        return current <= 0 ? 0 : current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [qr]);

  useEffect(() => {
    if (barbero && qr && secondsLeft === 0 && !loading) {
      loadQr(barbero);
    }
  }, [barbero, loadQr, loading, qr, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0B84C]">
          Visionary Studio
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-widest">
          QR de Sellos
        </h1>

        {estado === "cargando" && (
          <div className="mt-8 aspect-square w-full animate-pulse rounded-[2rem] bg-[#1A1A1A]" />
        )}

        {estado === "sin_sesion" && (
          <>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Inicia sesion con tu cuenta de barbero para generar tu QR de sellos.
            </p>
            <Link
              href="/login"
              className="mt-8 w-full rounded-full bg-[#E0B84C] px-6 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#F0C95A]"
            >
              Iniciar sesion
            </Link>
          </>
        )}

        {estado === "listo" && barbero && (
          <>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Muestra este codigo al cliente. Se renueva automaticamente cada 5 minutos.
            </p>

            <div className="mt-8 w-full rounded-[2rem] border border-[#E0B84C]/30 bg-[#1A1A1A] p-5 shadow-2xl shadow-black/50">
              <div className="rounded-3xl bg-white p-5">
                {qr && !loading ? (
                  <QRCode value={qr.qr_url} className="h-auto w-full" />
                ) : (
                  <div className="aspect-square animate-pulse rounded-2xl bg-black/10" />
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Se renueva en</p>
                <p className="mt-2 text-4xl font-black text-[#E0B84C]">
                  {minutes}:{seconds}
                </p>
              </div>

              {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

              <button
                onClick={() => loadQr(barbero)}
                className="mt-5 w-full rounded-full bg-[#E0B84C] px-6 py-3 text-sm font-bold uppercase tracking-widest text-black transition hover:bg-[#F0C95A]"
              >
                Generar nuevo QR
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
