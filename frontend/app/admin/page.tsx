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
  metodo_pago: string | null;
}

const VISTAS = [
  { id: "lista", label: "Lista" },
  { id: "calendario", label: "Calendario" },
  { id: "ingresos", label: "Ingresos" },
] as const;

const PERIODOS_INGRESOS = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
] as const;

export default function Admin() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"lista" | "calendario" | "ingresos">("lista");
  const [modalReserva, setModalReserva] = useState<Reserva | null>(null);
  const [metodoPago, setMetodoPago] = useState<"sinpe" | "efectivo" | null>(null);
  const [periodoIngresos, setPeriodoIngresos] = useState<"dia" | "semana" | "mes">("dia");
  const router = useRouter();

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/auth/verificar`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) { localStorage.removeItem("admin_token"); router.push("/login"); } });
  }, [API, router]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    fetch(`${API}/reservas/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { setReservas(data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [API]);

  const confirmarPago = async () => {
    if (!modalReserva || !metodoPago) return;
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/${modalReserva.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: "confirmada", metodo_pago: metodoPago }),
    });
    setReservas(reservas.map((r) => r.id === modalReserva.id ? { ...r, estado: "confirmada", metodo_pago: metodoPago } : r));
    setModalReserva(null);
    setMetodoPago(null);
  };

  const cancelarReserva = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setReservas(reservas.filter((r) => r.id !== id));
  };

  const eliminarReserva = async (id: number) => {
    if (!confirm("¿Estás seguro que deseas eliminar esta reserva permanentemente?")) return;
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/eliminar/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setReservas(reservas.filter((r) => r.id !== id));
  };

  const cerrarSesion = () => { localStorage.removeItem("admin_token"); router.push("/login"); };

  const parsearPrecio = (precio: string) => parseInt(precio.replace(/[^0-9]/g, "")) || 0;

  const hoy = new Date();
  const fechaHoy = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;

  const reservasConfirmadas = reservas.filter((r) => r.estado === "confirmada");

  const ingresosHoy = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + parsearPrecio(r.precio), 0);

  const ingresosSemanales = (() => {
    const diasSemana: {[key: string]: number} = {};
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - 6);
    for (let i = 0; i <= 6; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const key = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      diasSemana[key] = reservasConfirmadas
        .filter((r) => r.fecha === key)
        .reduce((t, r) => t + parsearPrecio(r.precio), 0);
    }
    return diasSemana;
  })();

  const ingresosSemanaTotal = Object.values(ingresosSemanales).reduce((a, b) => a + b, 0);

  const ingresosMes = (() => {
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    return reservasConfirmadas
      .filter((r) => {
        const partes = r.fecha.split("/");
        return parseInt(partes[1]) === mesActual && parseInt(partes[2]) === anioActual;
      })
      .reduce((t, r) => t + parsearPrecio(r.precio), 0);
  })();

  const reservasFiltradas = reservas
  .filter((r) => {
    if (filtro === "cancelada") return r.estado === "cancelada";
    if (filtro === "todas") return r.estado !== "cancelada";
    return r.estado === filtro;
  })
  .filter((r) => busqueda === "" ? true :
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.telefono.includes(busqueda) ||
    r.servicio.toLowerCase().includes(busqueda.toLowerCase())
  )
  .slice(0, filtro === "cancelada" ? 5 : undefined);

  const pendientes = reservas.filter((r) => r.estado === "pendiente").length;
  const confirmadas = reservas.filter((r) => r.estado === "confirmada").length;
  const canceladas = reservas.filter((r) => r.estado === "cancelada").length;
  const fechasUnicas = [...new Set(
    reservas
      .filter((r) => r.estado !== "cancelada")
      .map((r) => r.fecha)
  )].sort((a, b) => {
    const parsearFecha = (f: string) => {
      const [dia, mes, anio] = f.split("/");
      return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia)).getTime();
    };
    return parsearFecha(a) - parsearFecha(b);
  });

  return (
    <div className="min-h-screen bg-dark">

      {/* Modal de pago */}
      {modalReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background: "rgba(0,0,0,0.8)"}}>
          <div className="bg-dark-card border border-gold rounded-xl p-8 w-full max-w-md">
            <h3 className="text-white font-black text-xl mb-2">Corte Realizado</h3>
            <p className="text-gray-500 text-sm mb-6">¿Cómo pagó el cliente?</p>

            <div className="bg-dark rounded-xl p-4 mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Resumen</p>
              <p className="text-white font-bold">{modalReserva.nombre}</p>
              <p className="text-gray-500 text-sm">{modalReserva.servicio}</p>
              <p className="text-gold font-black text-xl mt-1">{modalReserva.precio}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => setMetodoPago("sinpe")} className={`p-4 rounded-xl border text-center transition-all duration-300 ${metodoPago === "sinpe" ? "border-gold bg-gold text-black" : "border-dark-border text-white hover:border-gold"}`}>
                <p className="font-black text-lg">📱</p>
                <p className="font-bold text-sm mt-1">SINPE</p>
                <p className="text-xs opacity-70">Móvil</p>
              </button>
              <button onClick={() => setMetodoPago("efectivo")} className={`p-4 rounded-xl border text-center transition-all duration-300 ${metodoPago === "efectivo" ? "border-gold bg-gold text-black" : "border-dark-border text-white hover:border-gold"}`}>
                <p className="font-black text-lg">💵</p>
                <p className="font-bold text-sm mt-1">Efectivo</p>
                <p className="text-xs opacity-70">En mano</p>
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setModalReserva(null); setMetodoPago(null); }} className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl hover:border-gold transition-all">
                Cancelar
              </button>
              <button onClick={confirmarPago} disabled={!metodoPago} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3 disabled:opacity-50">
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-black text-xl uppercase tracking-wider">
            Visionary Studio <span className="text-gold italic">Barber Shop</span>
          </h1>
          <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Panel de Administración</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="btn-outline text-xs uppercase tracking-widest px-4 py-2">Ver Página</Link>
          <button onClick={cerrarSesion} className="btn-gold text-xs uppercase tracking-widest px-4 py-2">Cerrar Sesión</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total Reservas</p>
              <p className="text-white font-black text-3xl">{pendientes + confirmadas}</p>
            </div>
          <div className="bg-dark-card border border-gold rounded-xl p-5">
            <p className="text-gold text-xs uppercase tracking-wider mb-2">Pendientes</p>
            <p className="text-gold font-black text-3xl">{pendientes}</p>
          </div>
          <div className="bg-dark-card border border-green-800 rounded-xl p-5">
            <p className="text-green-400 text-xs uppercase tracking-wider mb-2">Confirmadas</p>
            <p className="text-white font-black text-3xl">{confirmadas}</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Canceladas</p>
            <p className="text-white font-black text-3xl">{canceladas}</p>
          </div>
        </div>

        {/* Vistas */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {VISTAS.map((v) => (
            <button key={v.id} onClick={() => setVista(v.id)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-xl border transition-all duration-300 ${vista === v.id ? "bg-gold text-black border-gold font-bold" : "border-dark-border text-gray-500 hover:border-gold"}`}>
              {v.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-20"><p className="text-gray-500">Cargando...</p></div>
        ) : vista === "ingresos" ? (

          /* Vista Ingresos */
          <div className="flex flex-col gap-6">

            <div className="flex gap-3 mb-2">
              {PERIODOS_INGRESOS.map((p) => (
                <button key={p.id} onClick={() => setPeriodoIngresos(p.id)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-300 ${periodoIngresos === p.id ? "bg-gold text-black border-gold font-bold" : "border-dark-border text-gray-500 hover:border-gold"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {periodoIngresos === "dia" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-card border border-gold rounded-xl p-6 sm:col-span-2">
                  <p className="text-gold text-xs uppercase tracking-wider mb-2">Ingresos de Hoy</p>
                  <p className="text-white font-black text-4xl">₡{ingresosHoy.toLocaleString("es-CR")}</p>
                  <p className="text-gray-500 text-sm mt-2">{reservasConfirmadas.filter((r) => r.fecha === fechaHoy).length} cortes realizados hoy</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SINPE</p>
                    <p className="text-white font-black text-xl">₡{reservasConfirmadas.filter((r) => r.fecha === fechaHoy && r.metodo_pago === "sinpe").reduce((t, r) => t + parsearPrecio(r.precio), 0).toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Efectivo</p>
                    <p className="text-white font-black text-xl">₡{reservasConfirmadas.filter((r) => r.fecha === fechaHoy && r.metodo_pago === "efectivo").reduce((t, r) => t + parsearPrecio(r.precio), 0).toLocaleString("es-CR")}</p>
                  </div>
                </div>
              </div>
            )}

            {periodoIngresos === "semana" && (
              <div className="flex flex-col gap-4">
                <div className="bg-dark-card border border-gold rounded-xl p-6">
                  <p className="text-gold text-xs uppercase tracking-wider mb-2">Total esta semana</p>
                  <p className="text-white font-black text-4xl">₡{ingresosSemanaTotal.toLocaleString("es-CR")}</p>
                </div>
                <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                  {Object.entries(ingresosSemanales).map(([fecha, monto]) => (
                    <div key={fecha} className="flex justify-between items-center px-6 py-4 border-b border-dark-border last:border-0">
                      <p className="text-gray-400 text-sm">{fecha}</p>
                      <p className={`font-bold text-sm ${monto > 0 ? "text-gold" : "text-gray-600"}`}>
                        {monto > 0 ? `₡${monto.toLocaleString("es-CR")}` : "Sin ingresos"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {periodoIngresos === "mes" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-card border border-gold rounded-xl p-6 sm:col-span-2">
                  <p className="text-gold text-xs uppercase tracking-wider mb-2">Ingresos del Mes</p>
                  <p className="text-white font-black text-4xl">₡{ingresosMes.toLocaleString("es-CR")}</p>
                  <p className="text-gray-500 text-sm mt-2">{reservasConfirmadas.filter((r) => { const p = r.fecha.split("/"); return parseInt(p[1]) === hoy.getMonth() + 1; }).length} cortes realizados este mes</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SINPE</p>
                    <p className="text-white font-black text-xl">₡{reservasConfirmadas.filter((r) => { const p = r.fecha.split("/"); return parseInt(p[1]) === hoy.getMonth() + 1 && r.metodo_pago === "sinpe"; }).reduce((t, r) => t + parsearPrecio(r.precio), 0).toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Efectivo</p>
                    <p className="text-white font-black text-xl">₡{reservasConfirmadas.filter((r) => { const p = r.fecha.split("/"); return parseInt(p[1]) === hoy.getMonth() + 1 && r.metodo_pago === "efectivo"; }).reduce((t, r) => t + parsearPrecio(r.precio), 0).toLocaleString("es-CR")}</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        ) : vista === "lista" ? (

          /* Vista Lista */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <input type="text" placeholder="Buscar por nombre, teléfono o servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-dark-card border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors flex-1" />
              <div className="flex gap-2 flex-wrap">
                {["todas", "pendiente", "confirmada", "cancelada"].map((f) => (
                  <button key={f} onClick={() => setFiltro(f)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-300 ${filtro === f ? "bg-gold text-black border-gold font-bold" : "border-dark-border text-gray-500 hover:border-gold"}`}>{f}</button>
                ))}
              </div>
            </div>

            {reservasFiltradas.length === 0 ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
                <p className="text-gray-500">No hay reservas</p>
              </div>
            ) : reservasFiltradas.map((reserva) => (
              <div key={reserva.id} className={`bg-dark-card border rounded-xl p-6 transition-all duration-300 ${reserva.estado === "confirmada" ? "border-green-800" : reserva.estado === "cancelada" ? "border-red-900 opacity-60" : "border-dark-border hover:border-gold"}`}>
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
                    {reserva.metodo_pago && (
                      <span className="text-xs text-gray-500 capitalize">Pago: {reserva.metodo_pago}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha y Hora</p>
                    <p className="text-white font-bold">{reserva.fecha}</p>
                    <p className="text-gray-500 text-sm">{reserva.hora}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full text-center font-bold ${reserva.estado === "pendiente" ? "bg-gold text-black" : reserva.estado === "confirmada" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                      {reserva.estado}
                    </span>
                    {reserva.estado === "pendiente" && (
                      <button onClick={() => setModalReserva(reserva)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all duration-300">
                        Corte Realizado
                      </button>
                    )}
                    {reserva.estado !== "cancelada" && (
                      <button onClick={() => cancelarReserva(reserva.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all duration-300">
                        Cancelar
                      </button>
                    )}
                    {reserva.estado === "cancelada" && (
                      <button onClick={() => eliminarReserva(reserva.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all duration-300">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        ) : (

          
          /* Vista Calendario */
<div className="flex flex-col gap-4">
  {fechasUnicas.length === 0 ? (
    <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
      <p className="text-gray-500">No hay reservas agendadas</p>
    </div>
  ) : fechasUnicas.map((fecha) => {
    const citasDelDia = reservas.filter((r) => r.fecha === fecha && r.estado !== "cancelada");
    if (citasDelDia.length === 0) return null;
    const esHoy = fecha === fechaHoy;
    return (
      <div key={fecha} className={`bg-dark-card rounded-xl overflow-hidden border ${esHoy ? "border-gold" : "border-dark-border"}`}>

        {/* Header del día */}
        <div className={`px-6 py-4 flex items-center justify-between border-b border-dark-border ${esHoy ? "bg-gold/10" : "bg-dark-surface"}`}>
          <div className="flex items-center gap-3">
            {esHoy && <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />}
            <p className={`font-bold text-sm uppercase tracking-wider ${esHoy ? "text-gold" : "text-white"}`}>
              {esHoy ? "HOY — " : ""}{fecha}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs">{citasDelDia.length} cita{citasDelDia.length > 1 ? "s" : ""}</span>
            <span className="text-gold text-xs font-bold">
              ₡{citasDelDia.filter((r) => r.estado === "confirmada").reduce((t, r) => t + parsearPrecio(r.precio), 0).toLocaleString("es-CR")}
            </span>
          </div>
        </div>

        {/* Timeline del día */}
        <div className="divide-y divide-dark-border">
          {citasDelDia.sort((a, b) => a.hora.localeCompare(b.hora)).map((reserva) => (
            <div key={reserva.id} className="px-6 py-4 flex items-center gap-4">

              {/* Hora */}
              <div className="w-16 shrink-0 text-center">
                <p className="text-gold font-black text-sm">{reserva.hora.split(" ")[0]}</p>
                <p className="text-gray-600 text-xs">{reserva.hora.split(" ")[1]}</p>
              </div>

              {/* Línea vertical */}
              <div className={`w-px h-10 shrink-0 ${reserva.estado === "confirmada" ? "bg-green-700" : "bg-gold/40"}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm truncate">{reserva.nombre}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${reserva.estado === "confirmada" ? "bg-green-900 text-green-300" : "bg-gold/20 text-gold"}`}>
                    {reserva.estado}
                  </span>
                </div>
                <p className="text-gray-500 text-xs truncate">{reserva.servicio} · <span className="text-gold">{reserva.precio}</span></p>
                {reserva.metodo_pago && <p className="text-gray-600 text-xs capitalize mt-0.5">Pago: {reserva.metodo_pago}</p>}
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                {reserva.estado === "pendiente" && (
                  <button onClick={() => setModalReserva(reserva)} className="text-xs px-3 py-1.5 rounded-lg border border-green-700 text-green-400 hover:bg-green-900 transition-all">
                    Realizado ✓
                  </button>
                )}
                <button onClick={() => cancelarReserva(reserva.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900 transition-all">
                  ✕
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    );
  })}
</div>
        )}
      </div>
    </div>
  );
}