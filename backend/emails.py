import resend
import os

resend.api_key = os.getenv("RESEND_API_KEY")

def enviar_confirmacion_cliente(nombre: str, email: str, barbero: str, servicio: str, precio: str, fecha: str, hora: str):
    try:
        resend.Emails.send({
            "from": "Evolution X <onboarding@resend.dev>",
            "to": "jose12roberto17@gmail.com",
            "subject": "Cita confirmada - Evolution X Barbershop",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0A0A; color: #ffffff; padding: 40px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #F5C518; font-size: 28px; letter-spacing: 4px; text-transform: uppercase; margin: 0;">EVOLUTION X</h1>
                    <p style="color: #666; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Barbershop</p>
                </div>
                <div style="background-color: #1A1A1A; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Hola {nombre},</h2>
                    <p style="color: #888; line-height: 1.6;">Tu cita ha sido confirmada exitosamente. Te esperamos en Evolution X Barbershop.</p>
                </div>
                <div style="background-color: #1A1A1A; border: 1px solid #F5C518; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: #F5C518; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 0;">Detalles de tu cita</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Barbero</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{barbero}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Servicio</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{servicio}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Fecha</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{fecha}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Hora</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{hora}</td>
                        </tr>
                        <tr>
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Total</td>
                            <td style="color: #F5C518; padding: 10px 0; font-size: 18px; font-weight: bold; text-align: right;">{precio}</td>
                        </tr>
                    </table>
                </div>
                <div style="background-color: #1A1A1A; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <h3 style="color: #F5C518; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 0;">Información importante</h3>
                    <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;">Por favor llega 5 minutos antes de tu cita. Si necesitas cancelar, contáctanos con al menos 24 horas de anticipación.</p>
                </div>
                <div style="text-align: center;">
                    <p style="color: #444; font-size: 12px;">Liberia, Guanacaste, Costa Rica</p>
                    <p style="color: #F5C518; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Evolution X Barbershop</p>
                </div>
            </div>
            """
        })
    except Exception as e:
        print(f"Error enviando email al cliente: {e}")

def enviar_notificacion_admin(nombre: str, telefono: str, email: str, barbero: str, servicio: str, precio: str, fecha: str, hora: str):
    try:
        resend.Emails.send({
            "from": "Evolution X <onboarding@resend.dev>",
            "to": "onboarding@resend.dev",
            "subject": f"Nueva reserva - {nombre} - {fecha} {hora}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0A0A0A; color: #ffffff; padding: 40px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #F5C518; font-size: 28px; letter-spacing: 4px; text-transform: uppercase; margin: 0;">EVOLUTION X</h1>
                    <p style="color: #666; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Nueva Reserva</p>
                </div>
                <div style="background-color: #1A1A1A; border: 1px solid #F5C518; border-radius: 8px; padding: 24px;">
                    <h3 style="color: #F5C518; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 0;">Detalles de la reserva</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Cliente</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{nombre}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Teléfono</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{telefono}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Email</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{email}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Barbero</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{barbero}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Servicio</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{servicio}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Fecha</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{fecha}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #2D2D2D;">
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Hora</td>
                            <td style="color: #ffffff; padding: 10px 0; font-size: 14px; font-weight: bold; text-align: right;">{hora}</td>
                        </tr>
                        <tr>
                            <td style="color: #666; padding: 10px 0; font-size: 14px;">Total</td>
                            <td style="color: #F5C518; padding: 10px 0; font-size: 18px; font-weight: bold; text-align: right;">{precio}</td>
                        </tr>
                    </table>
                </div>
            </div>
            """
        })
    except Exception as e:
        print(f"Error enviando email al admin: {e}")