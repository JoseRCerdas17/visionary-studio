"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { BARBEROS, getBarbero, getHorariosBarbero } from "../../lib/barberos";

const servicios = [
  { id: 1, nombre: "Corte de Cabello", precio: "₡4,000", duracion: "30 min" },
  { id: 2, nombre: "Corte y Barba", precio: "₡5,000", duracion: "30 min" },
  { id: 3, nombre: "Marcado y/o Barba", precio: "₡2,000", duracion: "15 min" },
  { id: 4, nombre: "Cejas", precio: "₡1,000", duracion: "5 min" },
];

const adicionalesDisponibles = ["Mascarilla facial", "Pigmentación"];
const HORARIOS_MIEMBRO = ["2:30 PM", "7:00 PM"];

const pasos = ["Barbero", "Servicio", "Adicionales", "Fecha y Hora", "Confirmar"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getStoredValue(key: string) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) || "";
}

function setStoredValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

function getDuracionServicio(nombreBarbero: string | undefined, servicio: { id: number; duracion: string }) {
  if (nombreBarbero !== "Ian Bustos Navarrete") return servicio.duracion;
  if (servicio.id === 3) return "30 min";
  if (servicio.id === 4) return "10 min";
  return "60 min";
}

export default function Reservar() {
  const [paso, setPaso] = useState(0);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<number | null>(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<number | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState<string[]>([]);
  const [esMiembroClub, setEsMiembroClub] = useState(false);
  const [clubTelefono, setClubTelefono] = useState("");
  const [clubBarbero, setClubBarbero] = useState("");

  const barbero = getBarbero(barberoSeleccionado ?? 0);
  const horariosBase = barberoSeleccionado ? getHorariosBarbero(barberoSeleccionado) : [];
  const beneficiosMiembro = esMiembroClub && clubBarbero === barbero?.nombre;
  const horarios = beneficiosMiembro && barbero?.nombre === "Alonso Lobo"
    ? [...horariosBase, ...HORARIOS_MIEMBRO]
    : horariosBase;
  const precioAdicional = beneficiosMiembro ? "₡750 (precio miembro)" : "₡1,000";
  const precioAdicionalNumerico = beneficiosMiembro ? 750 : 1000;
  const adicionalesTotal = adicionalesSeleccionados.length * precioAdicionalNumerico;

  useEffect(() => {
    const telClub = localStorage.getItem("club_telefono");
    if (!telClub) return;
    fetch(`${API}/club/tarjeta/${encodeURIComponent(telClub)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.estado === "activo") {
          setEsMiembroClub(true);
          setClubTelefono(telClub);
          setClubBarbero(data.barbero || "");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!fechaSeleccionada || !barberoSeleccionado) return;
    const barberoActual = getBarbero(barberoSeleccionado);
    if (!barberoActual) return;
    const fechaStr = fechaSeleccionada.toLocaleDateString("es-CR");
    fetch(`${API}/reservas/ocupados?fecha=${encodeURIComponent(fechaStr)}&barbero=${encodeURIComponent(barberoActual.nombre)}`)
      .then((res) => res.json())
      .then((data) => setHorariosOcupados(Array.isArray(data) ? data : []))
      .catch(() => setHorariosOcupados([]));
  }, [fechaSeleccionada, barberoSeleccionado]);
  
  const esHorarioPasado = (hora: string) => {
    if (!fechaSeleccionada) return false;
    const hoy = new Date();
    const fechaHoy = hoy.toLocaleDateString("es-CR");
    const fechaCita = fechaSeleccionada.toLocaleDateString("es-CR");
    if (fechaCita !== fechaHoy) return false;
  
    const partes = hora.split(" ");
    const tiempo = partes[0].split(":");
    let h = parseInt(tiempo[0]);
    const m = parseInt(tiempo[1]);
    const periodo = partes[1].toUpperCase();
  
    if (periodo === "PM" && h !== 12) h += 12;
    if (periodo === "AM" && h === 12) h = 0;
  
    const citaDate = new Date();
    citaDate.setHours(h, m, 0, 0);
  
    // Deshabilitar si faltan menos de 5 minutos
    const diff = (citaDate.getTime() - hoy.getTime()) / 60000;
    return diff < 5;
  };
  const [nombre, setNombre] = useState(() => getStoredValue("cliente_nombre"));
const [telefono, setTelefono] = useState(() => getStoredValue("cliente_telefono"));
const [email, setEmail] = useState(() => getStoredValue("cliente_email"));
  const [cargando, setCargando] = useState(false);
const [exito, setExito] = useState(false);
const router = useRouter();
  const hoy = startOfDay(new Date());
  const limiteSemana = new Date(hoy);
  limiteSemana.setDate(hoy.getDate() + 7);
  const estaFueraDeRango = (date: Date) => {
    const fecha = startOfDay(date);
    return fecha < hoy || fecha > limiteSemana;
  };
  const fechaDeshabilitada = (date: Date) => date.getDay() === 0 || estaFueraDeRango(date);

  const servicio = servicios.find((s) => s.id === servicioSeleccionado);
  const precioBase = servicio ? parseInt(servicio.precio.replace(/[^0-9]/g, "")) || 0 : 0;
  const totalGeneral = precioBase + adicionalesTotal;

  const toggleAdicional = (adicional: string) => {
    setAdicionalesSeleccionados((actuales) =>
      actuales.includes(adicional)
        ? actuales.filter((item) => item !== adicional)
        : [...actuales, adicional],
    );
  };

  const confirmarReserva = async () => {
    if (!nombre || !telefono || !email) {
      alert("Por favor completa todos los campos");
      return;
    }
    const telefonoEnvio = beneficiosMiembro && clubTelefono ? clubTelefono : telefono;
    setStoredValue("cliente_nombre", nombre);
setStoredValue("cliente_telefono", telefonoEnvio);
setStoredValue("cliente_email", email);
    setCargando(true);
    try {
        const response = await fetch(`${API}/reservas/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          telefono: telefonoEnvio,
          email,
          barbero: barbero?.nombre || "",
          servicio: servicio?.nombre || "",
          precio: servicio?.precio || "",
          fecha: fechaSeleccionada ? fechaSeleccionada.toLocaleDateString("es-CR") : "",
          hora: horarioSeleccionado || "",
          adicionales: adicionalesSeleccionados,
          adicionales_precio: adicionalesTotal,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        if (error.detail === "Este horario es exclusivo para miembros activos de Visionary Club") {
          alert("Este horario es exclusivo para miembros activos de Visionary Club.");
          setPaso(3);
        } else if (error.detail === "Ya existe una reserva para esa fecha y hora") {
          alert("Ese horario ya está ocupado. Por favor selecciona otro.");
          setPaso(3);
        } else {
          alert("Error al crear la reserva, intenta de nuevo");
        }
        return;
      }
      setExito(true);
    } catch {
      alert("Error de conexión con el servidor");
    } finally {
      setCargando(false);
    }
  };

  if (exito) {
    return (
      <main>
        <Navbar />
        <div className="min-h-screen bg-dark flex items-center justify-center px-4">
          <div className="bg-dark-card border border-gold rounded-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center mx-auto mb-6">
              <span className="text-black font-black text-2xl">✓</span>
            </div>
            <h2 className="text-white font-black text-2xl uppercase mb-2">Cita Confirmada</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu cita ha sido agendada exitosamente. Te esperamos en Visionary Studio Barber Shop.
            </p>
            <div className="bg-dark rounded-lg p-4 mb-6 text-left flex flex-col gap-2">
              <p className="text-gray-500 text-xs uppercase tracking-wider">Resumen</p>
              <p className="text-white text-sm"><span className="text-gold">Barbero:</span> {barbero?.nombre}</p>
              <p className="text-white text-sm"><span className="text-gold">Servicio:</span> {servicio?.nombre}</p>
              <p className="text-white text-sm"><span className="text-gold">Adicionales:</span> {adicionalesSeleccionados.length ? adicionalesSeleccionados.join(", ") : "Ninguno"}</p>
              <p className="text-white text-sm"><span className="text-gold">Fecha:</span> {fechaSeleccionada?.toLocaleDateString("es-CR")}</p>
              <p className="text-white text-sm"><span className="text-gold">Hora:</span> {horarioSeleccionado}</p>
              <p className="text-white text-sm"><span className="text-gold">Total:</span> ₡{totalGeneral.toLocaleString("es-CR")}</p>
            </div>
            <button onClick={() => router.push("/")} className="btn-gold w-full uppercase tracking-widest text-sm py-3">
              Volver al inicio
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <div className="min-h-screen bg-dark pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Título */}
          <div className="text-center mb-12">
            <p className="text-gold text-xs tracking-[4px] uppercase mb-4">✦ Agenda tu cita ✦</p>
            <h1 className="text-white font-black uppercase text-4xl md:text-5xl mb-4">
              Reserva tu <span className="text-gold italic">Cita</span>
            </h1>
          </div>

          {/* Pasos */}
          <div className="flex items-center justify-center mb-12 gap-2">
            {pasos.map((p, i) => (
              <div key={p} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${i <= paso ? "text-gold" : "text-gray-600"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${i <= paso ? "border-gold text-gold" : "border-gray-600 text-gray-600"}`}>
                    {i + 1}
                  </div>
                  <span className="text-xs uppercase tracking-wider hidden sm:block">{p}</span>
                </div>
                {i < pasos.length - 1 && <div className={`w-8 h-px ${i < paso ? "bg-gold" : "bg-gray-700"}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Contenido principal */}
            <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-lg p-6">


              

              {/* Paso 1 - Barbero */}
              {paso === 0 && (
                <div>
                  <h2 className="text-white font-bold text-xl mb-6">Elige tu barbero</h2>
                  <div className="flex flex-col gap-4">
                    {BARBEROS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setBarberoSeleccionado(b.id);
                          setHorarioSeleccionado(null);
                        }}
                        className={`p-4 rounded-lg border text-left transition-all duration-300 flex items-center gap-4 ${barberoSeleccionado === b.id ? "border-gold bg-dark" : "border-dark-border bg-dark hover:border-gold"}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center shrink-0">
                          <span className="text-black font-black text-sm">{b.iniciales}</span>
                        </div>
                        <div>
                          <p className="text-white font-bold">{b.nombre}</p>
                          <p className="text-gray-500 text-xs mt-1">{b.especialidad}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 2 - Servicio */}
              {paso === 1 && (
                <div>
                  <h2 className="text-white font-bold text-xl mb-6">Elige un servicio</h2>
                  <div className="flex flex-col gap-4">
                    {servicios.map((s) => (
                      <button key={s.id} onClick={() => setServicioSeleccionado(s.id)} className={`p-4 rounded-lg border text-left transition-all duration-300 flex justify-between items-center ${servicioSeleccionado === s.id ? "border-gold bg-dark" : "border-dark-border bg-dark hover:border-gold"}`}>
                        <div>
                          <p className="text-white font-bold">{s.nombre}</p>
                          <p className="text-gray-500 text-xs mt-1">{getDuracionServicio(barbero?.nombre, s)}</p>
                        </div>
                        <span className="text-gold font-black text-lg">{s.precio}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paso 3 - Adicionales */}
              {paso === 2 && (
                <div>
                  <h2 className="text-white font-bold text-xl mb-2">Adicionales</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    Agrega un extra a tu cita.
                    {beneficiosMiembro ? " Como miembro del club pagas ₡750 por adicional." : " Cada adicional tiene un costo de ₡1,000."}
                  </p>
                  <div className="flex flex-col gap-3">
                    {adicionalesDisponibles.map((adicional) => (
                      <label
                        key={adicional}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition ${adicionalesSeleccionados.includes(adicional) ? "border-gold bg-dark" : "border-dark-border bg-dark hover:border-gold"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={adicionalesSeleccionados.includes(adicional)}
                            onChange={() => toggleAdicional(adicional)}
                            className="accent-gold"
                          />
                          <span className="text-white font-bold">{adicional}</span>
                        </div>
                        <span className="text-gold font-black text-sm">{precioAdicional}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

             {/* Paso 4 - Fecha y hora */}
             {paso === 3 && (
                <div>
                  <h2 className="text-white font-bold text-xl mb-6">Elige fecha y hora</h2>
                  <div className="mb-6">
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-3 block">Fecha</label>
                    <Calendar
                    onChange={(value) => setFechaSeleccionada(value as Date)}
                    value={fechaSeleccionada}
                    minDate={hoy}
                    className="react-calendar-dark w-full"
                    locale="es-ES"
                    tileDisabled={({ date }) => fechaDeshabilitada(date)}
                    tileClassName={({ date }) => fechaDeshabilitada(date) ? "domingo-deshabilitado" : ""}
                    nextLabel="→"
                    prevLabel="←"
                    next2Label={null}
                    prev2Label={null}
                  />
                  </div>
                  <div className="mt-6">
                    <label className="text-gray-500 text-xs uppercase tracking-wider mb-3 block">Horario disponible</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {horarios.map((h) => {
                        const esExclusivoMiembro = HORARIOS_MIEMBRO.includes(h);
                        return (
                       <button
                       key={h}
                       onClick={() => !horariosOcupados.includes(h) && !esHorarioPasado(h) && setHorarioSeleccionado(h)}
                       disabled={horariosOcupados.includes(h) || esHorarioPasado(h)}
                       className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all duration-300 ${
                         horariosOcupados.includes(h) || esHorarioPasado(h)
                           ? "border-dark-border text-gray-700 cursor-not-allowed line-through"
                           : horarioSeleccionado === h
                           ? "border-gold bg-gold text-black"
                           : esExclusivoMiembro
                           ? "border-gold text-gold hover:bg-gold hover:text-black"
                           : "border-dark-border text-gray-400 hover:border-gold hover:text-gold"
                       }`}
                     >
                       {h}
                       {esExclusivoMiembro && <span className="ml-1">💎</span>}
                     </button>
                        );
                      })}
                    </div>
                    {beneficiosMiembro && barbero?.nombre === "Alonso Lobo" && (
                      <p className="text-gold text-xs mt-3">💎 Horarios exclusivos para miembros del club</p>
                    )}
                  </div>
                </div>
              )}

              {/* Paso 5 - Confirmar */}
              {paso === 4 && (
                <div>
                  <h2 className="text-white font-bold text-xl mb-6">Tus datos</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Nombre completo</label>
                      <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Teléfono</label>
                      <input type="tel" placeholder="8888-8888" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Email</label>
                      <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors" />
                    </div>
                  </div>
                </div>
              )}

              {/* Botones de navegación */}
              <div className="flex justify-between mt-8">
                {paso > 0 && (
                  <button onClick={() => setPaso(paso - 1)} className="btn-outline text-xs uppercase tracking-widest px-6 py-3">
                    Atrás
                  </button>
                )}
                {paso < 4 ? (
                  <button onClick={() => {
                    if (paso === 1 && !servicioSeleccionado) { alert("Por favor selecciona un servicio"); return; }
                    if (paso === 3 && !fechaSeleccionada) { alert("Por favor selecciona una fecha"); return; }
                    if (paso === 3 && !horarioSeleccionado) { alert("Por favor selecciona un horario"); return; }
                    setPaso(paso + 1);
                  }} className="btn-gold text-xs uppercase tracking-widest px-6 py-3 ml-auto">
                    Continuar
                  </button>
                ) : (
                    <button onClick={confirmarReserva} disabled={cargando} className="btn-gold text-xs uppercase tracking-widest px-6 py-3 ml-auto disabled:opacity-50">
                    {cargando ? "Enviando..." : "Confirmar Cita"}
                  </button>
                )}
              </div>

            </div>

            {/* Resumen */}
            <div className="bg-dark-card border border-dark-border rounded-lg p-6 h-fit">
              <h3 className="text-gold font-bold text-xs tracking-[3px] uppercase mb-4">Tu selección</h3>
              <div className="flex flex-col gap-3">
                <div className="border-b border-dark-border pb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Barbero</p>
                  <p className="text-white font-bold text-sm">{barbero ? barbero.nombre : "---"}</p>
                </div>
                <div className="border-b border-dark-border pb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Servicio</p>
                  <p className="text-white font-bold text-sm">{servicio ? servicio.nombre : "---"}</p>
                </div>
                <div className="border-b border-dark-border pb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Adicionales</p>
                  <p className="text-white font-bold text-sm">{adicionalesSeleccionados.length ? adicionalesSeleccionados.join(", ") : "Ninguno"}</p>
                </div>
                <div className="border-b border-dark-border pb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha</p>
                  <p className="text-white font-bold text-sm">{fechaSeleccionada ? fechaSeleccionada.toLocaleDateString("es-CR") : "---"}</p>
                </div>
                <div className="border-b border-dark-border pb-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Hora</p>
                  <p className="text-white font-bold text-sm">{horarioSeleccionado || "---"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total</p>
                  <p className="text-gold font-black text-xl">₡{totalGeneral.toLocaleString("es-CR")}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
