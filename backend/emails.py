import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

def enviar_confirmacion_cliente(nombre: str, email: str, servicio: str, precio: str, fecha: str, hora: str, reserva_id: int):
    try:
        maps_url = "https://maps.app.goo.gl/zcfrCQAJDv4KLDfb9"
        whatsapp_url = "https://wa.me/50662009558"
        instagram_url = "https://www.instagram.com/lobo_barbero"
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        cancelar_url = f"{frontend_url}/cancelar?id={reserva_id}"

        resend.Emails.send({
            "from": "Visionary Studio <onboarding@resend.dev>",
            "to": "jose12roberto17@gmail.com",
            "subject": f"Cita confirmada — Visionary Studio Barber Shop",
            "html": f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1A1A1A 0%,#0A0A0A 100%);padding:40px 32px;text-align:center;border-bottom:2px solid #C9A035;">
      <h1 style="color:#C9A035;font-size:28px;letter-spacing:6px;text-transform:uppercase;margin:0;font-weight:900;">VISIONARY STUDIO</h1>
      <p style="color:#E8B84B;font-size:14px;letter-spacing:3px;margin:6px 0 0;font-style:italic;">Barber Shop</p>
      <p style="color:#555;font-size:11px;letter-spacing:2px;margin:16px 0 0;text-transform:uppercase;">Liberia, Guanacaste · Costa Rica</p>
    </div>

    <!-- Confirmación badge -->
    <div style="background:#1A1A1A;padding:24px 32px;text-align:center;border-bottom:1px solid #2A2A2A;">
      <div style="display:inline-block;background:#C9A035;color:#000;font-weight:900;font-size:12px;letter-spacing:3px;padding:8px 24px;border-radius:4px;text-transform:uppercase;">
        ✓ Cita Confirmada
      </div>
      <p style="color:#888;font-size:14px;margin:16px 0 0;">Hola <strong style="color:#fff;">{nombre}</strong>, tu cita ha sido agendada exitosamente.</p>
    </div>

    <!-- Detalles -->
    <div style="background:#111;padding:32px;border-bottom:1px solid #2A2A2A;">
      <p style="color:#C9A035;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;">Detalles de tu cita</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:12px 0;font-size:14px;width:40%;">Servicio</td>
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
          <td style="color:#fff;padding:12px 0;font-size:14px;font-weight:bold;text-align:right;">Alonso "Lobo" Lobo</td>
        </tr>
        <tr>
          <td style="color:#666;padding:12px 0;font-size:14px;">Total</td>
          <td style="color:#C9A035;padding:12px 0;font-size:22px;font-weight:900;text-align:right;">{precio}</td>
        </tr>
      </table>
    </div>

    <!-- Nota -->
    <div style="background:#1A1A1A;padding:20px 32px;border-left:3px solid #C9A035;border-bottom:1px solid #2A2A2A;">
      <p style="color:#888;font-size:13px;margin:0;line-height:1.6;">
        📌 <strong style="color:#fff;">Recuerda:</strong> El pago se realiza al asistir. Si necesitas cancelar, hazlo con al menos <strong style="color:#C9A035;">24 horas de anticipación</strong>.
      </p>
    </div>

    <!-- Mapa -->
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

    <!-- Contacto -->
    <div style="background:#111;padding:32px;border-bottom:1px solid #2A2A2A;">
      <p style="color:#C9A035;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;">Contacto</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;">
            <a href="{whatsapp_url}" target="_blank" style="display:flex;align-items:center;gap:12px;text-decoration:none;">
              <div style="background:#25D366;width:36px;height:36px;border-radius:50%;text-align:center;line-height:36px;font-size:18px;">💬</div>
              <div>
                <p style="color:#fff;font-size:13px;font-weight:bold;margin:0;">WhatsApp</p>
                <p style="color:#888;font-size:12px;margin:2px 0 0;">+506 6200-9558</p>
              </div>
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <a href="{instagram_url}" target="_blank" style="display:flex;align-items:center;gap:12px;text-decoration:none;">
              <div style="background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);width:36px;height:36px;border-radius:50%;text-align:center;line-height:36px;font-size:18px;">📸</div>
              <div>
                <p style="color:#fff;font-size:13px;font-weight:bold;margin:0;">Instagram</p>
                <p style="color:#888;font-size:12px;margin:2px 0 0;">@lobo_barbero</p>
              </div>
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Cancelar cita -->
    <div style="background:#1A1A1A;padding:24px 32px;border-bottom:1px solid #2A2A2A;text-align:center;">
      <p style="color:#666;font-size:12px;margin:0 0 12px;">¿Necesitas cancelar tu cita?</p>
      <a href="{cancelar_url}" target="_blank" style="display:inline-block;background:transparent;color:#888;font-size:11px;letter-spacing:2px;padding:8px 20px;border:1px solid #333;border-radius:4px;text-decoration:none;text-transform:uppercase;">
        Cancelar mi cita
      </a>
      <p style="color:#444;font-size:11px;margin:12px 0 0;">Por favor cancela con al menos 24 horas de anticipación</p>
    </div>

    <!-- Footer -->
    <div style="background:#0A0A0A;padding:24px 32px;text-align:center;">
      <p style="color:#C9A035;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Visionary Studio Barber Shop</p>
      <p style="color:#444;font-size:11px;margin:0;">Liberia, Guanacaste, Costa Rica</p>
      <p style="color:#333;font-size:10px;margin:16px 0 0;">Este correo fue enviado automáticamente.</p>
    </div>

  </div>
</body>
</html>
            """
        })
    except Exception as e:
        print(f"Error enviando email al cliente: {e}")


def enviar_notificacion_admin(nombre: str, telefono: str, email: str, servicio: str, precio: str, fecha: str, hora: str):
    try:
        resend.Emails.send({
            "from": "Visionary Studio <onboarding@resend.dev>",
            "to": "jose12roberto17@gmail.com",
            "subject": f"Nueva reserva — {nombre} — {fecha} {hora}",
            "html": f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0A0A0A;padding:32px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#C9A035;font-size:20px;letter-spacing:4px;text-transform:uppercase;margin:0;">VISIONARY STUDIO</h1>
      <p style="color:#E8B84B;font-size:12px;font-style:italic;margin:4px 0 0;">Nueva Reserva</p>
    </div>
    <div style="background:#1A1A1A;border:1px solid #C9A035;border-radius:8px;padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Cliente</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{nombre}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Teléfono</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{telefono}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Email</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{email}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Servicio</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{servicio}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Fecha</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{fecha}</td>
        </tr>
        <tr style="border-bottom:1px solid #2A2A2A;">
          <td style="color:#666;padding:10px 0;font-size:14px;">Hora</td>
          <td style="color:#fff;padding:10px 0;font-size:14px;font-weight:bold;text-align:right;">{hora}</td>
        </tr>
        <tr>
          <td style="color:#666;padding:10px 0;font-size:14px;">Total</td>
          <td style="color:#C9A035;padding:10px 0;font-size:20px;font-weight:900;text-align:right;">{precio}</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
            """
        })
    except Exception as e:
        print(f"Error enviando email al admin: {e}")