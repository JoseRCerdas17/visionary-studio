# Evolution X Barbershop 💈

Plataforma web completa para **Evolution X Barbershop**, una barbería premium ubicada en Liberia, Guanacaste, Costa Rica. Incluye landing page, sistema de reservas, panel de administración y notificaciones por email.

## 🌐 Demo en vivo

- **Frontend:** [evolution-x-eight.vercel.app](https://evolution-x-eight.vercel.app)
- **Backend API:** [evolution-x-production.up.railway.app](https://evolution-x-production.up.railway.app)
- **Documentación API:** [evolution-x-production.up.railway.app/docs](https://evolution-x-production.up.railway.app/docs)
- **Panel Admin:** [evolution-x-eight.vercel.app/admin](https://evolution-x-eight.vercel.app/admin)

## ✨ Funcionalidades

- Landing page completa con diseño premium negro y dorado
- Sistema de reservas con calendario interactivo
- Selección de barbero, servicio, fecha y horario
- Notificaciones automáticas por email al cliente y al negocio
- Panel de administración con autenticación JWT
- Gestión de reservas (ver, filtrar y cancelar)
- Botón flotante de WhatsApp
- Diseño 100% responsive para móvil

## 🛠️ Tecnologías

### Frontend
- Next.js 15
- TypeScript
- Tailwind CSS
- React Calendar

### Backend
- FastAPI
- SQLAlchemy
- SQLite
- JWT Authentication
- Resend (emails)

### Deploy
- Vercel (frontend)
- Railway (backend)

## 🚀 Instalación local

### Requisitos
- Node.js 18+
- Python 3.11+
- Git

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

### Variables de entorno

Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend `.env`:
```
DATABASE_URL=sqlite:///./evolution_x.db
SECRET_KEY=tu-secret-key
RESEND_API_KEY=tu-resend-api-key
```

## 📱 Capturas de pantalla

### Landing page
![Landing page Evolution X]()

### Sistema de reservas
![Sistema de reservas]()

### Panel de administración
![Panel de administración]()

## 👨‍💻 Desarrollado por

José Roberto — Desarrollador Full Stack
- GitHub: [@tu-usuario](https://github.com/tu-usuario)

## 📄 Licencia

MIT