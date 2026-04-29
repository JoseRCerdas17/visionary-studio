"use client";

import { useState, useEffect, useCallback } from "react";
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

const HORARIOS = [
  "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "1:00 PM", "1:30 PM", "2:00 PM", "3:00 PM", "3:30 PM",
  "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
];

export default function Admin() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"lista" | "calendario" | "ingresos">("lista");
  const [modalReserva, setModalReserva] = useState<Reserva | null>(null);
  const [metodoPago, setMetodoPago] = useState<"sinpe" | "efectivo" | null>(null);
  const [periodoIngresos, setPeriodoIngresos] = useState<"dia" | "semana" | "mes">("dia");
  const [procesandoHorario, setProcesandoHorario] = useState<string | null>(null);
  const [procesandoMasivo, setProcesandoMasivo] = useState<"bloquear" | "desbloquear" | null>(null);
  const router = useRouter();
  const [fechaCalendarioAdmin, setFechaCalendarioAdmin] = useState<string>("");
  const [mesCalendario, setMesCalendario] = useState(new Date());

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const cargarReservas = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const res = await fetch(`${API}/reservas/`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReservas(Array.isArray(data) ? data : []);
  }, [API]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/auth/verificar`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!res.ok) { localStorage.removeItem("admin_token"); router.push("/login"); } });
  }, [API, router]);

  useEffect(() => {
    cargarReservas()
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, [cargarReservas]);

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

  const bloquearHorario = async (hora: string) => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setProcesandoHorario(hora);
    try {
      const res = await fetch(`${API}/reservas/bloqueos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fecha: fechaCalendarioAdmin, hora }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        alert(error?.detail || "No se pudo bloquear el horario");
        return;
      }
      const nuevoBloqueo = await res.json();
      setReservas((prev) => [...prev, nuevoBloqueo]);
    } finally {
      setProcesandoHorario(null);
    }
  };

  const desbloquearHorario = async (hora: string) => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setProcesandoHorario(hora);
    try {
      const res = await fetch(`${API}/reservas/bloqueos?fecha=${encodeURIComponent(fechaCalendarioAdmin)}&hora=${encodeURIComponent(hora)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        alert(error?.detail || "No se pudo desbloquear el horario");
        return;
      }
      setReservas((prev) => prev.filter((r) => !(r.fecha === fechaCalendarioAdmin && r.hora === hora && r.estado === "bloqueado")));
    } finally {
      setProcesandoHorario(null);
    }
  };

  const bloquearDiaCompleto = async () => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const horasDisponibles = HORARIOS.filter(
      (hora) => !horariosReservadosDelDia.has(hora) && !horariosBloqueadosDelDia.has(hora),
    );
    if (horasDisponibles.length === 0) return;
    setProcesandoMasivo("bloquear");
    try {
      await Promise.all(
        horasDisponibles.map((hora) =>
          fetch(`${API}/reservas/bloqueos`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fecha: fechaCalendarioAdmin, hora }),
          }),
        ),
      );
      await cargarReservas();
    } catch {
      alert("No se pudo bloquear todo el día");
    } finally {
      setProcesandoMasivo(null);
    }
  };

  const desbloquearDiaCompleto = async () => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const horasBloqueadas = HORARIOS.filter((hora) => horariosBloqueadosDelDia.has(hora));
    if (horasBloqueadas.length === 0) return;
    setProcesandoMasivo("desbloquear");
    try {
      await Promise.all(
        horasBloqueadas.map((hora) =>
          fetch(`${API}/reservas/bloqueos?fecha=${encodeURIComponent(fechaCalendarioAdmin)}&hora=${encodeURIComponent(hora)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      await cargarReservas();
    } catch {
      alert("No se pudo desbloquear todo el día");
    } finally {
      setProcesandoMasivo(null);
    }
  };

  const parsearPrecio = (precio: string) => parseInt(precio.replace(/[^0-9]/g, "")) || 0;

  const hoy = new Date();
  const fechaHoy = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;

  const reservasActivas = reservas.filter((r) => r.estado !== "cancelada" && r.estado !== "bloqueado");
  const reservasConfirmadas = reservasActivas.filter((r) => r.estado === "confirmada");

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

  const reservasFiltradas = reservasActivas
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
  .sort((a, b) => {
    const parsearFecha = (fecha: string, hora: string) => {
      const [dia, mes, anio] = fecha.split("/");
      const partes = hora.split(" ");
      const tiempo = partes[0].split(":");
      let h = parseInt(tiempo[0]);
      const m = parseInt(tiempo[1]);
      if (partes[1] === "PM" && h !== 12) h += 12;
      if (partes[1] === "AM" && h === 12) h = 0;
      return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), h, m).getTime();
    };
    return parsearFecha(a.fecha, a.hora) - parsearFecha(b.fecha, b.hora);
  })
  
  .slice(0, filtro === "cancelada" ? 5 : undefined);

  const pendientes = reservasActivas.filter((r) => r.estado === "pendiente").length;
  const confirmadas = reservasActivas.filter((r) => r.estado === "confirmada").length;
  const canceladas = reservas.filter((r) => r.estado === "cancelada").length;
  const obtenerDiaSemana = (fecha: string) => {
    const [dia, mes, anio] = fecha.split("/");
    const date = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    return dias[date.getDay()];
  };

  const reservasDelDia = reservas.filter((r) => r.fecha === fechaCalendarioAdmin && r.estado !== "cancelada" && r.estado !== "bloqueado");
  const horariosBloqueadosDelDia = new Set(
    reservas
      .filter((r) => r.fecha === fechaCalendarioAdmin && r.estado === "bloqueado")
      .map((r) => r.hora),
  );
  const horariosReservadosDelDia = new Set(
    reservasDelDia.map((r) => r.hora),
  );
  const horariosDisponiblesParaBloquear = HORARIOS.filter(
    (hora) => !horariosReservadosDelDia.has(hora) && !horariosBloqueadosDelDia.has(hora),
  );

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
                    <p className="text-white font-bold">{obtenerDiaSemana(reserva.fecha)}, {reserva.fecha}</p>
                    <p className="text-gray-500 text-sm">{reserva.hora}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full text-center font-bold ${reserva.estado === "pendiente" ? "bg-gold text-black" : reserva.estado === "confirmada" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                      {reserva.estado}
                    </span>
                    <a href={`https://wa.me/506${reserva.telefono.replace(/[^0-9]/g, "")}`} target="_blank" className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all duration-300 text-center">
                        WhatsApp
                      </a>
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
<div className="flex flex-col gap-6">
  <div className="bg-dark-card border border-dark-border rounded-xl p-6">
  <div className="flex items-center justify-between mb-4">
  <button onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1, 1))} className="text-gold hover:text-white transition-colors px-2 py-1 text-lg">
    ←
  </button>
  <p className="text-gold text-xs tracking-[3px] uppercase">
    {mesCalendario.toLocaleDateString("es-CR", { month: "long", year: "numeric" })}
  </p>
  <button onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 1))} className="text-gold hover:text-white transition-colors px-2 py-1 text-lg">
    →
  </button>
