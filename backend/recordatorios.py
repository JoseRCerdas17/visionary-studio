import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import resend
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from models.reserva import Reserva
from models.club import ClubMiembro, ClubPlan
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
    barbero: str,
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
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 0;font-size:14px;">Barbero</td>
          <td style="color:#fff;padding:12px 0;font-size:14px;font-weight:bold;text-align:right;">{barbero}</td>
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
        "barbero": r.barbero,
        "reserva_id": r.id,
    }


def verificar_recordatorios():
    """Un sólo ciclo cada pocos min: día previo (~14 h CR) y aviso ~1 h antes."""
    db: Session = SessionLocal()
    try:
        ahora_cr = datetime.now(CR_TZ)
        print(f"[SCHEDULER] TICK - Hora CR: {ahora_cr.strftime('%Y-%m-%d %H:%M:%S %Z')}", flush=True)

        reservas = db.query(Reserva).filter(
            Reserva.estado == "pendiente",
            or_(
                Reserva.recordatorio_dia_previo_enviado == False,
                Reserva.recordatorio_1h_enviado == False,
            ),
        ).all()
        print(f"[SCHEDULER] Reservas pendientes encontradas: {len(reservas)}", flush=True)

        for reserva in reservas:
            try:
                cita_cr = parse_cita_cr(reserva.fecha, reserva.hora)
                if not cita_cr:
                    print(f"[SCHEDULER] ERROR parse id={reserva.id} fecha={reserva.fecha!r} hora={reserva.hora!r}", flush=True)
                    continue

                seg_rest = (cita_cr - ahora_cr).total_seconds()
                horas_rest = seg_rest / 3600
                print(
                    f"[SCHEDULER] Reserva id={reserva.id} nombre={reserva.nombre!r} "
                    f"cita={cita_cr.strftime('%Y-%m-%d %H:%M')} "
                    f"horas_rest={horas_rest:.2f} "
                    f"dia_prev_env={bool(reserva.recordatorio_dia_previo_enviado)} "
                    f"1h_env={bool(reserva.recordatorio_1h_enviado)}",
                    flush=True,
                )

                if debe_enviar_dia_previo(
                    ahora_cr,
                    cita_cr,
                    bool(reserva.recordatorio_dia_previo_enviado),
                ):
                    print(f"[SCHEDULER] Enviando recordatorio dia_previo a {reserva.email}", flush=True)
                    kw = _payload_reserva(reserva)
                    if enviar_recordatorio(**kw, tipo="dia_previo"):
                        reserva.recordatorio_dia_previo_enviado = True
                        db.commit()
                        print(f"[SCHEDULER] dia_previo enviado OK id={reserva.id}", flush=True)
                    else:
                        print(f"[SCHEDULER] FALLO enviando dia_previo id={reserva.id}", flush=True)

                if debe_enviar_1h(
                    ahora_cr,
                    cita_cr,
                    bool(reserva.recordatorio_1h_enviado),
                ):
                    print(f"[SCHEDULER] Enviando recordatorio 1h a {reserva.email}", flush=True)
                    kw = _payload_reserva(reserva)
                    if enviar_recordatorio(**kw, tipo="1h"):
                        reserva.recordatorio_1h_enviado = True
                        db.commit()
                        print(f"[SCHEDULER] 1h enviado OK id={reserva.id}", flush=True)
                    else:
                        print(f"[SCHEDULER] FALLO enviando 1h id={reserva.id}", flush=True)

            except Exception:
                db.rollback()
                _logger.exception(
                    "Error procesando recordatorios para reserva id=%s",
                    reserva.id,
                )
    finally:
        db.close()


