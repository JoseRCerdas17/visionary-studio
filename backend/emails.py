import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

def enviar_confirmacion_cliente(nombre: str, email: str, barbero: str, servicio: str, precio: str, fecha: str, hora: str):
    try:
        resend.Emails.send({
            "from": "Visionary Studio <onboarding@resend.dev>",
            "to": "jose12roberto17@gmail.com",
            "subject": f"✂ Cita confirmada — Visionary Studio Barber Shop",
            "html": f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0D0D;font-family:'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#111111;border-radius:12px 12px 0 0;padding:40px 40px 32px;border-bottom:1px solid #2A2A2A;text-align:center;">
              <div style="display:inline-block;margin-bottom:16px;">
                <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">Visionary Studio</span><span style="color:#D4A017;font-size:22px;font-weight:900;letter-spacing:4px;font-style:italic;text-transform:uppercase;"> Barber Shop</span>
              </div>
              <div style="width:40px;height:2px;background-color:#D4A017;margin:0 auto 16px;"></div>
              <p style="color:#6B7280;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0;">Barbershop Premium · Liberia, Guanacaste</p>
            </td>
          </tr>

          <!-- HERO CONFIRMACIÓN -->
          <tr>
            <td style="background-color:#111111;padding:40px 40px 32px;border-bottom:1px solid #2A2A2A;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background-color:#D4A017;width:52px;height:52px;border-radius:50%;text-align:center;line-height:52px;margin-bottom:20px;">
                      <span style="color:#ffffff;font-size:22px;font-weight:900;">✓</span>
                    </div>
                    <h1 style="color:#ffffff;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Cita Confirmada</h1>
                    <p style="color:#9CA3AF;font-size:14px;line-height:1.7;margin:0;">Hola <strong style="color:#ffffff;">{nombre}</strong>, tu reserva ha sido agendada exitosamente. Te esperamos en Visionary Studio Barber Shop.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DETALLES DE CITA -->
          <tr>
            <td style="background-color:#111111;padding:0 40px 32px;border-bottom:1px solid #2A2A2A;">
              <div style="background-color:#0A0A0A;border:1px solid #252525;border-radius:10px;overflow:hidden;">

                <div style="background-color:#D4A017;padding:14px 20px;">
                  <p style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0;">Detalles de tu Cita</p>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 20px;">
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:14px 0;font-size:13px;">Barbero</td>
                    <td style="color:#ffffff;padding:14px 0;font-size:13px;font-weight:700;text-align:right;">{barbero}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:14px 0;font-size:13px;">Servicio</td>
                    <td style="color:#ffffff;padding:14px 0;font-size:13px;font-weight:700;text-align:right;">{servicio}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:14px 0;font-size:13px;">Fecha</td>
                    <td style="color:#ffffff;padding:14px 0;font-size:13px;font-weight:700;text-align:right;">{fecha}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:14px 0;font-size:13px;">Hora</td>
                    <td style="color:#ffffff;padding:14px 0;font-size:13px;font-weight:700;text-align:right;">{hora}</td>
                  </tr>
                  <tr>
                    <td style="color:#6B7280;padding:14px 0;font-size:13px;">Total</td>
                    <td style="color:#D4A017;padding:14px 0;font-size:20px;font-weight:900;text-align:right;">{precio}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- NOTA IMPORTANTE -->
          <tr>
            <td style="background-color:#111111;padding:0 40px 32px;border-bottom:1px solid #2A2A2A;">
              <div style="background-color:#0A0A0A;border-left:3px solid #D4A017;border-radius:0 8px 8px 0;padding:16px 20px;">
                <p style="color:#6B7280;font-size:13px;line-height:1.7;margin:0;">
                  <strong style="color:#ffffff;">Recuerda:</strong> Por favor llega 5 minutos antes de tu cita. Si necesitas cancelar, contáctanos con al menos 24 horas de anticipación.
                </p>
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0A0A0A;border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;border-top:1px solid #2A2A2A;">
              <p style="color:#4B5563;font-size:12px;margin:0 0 6px;">Liberia, Guanacaste, Costa Rica</p>
              <p style="color:#4B5563;font-size:12px;margin:0 0 6px;">+506 6200-9558 &nbsp;·&nbsp; @lobo_barbero</p>
              <p style="color:#374151;font-size:11px;margin:16px 0 0;letter-spacing:2px;text-transform:uppercase;">© 2026 Visionary Studio Barber Shop</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
            """
        })
    except Exception as e:
        print(f"Error enviando email al cliente: {e}")

def enviar_notificacion_admin(nombre: str, telefono: str, email: str, barbero: str, servicio: str, precio: str, fecha: str, hora: str):
    try:
        resend.Emails.send({
            "from": "Visionary Studio <onboarding@resend.dev>",
            "to": "onboarding@resend.dev",
            "subject": f"Nueva reserva — {nombre} · {fecha} {hora}",
            "html": f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0D0D;font-family:'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D0D;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#111111;border-radius:12px 12px 0 0;padding:32px 40px;border-bottom:1px solid #2A2A2A;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">Visionary Studio</span><span style="color:#D4A017;font-size:22px;font-weight:900;letter-spacing:4px;font-style:italic;text-transform:uppercase;"> Barber Shop</span>
              <p style="color:#D4A017;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:12px 0 0;">Nueva Reserva Recibida</p>
            </td>
          </tr>

          <!-- DATOS DEL CLIENTE -->
          <tr>
            <td style="background-color:#111111;padding:32px 40px;border-bottom:1px solid #2A2A2A;">
              <p style="color:#6B7280;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Cliente</p>
              <div style="background-color:#0A0A0A;border:1px solid #252525;border-radius:10px;overflow:hidden;">
                <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 20px;">
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Nombre</td>
                    <td style="color:#ffffff;padding:12px 0;font-size:13px;font-weight:700;text-align:right;">{nombre}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Teléfono</td>
                    <td style="color:#ffffff;padding:12px 0;font-size:13px;font-weight:700;text-align:right;">{telefono}</td>
                  </tr>
                  <tr>
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Email</td>
                    <td style="color:#ffffff;padding:12px 0;font-size:13px;font-weight:700;text-align:right;">{email}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- DETALLES DE RESERVA -->
          <tr>
            <td style="background-color:#111111;padding:0 40px 32px;border-bottom:1px solid #2A2A2A;">
              <p style="color:#6B7280;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Reserva</p>
              <div style="background-color:#0A0A0A;border:1px solid #252525;border-radius:10px;overflow:hidden;">

                <div style="background-color:#D4A017;padding:12px 20px;">
                  <p style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0;">{fecha} &nbsp;·&nbsp; {hora}</p>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 20px;">
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Barbero</td>
                    <td style="color:#ffffff;padding:12px 0;font-size:13px;font-weight:700;text-align:right;">{barbero}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #1E1E1E;">
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Servicio</td>
                    <td style="color:#ffffff;padding:12px 0;font-size:13px;font-weight:700;text-align:right;">{servicio}</td>
                  </tr>
                  <tr>
                    <td style="color:#6B7280;padding:12px 0;font-size:13px;">Total</td>
                    <td style="color:#D4A017;padding:12px 0;font-size:18px;font-weight:900;text-align:right;">{precio}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0A0A0A;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #2A2A2A;">
              <p style="color:#374151;font-size:11px;margin:0;letter-spacing:2px;text-transform:uppercase;">Visionary Studio Admin · Panel de Reservas</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
            """
        })
    except Exception as e:
        print(f"Error enviando email al admin: {e}")
