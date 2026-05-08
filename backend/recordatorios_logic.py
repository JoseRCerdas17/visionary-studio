"""Lógica de recordatorios (sin I/O). Usada por recordatorios.py y por tests sin dependencias pesadas."""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ_CR = "America/Costa_Rica"
CR_TZ = ZoneInfo(TZ_CR)

# Envío cuando falta ~1 hora (con tick cada TICK_MINUTES min no se pierde la ventana)
MIN_SEGUNDOS_ANTES_UNA_HORA = 52 * 60
MAX_SEGUNDOS_ANTES_UNA_HORA = 68 * 60
TICK_MINUTES = 3


def parse_cita_cr(fecha: str, hora: str) -> datetime | None:
    """Interpreta fecha/hora como hora civil de Costa Rica (como las reserva en frontend)."""
    try:
        partes_fecha = fecha.strip().split("/")
        if len(partes_fecha) != 3:
            return None
        dia = int(partes_fecha[0])
        mes = int(partes_fecha[1])
        anio = int(partes_fecha[2])

        tokens = hora.strip().split()
        if len(tokens) < 2:
            return None
        tiempo = tokens[0].split(":")
        hora_num = int(tiempo[0])
        minuto_num = int(tiempo[1])
        periodo = tokens[-1].strip().upper()

        if periodo == "PM" and hora_num != 12:
            hora_num += 12
        elif periodo == "AM" and hora_num == 12:
            hora_num = 0

        return datetime(anio, mes, dia, hora_num, minuto_num, tzinfo=CR_TZ)
    except Exception:
        return None


def debe_enviar_dia_previo(ahora_cr: datetime, cita_cr: datetime, ya_enviado: bool) -> bool:
    if ya_enviado:
        return False
    dia_previo = cita_cr.date() - timedelta(days=1)
    return ahora_cr.date() == dia_previo and ahora_cr.hour == 14


def debe_enviar_1h(
    ahora_cr: datetime,
    cita_cr: datetime,
    ya_enviado: bool,
    min_seg: float = MIN_SEGUNDOS_ANTES_UNA_HORA,
    max_seg: float = MAX_SEGUNDOS_ANTES_UNA_HORA,
) -> bool:
    if ya_enviado:
        return False
    seg_rest = (cita_cr - ahora_cr).total_seconds()
    return min_seg <= seg_rest <= max_seg