def enviar_recordatorio_vencimientos(miembros: list) -> bool:
    """Envía a Lobo un resumen de membresías del club que vencen pronto."""
    if not os.getenv("RESEND_API_KEY"):
        _logger.error("RESEND_API_KEY ausente; no se puede enviar resumen de vencimientos")
        return False
    admin_email = os.getenv("ADMIN_EMAIL", "jose12roberto17@gmail.com")

    filas = ""
    for m in miembros:
        filas += f"""
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#fff;padding:12px 8px;font-size:14px;font-weight:bold;">{m['nombre']}</td>
          <td style="color:#888;padding:12px 8px;font-size:14px;">{m['telefono']}</td>
          <td style="color:#888;padding:12px 8px;font-size:14px;">{m['plan']}</td>
          <td style="color:#C9A035;padding:12px 8px;font-size:14px;font-weight:bold;text-align:right;">{m['fecha']} ({m['dias']}d)</td>
        </tr>"""

    try:
        resend.Emails.send(
            {
                "from": "Visionary Studio <reservas@visionarystudiobarbershop.com>",
                "to": admin_email,
                "subject": f"Visionary Club — {len(miembros)} membresía(s) por vencer",
                "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
    <div style="background:linear-gradient(135deg,#1A1A1A 0%,#0A0A0A 100%);padding:40px 32px;text-align:center;border-bottom:2px solid #C9A035;">
      <h1 style="color:#C9A035;font-size:28px;letter-spacing:6px;text-transform:uppercase;margin:0;font-weight:900;">VISIONARY STUDIO</h1>
      <p style="color:#E8B84B;font-size:14px;letter-spacing:3px;margin:6px 0 0;font-style:italic;">Visionary Club · Vencimientos</p>
    </div>
    <div style="background:#111;padding:32px;">
      <p style="color:#C9A035;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;">Membresías por vencer (próximos 7 días)</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 8px;font-size:12px;text-transform:uppercase;">Miembro</td>
          <td style="color:#666;padding:12px 8px;font-size:12px;text-transform:uppercase;">Teléfono</td>
          <td style="color:#666;padding:12px 8px;font-size:12px;text-transform:uppercase;">Plan</td>
          <td style="color:#666;padding:12px 8px;font-size:12px;text-transform:uppercase;text-align:right;">Vence</td>
        </tr>{filas}
      </table>
      <p style="color:#888;font-size:13px;margin:24px 0 0;line-height:1.6;">Contacta a cada miembro por WhatsApp desde el panel para renovar su membresía.</p>
    </div>
    <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
      <p style="color:#444;font-size:11px;margin:0;">Este correo fue enviado automáticamente.</p>
    </div>
  </div>
</body>
</html>
                """,
            }
        )
        _logger.info("Resumen de vencimientos enviado a %s (%d miembros)", admin_email, len(miembros))
        return True
    except Exception as e:
        _logger.exception("Error enviando resumen de vencimientos: %s", e)
        return False


def enviar_recordatorio_vencimiento_miembro(nombre: str, email: str, fecha_vencimiento, plan: str) -> bool:
    """Envía al miembro un recordatorio de que su membresía está por vencer."""
    if not os.getenv("RESEND_API_KEY"):
        return False
    fecha_texto = fecha_vencimiento.strftime("%d/%m/%Y")
    try:
        resend.Emails.send(
            {
                "from": "Visionary Studio <reservas@visionarystudiobarbershop.com>",
                "to": email,
                "subject": "Tu membresía Visionary Club vence pronto",
                "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
    <div style="background:linear-gradient(135deg,#1A1A1A 0%,#0A0A0A 100%);padding:40px 32px;text-align:center;border-bottom:2px solid #C9A035;">
      <h1 style="color:#C9A035;font-size:28px;letter-spacing:6px;text-transform:uppercase;margin:0;font-weight:900;">VISIONARY STUDIO</h1>
      <p style="color:#E8B84B;font-size:14px;letter-spacing:3px;margin:6px 0 0;font-style:italic;">Visionary Club</p>
    </div>
    <div style="background:#1A1A1A;padding:24px 32px;text-align:center;border-bottom:1px solid #2A2A2A;">
      <p style="color:#888;font-size:14px;margin:0;line-height:1.6;">
        Hola <strong style="color:#fff;">{nombre}</strong>, tu membresía
        <strong style="color:#C9A035;">{plan}</strong> vence el
        <strong style="color:#fff;">{fecha_texto}</strong>.
      </p>
    </div>
    <div style="background:#111;padding:32px;text-align:center;border-bottom:1px solid #2A2A2A;">
      <p style="color:#888;font-size:13px;margin:0 0 20px;line-height:1.6;">Renueva para no perder tus cortes y beneficios exclusivos.</p>
      <a href="https://wa.me/50662009558" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-weight:bold;font-size:13px;padding:12px 24px;border-radius:4px;text-decoration:none;">💬 Renovar por WhatsApp</a>
    </div>
    <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
      <p style="color:#444;font-size:11px;margin:0;">Este correo fue enviado automáticamente.</p>
    </div>
  </div>
</body>
</html>
                """,
            }
        )
        _logger.info("Recordatorio de vencimiento enviado a %s (%s)", email, nombre)
        return True
    except Exception as e:
        _logger.exception("Error enviando recordatorio de vencimiento a %s: %s", email, e)
        return False


def verificar_vencimientos_club():
    """Revisa membresías del club activas que vencen en los próximos 7 días."""
    db: Session = SessionLocal()
    try:
        ahora = datetime.now(CR_TZ).replace(tzinfo=None)
        limite = ahora + timedelta(days=7)
        miembros = (
            db.query(ClubMiembro)
            .filter(
                ClubMiembro.estado == "activo",
                ClubMiembro.fecha_vencimiento != None,
                ClubMiembro.fecha_vencimiento <= limite,
                ClubMiembro.fecha_vencimiento >= ahora,
            )
            .order_by(ClubMiembro.fecha_vencimiento)
            .all()
        )
        if not miembros:
            _logger.info("Sin membresías del club por vencer próximamente")
            return

        payload = []
        limite_directo = ahora + timedelta(days=3)
        for m in miembros:
            plan = db.query(ClubPlan).filter(ClubPlan.id == m.plan_id).first()
            plan_nombre = plan.nombre if plan else "—"
            dias = max((m.fecha_vencimiento - ahora).days, 0)
            payload.append(
                {
                    "nombre": m.nombre,
                    "telefono": m.telefono,
                    "plan": plan_nombre,
                    "fecha": m.fecha_vencimiento.strftime("%d/%m/%Y"),
                    "dias": dias,
                }
            )
            # Recordatorio directo al miembro (solo si tiene email y aún no se le avisó).
            if (
                m.email
                and not m.recordatorio_vencimiento_enviado
                and m.fecha_vencimiento <= limite_directo
            ):
                if enviar_recordatorio_vencimiento_miembro(m.nombre, m.email, m.fecha_vencimiento, plan_nombre):
                    m.recordatorio_vencimiento_enviado = True
                    db.commit()
        enviar_recordatorio_vencimientos(payload)
    except Exception:
        _logger.exception("Error en verificación de vencimientos del club")
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
    scheduler.add_job(
        verificar_vencimientos_club,
        "cron",
        hour=10,
        minute=0,
        timezone=TZ_CR,
        misfire_grace_time=3600,
        coalesce=True,
        max_instances=1,
        id="vencimientos_club_visionary",
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
