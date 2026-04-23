"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Reserva {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  barbero: string;
  servicio: string;
  precio: string;
  fecha: string;
  hora: string;
  estado: string;
}

export default function Admin() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`${API}/auth/verificar`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) {
        localStorage.removeItem("admin_token");
        router.push("/login");
      }
    });
  }, [API, router]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    fetch(`${API}/reservas/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setReservas(data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [API]);

  const cancelarReserva = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setReservas(reservas.map((r) => r.id === id ? { ...r, estado: "cancelada" } : r));
  };

  const cerrarSesion = () => {
    localStorage.removeItem("admin_token");
    router.push("/login");
  };

  const reservasFiltradas = reservas.filter((r) => {
    if (filtro === "todas") return true;
    return r.estado === filtro;
  });

  const pendientes = reservas.filter((r) => r.estado === "pendiente").length;
  const canceladas = reservas.filter((r) => r.estado === "cancelada").length;

  return (
    <div className="min-h-screen bg-dark">

      <div className="bg-dark-card border-b border-dark-border px-6 py-4 flex items-center justify-between">
        <div>
          <div>
            <span className="text-white font-black text-xl tracking-widest uppercase">Visionary Studio</span>
            <span className="text-gold font-black text-xl italic tracking-widest uppercase"> Barber Shop</span>
          </div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Panel de Administración</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="btn-outline text-xs uppercase tracking-widest px-4 py-2">
            Ver Página
          </Link>
          <button onClick={cerrarSesion} className="btn-gold text-xs uppercase tracking-widest px-4 py-2">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total Reservas</p>
            <p className="text-white font-black text-3xl">{reservas.length}</p>
          </div>
          <div className="bg-dark-card border border-gold rounded-lg p-6">
            <p className="text-gold text-xs uppercase tracking-wider mb-2">Pendientes</p>
            <p className="text-gold font-black text-3xl">{pendientes}</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Canceladas</p>
            <p className="text-white font-black text-3xl">{canceladas}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          {["todas", "pendiente", "confirmada", "cancelada"].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded border transition-all duration-300 ${filtro === f ? "bg-gold text-black border-gold font-bold" : "border-dark-border text-gray-500 hover:border-gold hover:text-gold"}`}>
              {f}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Cargando reservas...</p>
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <div className="text-center py-20 bg-dark-card border border-dark-border rounded-lg">
            <p className="text-gray-500">No hay reservas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reservasFiltradas.map((reserva) => (
              <div key={reserva.id} className="bg-dark-card border border-dark-border rounded-lg p-6 hover:border-gold transition-all duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Cliente</p>
                    <p className="text-white font-bold">{reserva.nombre}</p>
                    <p className="text-gray-500 text-sm">{reserva.telefono}</p>
                    <p className="text-gray-500 text-sm">{reserva.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Servicio</p>
                    <p className="text-white font-bold">{reserva.servicio}</p>
                    <p className="text-gold text-sm font-bold">{reserva.precio}</p>
                    <p className="text-gray-500 text-sm">Barbero: {reserva.barbero}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha y Hora</p>
                    <p className="text-white font-bold">{reserva.fecha}</p>
                    <p className="text-gray-500 text-sm">{reserva.hora}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded text-center font-bold ${reserva.estado === "pendiente" ? "bg-gold text-black" : reserva.estado === "cancelada" ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}>
                      {reserva.estado}
                    </span>
                    {reserva.estado !== "cancelada" && (
                      <button onClick={() => cancelarReserva(reserva.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900 transition-all duration-300">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