</div>
    <div className="grid grid-cols-7 gap-1 mb-4">
      {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
        <p key={d} className="text-gray-600 text-xs text-center uppercase tracking-wider py-2">{d}</p>
      ))}
      {(() => {
       const hoyDate = new Date();
       const primerDia = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1);
       const ultimoDia = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0);
        const diasVacios = Array(primerDia.getDay()).fill(null);
        const dias = Array.from({ length: ultimoDia.getDate() }, (_, i) => i + 1);
        const fechasConReservas = new Set(
          reservas
            .filter((r) => r.estado !== "cancelada" && r.estado !== "bloqueado")
            .map((r) => r.fecha)
        );

        return [...diasVacios, ...dias].map((dia, idx) => {
          if (!dia) return <div key={`empty-${idx}`} />;
          const fechaStr = `${dia}/${mesCalendario.getMonth() + 1}/${mesCalendario.getFullYear()}`;
          const tieneReservas = fechasConReservas.has(fechaStr);
          const esSeleccionada = fechaCalendarioAdmin === fechaStr;
          const esHoyAdmin = dia === hoyDate.getDate() && mesCalendario.getMonth() === hoyDate.getMonth() && mesCalendario.getFullYear() === hoyDate.getFullYear();

          return (
            <button
              key={dia}
              onClick={() => setFechaCalendarioAdmin(fechaStr)}
              className={`aspect-square rounded-lg text-xs font-bold transition-all duration-300 relative ${
                esSeleccionada
                  ? "bg-gold text-black"
                  : esHoyAdmin
                  ? "border border-gold text-gold"
                  : tieneReservas
                  ? "bg-dark-surface text-white hover:border-gold border border-dark-border"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {dia}
              {tieneReservas && !esSeleccionada && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
              )}
            </button>
          );
        });
      })()}
    </div>
  </div>

  {fechaCalendarioAdmin && (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      <div className="bg-dark-surface px-6 py-4 flex items-center justify-between border-b border-dark-border">
        <p className="text-gold font-bold text-sm uppercase tracking-wider">
          {obtenerDiaSemana(fechaCalendarioAdmin)}, {fechaCalendarioAdmin}
        </p>
        <p className="text-gray-500 text-xs">
          {reservasDelDia.length} citas
        </p>
      </div>
      <div className="divide-y divide-dark-border">
        {reservasDelDia
          .sort((a, b) => a.hora.localeCompare(b.hora))
          .map((reserva) => (
            <div key={reserva.id} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-gold font-bold text-sm w-20 shrink-0">{reserva.hora}</p>
                <div>
                  <p className="text-white font-bold text-sm">{reserva.nombre}</p>
                  <p className="text-gray-500 text-xs">{reserva.servicio} · {reserva.precio}</p>
                  {reserva.metodo_pago && <p className="text-gray-600 text-xs capitalize">Pago: {reserva.metodo_pago}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${reserva.estado === "pendiente" ? "bg-gold text-black" : "bg-green-900 text-green-300"}`}>
                  {reserva.estado}
                </span>
                <a href={`https://wa.me/506${reserva.telefono.replace(/[^0-9]/g, "")}`} target="_blank" className="text-xs px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all">
                  WA
                </a>
                {reserva.estado === "pendiente" && (
                  <button onClick={() => setModalReserva(reserva)} className="text-xs px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all">
                    ✓
                  </button>
                )}
                <button onClick={() => cancelarReserva(reserva.id)} className="text-xs px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all">
                  ✕
                </button>
              </div>
            </div>
          ))}
        {reservasDelDia.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No hay citas para este día</p>
          </div>
        )}
      </div>
    </div>
  )}

  {fechaCalendarioAdmin && (
    <div className="bg-dark-card border border-dark-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-gold font-bold text-sm uppercase tracking-wider">Bloquear / desbloquear horarios</p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-500 text-xs">{horariosBloqueadosDelDia.size} bloqueados</p>
          <button
            onClick={bloquearDiaCompleto}
            disabled={procesandoMasivo !== null || horariosDisponiblesParaBloquear.length === 0}
            className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-dark-border text-gray-400 hover:border-gold hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesandoMasivo === "bloquear" ? "Bloqueando..." : "Bloquear día"}
          </button>
          <button
            onClick={desbloquearDiaCompleto}
            disabled={procesandoMasivo !== null || horariosBloqueadosDelDia.size === 0}
            className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesandoMasivo === "desbloquear" ? "Liberando..." : "Desbloquear día"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {HORARIOS.map((hora) => {
          const ocupado = horariosReservadosDelDia.has(hora);
          const bloqueado = horariosBloqueadosDelDia.has(hora);
          const cargando = procesandoHorario === hora;
          return (
            <button
              key={hora}
              disabled={ocupado || cargando}
              onClick={() => (bloqueado ? desbloquearHorario(hora) : bloquearHorario(hora))}
              className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all duration-300 ${
                ocupado
                  ? "border-dark-border text-gray-700 cursor-not-allowed line-through"
                  : bloqueado
                  ? "border-red-700 text-red-300 bg-red-950/40 hover:bg-red-900/60"
                  : "border-dark-border text-gray-400 hover:border-gold hover:text-gold"
              }`}
            >
              {cargando ? "..." : hora}
            </button>
          );
        })}
      </div>
      <p className="text-gray-600 text-xs mt-3">
        Los horarios con cita no se pueden bloquear. Pulsa un horario bloqueado para liberarlo.
      </p>
    </div>
  )}
</div>
        )}
      </div>
    </div>
  );
}