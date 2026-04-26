from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from models.reserva import Reserva
from datetime import datetime, timedelta
import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

def enviar_recordatorio(nombre: str, email: str, servicio: str, precio: str, fecha: str, hora: str, tipo: str):
    try:
        asunto = "Recordatorio: Tu cita es mañana" if tipo == "24h" else "Recordatorio: Tu cita es en 1 hora"
        mensaje_tiempo = "mañana" if tipo == "24h" else "en 1 hora"

        resend.Emails.send({
            "from": "Visionary Studio <reservas@visionarystudiobarbershop.com>",
            "to": email,
            "subject": asunto,
            "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
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
        📌 <strong style="color:#fff;">Recuerda:</strong> El pago se realiza al asistir. Si necesitas cancelar contáctanos por WhatsApp.
      </p>
    </div>

    <div style="background:#111;padding:24px 32px;border-bottom:1px solid #2A2A2A;text-align:center;">
      <a href="https://wa.me/50662009558" target="_blank" style="display:inline-block;background:#25D366;color:#fff;font-weight:bold;font-size:13px;padding:12px 24px;border-radius:4px;text-decoration:none;">
        💬 Contactar por WhatsApp
      </a>
    </div>

    <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
      <p style="color:#C9A035;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Visionary Studio Barber Shop</p>
      <p style="color:#444;font-size:11px;margin:0;">Liberia, Guanacaste, Costa Rica</p>
    </div>

  </div>
</body>
</html>
            """
        })
        print(f"Recordatorio {tipo} enviado a {email}")
    except Exception as e:
        print(f"Error enviando recordatorio: {e}")


def parsear_fecha_hora(fecha: str, hora: str):
    try:
        # fecha formato: d/m/yyyy, hora formato: H:MM AM/PM
        partes_fecha = fecha.split("/")
        dia = int(partes_fecha[0])
        mes = int(partes_fecha[1])
        anio = int(partes_fecha[2])

        partes_hora = hora.split(" ")
        tiempo = partes_hora[0].split(":")
        hora_num = int(tiempo[0])
        minuto_num = int(tiempo[1])
        periodo = partes_hora[1]

        if periodo == "PM" and hora_num != 12:
            hora_num += 12
        elif periodo == "AM" and hora_num == 12:
            hora_num = 0

        return datetime(anio, mes, dia, hora_num, minuto_num)
    except Exception as e:
        print(f"Error parseando fecha/hora: {e}")
        return None


def verificar_recordatorios():
    db: Session = SessionLocal()
    try:
        ahora = datetime.now()
        reservas = db.query(Reserva).filter(Reserva.estado == "pendiente").all()

        for reserva in reservas:
            cita_dt = parsear_fecha_hora(reserva.fecha, reserva.hora)
            if not cita_dt:
                continue

            diferencia = cita_dt - ahora
            horas_restantes = diferencia.total_seconds() / 3600

            # Recordatorio 24 horas antes (entre 23.5 y 24.5 horas)
            if 23.5 <= horas_restantes <= 24.5:
                enviar_recordatorio(
                    nombre=reserva.nombre,
                    email=reserva.email,
                    servicio=reserva.servicio,
                    precio=reserva.precio,
                    fecha=reserva.fecha,
                    hora=reserva.hora,
                    tipo="24h"
                )

            # Recordatorio 1 hora antes (entre 0.5 y 1.5 horas)
            elif 0.5 <= horas_restantes <= 1.5:
                enviar_recordatorio(
                    nombre=reserva.nombre,
                    email=reserva.email,
                    servicio=reserva.servicio,
                    precio=reserva.precio,
                    fecha=reserva.fecha,
                    hora=reserva.hora,
                    tipo="1h"
                )

    finally:
        db.close()


def iniciar_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(verificar_recordatorios, "interval", minutes=30)
    scheduler.start()
    print("Scheduler de recordatorios iniciado")
    return scheduler