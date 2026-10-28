"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { BARBEROS, getBarbero, getHorariosBarbero } from "../../lib/barberos";

function getBarberoId(nombre: string): number | null {
  return BARBEROS.find((b) => b.nombre === nombre)?.id ?? null;
}

const LOBO_BARBERO = "Alonso Lobo";
const IAN_BARBERO = "Ian Bustos Navarrete";
const PERFILES_BARBEROS = [
  { id: "todos", label: "Todos" },
  { id: LOBO_BARBERO, label: "Lobo" },
  { id: IAN_BARBERO, label: "Ian" },
];

function esCuentaIan(username: string, barbero: string | null) {
  const normalized = username.trim().toLowerCase();
  return barbero === IAN_BARBERO || normalized.includes("ian") || normalized === "admin2";
}

function obtenerBarberoClub(usuarioInfo: { rol: string; barbero: string | null } | null, perfilActual: string): string | null {
  if (!usuarioInfo) return null;
  if (usuarioInfo.rol !== "admin") return usuarioInfo.barbero || IAN_BARBERO;
  return perfilActual === LOBO_BARBERO || perfilActual === IAN_BARBERO ? perfilActual : null;
}

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
  adicionales: string | null;
  adicionales_precio: number | null;
  es_miembro_club: boolean;
  cancelada_en: string | null;
}

interface Resena {
  id: number;
  nombre: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
}

interface ClubPlan {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
  servicios: { cortes: number; barbas: number; mascarilla: boolean };
  cupo_max: number | null;
  miembros_activos: number;
  promo_restantes: number;
  creado_en: string | null;
}

interface ClubMiembro {
  id: number;
  nombre: string;
  telefono: string;
  email: string | null;
  barbero: string;
  plan_id: number;
  plan_nombre: string | null;
  plan_precio: number | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  qr_token: string | null;
  balance: { cortes: number; barbas: number; mascarilla: number };
  grupo_id: number | null;
  mascarilla_promo?: boolean;
  pagos?: { id: number; monto: number; metodo: string; referencia: string | null; fecha: string | null }[];
  consumos?: { id: number; servicio: string; fecha: string | null; anulado: boolean; motivo_anulacion: string | null }[];
  servicios_extra?: { id: number; servicio: string; monto: number; pagado: boolean; metodo: string | null; nota: string | null; creado_en: string | null }[];
}

interface ClubGrupo {
  id: number;
  nombre_grupo: string;
  plan_nombre: string | null;
  pago_total: number;
  fecha_pago: string | null;
  activo: boolean;
  miembros: ClubMiembro[];
}

interface ClubStats {
  miembros_activos: number;
  pagos_mes_total: number;
  pagos_mes_cantidad: number;
  servicios_mes: number;
  por_vencer: ClubMiembro[];
}

interface PagoSilla {
  id: number;
  monto: number;
  fecha: string | null;
  nota: string | null;
}

interface Gasto {
  id: number;
  descripcion: string;
  monto: number;
  fecha: string | null;
}

interface ClubPago {
  id: number;
  miembro_id: number;
  barbero: string | null;
  monto: number;
  metodo: string;
  fecha: string | null;
  referencia: string | null;
}

type QrData = {
  token: string;
  qr_url: string;
  expira_en: string;
  segundos_validos: number;
};

const VISTAS = [
  { id: "lista", label: "Lista" },
  { id: "calendario", label: "Calendario" },
  { id: "ingresos", label: "Ingresos" },
  { id: "canceladas", label: "Canceladas" },
  { id: "reseñas", label: "Reseñas" },
  { id: "club", label: "Club" },
  { id: "silla", label: "Silla" },
  { id: "gastos", label: "Gastos" },
] as const;

const VISTAS_LOBO = new Set(["silla", "gastos"]);

