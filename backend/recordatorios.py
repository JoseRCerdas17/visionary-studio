import logging
import os
from datetime import datetime
from typing import Optional

import resend
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from models.reserva import Reserva
from recordatorios_logic import (
    CR_TZ,
    MAX_SEGUNDOS_ANTES_UNA_HORA,
    MIN_SEGUNDOS_ANTES_UNA_HORA,
    TICK_MINUTES,
    TZ_CR,
    debe_enviar_1h,
    debe_enviar_dia_previo,
    parse_cita_cr,
)

resend.api_key = os.getenv("RESEND_API_KEY")

_logger = logging.getLogger(__name__)

_ENV_TRUE = frozenset({"1", "true", "yes", "on"})


def enviar_recordatorio(
    nombre: str,
    email: str,
    servicio: str,
    precio: str,
    fecha: str,
    hora: str,
    tipo: str,
    reserva_id: int,
) -> bool:
    if not os.getenv("RESEND_API_KEY"):
        _logger.error(
            "RESEND_API_KEY ausente; no se puede enviar recordatorio reserva_id=%s",
            reserva_id,
        )
        return False
    try:
        maps_url = "https://maps.app.goo.gl/zcfrCQAJDv4KLDfb9"
        whatsapp_url = "https://wa.me/50662009558"
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        cancelar_url = f"{frontend_url}/cancelar?id={reserva_id}"
        if tipo == "dia_previo":
            asunto = "Recordatorio: Tu cita es mañana"
            mensaje_tiempo = "mañana"
        else:
            asunto = "Recordatorio: Tu cita es en 1 hora"
            mensaje_tiempo = "en alrededor de 1 hora"

        resend.Emails.send(
            {
                "from": "Visionary Studio <reservas@visionarystudiobarbershop.com>",
                "to": email,
                "subject": asunto,
                "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">

    <div style="background:linear-gradient(135deg,#1A1A1A 0%,#0A0A0A 100%);padding:40px 32px;text-align:center;border-bottom:2px solid #C9A035;">
      <h1 style="color:#C9A035;font-size:28px;letter-spacing:6px;text-transform:uppercase;margin:0;font-weight:900;">VISIONARY STUDIO</h1>
      <p style="color:#E8B84B;font-size:14px;letter-spacing:3px;margin:6px 0 0;font-style:italic;">Barber Shop</p>
    </div>

    <div style="background:#1A1A1A;padding:24px 32px;text-align:center;border-bottom:1px solid #2A2A2A;">
      <div style="display:inline-block;background:#C9A035;color:#000;font-weight:900;font-size:12px;letter-spacing:3px;padding:8px 24px;border-radius:4px;text-transform:uppercase;">
        ⏰ Recordatorio de Cita
      </div>
      <p style="color:#888;font-size:14px;margin:16px 0 0;">
        Hola <strong style="color:#fff;">{nombre}</strong>, recuerda que tienes una cita <strong style="color:#C9A035;">{mensaje_tiempo}</strong>.
      </p>
    </div>

    <div style="background:#111;padding:32px;border-bottom:1px solid #2A2A2A;">
      <p style="color:#C9A035;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;">Detalles de tu cita</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 0;font-size:14px;">Servicio</td>
          <td style="color:#fff;padding:12px 0;font-size:14px;font-weight:bold;text-align:right;">{servicio}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 0;font-size:14px;">Fecha</td>
          <td style="color:#fff;padding:12px 0;font-size:14px;font-weight:bold;text-align:right;">{fecha}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 0;font-size:14px;">Hora</td>
          <td style="color:#fff;padding:12px 0;font-size:14px;font-weight:bold;text-align:right;">{hora}</td>
        </tr>
        <tr>
          <td style="color:#666;padding:12px 0;font-size:14px;">Total</td>
          <td style="color:#C9A035;padding:12px 0;font-size:22px;font-weight:900;text-align:right;">{precio}</td>
        </tr>
      </table>
    </div>

    <div style="background:#1A1A1A;padding:20px 32px;border-left:3px solid #C9A035;border-bottom:1px solid #2A2A2A;">
      <p style="color:#888;font-size:13px;margin:0;line-height:1.6;">
        📌 <strong style="color:#fff;">Recuerda:</strong> El pago se realiza al asistir. Si necesitas cancelar contáctanos con anticipación.
      </p>
    </div>

    <div style="background:#111;padding:32px;border-bottom:1px solid #2A2A2A;">
      <p style="color:#C9A035;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px;">Cómo llegar</p>
      <a href="{maps_url}" target="_blank" style="display:block;text-decoration:none;">
        <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:8px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);height:140px;display:flex;align-items:center;justify-content:center;">
            <div style="text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">📍</div>
              <p style="color:#C9A035;font-weight:bold;font-size:14px;margin:0;">Visionary Studio Barber Shop</p>
              <p style="color:#888;font-size:12px;margin:4px 0 0;">Liberia, Guanacaste, Costa Rica</p>
            </div>
          </div>
          <div style="background:#C9A035;text-align:center;padding:10px;">
            <p style="color:#000;font-weight:900;font-size:12px;letter-spacing:2px;margin:0;text-transform:uppercase;">🗺 Abrir en Google Maps</p>
          </div>
        </div>
      </a>
    </div>

    <div style="background:#111;padding:24px 32px;border-bottom:1px solid #2A2A2A;text-align:center;">
      <a href="{whatsapp_url}" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-weight:bold;font-size:13px;padding:12px 24px;border-radius:4px;text-decoration:none;">
        💬 Contactar por WhatsApp
      </a>
    </div>

    <div style="background:#1A1A1A;padding:24px 32px;border-bottom:1px solid #2A2A2A;text-align:center;">
      <p style="color:#666;font-size:12px;margin:0 0 12px;">¿Necesitas cancelar tu cita?</p>
      <a href="{cancelar_url}" target="_blank" style="display:inline-block;background:transparent;color:#888;font-size:11px;letter-spacing:2px;padding:8px 20px;border:1px solid #333;border-radius:4px;text-decoration:none;text-transform:uppercase;">
        Cancelar mi cita
      </a>
    </div>

    <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
      <p style="color:#C9A035;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Visionary Studio Barber Shop</p>
      <p style="color:#444;font-size:11px;margin:0;">Liberia, Guanacaste, Costa Rica</p>
    </div>

  </div>
</body>
</html>
            """,
            }
        )
        _logger.info(
            "Recordatorio enviado tipo=%s reserva_id=%s email=%s",
            tipo,
            reserva_id,
            email,
        )
        return True
    except Exception as e:
        _logger.exception(
            "Error enviando recordatorio tipo=%s reserva_id=%s: %s",
            tipo,
            reserva_id,
            e,
        )
        return False


def _payload_reserva(r: Reserva):
    return {
        "nombre": r.nombre,
        "email": r.email,
        "servicio": r.servicio,
        "precio": r.precio,
        "fecha": r.fecha,
        "hora": r.hora,
        "reserva_id": r.id,
    }


def verificar_recordatorios():
    """Un sólo ciclo cada pocos min: día previo (~14 h CR) y aviso ~1 h antes."""
    db: Session = SessionLocal()
    try:
        ahora_cr = datetime.now(CR_TZ)

        reservas = db.query(Reserva).filter(Reserva.estado == "pendiente").all()

        for reserva in reservas:
            try:
                cita_cr = parse_cita_cr(reserva.fecha, reserva.hora)
                if not cita_cr:
                    _logger.warning(
                        "fecha/hora no parseable id=%s fecha=%r hora=%r",
                        reserva.id,
                        reserva.fecha,
                        reserva.hora,
                    )
                    continue

                if debe_enviar_dia_previo(
                    ahora_cr,
                    cita_cr,
                    bool(reserva.recordatorio_dia_previo_enviado),
                ):
                    kw = _payload_reserva(reserva)
                    if enviar_recordatorio(**kw, tipo="dia_previo"):
                        reserva.recordatorio_dia_previo_enviado = True
                        db.commit()

                if debe_enviar_1h(
                    ahora_cr,
                    cita_cr,
                    bool(reserva.recordatorio_1h_enviado),
                ):
                    kw = _payload_reserva(reserva)
                    if enviar_recordatorio(**kw, tipo="1h"):
                        reserva.recordatorio_1h_enviado = True
                        db.commit()

            except Exception:
                db.rollback()
                _logger.exception(
                    "Error procesando recordatorios para reserva id=%s",
                    reserva.id,
                )
    finally:
        db.close()


def iniciar_scheduler():
    if os.getenv("DISABLE_REMINDER_SCHEDULER", "").strip().lower() in _ENV_TRUE:
        _logger.info(
            "Recordatorios desactivados (DISABLE_REMINDER_SCHEDULER); "
            "si escalas réplicas deja sólo una con recordatorios encendidos."
        )
        return None
    scheduler = BackgroundScheduler(timezone=TZ_CR)
    scheduler.add_job(
        verificar_recordatorios,
        "interval",
        minutes=TICK_MINUTES,
        misfire_grace_time=420,
        coalesce=True,
        max_instances=1,
        id="recordatorios_visionary",
        replace_existing=True,
    )
    scheduler.start()
    _logger.info(
        "Recordatorios activos CR: cada %s min | ventana 1h ~%s-%s min antes",
        TICK_MINUTES,
        MIN_SEGUNDOS_ANTES_UNA_HORA // 60,
        MAX_SEGUNDOS_ANTES_UNA_HORA // 60,
    )
    return scheduler


def shutdown_scheduler(scheduler: Optional[BackgroundScheduler]) -> None:
    if scheduler is None:
        return
    try:
        scheduler.shutdown(wait=False)
        _logger.info("Scheduler de recordatorios detenido")
    except Exception as e:
        _logger.warning("Scheduler recordatorios al cerrar: %s", e)
