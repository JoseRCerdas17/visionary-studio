"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type StampCard = {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  barbero: string;
  barbero_inicial: string;
  total_cortes: number;
  descuento_porcentaje: number;
  descuento_texto: string;
};

function BarberoBadge({ inicial }: { inicial: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E0B84C] text-sm font-black text-black">
      {inicial}
    </span>
  );
}

function StampGrid({ total }: { total: number }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: 10 }, (_, index) => {
        const filled = index < total;
        return (
          <div
            key={index}
            className={`flex aspect-square items-center justify-center rounded-full border text-xl font-black ${
              filled
                ? "border-[#E0B84C] bg-[#E0B84C] text-black"
                : "border-white/15 bg-white/5 text-white/25"
            }`}
          >
            {filled ? "✂️" : index + 1}
          </div>
        );
      })}
    </div>
  );
}

export default function StampRedeemPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [card, setCard] = useState<StampCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNombre(localStorage.getItem("stamp_nombre") || localStorage.getItem("cliente_nombre") || "");
    setTelefono(localStorage.getItem("stamp_telefono") || localStorage.getItem("cliente_telefono") || "");
  }, []);

  const redeem = async () => {
    if (!telefono.trim()) {
      setError("Completa tu telefono.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/stamps/canjear/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), telefono: telefono.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "No se pudo canjear el sello");
      localStorage.setItem("stamp_nombre", nombre.trim());
      localStorage.setItem("stamp_telefono", telefono.trim());
      setCard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR vencido, pide uno nuevo al barbero");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-5 py-8 text-white">
      <section className="mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#E0B84C]">
          Tarjeta de sellos
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-widest">
          {card ? "Sello agregado" : "Canjear sello"}
        </h1>

        {!card ? (
          <div className="mt-8 rounded-[2rem] border border-[#E0B84C]/25 bg-[#1A1A1A] p-5">
            <p className="text-sm leading-6 text-white/70">
              Ingresa tu telefono. Si es tu primera vez, agrega tambien tu nombre.
            </p>

            <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-white/60">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#E0B84C]"
              placeholder="Tu nombre (primera vez)"
            />

            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-white/60">
              Telefono
            </label>
            <input
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-[#E0B84C]"
              inputMode="tel"
              placeholder="Ej: 62009558"
            />

            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

            <button
              onClick={redeem}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-[#E0B84C] px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-[#F0C95A] disabled:opacity-60"
            >
              {loading ? "Canjeando..." : "Agregar sello"}
            </button>
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-[#E0B84C]/25 bg-[#1A1A1A] p-5">
            <div className="rounded-3xl bg-black/35 p-5 text-center">
              <div className="flex items-center justify-center gap-2">
                <BarberoBadge inicial={card.barbero_inicial} />
                <p className="text-sm text-white/60">Tarjeta con {card.barbero}</p>
              </div>
              <p className="mt-2 text-sm text-white/60">{card.cliente_nombre}</p>
              <p className="mt-2 text-5xl font-black text-[#E0B84C]">{card.total_cortes}/10</p>
              <p className="mt-2 text-sm font-bold uppercase tracking-widest text-white">
                {card.descuento_texto}
              </p>
            </div>
            <div className="mt-6">
              <StampGrid total={card.total_cortes} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