function GastosSeccion({ total, lista }: { total: number; lista: Gasto[] }) {
  return (
    <div className="bg-dark-card border border-red-900 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-red-400 text-xs uppercase tracking-wider">Gastos del período</p>
        <p className="text-red-400 font-black text-xl">₡{total.toLocaleString("es-CR")}</p>
      </div>
      {lista.length === 0 ? (
        <p className="text-gray-600 text-sm mt-3">Sin gastos en este período.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {lista.map((g) => (
            <div key={g.id} className="flex items-center justify-between text-sm border-b border-dark-border pb-2">
              <div>
                <p className="text-white/80">{g.descripcion}</p>
                <p className="text-gray-600 text-xs">{g.fecha ? new Date(g.fecha + "T00:00:00").toLocaleDateString("es-CR") : "—"}</p>
              </div>
              <p className="text-red-300 font-bold">-₡{g.monto.toLocaleString("es-CR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GananciaNetaCard({ total, ingresos, gastos }: { total: number; ingresos: number; gastos: number }) {
  const positiva = total >= 0;
  return (
    <div className={`bg-dark-card border-2 rounded-xl p-6 ${positiva ? "border-gold" : "border-red-700"}`}>
      <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-bold">Ganancia Neta</p>
      <p className={`font-black text-4xl mt-2 ${positiva ? "text-gold" : "text-red-400"}`}>₡{total.toLocaleString("es-CR")}</p>
      <p className="text-gray-500 text-sm mt-2">₡{ingresos.toLocaleString("es-CR")} ingresos − ₡{gastos.toLocaleString("es-CR")} gastos</p>
    </div>
  );
}

const DIAS_RETENCION_CANCELADAS = 7;

const PERIODOS_INGRESOS = [
  { id: "dia", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
] as const;

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export default function Admin() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("pendiente");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<"lista" | "calendario" | "ingresos" | "canceladas" | "reseñas" | "club" | "silla" | "gastos">("lista");
  const [modalReserva, setModalReserva] = useState<Reserva | null>(null);
  const [metodoPago, setMetodoPago] = useState<"sinpe" | "efectivo" | "mixto" | "membresia" | null>(null);
  const [montoPagoMetodo, setMontoPagoMetodo] = useState<string>("");
  const [tienePropina, setTienePropina] = useState<boolean>(false);
  const [montoPropina, setMontoPropina] = useState<string>("");
  const [tieneDolares, setTieneDolares] = useState<boolean>(false);
  const [montoDolares, setMontoDolares] = useState<string>("");
  const [montoMixtoEfectivo, setMontoMixtoEfectivo] = useState<string>("");
  const [periodoIngresos, setPeriodoIngresos] = useState<"dia" | "semana" | "mes">("dia");
  const [mesIngresos, setMesIngresos] = useState({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() });
  const [procesandoHorario, setProcesandoHorario] = useState<string | null>(null);
  const [procesandoMasivo, setProcesandoMasivo] = useState<"bloquear" | "desbloquear" | null>(null);
  const router = useRouter();
  const [fechaCalendarioAdmin, setFechaCalendarioAdmin] = useState<string>("");
  const [mesCalendario, setMesCalendario] = useState(new Date());
  const [tipoCambio, setTipoCambio] = useState<number>(520);
  const [barberoBloqueoId, setBarberoBloqueoId] = useState(BARBEROS[0].id);
  const [usuarioInfo, setUsuarioInfo] = useState<{ username: string; rol: string; barbero: string | null } | null>(null);
  // Initialize from localStorage immediately — prevents stale default causing wrong data load on first render
  const [perfilActual, setPerfilActual] = useState<string>("todos");
  const [reseñas, setReseñas] = useState<Resena[]>([]);
  const [cargandoReseñas, setCargandoReseñas] = useState(false);
  const [modalQrSellos, setModalQrSellos] = useState(false);
  const [qrSellos, setQrSellos] = useState<QrData | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const [cargandoQrSellos, setCargandoQrSellos] = useState(false);
  const [errorQrSellos, setErrorQrSellos] = useState("");
  const [qrSellosBarbero, setQrSellosBarbero] = useState<"Lobo" | "Ian">("Lobo");
  const [planes, setPlanes] = useState<ClubPlan[]>([]);
  const [miembros, setMiembros] = useState<ClubMiembro[]>([]);
  const [grupos, setGrupos] = useState<ClubGrupo[]>([]);
  const [statsClub, setStatsClub] = useState<ClubStats | null>(null);
  const [cargandoClub, setCargandoClub] = useState(false);
  const [busquedaMiembro, setBusquedaMiembro] = useState("");
  const [filtroEstadoClub, setFiltroEstadoClub] = useState("todas");
  const [modalDetalleMiembro, setModalDetalleMiembro] = useState<ClubMiembro | null>(null);
  const [modalPagoMiembro, setModalPagoMiembro] = useState<ClubMiembro | null>(null);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [modalEscanearQr, setModalEscanearQr] = useState(false);
  const [modalNuevoMiembro, setModalNuevoMiembro] = useState(false);
  const [telefonosClub, setTelefonosClub] = useState<Set<string>>(new Set());
  const [formNuevoMiembro, setFormNuevoMiembro] = useState({ nombre: "", telefono: "", email: "", plan_id: 0, barbero: "" });
  const [formServicioExtra, setFormServicioExtra] = useState({ servicio: "corte", monto: "", pagado: false, metodo: "sinpe", nota: "" });
  const [mostrarFormExtra, setMostrarFormExtra] = useState(false);
  const [backfillResult, setBackfillResult] = useState("");
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [formPago, setFormPago] = useState({ metodo: "sinpe", monto: "", referencia: "" });
  const [formGrupo, setFormGrupo] = useState({ nombre_grupo: "", metodo: "sinpe", monto: "", barbero: "", miembros: Array.from({ length: 5 }, () => ({ nombre: "", telefono: "" })) });
  const [formQrToken, setFormQrToken] = useState("");
  const [qrMiembro, setQrMiembro] = useState<ClubMiembro | null>(null);
  const [cargandoQrMiembro, setCargandoQrMiembro] = useState(false);
  const [modalEditarPlan, setModalEditarPlan] = useState<ClubPlan | null>(null);
  const [formPlan, setFormPlan] = useState({ precio: "", cortes: "", barbas: "" });
  const [pagosSilla, setPagosSilla] = useState<PagoSilla[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [clubPagos, setClubPagos] = useState<ClubPago[]>([]);
  const [formSilla, setFormSilla] = useState({ monto: "", nota: "" });
  const [formGasto, setFormGasto] = useState({ descripcion: "", monto: "" });

  const barberoBloqueo = getBarbero(barberoBloqueoId);
  const horariosBarbero = getHorariosBarbero(barberoBloqueoId);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const barberoClubActual = obtenerBarberoClub(usuarioInfo, perfilActual);

  const cargarQrSellos = useCallback(async (barbero: "Lobo" | "Ian") => {
    setCargandoQrSellos(true);
    setErrorQrSellos("");
    try {
      const response = await fetch(`${API}/stamps/qr?barbero=${encodeURIComponent(barbero)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo generar el QR");
      const data: QrData = await response.json();
      setQrSellos(data);
      setQrSecondsLeft(data.segundos_validos);
    } catch {
      setErrorQrSellos("No se pudo generar el QR. Intenta de nuevo.");
    } finally {
      setCargandoQrSellos(false);
    }
  }, [API]);

  const cargarReservas = useCallback(async (barberoFiltro?: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const url = barberoFiltro && barberoFiltro !== "todos"
      ? `${API}/reservas/?barbero=${encodeURIComponent(barberoFiltro)}`
      : `${API}/reservas/`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setReservas(Array.isArray(data) ? data : []);
  }, [API]);

  const cargarReseñas = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setCargandoReseñas(true);
    try {
      const res = await fetch(`${API}/resenas/todas`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReseñas(Array.isArray(data) ? data : []);
    } finally {
      setCargandoReseñas(false);
    }
  }, [API]);

  const cargarClub = useCallback(async (barbero?: string | null) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setCargandoClub(true);
    const bq = barbero ? `?barbero=${encodeURIComponent(barbero)}` : "";
    try {
      const [planesRes, miembrosRes, gruposRes, statsRes] = await Promise.all([
        fetch(`${API}/club/planes${bq}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/club/miembros${bq}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/club/grupos${bq}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/club/stats${bq}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const planesData = await planesRes.json().catch(() => []);
      const miembrosData = await miembrosRes.json().catch(() => []);
      const gruposData = await gruposRes.json().catch(() => []);
      const statsData = await statsRes.json().catch(() => null);
      setPlanes(Array.isArray(planesData) ? planesData : []);
      setMiembros(Array.isArray(miembrosData) ? miembrosData : []);
      setGrupos(Array.isArray(gruposData) ? gruposData : []);
      setStatsClub(statsData);
      if (Array.isArray(miembrosData)) {
        setTelefonosClub(new Set(miembrosData.map((m: ClubMiembro) => m.telefono.replace(/[^0-9]/g, ""))));
      }
    } finally {
      setCargandoClub(false);
    }
  }, [API]);

  const cargarTelefonosClub = useCallback(async (barbero?: string | null) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const bq = barbero ? `?barbero=${encodeURIComponent(barbero)}` : "";
      const res = await fetch(`${API}/club/miembros${bq}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTelefonosClub(new Set(data.map((m: ClubMiembro) => m.telefono.replace(/[^0-9]/g, ""))));
      }
    } catch {
      // ignore
    }
  }, [API]);

  const cargarFinanzas = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const [sillaRes, gastosRes] = await Promise.all([
        fetch(`${API}/finanzas/silla`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/finanzas/gastos`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const sillaData = await sillaRes.json().catch(() => []);
      const gastosData = await gastosRes.json().catch(() => []);
      setPagosSilla(Array.isArray(sillaData) ? sillaData : []);
      setGastos(Array.isArray(gastosData) ? gastosData : []);
    } catch {
      // ignore
    }
  }, [API]);

  const cargarClubPagos = useCallback(async (barbero?: string | null) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const bq = barbero ? `?barbero=${encodeURIComponent(barbero)}` : "";
      const res = await fetch(`${API}/club/pagos${bq}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => []);
      setClubPagos(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, [API]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/auth/verificar`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("usuario_rol");
          localStorage.removeItem("usuario_barbero");
          localStorage.removeItem("perfil_actual");
          router.push("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUsuarioInfo(data);
          const cuentaIan = esCuentaIan(data.username, data.barbero);
          setQrSellosBarbero(cuentaIan ? "Ian" : "Lobo");
          if (cuentaIan || data.rol === "barber") {
            const perfilBarbero = cuentaIan ? IAN_BARBERO : data.barbero || IAN_BARBERO;
            const barberId = getBarberoId(perfilBarbero);
            if (barberId !== null) setBarberoBloqueoId(barberId);
            setPerfilActual(perfilBarbero);
            localStorage.setItem("perfil_actual", perfilBarbero);
          } else {
            setPerfilActual("todos");
            localStorage.setItem("perfil_actual", "todos");
          }
        }
      });
  }, [API, router]);

  useEffect(() => {
    if (!usuarioInfo) return;
    setCargando(true);
    const filtro = perfilActual === "todos" ? undefined : perfilActual;
    cargarReservas(filtro)
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, [perfilActual, usuarioInfo, cargarReservas]);

  // Lock barberoBloqueoId to the barber's own ID — prevents switching for non-admin accounts
  useEffect(() => {
    if (!usuarioInfo || usuarioInfo.rol === "admin") return;
    if (usuarioInfo.barbero || usuarioInfo.username) {
      const id = getBarberoId(usuarioInfo.barbero || IAN_BARBERO);
      if (id !== null) setBarberoBloqueoId(id);
    }
  }, [usuarioInfo]);

  useEffect(() => {
    if (vista === "reseñas") {
      cargarReseñas().catch(() => undefined);
    }
  }, [vista, cargarReseñas]);

  useEffect(() => {
    if (vista === "club") {
      cargarClub(barberoClubActual).catch(() => undefined);
    }
  }, [vista, cargarClub, barberoClubActual]);

  useEffect(() => {
    if (!usuarioInfo) return;
    cargarTelefonosClub(barberoClubActual).catch(() => undefined);
    cargarClubPagos(barberoClubActual).catch(() => undefined);
    if (usuarioInfo.rol === "admin") {
      cargarFinanzas().catch(() => undefined);
    }
  }, [usuarioInfo, barberoClubActual, cargarTelefonosClub, cargarClubPagos, cargarFinanzas]);

  useEffect(() => {
    if (!modalReserva) return;
    setMetodoPago(modalReserva.es_miembro_club ? "membresia" : null);
    setMontoPagoMetodo("");
    setMontoMixtoEfectivo("");
    setTienePropina(false);
    setMontoPropina("");
    setTieneDolares(false);
    setMontoDolares("");
  }, [modalReserva]);

  useEffect(() => {
    if (modalQrSellos) {
      cargarQrSellos(qrSellosBarbero);
    }
  }, [cargarQrSellos, modalQrSellos, qrSellosBarbero]);

  useEffect(() => {
    if (!modalQrSellos || !qrSellos) return;
    const interval = window.setInterval(() => {
      setQrSecondsLeft((current) => current <= 0 ? 0 : current - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [modalQrSellos, qrSellos]);

  useEffect(() => {
    if (modalQrSellos && qrSellos && qrSecondsLeft === 0 && !cargandoQrSellos) {
      cargarQrSellos(qrSellosBarbero);
    }
  }, [cargarQrSellos, cargandoQrSellos, modalQrSellos, qrSecondsLeft, qrSellos, qrSellosBarbero]);

  useEffect(() => {
    if (!modalReserva || !metodoPago) return;
    if (metodoPago === "sinpe" || metodoPago === "efectivo") {
      const base = parseInt(modalReserva.precio.replace(/[^0-9]/g, "")) || 0;
      const total = base + (modalReserva.adicionales_precio ?? 0);
      setMontoPagoMetodo("₡" + total.toLocaleString("es-CR"));
    }
  }, [metodoPago, modalReserva]);


  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        const crc = data.rates?.CRC;
        if (crc) setTipoCambio(crc);
      })
      .catch(() => setTipoCambio(520));
  }, []);

  const confirmarPago = async () => {
    if (!modalReserva || !metodoPago) return;

    // Membresía Club: el corte está cubierto, no hay cobro en caja.
    if (metodoPago === "membresia" || modalReserva.es_miembro_club) {
      const token = localStorage.getItem("admin_token");
      await fetch(`${API}/reservas/${modalReserva.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: "confirmada", metodo_pago: "membresia" }),
      });
      setReservas((prev) =>
        prev.map((r) =>
          r.id === modalReserva.id
            ? { ...r, estado: "confirmada", metodo_pago: "membresia" }
            : r,
        ),
      );
      setModalReserva(null);
      setMetodoPago(null);
      setMontoPagoMetodo("");
      setMontoMixtoEfectivo("");
      setTienePropina(false);
      setMontoPropina("");
      setTieneDolares(false);
      setMontoDolares("");
      return;
    }

    let detallePago: Record<string, unknown>;

    if (metodoPago === "mixto") {
      const montoSinpe = parsearPrecio(montoPagoMetodo);
      const montoEfectivo = parsearPrecio(montoMixtoEfectivo);
      if (montoSinpe <= 0 && montoEfectivo <= 0) {
        alert("Ingresa al menos un monto para SINPE o Efectivo.");
        return;
      }
      detallePago = { tipo: "mixto", montoSinpe: montoSinpe, montoEfectivo: montoEfectivo, monto: montoSinpe + montoEfectivo };
    } else if (tieneDolares) {
      const montoUSDNumero = montoDolares.trim().length ? parseMontoUSD(montoDolares) : 0;
      if (montoUSDNumero <= 0) {
        alert("Ingresa el monto en dólares.");
        return;
      }
      const montoPropinaNumero = tienePropina && montoPropina.trim().length ? parsearPrecio(montoPropina) : null;
      if (tienePropina && (montoPropinaNumero === null || montoPropinaNumero <= 0)) {
        alert("Ingresa el monto de la propina.");
        return;
      }
      detallePago = {
        tipo: metodoPago,
        monto: null,
        propina: montoPropinaNumero !== null ? { monto: montoPropinaNumero } : null,
        dolares: { monto: montoUSDNumero },
      };
    } else {
      const montoMetodo = montoPagoMetodo.trim().length ? parsearPrecio(montoPagoMetodo) : null;
      if (montoMetodo === null || montoMetodo <= 0) {
        alert("Ingresa el monto recibido.");
        return;
      }
      const montoPropinaNumero = tienePropina && montoPropina.trim().length ? parsearPrecio(montoPropina) : null;
      if (tienePropina && (montoPropinaNumero === null || montoPropinaNumero <= 0)) {
        alert("Ingresa el monto de la propina.");
        return;
      }
      detallePago = {
        tipo: metodoPago,
        monto: montoMetodo,
        propina: montoPropinaNumero !== null ? { monto: montoPropinaNumero } : null,
        dolares: null,
      };
    }

    const metodoPagoDetalle = JSON.stringify(detallePago);
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/${modalReserva.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: "confirmada", metodo_pago: metodoPagoDetalle }),
    });
    setReservas((prev) =>
      prev.map((r) =>
        r.id === modalReserva.id
          ? { ...r, estado: "confirmada", metodo_pago: metodoPagoDetalle }
          : r,
      ),
    );
    setModalReserva(null);
    setMetodoPago(null);
    setMontoPagoMetodo("");
    setMontoMixtoEfectivo("");
    setTienePropina(false);
    setMontoPropina("");
    setTieneDolares(false);
    setMontoDolares("");
  };

  const cancelarReserva = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const ahora = new Date().toISOString();
    setReservas(reservas.map((r) => r.id === id ? { ...r, estado: "cancelada", cancelada_en: ahora } : r));
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

  const restaurarReserva = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/reservas/restaurar/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setReservas(reservas.map((r) => r.id === id ? { ...r, estado: "pendiente", cancelada_en: null } : r));
  };

  const eliminarResena = async (id: number) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    const token = localStorage.getItem("admin_token");
    await fetch(`${API}/resenas/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setReseñas(reseñas.filter((r) => r.id !== id));
  };

  const togglePlan = async (planId: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const plan = planes.find((p) => p.id === planId);
    if (plan?.activo && !confirm(`¿Desactivar el plan ${plan.nombre}?`)) return;
    try {
      const res = await fetch(`${API}/club/planes/${planId}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setPlanes((prev) => prev.map((p) => (p.id === planId ? { ...p, activo: !p.activo } : p)));
      }
    } catch {
      // ignore
    }
  };

  const corregirReservasPendientes = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setBackfillLoading(true);
    setBackfillResult("");
    try {
      const res = await fetch(`${API}/reservas/backfill-membresia`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBackfillResult(data?.detail || "No se pudo completar la corrección");
        return;
      }
      setBackfillResult(`Se corrigieron ${data.actualizadas} reservas pendientes.`);
      const filtro = perfilActual === "todos" ? undefined : perfilActual;
      cargarReservas(filtro).catch(() => undefined);
    } catch {
      setBackfillResult("Error de conexión");
    } finally {
      setBackfillLoading(false);
    }
  };

  const guardarPlan = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token || !modalEditarPlan) return;
    const precio = parseInt((formPlan.precio || "").replace(/[^0-9]/g, ""));
    const cortes = parseInt((formPlan.cortes || "").replace(/[^0-9]/g, ""));
    const barbas = parseInt((formPlan.barbas || "").replace(/[^0-9]/g, ""));
    const body: Record<string, number> = {};
    if (!Number.isNaN(precio) && precio > 0) body.precio = precio;
    if (!Number.isNaN(cortes) && cortes >= 0) body.cortes = cortes;
    if (!Number.isNaN(barbas) && barbas >= 0) body.barbas = barbas;
    try {
      const res = await fetch(`${API}/club/planes/${modalEditarPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo actualizar el plan");
        return;
      }
      setModalEditarPlan(null);
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const crearMiembro = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    if (!formNuevoMiembro.nombre.trim() || !formNuevoMiembro.telefono.trim() || !formNuevoMiembro.plan_id) {
      alert("Completa nombre, teléfono y plan.");
      return;
    }
    const barbero = barberoClubActual || formNuevoMiembro.barbero;
    if (!barbero) {
      alert("Selecciona el barbero.");
      return;
    }
    try {
      const res = await fetch(`${API}/club/miembros`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: formNuevoMiembro.nombre.trim(), telefono: formNuevoMiembro.telefono.trim(), email: formNuevoMiembro.email.trim() || null, plan_id: formNuevoMiembro.plan_id, barbero }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo crear el miembro");
        return;
      }
      setMiembros((prev) => [data, ...prev]);
      setModalNuevoMiembro(false);
      setFormNuevoMiembro({ nombre: "", telefono: "", email: "", plan_id: 0, barbero: "" });
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const registrarPagoMiembro = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token || !modalPagoMiembro) return;
    const monto = parseInt((formPago.monto || "").replace(/[^0-9]/g, "")) || 0;
    if (monto <= 0) {
      alert("Ingresa un monto válido.");
      return;
    }
    try {
      const res = await fetch(`${API}/club/miembros/${modalPagoMiembro.id}/pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monto, metodo: formPago.metodo, referencia: formPago.referencia || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo registrar el pago");
        return;
      }
      setMiembros((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setModalPagoMiembro(null);
      setFormPago({ metodo: "sinpe", monto: "", referencia: "" });
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const abrirDetalleMiembro = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/club/miembros/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setModalDetalleMiembro(data);
        setMostrarFormExtra(false);
        setFormServicioExtra({ servicio: "corte", monto: "", pagado: false, metodo: "sinpe", nota: "" });
      }
    } catch {
      // ignore
    }
  };

  const agregarServicioExtra = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token || !modalDetalleMiembro) return;
    const monto = parseInt((formServicioExtra.monto || "").replace(/[^0-9]/g, "")) || 0;
    try {
      const res = await fetch(`${API}/club/miembros/${modalDetalleMiembro.id}/servicios-extra`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          servicio: formServicioExtra.servicio,
          monto,
          pagado: formServicioExtra.pagado,
          metodo: formServicioExtra.pagado ? formServicioExtra.metodo : null,
          nota: formServicioExtra.nota.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo agregar el servicio extra");
        return;
      }
      setModalDetalleMiembro(data);
      setMostrarFormExtra(false);
      setFormServicioExtra({ servicio: "corte", monto: "", pagado: false, metodo: "sinpe", nota: "" });
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const eliminarServicioExtra = async (extraId: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token || !modalDetalleMiembro) return;
    if (!confirm("¿Eliminar este servicio extra? Se descontará del balance del miembro.")) return;
    try {
      const res = await fetch(`${API}/club/miembros/${modalDetalleMiembro.id}/servicios-extra/${extraId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo eliminar el servicio extra");
        return;
      }
      setModalDetalleMiembro(data);
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const anularConsumo = async (consumoId: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token || !modalDetalleMiembro) return;
    if (!confirm("¿Anular este consumo? Se restaurará el servicio al balance del miembro.")) return;
    const motivo = prompt("Motivo de anulación (opcional):");
    try {
      const res = await fetch(`${API}/club/miembros/${modalDetalleMiembro.id}/anular-consumo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ consumo_id: consumoId, motivo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo anular el consumo");
        return;
      }
      await abrirDetalleMiembro(modalDetalleMiembro.id);
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const cambiarEstadoMiembro = async (id: number, estado: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const miembro = miembros.find((m) => m.id === id);
    if (estado === "suspendido" && miembro && !confirm(`¿Suspender a ${miembro.nombre}?`)) return;
    try {
      const res = await fetch(`${API}/club/miembros/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo cambiar el estado");
        return;
      }
      setMiembros((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      setTelefonosClub(new Set(miembros.filter((m) => m.estado === "activo").map((m) => m.telefono.replace(/[^0-9]/g, ""))));
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const regenerarQr = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    if (!confirm("¿Regenerar el código QR? El código anterior dejará de funcionar.")) return;
    try {
      const res = await fetch(`${API}/club/miembros/${id}/regenerar-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo regenerar el QR");
        return;
      }
      await abrirDetalleMiembro(id);
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const toggleGrupo = async (grupoId: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const grupo = grupos.find((g) => g.id === grupoId);
    if (!grupo) return;
    const nuevoActivo = !grupo.activo;
    if (!nuevoActivo && !confirm(`¿Desactivar el grupo ${grupo.nombre_grupo}? Se suspenderán sus 5 miembros.`)) return;
    try {
      const res = await fetch(`${API}/club/grupos/${grupoId}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activo: nuevoActivo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo cambiar el estado del grupo");
        return;
      }
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const exportarMiembrosCsv = () => {
    const filas = [["Nombre", "Teléfono", "Email", "Plan", "Estado", "Cortes", "Barbas", "Mascarilla", "Vence"]];
    miembros.forEach((m) => {
      filas.push([
        m.nombre,
        m.telefono,
        m.email || "",
        m.plan_nombre || "",
        m.estado,
        String(m.balance.cortes),
        String(m.balance.barbas),
        String(m.balance.mascarilla),
        m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString("es-CR") : "",
      ]);
    });
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "miembros-club.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const registrarPagoSilla = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const monto = parseInt((formSilla.monto || "").replace(/[^0-9]/g, ""));
    if (!monto || monto <= 0) {
      alert("Ingresa un monto válido.");
      return;
    }
    try {
      const res = await fetch(`${API}/finanzas/silla`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monto, nota: formSilla.nota.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo registrar el pago");
        return;
      }
      setFormSilla({ monto: "", nota: "" });
      cargarFinanzas().catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const eliminarPagoSilla = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    if (!confirm("¿Eliminar este pago de silla?")) return;
    try {
      const res = await fetch(`${API}/finanzas/silla/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo eliminar");
        return;
      }
      cargarFinanzas().catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const registrarGasto = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const monto = parseInt((formGasto.monto || "").replace(/[^0-9]/g, ""));
    if (!formGasto.descripcion.trim()) {
      alert("Ingresa una descripción.");
      return;
    }
    if (!monto || monto <= 0) {
      alert("Ingresa un monto válido.");
      return;
    }
    try {
      const res = await fetch(`${API}/finanzas/gastos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ descripcion: formGasto.descripcion.trim(), monto }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo registrar el gasto");
        return;
      }
      setFormGasto({ descripcion: "", monto: "" });
      cargarFinanzas().catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const eliminarGasto = async (id: number) => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      const res = await fetch(`${API}/finanzas/gastos/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.detail || "No se pudo eliminar");
        return;
      }
      cargarFinanzas().catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const crearGrupo = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    if (!formGrupo.nombre_grupo.trim()) {
      alert("Ingresa el nombre del grupo.");
      return;
    }
    const miembros = formGrupo.miembros.filter((m) => m.nombre.trim() && m.telefono.trim());
    if (miembros.length !== 5) {
      alert("El grupo debe tener 5 miembros con nombre y teléfono.");
      return;
    }
    const barbero = barberoClubActual || formGrupo.barbero;
    if (!barbero) {
      alert("Selecciona el barbero.");
      return;
    }
    if (!confirm(`¿Crear el grupo ${formGrupo.nombre_grupo.trim()} con 5 miembros?`)) return;
    try {
      const res = await fetch(`${API}/club/grupos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre_grupo: formGrupo.nombre_grupo.trim(),
          metodo: formGrupo.metodo,
          monto: formGrupo.monto ? parseInt(formGrupo.monto.replace(/[^0-9]/g, "")) || null : null,
          barbero,
          miembros,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo crear el grupo");
        return;
      }
      setModalGrupo(false);
      setFormGrupo({ nombre_grupo: "", metodo: "sinpe", monto: "", barbero: "", miembros: Array.from({ length: 5 }, () => ({ nombre: "", telefono: "" })) });
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const escanearQr = async () => {
    const input = formQrToken.trim();
    if (!input) return;
    // Acepta token crudo o URL completa (/club/qr/{token}).
    const match = input.match(/\/club\/qr\/([^/?#]+)/);
    const token = match ? match[1] : input;
    const authToken = localStorage.getItem("admin_token");
    setCargandoQrMiembro(true);
    try {
      const res = await fetch(`${API}/club/qr/${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setQrMiembro(null);
        alert(data?.detail || data?.error || "QR inválido");
        return;
      }
      setQrMiembro(data);
    } catch {
      setQrMiembro(null);
      alert("No se pudo leer el QR");
    } finally {
      setCargandoQrMiembro(false);
    }
  };

  const consumirDesdeQr = async (servicio: string) => {
    const token = localStorage.getItem("admin_token");
    if (!token || !qrMiembro) return;
    try {
      const res = await fetch(`${API}/club/miembros/${qrMiembro.id}/consumo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ servicio }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.detail || "No se pudo registrar el consumo");
        return;
      }
      setQrMiembro(data);
      cargarClub(barberoClubActual).catch(() => undefined);
    } catch {
      alert("Error de conexión");
    }
  };

  const enlaceWhatsAppMiembro = (m: ClubMiembro) => {
    const mensaje = `Hola ${m.nombre} 👋 Tu membresía Visionary Club está activa. Consulta tu tarjeta aquí: https://visionarystudiobarbershop.com/club — Vigencia: ${m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString("es-CR") : "—"} al ${m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString("es-CR") : "—"}`;
    window.open(`https://wa.me/506${m.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const esReservaClub = (r: Reserva) => {
    const tieneAdicionales = r.adicionales && r.adicionales.trim() !== "" && r.adicionales.trim() !== "[]";
    return tieneAdicionales || telefonosClub.has(r.telefono.replace(/[^0-9]/g, ""));
  };

  const parseAdicionales = (adicionales: string | null) => {
    if (!adicionales) return "";
    try {
      const parsed = JSON.parse(adicionales);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return adicionales;
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_barbero");
    localStorage.removeItem("perfil_actual");
    router.push("/login");
  };

  const bloquearHorario = async (hora: string) => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    setProcesandoHorario(hora);
    try {
      const res = await fetch(`${API}/reservas/bloqueos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fecha: fechaCalendarioAdmin, hora, barbero: barberoBloqueo?.nombre ?? "" }),
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
      const res = await fetch(`${API}/reservas/bloqueos?fecha=${encodeURIComponent(fechaCalendarioAdmin)}&hora=${encodeURIComponent(hora)}&barbero=${encodeURIComponent(barberoBloqueo?.nombre ?? "")}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        alert(error?.detail || "No se pudo desbloquear el horario");
        return;
      }
      setReservas((prev) => prev.filter((r) => !(r.fecha === fechaCalendarioAdmin && r.hora === hora && r.barbero === barberoBloqueo?.nombre && r.estado === "bloqueado")));
    } finally {
      setProcesandoHorario(null);
    }
  };

  const bloquearDiaCompleto = async () => {
    if (!fechaCalendarioAdmin) return;
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    const horasDisponibles = horariosBarbero.filter(
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
            body: JSON.stringify({ fecha: fechaCalendarioAdmin, hora, barbero: barberoBloqueo?.nombre ?? "" }),
          }),
        ),
      );
      const filtro = perfilActual === "todos" ? undefined : perfilActual;
      await cargarReservas(filtro);
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
    const horasBloqueadas = horariosBarbero.filter((hora) => horariosBloqueadosDelDia.has(hora));
    if (horasBloqueadas.length === 0) return;
    setProcesandoMasivo("desbloquear");
    try {
      await Promise.all(
        horasBloqueadas.map((hora) =>
          fetch(`${API}/reservas/bloqueos?fecha=${encodeURIComponent(fechaCalendarioAdmin)}&hora=${encodeURIComponent(hora)}&barbero=${encodeURIComponent(barberoBloqueo?.nombre ?? "")}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
      );
      const filtroDesbloqueo = perfilActual === "todos" ? undefined : perfilActual;
      await cargarReservas(filtroDesbloqueo);
    } catch {
      alert("No se pudo desbloquear todo el día");
    } finally {
      setProcesandoMasivo(null);
    }
  };

  const parsearPrecio = (precio: string) => parseInt(precio.replace(/[^0-9]/g, "")) || 0;

  const parseMontoUSD = (valor: string) => {
    const cleaned = valor.replace(/[^0-9.]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  type PagoDetalle = {
    tipo: "sinpe" | "efectivo" | "mixto" | null;
    montoColones: number | null;
    montoSinpe?: number;
    montoEfectivo?: number;
    propinaMonto: number;
    dolaresMonto: number;
  };

  const parseMetodoPagoDetalle = (metodoRaw: string | null): PagoDetalle => {
    if (!metodoRaw) return { tipo: null, montoColones: null, propinaMonto: 0, dolaresMonto: 0 };
    const raw = metodoRaw.trim();
    if (raw === "sinpe" || raw === "efectivo") {
      return { tipo: raw, montoColones: null, propinaMonto: 0, dolaresMonto: 0 };
    }
    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw) as {
          tipo?: string;
          monto?: number | null;
          montoSinpe?: number | null;
          montoEfectivo?: number | null;
          monto_sinpe?: number | null;
          monto_efectivo?: number | null;
          propina?: { monto?: number } | null;
          dolares?: { monto?: number } | null;
        };
        if (parsed.tipo === "mixto") {
          const sinpe = parsed.montoSinpe ?? parsed.monto_sinpe ?? 0;
          const efectivo = parsed.montoEfectivo ?? parsed.monto_efectivo ?? 0;
          return {
            tipo: "mixto",
            montoColones: sinpe + efectivo,
            montoSinpe: sinpe,
            montoEfectivo: efectivo,
            propinaMonto: 0,
            dolaresMonto: 0,
          };
        }
        const tipo = parsed.tipo === "sinpe" || parsed.tipo === "efectivo" ? parsed.tipo : null;
        return {
          tipo,
          montoColones: typeof parsed.monto === "number" ? parsed.monto : null,
          propinaMonto: typeof parsed.propina?.monto === "number" ? parsed.propina.monto : 0,
          dolaresMonto: typeof parsed.dolares?.monto === "number" ? parsed.dolares.monto : 0,
        };
      } catch {
        return { tipo: null, montoColones: null, propinaMonto: 0, dolaresMonto: 0 };
      }
    }
    return { tipo: null, montoColones: null, propinaMonto: 0, dolaresMonto: 0 };
  };

  const esReservaMembresia = (r: Reserva) => r.metodo_pago === "membresia";

  const obtenerPrecioBaseReserva = (r: Reserva) => {
    if (esReservaMembresia(r)) return 0;
    const det = parseMetodoPagoDetalle(r.metodo_pago);
    if (det.tipo === "mixto") return (det.montoSinpe ?? 0) + (det.montoEfectivo ?? 0);
    return det.montoColones !== null ? det.montoColones : parsearPrecio(r.precio);
  };

  const obtenerIngresoColonesReserva = (r: Reserva) => {
    const det = parseMetodoPagoDetalle(r.metodo_pago);
    const base = obtenerPrecioBaseReserva(r);
    return base + det.propinaMonto + Math.round(det.dolaresMonto * tipoCambio);
  };

  const obtenerPropinaReserva = (r: Reserva) => parseMetodoPagoDetalle(r.metodo_pago).propinaMonto;
  const obtenerDolaresReserva = (r: Reserva) => parseMetodoPagoDetalle(r.metodo_pago).dolaresMonto;

  const obtenerAdicionalesReserva = (r: Reserva) => r.adicionales_precio ?? 0;

  const obtenerIngresoSinpeReserva = (r: Reserva) => {
    const det = parseMetodoPagoDetalle(r.metodo_pago);
    if (det.tipo === "sinpe") return det.montoColones ?? parsearPrecio(r.precio);
    if (det.tipo === "mixto") return det.montoSinpe ?? 0;
    return 0;
  };

  const obtenerIngresoEfectivoReserva = (r: Reserva) => {
    const det = parseMetodoPagoDetalle(r.metodo_pago);
    if (det.tipo === "efectivo") return det.montoColones ?? parsearPrecio(r.precio);
    if (det.tipo === "mixto") return det.montoEfectivo ?? 0;
    return 0;
  };

  const formatPagoDetalle = (r: Reserva) => {
    if (esReservaMembresia(r)) return "Membresía Club";
    const det = parseMetodoPagoDetalle(r.metodo_pago);
    const partes: string[] = [];

    if (det.tipo === "mixto") {
      if (det.montoSinpe) partes.push(`SINPE ₡${det.montoSinpe.toLocaleString("es-CR")}`);
      if (det.montoEfectivo) partes.push(`Efectivo ₡${det.montoEfectivo.toLocaleString("es-CR")}`);
    } else {
      const montoColones = obtenerPrecioBaseReserva(r);
      const tipoLabel = det.tipo === "sinpe" ? "SINPE" : det.tipo === "efectivo" ? "Efectivo" : null;
      if (tipoLabel) {
        partes.push(`${tipoLabel} ₡${montoColones.toLocaleString("es-CR")}`);
      } else {
        partes.push(`₡${montoColones.toLocaleString("es-CR")}`);
      }
      if (det.propinaMonto > 0) partes.push(`Propina ₡${det.propinaMonto.toLocaleString("es-CR")}`);
      if (det.dolaresMonto > 0) partes.push(`USD ${det.dolaresMonto.toFixed(2)}`);
    }

    return partes.join(" · ");
  };

  const hoy = new Date();
  const fechaHoy = hoy.toLocaleDateString("es-CR");

  const reservasActivas = reservas.filter((r) => r.estado !== "cancelada" && r.estado !== "bloqueado");
  const reservasConfirmadas = reservasActivas.filter((r) => r.estado === "confirmada");

  const fechaHoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const mesActualISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

  const esFechaSemanaISO = (f: string | null) => {
    if (!f) return false;
    const fecha = new Date(f + "T00:00:00");
    const inicio = new Date(hoy);
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - 6);
    return fecha >= inicio && fecha <= hoy;
  };

  const esFechaMesISO = (f: string | null, mes: number, anio: number) => {
    if (!f) return false;
    return f.startsWith(`${anio}-${String(mes).padStart(2, "0")}`);
  };

  const sillaHoy = pagosSilla.filter((p) => p.fecha === fechaHoyISO).reduce((t, p) => t + p.monto, 0);
  const sillaSemanaTotal = pagosSilla.filter((p) => esFechaSemanaISO(p.fecha)).reduce((t, p) => t + p.monto, 0);
  const sillaMes = pagosSilla.filter((p) => esFechaMesISO(p.fecha, mesIngresos.mes, mesIngresos.anio)).reduce((t, p) => t + p.monto, 0);

  const gastosHoy = gastos.filter((g) => g.fecha === fechaHoyISO).reduce((t, g) => t + g.monto, 0);
  const gastosSemanaTotal = gastos.filter((g) => esFechaSemanaISO(g.fecha)).reduce((t, g) => t + g.monto, 0);
  const gastosMes = gastos.filter((g) => esFechaMesISO(g.fecha, mesIngresos.mes, mesIngresos.anio)).reduce((t, g) => t + g.monto, 0);

  const gastosHoyLista = gastos.filter((g) => g.fecha === fechaHoyISO);
  const gastosSemanaLista = gastos.filter((g) => esFechaSemanaISO(g.fecha));
  const gastosMesLista = gastos.filter((g) => esFechaMesISO(g.fecha, mesIngresos.mes, mesIngresos.anio));

  const sillaMesActual = pagosSilla.filter((p) => p.fecha?.startsWith(mesActualISO)).reduce((t, p) => t + p.monto, 0);
  const gastosMesActual = gastos.filter((g) => g.fecha?.startsWith(mesActualISO)).reduce((t, g) => t + g.monto, 0);

  const fechaPagoISO = (f: string | null) => (f ? f.slice(0, 10) : null);
  const clubPagosHoy = clubPagos.filter((p) => fechaPagoISO(p.fecha) === fechaHoyISO).reduce((t, p) => t + p.monto, 0);
  const clubPagosSemana = clubPagos.filter((p) => esFechaSemanaISO(fechaPagoISO(p.fecha))).reduce((t, p) => t + p.monto, 0);
  const clubPagosMes = clubPagos.filter((p) => esFechaMesISO(fechaPagoISO(p.fecha), mesIngresos.mes, mesIngresos.anio)).reduce((t, p) => t + p.monto, 0);

  const clubPagosHoyLobo = clubPagos.filter((p) => p.barbero === "Alonso Lobo" && fechaPagoISO(p.fecha) === fechaHoyISO).reduce((t, p) => t + p.monto, 0);
  const clubPagosHoyIan = clubPagos.filter((p) => p.barbero === "Ian Bustos Navarrete" && fechaPagoISO(p.fecha) === fechaHoyISO).reduce((t, p) => t + p.monto, 0);
  const clubPagosSemanaLobo = clubPagos.filter((p) => p.barbero === "Alonso Lobo" && esFechaSemanaISO(fechaPagoISO(p.fecha))).reduce((t, p) => t + p.monto, 0);
  const clubPagosSemanaIan = clubPagos.filter((p) => p.barbero === "Ian Bustos Navarrete" && esFechaSemanaISO(fechaPagoISO(p.fecha))).reduce((t, p) => t + p.monto, 0);
  const clubPagosMesLobo = clubPagos.filter((p) => p.barbero === "Alonso Lobo" && esFechaMesISO(fechaPagoISO(p.fecha), mesIngresos.mes, mesIngresos.anio)).reduce((t, p) => t + p.monto, 0);
  const clubPagosMesIan = clubPagos.filter((p) => p.barbero === "Ian Bustos Navarrete" && esFechaMesISO(fechaPagoISO(p.fecha), mesIngresos.mes, mesIngresos.anio)).reduce((t, p) => t + p.monto, 0);

  const ingresosHoy = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerIngresoColonesReserva(r), 0) + sillaHoy + clubPagosHoy;

  const ingresosHoySinpe = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerIngresoSinpeReserva(r), 0);

  const ingresosHoyEfectivo = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerIngresoEfectivoReserva(r), 0);

  const propinasHoy = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerPropinaReserva(r), 0);

  const dolaresHoy = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerDolaresReserva(r), 0);

  const adicionalesHoy = reservasConfirmadas
    .filter((r) => r.fecha === fechaHoy)
    .reduce((t, r) => t + obtenerAdicionalesReserva(r), 0);

  const ingresosSemanales = (() => {
    const diasSemana: {[key: string]: number} = {};
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - 6);
    for (let i = 0; i <= 6; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const key = d.toLocaleDateString("es-CR");
      diasSemana[key] = reservasConfirmadas
        .filter((r) => r.fecha === key)
        .reduce((t, r) => t + obtenerIngresoColonesReserva(r), 0);
    }
    return diasSemana;
  })();

  const ingresosSemanaTotal = Object.values(ingresosSemanales).reduce((a, b) => a + b, 0) + sillaSemanaTotal + clubPagosSemana;

  const fechasSemanaKeys = Object.keys(ingresosSemanales);

  const propinasSemanaTotal = reservasConfirmadas
    .filter((r) => fechasSemanaKeys.includes(r.fecha))
    .reduce((t, r) => t + obtenerPropinaReserva(r), 0);

  const dolaresSemanaTotal = reservasConfirmadas
    .filter((r) => fechasSemanaKeys.includes(r.fecha))
    .reduce((t, r) => t + obtenerDolaresReserva(r), 0);

  const adicionalesSemanaTotal = reservasConfirmadas
    .filter((r) => fechasSemanaKeys.includes(r.fecha))
    .reduce((t, r) => t + obtenerAdicionalesReserva(r), 0);

  const esMesIngresos = (r: Reserva) => {
    const partes = r.fecha.split("/");
    return parseInt(partes[1]) === mesIngresos.mes && parseInt(partes[2]) === mesIngresos.anio;
  };

  const esMesActual = mesIngresos.mes === hoy.getMonth() + 1 && mesIngresos.anio === hoy.getFullYear();
  const nombreMesIngresos = MESES[mesIngresos.mes - 1];
  const tituloMesIngresos = esMesActual ? `Ingresos de ${nombreMesIngresos}` : `Ingresos de ${nombreMesIngresos} ${mesIngresos.anio}`;

  const anteriorMes = () => {
    if (mesIngresos.mes === 1) {
      setMesIngresos({ mes: 12, anio: mesIngresos.anio - 1 });
    } else {
      setMesIngresos({ mes: mesIngresos.mes - 1, anio: mesIngresos.anio });
    }
  };

  const siguienteMes = () => {
    if (esMesActual) return;
    if (mesIngresos.mes === 12) {
      setMesIngresos({ mes: 1, anio: mesIngresos.anio + 1 });
    } else {
      setMesIngresos({ mes: mesIngresos.mes + 1, anio: mesIngresos.anio });
    }
  };

  const ingresosMes = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerIngresoColonesReserva(r), 0) + sillaMes + clubPagosMes;

  const gananciaHoy = ingresosHoy - gastosHoy;
  const gananciaSemana = ingresosSemanaTotal - gastosSemanaTotal;
  const gananciaMes = ingresosMes - gastosMes;

  const propinasMes = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerPropinaReserva(r), 0);

  const dolaresMes = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerDolaresReserva(r), 0);

  const adicionalesMes = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerAdicionalesReserva(r), 0);

  const ingresosMesSinpe = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerIngresoSinpeReserva(r), 0);

  const ingresosMesEfectivo = reservasConfirmadas
    .filter(esMesIngresos)
    .reduce((t, r) => t + obtenerIngresoEfectivoReserva(r), 0);

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
      .filter((r) => r.fecha === fechaCalendarioAdmin && r.estado === "bloqueado" && r.barbero === barberoBloqueo?.nombre)
      .map((r) => r.hora),
  );
  const horariosReservadosDelDia = new Set(
    reservasDelDia.filter((r) => r.barbero === barberoBloqueo?.nombre).map((r) => r.hora),
  );
  const horariosDisponiblesParaBloquear = horariosBarbero.filter(
    (hora) => !horariosReservadosDelDia.has(hora) && !horariosBloqueadosDelDia.has(hora),
  );
  const qrMinutes = Math.floor(qrSecondsLeft / 60);
  const qrSeconds = String(qrSecondsLeft % 60).padStart(2, "0");
  const usuarioIan = usuarioInfo ? esCuentaIan(usuarioInfo.username, usuarioInfo.barbero) : false;

  return (
    <div className="min-h-screen bg-dark">

      {/* Perfil switcher — solo para admins */}
      {usuarioInfo && usuarioInfo.rol === "admin" && !usuarioIan && (
        <div className="bg-dark-card border-b border-dark-border px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Ver como:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PERFILES_BARBEROS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPerfilActual(p.id);
                    localStorage.setItem("perfil_actual", p.id);
                  }}
                  className={`text-xs uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all duration-300 font-bold ${
                    perfilActual === p.id
                      ? "bg-gold text-black border-gold"
                      : "border-dark-border text-gray-500 hover:border-gold hover:text-gold"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {perfilActual !== "todos" && (
              <span className="text-gold text-xs uppercase tracking-wider ml-auto">
                ▼ Mostrando: {perfilActual}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barra de barbero para cuentas barber */}
      {usuarioInfo && (usuarioInfo.rol === "barber" || usuarioIan) && (
        <div className="bg-dark-card border-b border-dark-border px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="text-gold font-black text-sm uppercase tracking-widest">
                {usuarioIan ? IAN_BARBERO : usuarioInfo.barbero}
            </span>
            <span className="text-gray-600 text-xs">— Reservas del barbero</span>
          </div>
        </div>
      )}

      {/* Modal de pago */}
      {modalReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background: "rgba(0,0,0,0.8)"}}>
          <div className="bg-dark-card border border-gold rounded-xl p-8 w-full max-w-md">
            <h3 className="text-white font-black text-xl mb-2">Corte Realizado</h3>
            {modalReserva.es_miembro_club ? (
              <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 p-5 text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-black uppercase tracking-widest text-black">💎 Membresía</span>
                <p className="text-gold text-sm font-bold">Este corte está cubierto por membresía Visionary Club</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-6">¿Cómo pagó el cliente?</p>
            )}

            <div className="bg-dark rounded-xl p-4 mb-6">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Resumen</p>
              <p className="text-white font-bold">{modalReserva.nombre}</p>
              <p className="text-gray-500 text-sm">{modalReserva.servicio}</p>
              {modalReserva.es_miembro_club ? (
                <p className="text-gold font-black text-xl mt-1">💎 Membresía Club</p>
              ) : (
                <p className="text-gold font-black text-xl mt-1">{modalReserva.precio}</p>
              )}
              {modalReserva.adicionales && modalReserva.adicionales !== "[]" && (
                <p className="text-gray-400 text-sm mt-1">
                  Adicionales: {parseAdicionales(modalReserva.adicionales)}
                  {modalReserva.adicionales_precio ? ` · ₡${modalReserva.adicionales_precio.toLocaleString("es-CR")}` : ""}
                </p>
              )}
            </div>

            {!modalReserva.es_miembro_club && (
              <>
            <div className="grid grid-cols-3 gap-3 mb-6">
  <button onClick={() => setMetodoPago("sinpe")} className={`p-3 rounded-xl border text-center transition-all duration-300 ${metodoPago === "sinpe" ? "border-gold bg-gold text-black" : "border-dark-border text-white hover:border-gold"}`}>
    <p className="font-black text-lg">📱</p>
    <p className="font-bold text-xs mt-1">SINPE</p>
  </button>
  <button onClick={() => setMetodoPago("efectivo")} className={`p-3 rounded-xl border text-center transition-all duration-300 ${metodoPago === "efectivo" ? "border-gold bg-gold text-black" : "border-dark-border text-white hover:border-gold"}`}>
    <p className="font-black text-lg">💵</p>
    <p className="font-bold text-xs mt-1">Efectivo</p>
  </button>
  <button onClick={() => setMetodoPago("mixto")} className={`p-3 rounded-xl border text-center transition-all duration-300 ${metodoPago === "mixto" ? "border-gold bg-gold text-black" : "border-dark-border text-white hover:border-gold"}`}>
    <p className="font-black text-lg">💳</p>
    <p className="font-bold text-xs mt-1">Mixto</p>
  </button>
</div>

{metodoPago === "mixto" && (
  <div className="flex flex-col gap-3 mb-4">
    <div>
      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Monto SINPE (₡)</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Ej: ₡2000"
        value={montoPagoMetodo}
        onChange={(e) => setMontoPagoMetodo(e.target.value)}
        className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
      />
    </div>
    <div>
      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Monto Efectivo (₡)</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Ej: ₡2000"
        value={montoMixtoEfectivo}
        onChange={(e) => setMontoMixtoEfectivo(e.target.value)}
        className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
      />
    </div>
    <div className="bg-dark rounded-xl p-3 border border-gold">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total recibido</p>
      <p className="text-gold font-black text-xl">
        ₡{(parsearPrecio(montoPagoMetodo) + parsearPrecio(montoMixtoEfectivo)).toLocaleString("es-CR")}
      </p>
    </div>
  </div>
)}

            <div className="flex flex-col gap-4 mb-6">
            {metodoPago !== "mixto" && !tieneDolares && (
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                  Monto recibido en {metodoPago === "sinpe" ? "SINPE" : "EFECTIVO"} (₡)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: ₡4000"
                  value={montoPagoMetodo}
                  onChange={(e) => setMontoPagoMetodo(e.target.value)}
                  disabled={!metodoPago}
                  className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors disabled:opacity-60"
                />
              </div>
            )}

            {metodoPago !== "mixto" && tieneDolares && (
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                  Monto recibido en dólares (USD)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 20"
                  value={montoDolares}
                  onChange={(e) => setMontoDolares(e.target.value)}
                  disabled={!metodoPago}
                  className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors disabled:opacity-60"
                />
              </div>
            )}

              {metodoPago !== "mixto" && (
              <>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tienePropina}
                    onChange={(e) => setTienePropina(e.target.checked)}
                    className="accent-gold"
                  />
                  ¿Dieron propina?
                </label>
              </div>
              {tienePropina && (
                <div>
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                    Monto de propina (₡)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: ₡500"
                    value={montoPropina}
                    onChange={(e) => setMontoPropina(e.target.value)}
                    className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneDolares}
                    onChange={(e) => {
                      setTieneDolares(e.target.checked);
                      if (e.target.checked) setMontoPagoMetodo("");
                      else setMontoDolares("");
                    }}
                    className="accent-gold"
                  />
                  ¿Pagaron en dólares?
                </label>
              </div>
              </>
              )}
            </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalReserva(null);
                  setMetodoPago(null);
                  setMontoPagoMetodo("");
                  setMontoMixtoEfectivo("");
                  setTienePropina(false);
                  setMontoPropina("");
                  setTieneDolares(false);
                  setMontoDolares("");
                }}
                className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl hover:border-gold transition-all"
              >
                Cancelar
              </button>
              <button onClick={confirmarPago} disabled={!metodoPago} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3 disabled:opacity-50">
                {modalReserva.es_miembro_club ? "Confirmar Membresía" : "Confirmar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Sellos */}
      {modalQrSellos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background: "rgba(0,0,0,0.8)"}}>
          <div className="bg-dark-card border border-gold rounded-3xl p-6 w-full max-w-md shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-gold text-xs font-semibold uppercase tracking-[0.35em]">Visionary Studio</p>
                <h3 className="text-white font-black text-2xl uppercase tracking-widest mt-3">QR de Sellos</h3>
                <p className="text-gray-500 text-sm leading-6 mt-2">
                  Muestra este codigo al cliente. Se renueva automaticamente cada 5 minutos.
                </p>
              </div>
              <button
                onClick={() => setModalQrSellos(false)}
                className="border border-dark-border text-gray-500 text-xs uppercase tracking-widest px-3 py-2 rounded-xl hover:border-gold hover:text-gold transition-all"
                aria-label="Cerrar QR de sellos"
              >
                X
              </button>
            </div>

            <div className="mt-6 rounded-3xl bg-white p-5">
              {qrSellos && !cargandoQrSellos ? (
                <QRCode value={qrSellos.qr_url} className="h-auto w-full" />
              ) : (
                <div className="aspect-square animate-pulse rounded-2xl bg-black/10" />
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-dark-border bg-dark p-4 text-center">
              <p className="text-gray-500 text-xs uppercase tracking-[0.25em]">Se renueva en</p>
              <p className="text-gold font-black text-4xl mt-2">
                {qrMinutes}:{qrSeconds}
              </p>
            </div>

            {errorQrSellos && <p className="mt-4 text-sm text-red-300">{errorQrSellos}</p>}

            <button
              onClick={() => cargarQrSellos(qrSellosBarbero)}
              className="btn-gold w-full text-sm uppercase tracking-widest py-3 mt-5"
            >
              Generar nuevo QR
            </button>
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
        <div className="flex gap-3 flex-wrap justify-end">
          <Link href="/" className="btn-outline text-xs uppercase tracking-widest px-4 py-2">Ver Página</Link>
          <button onClick={() => setModalQrSellos(true)} className="btn-outline text-xs uppercase tracking-widest px-4 py-2">QR Sellos</button>
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
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Tabs regulares */}
          <div className="flex gap-2 flex-wrap">
            {VISTAS.filter((v) => !VISTAS_LOBO.has(v.id) && v.id !== "club").map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} className={`text-xs uppercase tracking-widest px-4 py-2 rounded-xl border transition-all duration-300 ${vista === v.id ? "bg-gold text-black border-gold font-bold" : "border-dark-border text-gray-500 hover:border-gold"}`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Club (disponible para todos) + Silla/Gastos (solo Lobo) */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block h-8 w-px bg-dark-border" aria-hidden="true" />
            <button
              onClick={() => setVista("club")}
              className={`flex items-center gap-2 text-sm font-black uppercase tracking-widest px-6 py-3 rounded-2xl border-2 transition-all duration-300 shadow-[0_0_20px_rgba(224,184,76,0.4)] ${vista === "club" ? "bg-gold text-black border-gold" : "bg-transparent text-gold border-gold hover:bg-gold hover:text-black hover:shadow-[0_0_28px_rgba(224,184,76,0.55)]"}`}
            >
              <span className="text-base">💎</span>
              <span>Visionary Club</span>
            </button>
            {usuarioInfo?.rol === "admin" && !usuarioIan && (
              <>
                <button
                  onClick={() => setVista("silla")}
                  className={`text-xs uppercase tracking-widest px-4 py-2 rounded-xl border font-bold transition-all duration-300 ${vista === "silla" ? "bg-gold text-black border-gold" : "border-gold text-gold hover:bg-gold hover:text-black"}`}
                >
                  Silla
                </button>
                <button
                  onClick={() => setVista("gastos")}
                  className={`text-xs uppercase tracking-widest px-4 py-2 rounded-xl border font-bold transition-all duration-300 ${vista === "gastos" ? "bg-gold text-black border-gold" : "border-gold text-gold hover:bg-gold hover:text-black"}`}
                >
                  Gastos
                </button>
              </>
            )}
          </div>
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
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-dark-card border border-gold rounded-xl p-6 sm:col-span-2">
                    <p className="text-gold text-xs uppercase tracking-wider mb-2">Ingresos de Hoy</p>
                    <p className="text-white font-black text-4xl">₡{ingresosHoy.toLocaleString("es-CR")}</p>
                    <p className="text-gray-500 text-sm mt-2">{reservasConfirmadas.filter((r) => r.fecha === fechaHoy).length} cortes realizados hoy</p>
                    <p className="text-gray-600 text-xs mt-1">Incluye propinas y dólares convertidos · TC: ₡{tipoCambio.toFixed(0)}/USD</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SINPE</p>
                      <p className="text-white font-black text-xl">₡{ingresosHoySinpe.toLocaleString("es-CR")}</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Efectivo</p>
                      <p className="text-white font-black text-xl">₡{ingresosHoyEfectivo.toLocaleString("es-CR")}</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Propinas</p>
                      <p className="text-white font-black text-xl">₡{propinasHoy.toLocaleString("es-CR")}</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Dólares</p>
                      <p className="text-white font-black text-xl">${dolaresHoy.toFixed(2)}</p>
                      {dolaresHoy > 0 && <p className="text-gray-600 text-xs mt-1">≈ ₡{Math.round(dolaresHoy * tipoCambio).toLocaleString("es-CR")}</p>}
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Adicionales</p>
                      <p className="text-white font-black text-xl">₡{adicionalesHoy.toLocaleString("es-CR")}</p>
                    </div>
                    {usuarioInfo?.rol === "admin" && !usuarioIan && (
                      <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Silla</p>
                        <p className="text-white font-black text-xl">₡{sillaHoy.toLocaleString("es-CR")}</p>
                      </div>
                    )}
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Membresías</p>
                      <p className="text-white font-black text-xl">₡{clubPagosHoy.toLocaleString("es-CR")}</p>
                      {!barberoClubActual && (
                        <p className="text-gray-500 text-xs mt-1">Lobo ₡{clubPagosHoyLobo.toLocaleString("es-CR")} · Ian ₡{clubPagosHoyIan.toLocaleString("es-CR")}</p>
                      )}
                    </div>
                  </div>
                </div>
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GastosSeccion total={gastosHoy} lista={gastosHoyLista} />
                )}
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GananciaNetaCard total={gananciaHoy} ingresos={ingresosHoy} gastos={gastosHoy} />
                )}
              </div>
            )}

            {periodoIngresos === "semana" && (
              <div className="flex flex-col gap-4">
                <div className="bg-dark-card border border-gold rounded-xl p-6">
                  <p className="text-gold text-xs uppercase tracking-wider mb-2">Total esta semana</p>
                  <p className="text-white font-black text-4xl">₡{ingresosSemanaTotal.toLocaleString("es-CR")}</p>
                  <p className="text-gray-600 text-xs mt-2">Incluye propinas y dólares convertidos · TC: ₡{tipoCambio.toFixed(0)}/USD</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Propinas</p>
                    <p className="text-white font-black text-xl">₡{propinasSemanaTotal.toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Dólares</p>
                    <p className="text-white font-black text-xl">${dolaresSemanaTotal.toFixed(2)}</p>
                    {dolaresSemanaTotal > 0 && <p className="text-gray-600 text-xs mt-1">≈ ₡{Math.round(dolaresSemanaTotal * tipoCambio).toLocaleString("es-CR")}</p>}
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Adicionales</p>
                    <p className="text-white font-black text-xl">₡{adicionalesSemanaTotal.toLocaleString("es-CR")}</p>
                  </div>
                  {usuarioInfo?.rol === "admin" && !usuarioIan && (
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Silla</p>
                      <p className="text-white font-black text-xl">₡{sillaSemanaTotal.toLocaleString("es-CR")}</p>
                    </div>
                  )}
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Membresías</p>
                    <p className="text-white font-black text-xl">₡{clubPagosSemana.toLocaleString("es-CR")}</p>
                    {!barberoClubActual && (
                      <p className="text-gray-500 text-xs mt-1">Lobo ₡{clubPagosSemanaLobo.toLocaleString("es-CR")} · Ian ₡{clubPagosSemanaIan.toLocaleString("es-CR")}</p>
                    )}
                  </div>
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
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GastosSeccion total={gastosSemanaTotal} lista={gastosSemanaLista} />
                )}
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GananciaNetaCard total={gananciaSemana} ingresos={ingresosSemanaTotal} gastos={gastosSemanaTotal} />
                )}
              </div>
            )}

            {periodoIngresos === "mes" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center gap-4">
                  <button onClick={anteriorMes} className="text-gold hover:text-white transition-colors px-3 py-2 text-lg border border-dark-border rounded-lg">←</button>
                  <p className="text-gold text-xs tracking-[3px] uppercase text-center min-w-[160px]">
                    {nombreMesIngresos} {mesIngresos.anio}
                  </p>
                  <button onClick={siguienteMes} disabled={esMesActual} className="text-gold hover:text-white transition-colors px-3 py-2 text-lg border border-dark-border rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">→</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-dark-card border border-gold rounded-xl p-6 sm:col-span-2">
                    <p className="text-gold text-xs uppercase tracking-wider mb-2">{tituloMesIngresos}</p>
                    <p className="text-white font-black text-4xl">₡{ingresosMes.toLocaleString("es-CR")}</p>
                    <p className="text-gray-500 text-sm mt-2">{reservasConfirmadas.filter(esMesIngresos).length} cortes realizados este mes</p>
                  <p className="text-gray-600 text-xs mt-1">Incluye propinas y dólares convertidos · TC: ₡{tipoCambio.toFixed(0)}/USD</p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SINPE</p>
                    <p className="text-white font-black text-xl">₡{ingresosMesSinpe.toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Efectivo</p>
                    <p className="text-white font-black text-xl">₡{ingresosMesEfectivo.toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Propinas</p>
                    <p className="text-white font-black text-xl">₡{propinasMes.toLocaleString("es-CR")}</p>
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Dólares</p>
                    <p className="text-white font-black text-xl">${dolaresMes.toFixed(2)}</p>
                    {dolaresMes > 0 && <p className="text-gray-600 text-xs mt-1">≈ ₡{Math.round(dolaresMes * tipoCambio).toLocaleString("es-CR")}</p>}
                  </div>
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Adicionales</p>
                    <p className="text-white font-black text-xl">₡{adicionalesMes.toLocaleString("es-CR")}</p>
                  </div>
                  {usuarioInfo?.rol === "admin" && !usuarioIan && (
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Silla</p>
                      <p className="text-white font-black text-xl">₡{sillaMes.toLocaleString("es-CR")}</p>
                    </div>
                  )}
                  <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Membresías</p>
                    <p className="text-white font-black text-xl">₡{clubPagosMes.toLocaleString("es-CR")}</p>
                    {!barberoClubActual && (
                      <p className="text-gray-500 text-xs mt-1">Lobo ₡{clubPagosMesLobo.toLocaleString("es-CR")} · Ian ₡{clubPagosMesIan.toLocaleString("es-CR")}</p>
                    )}
                  </div>
                </div>
                </div>
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GastosSeccion total={gastosMes} lista={gastosMesLista} />
                )}
                {usuarioInfo?.rol === "admin" && !usuarioIan && (
                  <GananciaNetaCard total={gananciaMes} ingresos={ingresosMes} gastos={gastosMes} />
                )}
              </div>
            )}

          </div>

        ) : vista === "lista" ? (

          /* Vista Lista */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <input type="text" placeholder="Buscar por nombre, teléfono o servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-dark-card border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold transition-colors flex-1" />
              <div className="flex gap-2 flex-wrap">
                {["todas", "pendiente", "confirmada"].map((f) => (
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
                    <p className="text-white font-bold">{esReservaClub(reserva) ? "💎 " : ""}{reserva.nombre}</p>
                    <p className="text-gray-500 text-sm">{reserva.telefono}</p>
                    <p className="text-gray-500 text-sm">{reserva.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Servicio</p>
                    <p className="text-white font-bold">{reserva.servicio}</p>
                    {reserva.es_miembro_club ? (
                      <>
                        <span className="mt-1 inline-block text-xs font-black uppercase tracking-widest px-2 py-1 rounded-full bg-gold text-black">💎 Membresía</span>
                        <p className="text-gold text-xs mt-1">Pagado por membresía Club</p>
                      </>
                    ) : (
                      <p className="text-gold text-sm font-bold">{reserva.precio}</p>
                    )}
                    {reserva.adicionales && reserva.adicionales !== "[]" && (
                      <p className="text-violet-300 text-xs mt-1">+ {parseAdicionales(reserva.adicionales)}</p>
                    )}
                    {reserva.metodo_pago && (
                      <span className="text-xs text-gray-500 capitalize">
                        Pago: {formatPagoDetalle(reserva)}
                      </span>
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

        ) : vista === "canceladas" ? (

          /* Vista Canceladas */
          (() => {
            const limite = new Date(Date.now() - DIAS_RETENCION_CANCELADAS * 24 * 60 * 60 * 1000);
            const canceladasVisibles = reservas
              .filter((r) => r.estado === "cancelada")
              .filter((r) => {
                if (!r.cancelada_en) return true;
                return new Date(r.cancelada_en) >= limite;
              })
              .sort((a, b) => {
                const ta = a.cancelada_en ? new Date(a.cancelada_en).getTime() : 0;
                const tb = b.cancelada_en ? new Date(b.cancelada_en).getTime() : 0;
                return tb - ta;
              });

            const diasRestantes = (cancelada_en: string | null) => {
              if (!cancelada_en) return DIAS_RETENCION_CANCELADAS;
              const diff = Math.ceil((new Date(cancelada_en).getTime() + DIAS_RETENCION_CANCELADAS * 86400000 - Date.now()) / 86400000);
              return Math.max(0, diff);
            };

            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 text-xs uppercase tracking-widest">
                    {canceladasVisibles.length === 0 ? "Sin canceladas recientes" : `${canceladasVisibles.length} cancelada${canceladasVisibles.length !== 1 ? "s" : ""} — últimos ${DIAS_RETENCION_CANCELADAS} días`}
                  </p>
                </div>

                {canceladasVisibles.length === 0 ? (
                  <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
                    <p className="text-gray-500">No hay reservas canceladas recientes</p>
                  </div>
                ) : canceladasVisibles.map((reserva) => {
                  const restantes = diasRestantes(reserva.cancelada_en);
                  return (
                    <div key={reserva.id} className="bg-dark-card border border-red-900 rounded-xl p-6 opacity-80">
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
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Cita</p>
                          <p className="text-white font-bold">{reserva.fecha}</p>
                          <p className="text-gray-500 text-sm">{reserva.hora}</p>
                          {reserva.cancelada_en && (
                            <p className="text-red-400 text-xs mt-1">
                              Cancelada: {new Date(reserva.cancelada_en).toLocaleDateString("es-CR")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full text-center font-bold ${restantes <= 1 ? "bg-red-950 text-red-400" : "bg-red-900 text-red-300"}`}>
                            {restantes === 0 ? "Expira hoy" : `${restantes}d restantes`}
                          </span>
                          <a href={`https://wa.me/506${reserva.telefono.replace(/[^0-9]/g, "")}`} target="_blank" className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all duration-300 text-center">
                            WhatsApp
                          </a>
                          <button onClick={() => restaurarReserva(reserva.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-gold text-gold hover:bg-gold hover:text-black transition-all duration-300">
                            Restaurar
                          </button>
                          <button onClick={() => eliminarReserva(reserva.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all duration-300">
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()

        ) : vista === "reseñas" ? (

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-xs uppercase tracking-widest">
                {reseñas.length} reseñ{reseñas.length !== 1 ? "as" : "a"}
              </p>
            </div>

            {cargandoReseñas ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
                <p className="text-gray-500">Cargando...</p>
              </div>
            ) : reseñas.length === 0 ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
                <p className="text-gray-500">No hay reseñas publicadas</p>
              </div>
            ) : reseñas.map((r) => (
              <div key={r.id} className="bg-dark-card border border-dark-border rounded-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                        <span className="text-gold font-black text-sm">{r.nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold">{r.nombre}</p>
                        <p className="text-gray-600 text-xs">
                          {new Date(r.creado_en).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex gap-0.5 ml-2">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < r.calificacion ? "text-gold" : "text-dark-border"}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{r.comentario}</p>
                  </div>
                  <button
                    onClick={() => eliminarResena(r.id)}
                    className="text-red-400 hover:text-red-300 transition-colors text-xs uppercase tracking-widest border border-red-800 rounded-lg px-3 py-2 hover:bg-red-900 shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

        ) : vista === "club" ? (

          /* Vista Club */
          <div className="flex flex-col gap-6">
            {cargandoClub ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl">
                <p className="text-gray-500">Cargando Visionary Club...</p>
              </div>
            ) : (
              <>
                {/* Estadísticas */}
                {statsClub && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-dark-card border border-gold rounded-xl p-5">
                      <p className="text-gold text-xs uppercase tracking-wider mb-2">Miembros activos</p>
                      <p className="text-white font-black text-3xl">{statsClub.miembros_activos}</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Pagos del mes</p>
                      <p className="text-white font-black text-3xl">₡{statsClub.pagos_mes_total.toLocaleString("es-CR")}</p>
                      <p className="text-gray-600 text-xs mt-1">{statsClub.pagos_mes_cantidad} pagos</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Servicios del mes</p>
                      <p className="text-white font-black text-3xl">{statsClub.servicios_mes}</p>
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Vencen en 7 días</p>
                      <p className="text-white font-black text-3xl">{statsClub.por_vencer.length}</p>
                    </div>
                  </div>
                )}

                {statsClub && statsClub.por_vencer.length > 0 && (
                  <div className="bg-dark-card border border-amber-700 rounded-xl p-5">
                    <p className="text-amber-400 text-xs uppercase tracking-wider mb-3">Miembros por vencer (próximos 7 días)</p>
                    <div className="flex flex-wrap gap-2">
                      {statsClub.por_vencer.map((m) => (
                        <span key={m.id} className="text-xs rounded-full border border-amber-700 text-amber-300 px-3 py-1">
                          {m.nombre} · vence {m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString("es-CR") : "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mantenimiento: corregir marcado de membresía en reservas pendientes */}
                {usuarioInfo?.rol === "admin" && (
                  <div className="bg-dark-card border border-dark-border rounded-xl p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-gold text-xs uppercase tracking-widest">Mantenimiento</p>
                        <p className="text-gray-500 text-xs mt-1">Corrige el marcado de membresía en reservas pendientes creadas antes de la actualización.</p>
                      </div>
                      <button
                        onClick={corregirReservasPendientes}
                        disabled={backfillLoading}
                        className="btn-outline text-xs uppercase tracking-widest px-4 py-2 disabled:opacity-50"
                      >
                        {backfillLoading ? "Corrigiendo..." : "Corregir reservas pendientes"}
                      </button>
                    </div>
                    {backfillResult && <p className="text-gold text-sm mt-2">{backfillResult}</p>}
                  </div>
                )}

                {/* Planes */}
                <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                  <h3 className="text-gold text-xs uppercase tracking-widest mb-4">Planes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planes.map((plan) => (
                      <div key={plan.id} className={`rounded-xl border p-4 ${plan.activo ? "border-gold" : "border-dark-border opacity-70"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white font-bold">{plan.nombre}</p>
                          <div className="flex items-center gap-2">
                            {usuarioInfo?.rol === "admin" && (
                              <>
                                <button
                                  onClick={() => {
                                    setModalEditarPlan(plan);
                                    setFormPlan({ precio: String(plan.precio), cortes: String(plan.servicios.cortes), barbas: String(plan.servicios.barbas) });
                                  }}
                                  className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-dark-border text-gray-400 hover:border-gold hover:text-gold"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => togglePlan(plan.id)}
                                  className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full border font-bold ${plan.activo ? "border-red-800 text-red-400 hover:bg-red-900" : "border-green-700 text-green-400 hover:bg-green-900"}`}
                                >
                                  {plan.activo ? "Desactivar" : "Activar"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-gold font-black text-xl mt-2">₡{plan.precio.toLocaleString("es-CR")}<span className="text-gray-500 text-xs font-normal">/mes</span></p>
                        <p className="text-gray-500 text-sm mt-2">✂️ {plan.servicios.cortes} cortes · 🪒 {plan.servicios.barbas} barbas</p>
                        <p className="text-gray-600 text-xs mt-1">{plan.cupo_max ? `${plan.miembros_activos}/${plan.cupo_max} miembros` : `${plan.miembros_activos} miembros activos`}</p>
                        <p className="text-gray-600 text-xs mt-1">🎁 {plan.promo_restantes} mascarillas de regalo restantes</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Miembros */}
                <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h3 className="text-gold text-xs uppercase tracking-widest">Miembros</h3>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setModalNuevoMiembro(true)} className="btn-gold text-xs uppercase tracking-widest px-4 py-2">Nuevo miembro</button>
                      <button onClick={() => setModalEscanearQr(true)} className="btn-outline text-xs uppercase tracking-widest px-4 py-2">Escanear QR</button>
                      <button onClick={exportarMiembrosCsv} className="btn-outline text-xs uppercase tracking-widest px-4 py-2">Exportar CSV</button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input type="text" placeholder="Buscar por nombre o teléfono..." value={busquedaMiembro} onChange={(e) => setBusquedaMiembro(e.target.value)} className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1" />
                    <select value={filtroEstadoClub} onChange={(e) => setFiltroEstadoClub(e.target.value)} className="bg-dark border border-dark-border rounded-xl px-3 py-2 text-gray-400 text-sm focus:outline-none focus:border-gold">
                      <option value="todas">Todos</option>
                      <option value="activo">Activos</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="vencido">Vencidos</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3">
                    {miembros
                      .filter((m) => filtroEstadoClub === "todas" || m.estado === filtroEstadoClub)
                      .filter((m) => busquedaMiembro === "" || m.nombre.toLowerCase().includes(busquedaMiembro.toLowerCase()) || m.telefono.includes(busquedaMiembro))
                      .map((m) => (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-dark-border p-4">
                          <div className="flex-1">
                            <p className="text-white font-bold flex items-center gap-2">
                              {m.nombre}
                              {!barberoClubActual && (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold/20 text-[10px] font-black text-gold">
                                  {m.barbero === "Alonso Lobo" ? "L" : "I"}
                                </span>
                              )}
                            </p>
                            <p className="text-gray-500 text-sm">{m.telefono} · {m.plan_nombre || "—"}</p>
                            <p className="text-gray-600 text-xs mt-1">✂️ {m.balance.cortes} · 🪒 {m.balance.barbas} · 🧖 {m.balance.mascarilla}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full font-bold ${m.estado === "activo" ? "bg-gold text-black" : m.estado === "vencido" ? "bg-red-900 text-red-300" : "bg-dark-surface text-gray-400"}`}>
                              {m.estado}
                            </span>
                            <button onClick={() => abrirDetalleMiembro(m.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-dark-border text-gray-400 hover:border-gold hover:text-gold">Detalle</button>
                            <button onClick={() => { setFormPago({ metodo: "sinpe", monto: String(m.plan_precio ?? ""), referencia: "" }); setModalPagoMiembro(m); }} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900">Registrar pago y activar</button>
                            <button onClick={() => enlaceWhatsAppMiembro(m)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900">WhatsApp</button>
                            {m.estado === "suspendido" ? (
                              <button onClick={() => cambiarEstadoMiembro(m.id, "activo")} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-gold text-gold hover:bg-gold hover:text-black">Reactivar</button>
                            ) : (
                              <button onClick={() => cambiarEstadoMiembro(m.id, "suspendido")} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900">Suspender</button>
                            )}
                          </div>
                        </div>
                      ))}
                    {miembros.length === 0 && <p className="text-gray-500 text-sm">No hay miembros registrados.</p>}
                  </div>
                </div>

                {/* Friends 5 */}
                <div className="bg-dark-card border border-dark-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h3 className="text-gold text-xs uppercase tracking-widest">Visionary Friends 5</h3>
                    <button onClick={() => setModalGrupo(true)} className="btn-gold text-xs uppercase tracking-widest px-4 py-2">Crear grupo</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {grupos.map((g) => (
                      <div key={g.id} className="rounded-xl border border-dark-border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white font-bold">{g.nombre_grupo}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full font-bold ${g.activo ? "bg-gold text-black" : "bg-red-900 text-red-300"}`}>
                              {g.activo ? "Activo" : "Inactivo"}
                            </span>
                            <span className="text-gold font-black">₡{g.pago_total.toLocaleString("es-CR")}</span>
                            <button
                              onClick={() => toggleGrupo(g.id)}
                              className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full border font-bold ${g.activo ? "border-red-800 text-red-400 hover:bg-red-900" : "border-gold text-gold hover:bg-gold hover:text-black"}`}
                            >
                              {g.activo ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                          {g.fecha_pago ? new Date(g.fecha_pago).toLocaleDateString("es-CR") : "—"} · {g.miembros.length} miembros
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {g.miembros.map((m) => (
                            <span key={m.id} className="text-xs rounded-full bg-dark-surface px-3 py-1 text-gray-400">{m.nombre}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {grupos.length === 0 && <p className="text-gray-500 text-sm">No hay grupos registrados.</p>}
                  </div>
                </div>
              </>
            )}

            {/* Modal detalle miembro */}
            {modalDetalleMiembro && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gold text-xs uppercase tracking-widest">Miembro</p>
                      <h3 className="text-white font-black text-2xl mt-1">{modalDetalleMiembro.nombre}</h3>
                      <p className="text-gray-500 text-sm">{modalDetalleMiembro.telefono} · {modalDetalleMiembro.plan_nombre || "—"}</p>
                    </div>
                    <button onClick={() => setModalDetalleMiembro(null)} className="border border-dark-border text-gray-500 text-xs px-3 py-2 rounded-xl">X</button>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-dark p-3 text-center"><p className="text-lg">✂️</p><p className="text-2xl font-black text-gold">{modalDetalleMiembro.balance.cortes}</p><p className="text-xs text-gray-500">Cortes</p></div>
                    <div className="rounded-xl bg-dark p-3 text-center"><p className="text-lg">🪒</p><p className="text-2xl font-black text-gold">{modalDetalleMiembro.balance.barbas}</p><p className="text-xs text-gray-500">Barbas</p></div>
                    <div className="rounded-xl bg-dark p-3 text-center"><p className="text-lg">🧖</p><p className="text-2xl font-black text-gold">{modalDetalleMiembro.balance.mascarilla}</p><p className="text-xs text-gray-500">Mascarilla</p></div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gold text-xs uppercase tracking-widest">Servicios extra</p>
                      <button onClick={() => setMostrarFormExtra((v) => !v)} className="text-xs uppercase tracking-widest px-3 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-black">
                        {mostrarFormExtra ? "Cancelar" : "Agregar servicio extra"}
                      </button>
                    </div>

                    {(modalDetalleMiembro.servicios_extra || []).length === 0 && !mostrarFormExtra ? (
                      <p className="text-gray-600 text-sm">Sin servicios extra.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {(modalDetalleMiembro.servicios_extra || []).map((e) => (
                          <div key={e.id} className="flex items-center justify-between rounded-lg border border-dark-border bg-dark px-3 py-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-gray-300 text-sm capitalize">{e.servicio}</span>
                              <span className="text-gray-500 text-xs">₡{e.monto.toLocaleString("es-CR")}</span>
                              <span className={`text-xs font-bold uppercase ${e.pagado ? "text-green-400" : "text-gray-500"}`}>{e.pagado ? `Pagado${e.metodo ? ` · ${e.metodo}` : ""}` : "Regalo"}</span>
                              {e.nota && <span className="text-gray-600 text-xs">· {e.nota}</span>}
                            </div>
                            <button onClick={() => eliminarServicioExtra(e.id)} className="text-xs uppercase tracking-widest px-2 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 shrink-0 ml-2">Eliminar</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {mostrarFormExtra && (
                      <div className="mt-3 rounded-xl border border-dark-border bg-dark p-4 flex flex-col gap-3">
                        <div>
                          <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Servicio</label>
                          <select value={formServicioExtra.servicio} onChange={(e) => setFormServicioExtra({ ...formServicioExtra, servicio: e.target.value })} className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold">
                            <option value="corte">Corte</option>
                            <option value="barba">Barba</option>
                            <option value="mascarilla">Mascarilla</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Monto (₡, 0 si es regalo)</label>
                          <input type="text" inputMode="numeric" value={formServicioExtra.monto} onChange={(e) => setFormServicioExtra({ ...formServicioExtra, monto: e.target.value })} placeholder="Ej: 4000" className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold" />
                        </div>
                        <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
                          <input type="checkbox" checked={formServicioExtra.pagado} onChange={(e) => setFormServicioExtra({ ...formServicioExtra, pagado: e.target.checked })} className="accent-gold" />
                          ¿Pagado?
                        </label>
                        {formServicioExtra.pagado && (
                          <div>
                            <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Método</label>
                            <select value={formServicioExtra.metodo} onChange={(e) => setFormServicioExtra({ ...formServicioExtra, metodo: e.target.value })} className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold">
                              <option value="sinpe">SINPE</option>
                              <option value="efectivo">Efectivo</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="text-gray-500 text-xs uppercase tracking-wider mb-1 block">Nota (opcional)</label>
                          <input type="text" value={formServicioExtra.nota} onChange={(e) => setFormServicioExtra({ ...formServicioExtra, nota: e.target.value })} className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold" />
                        </div>
                        <button onClick={agregarServicioExtra} className="btn-gold text-xs uppercase tracking-widest py-2">Agregar</button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-500 text-sm mt-4">Vigencia: {modalDetalleMiembro.fecha_inicio ? new Date(modalDetalleMiembro.fecha_inicio).toLocaleDateString("es-CR") : "—"} → {modalDetalleMiembro.fecha_vencimiento ? new Date(modalDetalleMiembro.fecha_vencimiento).toLocaleDateString("es-CR") : "—"}</p>
                  <p className="text-gray-600 text-xs mt-2">Estado: <span className="uppercase font-bold">{modalDetalleMiembro.estado}</span></p>
                  <div className="mt-4">
                    <button onClick={() => regenerarQr(modalDetalleMiembro.id)} className="text-xs uppercase tracking-widest px-3 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-black">Regenerar QR</button>
                  </div>

                  <div className="mt-5">
                    <p className="text-gold text-xs uppercase tracking-widest mb-2">Pagos</p>
                    {(modalDetalleMiembro.pagos || []).length === 0 ? <p className="text-gray-600 text-sm">Sin pagos registrados.</p> : (modalDetalleMiembro.pagos || []).map((p) => (
                      <div key={p.id} className="flex justify-between text-sm py-1 border-b border-dark-border">
                        <span className="text-gray-400">{p.fecha ? new Date(p.fecha).toLocaleDateString("es-CR") : "—"} · {p.metodo}</span>
                        <span className="text-gold font-bold">₡{p.monto.toLocaleString("es-CR")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <p className="text-gold text-xs uppercase tracking-widest mb-2">Consumos</p>
                    {(modalDetalleMiembro.consumos || []).length === 0 ? <p className="text-gray-600 text-sm">Sin consumos registrados.</p> : (modalDetalleMiembro.consumos || []).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-dark-border">
                        <span className={`${c.anulado ? "text-gray-600 line-through" : "text-gray-400"}`}>{c.servicio} · {c.fecha ? new Date(c.fecha).toLocaleString("es-CR") : "—"}</span>
                        <div className="flex items-center gap-2">
                          {c.anulado ? (
                            <span className="text-red-400 text-xs">{c.motivo_anulacion || "Anulado"}</span>
                          ) : (
                            <button onClick={() => anularConsumo(c.id)} className="text-xs uppercase tracking-widest px-2 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all">
                              Anular
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal pago */}
            {modalPagoMiembro && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-white font-black text-xl">Registrar pago y activar</h3>
                  <p className="text-gray-500 text-sm mt-1">{modalPagoMiembro.nombre} · {modalPagoMiembro.plan_nombre || "—"}</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Método</label>
                      <select value={formPago.metodo} onChange={(e) => setFormPago({ ...formPago, metodo: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold">
                        <option value="sinpe">SINPE</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Monto (₡)</label>
                      <input type="text" inputMode="numeric" value={formPago.monto} onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Referencia (opcional)</label>
                      <input type="text" value={formPago.referencia} onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalPagoMiembro(null)} className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl">Cancelar</button>
                    <button onClick={registrarPagoMiembro} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3">Confirmar pago</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal nuevo miembro */}
            {modalNuevoMiembro && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-white font-black text-xl">Nuevo miembro</h3>
                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Nombre</label>
                      <input type="text" value={formNuevoMiembro.nombre} onChange={(e) => setFormNuevoMiembro({ ...formNuevoMiembro, nombre: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Teléfono</label>
                      <input type="tel" value={formNuevoMiembro.telefono} onChange={(e) => setFormNuevoMiembro({ ...formNuevoMiembro, telefono: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Email (opcional)</label>
                      <input type="email" value={formNuevoMiembro.email} onChange={(e) => setFormNuevoMiembro({ ...formNuevoMiembro, email: e.target.value })} placeholder="Para recordatorios de vencimiento" className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Plan</label>
                      <select value={formNuevoMiembro.plan_id} onChange={(e) => setFormNuevoMiembro({ ...formNuevoMiembro, plan_id: Number(e.target.value) })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold">
                        <option value={0}>Selecciona un plan</option>
                        {planes.filter((p) => p.activo).map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre} — ₡{p.precio.toLocaleString("es-CR")}</option>
                        ))}
                      </select>
                    </div>
                    {barberoClubActual ? (
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Barbero</label>
                        <p className="text-gray-400 text-sm">{barberoClubActual}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Barbero</label>
                        <select value={formNuevoMiembro.barbero} onChange={(e) => setFormNuevoMiembro({ ...formNuevoMiembro, barbero: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold">
                          <option value="">Selecciona un barbero</option>
                          <option value="Alonso Lobo">Alonso Lobo</option>
                          <option value="Ian Bustos Navarrete">Ian Bustos Navarrete</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalNuevoMiembro(false)} className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl">Cancelar</button>
                    <button onClick={crearMiembro} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3">Crear miembro</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal editar plan */}
            {modalEditarPlan && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-white font-black text-xl">Editar plan</h3>
                  <p className="text-gray-500 text-sm mt-1">{modalEditarPlan.nombre}</p>
                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Precio mensual (₡)</label>
                      <input type="text" inputMode="numeric" value={formPlan.precio} onChange={(e) => setFormPlan({ ...formPlan, precio: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Cortes</label>
                        <input type="text" inputMode="numeric" value={formPlan.cortes} onChange={(e) => setFormPlan({ ...formPlan, cortes: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Barbas</label>
                        <input type="text" inputMode="numeric" value={formPlan.barbas} onChange={(e) => setFormPlan({ ...formPlan, barbas: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalEditarPlan(null)} className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl">Cancelar</button>
                    <button onClick={guardarPlan} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3">Guardar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal grupo */}
            {modalGrupo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <h3 className="text-white font-black text-xl">Crear grupo Friends 5</h3>
                  <div className="mt-5 flex flex-col gap-4">
                    <div>
                      <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Nombre del grupo</label>
                      <input type="text" value={formGrupo.nombre_grupo} onChange={(e) => setFormGrupo({ ...formGrupo, nombre_grupo: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    </div>
                    {formGrupo.miembros.map((m, i) => (
                      <div key={i} className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder={`Nombre ${i + 1}`} value={m.nombre} onChange={(e) => { const copia = [...formGrupo.miembros]; copia[i] = { ...copia[i], nombre: e.target.value }; setFormGrupo({ ...formGrupo, miembros: copia }); }} className="bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                        <input type="tel" placeholder={`Teléfono ${i + 1}`} value={m.telefono} onChange={(e) => { const copia = [...formGrupo.miembros]; copia[i] = { ...copia[i], telefono: e.target.value }; setFormGrupo({ ...formGrupo, miembros: copia }); }} className="bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Método</label>
                        <select value={formGrupo.metodo} onChange={(e) => setFormGrupo({ ...formGrupo, metodo: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold">
                          <option value="sinpe">SINPE</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Monto total (₡)</label>
                        <input type="text" inputMode="numeric" placeholder="35000" value={formGrupo.monto} onChange={(e) => setFormGrupo({ ...formGrupo, monto: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                      </div>
                    </div>
                    {barberoClubActual ? (
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Barbero</label>
                        <p className="text-gray-400 text-sm">{barberoClubActual}</p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Barbero</label>
                        <select value={formGrupo.barbero} onChange={(e) => setFormGrupo({ ...formGrupo, barbero: e.target.value })} className="w-full bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold">
                          <option value="">Selecciona un barbero</option>
                          <option value="Alonso Lobo">Alonso Lobo</option>
                          <option value="Ian Bustos Navarrete">Ian Bustos Navarrete</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setModalGrupo(false)} className="flex-1 border border-dark-border text-gray-500 text-xs uppercase tracking-widest py-3 rounded-xl">Cancelar</button>
                    <button onClick={crearGrupo} className="flex-1 btn-gold text-xs uppercase tracking-widest py-3">Crear grupo</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal escanear QR */}
            {modalEscanearQr && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
                <div className="relative bg-dark-card border border-gold rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <button
                    onClick={() => setModalEscanearQr(false)}
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-gold text-lg font-bold text-gold transition hover:bg-gold hover:text-black"
                  >
                    ✕
                  </button>
                  <h3 className="text-white font-black text-xl">Escanear QR de miembro</h3>
                  <p className="text-gray-500 text-sm mt-1">Ingresa el código QR del miembro.</p>
                  <div className="mt-4 flex gap-2">
                    <input type="text" value={formQrToken} onChange={(e) => setFormQrToken(e.target.value)} placeholder="Token del QR" className="flex-1 bg-dark border border-dark-border rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-gold" />
                    <button onClick={escanearQr} disabled={cargandoQrMiembro} className="btn-gold text-xs uppercase tracking-widest px-4 py-2">Buscar</button>
                  </div>

                  {qrMiembro && (
                    <div className="mt-5 rounded-xl border border-dark-border p-4">
                      <p className="text-white font-bold">{qrMiembro.nombre}</p>
                      <p className="text-gray-500 text-sm">{qrMiembro.telefono} · {qrMiembro.plan_nombre || "—"}</p>
                      <p className={`text-xs uppercase tracking-widest mt-2 font-bold ${qrMiembro.estado === "activo" ? "text-gold" : "text-red-400"}`}>{qrMiembro.estado}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-lg bg-dark p-2 text-center"><p className="text-xl">✂️</p><p className="text-lg font-black text-gold">{qrMiembro.balance.cortes}</p></div>
                        <div className="rounded-lg bg-dark p-2 text-center"><p className="text-xl">🪒</p><p className="text-lg font-black text-gold">{qrMiembro.balance.barbas}</p></div>
                        <div className="rounded-lg bg-dark p-2 text-center"><p className="text-xl">🧖</p><p className="text-lg font-black text-gold">{qrMiembro.balance.mascarilla}</p></div>
                      </div>
                      {qrMiembro.estado === "activo" && (
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => consumirDesdeQr("corte")} disabled={qrMiembro.balance.cortes <= 0} className="flex-1 btn-gold text-xs uppercase tracking-widest py-2 disabled:opacity-40">Corte</button>
                          <button onClick={() => consumirDesdeQr("barba")} disabled={qrMiembro.balance.barbas <= 0} className="flex-1 border border-gold text-gold text-xs uppercase tracking-widest py-2 disabled:opacity-40">Barba</button>
                          <button onClick={() => consumirDesdeQr("mascarilla")} disabled={qrMiembro.balance.mascarilla <= 0} className="flex-1 border border-white/20 text-gray-300 text-xs uppercase tracking-widest py-2 disabled:opacity-40">Mascarilla</button>
                        </div>
                      )}
                      {qrMiembro.estado !== "activo" && <p className="mt-3 text-red-400 text-sm font-bold">La membresía no está activa. No se pueden registrar servicios.</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        ) : vista === "silla" ? (

          /* Vista Silla */
          <div className="flex flex-col gap-6">
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <h3 className="text-gold text-xs uppercase tracking-widest mb-4">Pago de Silla</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" inputMode="numeric" placeholder="Monto (₡)" value={formSilla.monto} onChange={(e) => setFormSilla({ ...formSilla, monto: e.target.value })} className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1" />
                <input type="text" placeholder="Nota (opcional)" value={formSilla.nota} onChange={(e) => setFormSilla({ ...formSilla, nota: e.target.value })} className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1" />
                <button onClick={registrarPagoSilla} className="btn-gold text-xs uppercase tracking-widest px-5 py-2">Registrar pago</button>
              </div>
            </div>

            <div className="bg-dark-card border border-gold rounded-xl p-5">
              <p className="text-gold text-xs uppercase tracking-wider mb-1">Total silla este mes</p>
              <p className="text-white font-black text-3xl">₡{sillaMesActual.toLocaleString("es-CR")}</p>
            </div>

            <div className="flex flex-col gap-3">
              {pagosSilla.length === 0 ? (
                <div className="text-center py-16 bg-dark-card border border-dark-border rounded-xl"><p className="text-gray-500">No hay pagos de silla registrados.</p></div>
              ) : pagosSilla.map((p) => (
                <div key={p.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-gold font-black text-xl">₡{p.monto.toLocaleString("es-CR")}</p>
                    <p className="text-gray-500 text-sm">{p.fecha ? new Date(p.fecha + "T00:00:00").toLocaleDateString("es-CR") : "—"}{p.nota ? ` · ${p.nota}` : ""}</p>
                  </div>
                  <button onClick={() => eliminarPagoSilla(p.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900">Eliminar</button>
                </div>
              ))}
            </div>
          </div>

        ) : vista === "gastos" ? (

          /* Vista Gastos */
          <div className="flex flex-col gap-6">
            <div className="bg-dark-card border border-dark-border rounded-xl p-6">
              <h3 className="text-gold text-xs uppercase tracking-widest mb-4">Gastos</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="Descripción" value={formGasto.descripcion} onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })} className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1" />
                <input type="text" inputMode="numeric" placeholder="Monto (₡)" value={formGasto.monto} onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })} className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1" />
                <button onClick={registrarGasto} className="btn-gold text-xs uppercase tracking-widest px-5 py-2">Registrar gasto</button>
              </div>
            </div>

            <div className="bg-dark-card border border-red-900 rounded-xl p-5">
              <p className="text-red-400 text-xs uppercase tracking-wider mb-1">Total gastos este mes</p>
              <p className="text-white font-black text-3xl">₡{gastosMesActual.toLocaleString("es-CR")}</p>
            </div>

            <div className="flex flex-col gap-3">
              {gastos.length === 0 ? (
                <div className="text-center py-16 bg-dark-card border border-dark-border rounded-xl"><p className="text-gray-500">No hay gastos registrados.</p></div>
              ) : gastos.map((g) => (
                <div key={g.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-bold">{g.descripcion}</p>
                    <p className="text-gray-500 text-sm">{g.fecha ? new Date(g.fecha + "T00:00:00").toLocaleDateString("es-CR") : "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-red-300 font-black text-xl">-₡{g.monto.toLocaleString("es-CR")}</p>
                    <button onClick={() => eliminarGasto(g.id)} className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
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
        {[...reservasDelDia]
          .sort((a, b) => {
            const parsearHora = (hora: string) => {
              const partes = hora.split(" ");
              const [h, m] = partes[0].split(":").map(Number);
              const esPM = partes[1] === "PM";
              return (esPM && h !== 12 ? h + 12 : !esPM && h === 12 ? 0 : h) * 60 + m;
            };
            return parsearHora(a.hora) - parsearHora(b.hora);
          })
          .map((reserva) => {
            const esClub = esReservaClub(reserva);
            return (
            <div key={reserva.id} className={`px-6 py-4 flex items-center justify-between gap-4 ${esClub ? "border-l-4 border-violet-500 bg-violet-950/20" : ""}`}>
              <div className="flex items-center gap-4">
                <p className={`font-bold text-sm w-20 shrink-0 ${esClub ? "text-violet-300" : "text-gold"}`}>{reserva.hora}</p>
                <div>
                  <p className="text-white font-bold text-sm">{esClub ? "💎 " : ""}{reserva.nombre}</p>
                  <p className="text-gray-500 text-xs">{reserva.servicio} · {reserva.es_miembro_club ? "💎 Membresía" : reserva.precio} · {reserva.barbero}</p>
                  {reserva.adicionales && reserva.adicionales !== "[]" && <p className="text-violet-300 text-xs">+ {parseAdicionales(reserva.adicionales)}</p>}
                  {reserva.metodo_pago && <p className="text-gray-600 text-xs capitalize">Pago: {formatPagoDetalle(reserva)}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
  <span className={`text-xs px-2 py-1 rounded-full font-bold ${reserva.estado === "pendiente" ? "bg-gold text-black" : "bg-green-900 text-green-300"}`}>
    {reserva.estado}
  </span>
  <div className="flex gap-1">
    <a href={`https://wa.me/506${reserva.telefono.replace(/[^0-9]/g, "")}`} target="_blank" className="text-xs px-2 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all">
      WA
    </a>
    {reserva.estado === "pendiente" && (
      <button onClick={() => setModalReserva(reserva)} className="text-xs px-2 py-1 rounded-full border border-green-700 text-green-400 hover:bg-green-900 transition-all">
        ✓
      </button>
    )}
    <button onClick={() => cancelarReserva(reserva.id)} className="text-xs px-2 py-1 rounded-full border border-red-800 text-red-400 hover:bg-red-900 transition-all">
      ✕
    </button>
  </div>
</div>
            </div>
            );
          })}
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
          {usuarioInfo?.rol === "admin" && (
            <select
              value={barberoBloqueoId}
              onChange={(e) => setBarberoBloqueoId(Number(e.target.value))}
              className="bg-dark border border-dark-border rounded px-3 py-1 text-gray-400 text-xs focus:outline-none focus:border-gold"
            >
              {BARBEROS.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          )}
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
        {horariosBarbero.map((hora) => {
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
