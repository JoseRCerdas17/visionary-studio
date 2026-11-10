# Visionary Studio Barber Shop — Project Context

> Comprehensive reference for AI agents and developers working on this codebase.
> Last updated from codebase scan: **November 2026** (supersedes the June 2026 scan).

---

## 1. Project Overview

**Visionary Studio Barber Shop** is a full-stack web platform for a premium barbershop in **Liberia, Guanacaste, Costa Rica**. It provides:

- A marketing **landing page** (black & gold premium design)
- A **public booking flow** (`/reservar`) with barber selection, service selection, add-ons, calendar, and time slots
- An **admin panel** (`/admin`) for managing appointments, payments, income reports, club memberships, and schedule blocking
- **Visionary Club** — paid monthly membership program (per-barber) with QR digital member cards, balance tracking, and member-exclusive booking slots
- **Stamp cards** — per-barber loyalty cards (5 cuts = 50% off, 10 = free cut)
- **Email notifications** (confirmation + automated reminders) via Resend
- **Self-service cancellation** via email link (`/cancelar?id={reserva_id}`)

**Production domain:** `https://visionarystudiobarbershop.com`

**Owner / master barber:** Alonso "Lobo" Lobo (`@lobo_barbero` on Instagram)

**Note:** The root `README.md` is outdated (still references "NobelCut" / "Evolution X"). The live brand and API title are **Visionary Studio**.

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.1 | App Router, SSR/CSR hybrid |
| React | 19.2.4 | UI |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling (`@import "tailwindcss"`, `@theme` tokens) |
| react-calendar | ^6.0.0 | Date picker in booking flow |
| react-qr-code | (installed) | QR rendering (member cards, stamp QRs, admin scan view) |
| Google Fonts | Montserrat + Playfair Display | Typography |

**Deploy:** Vercel

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.136.1 | REST API |
| Uvicorn | 0.46.0 | ASGI server |
| SQLAlchemy | 2.0.49 | ORM |
| SQLite (local) / PostgreSQL (prod) | — | Database |
| python-jose + bcrypt | — | JWT auth |
| APScheduler | 3.11.2 | Reminder cron jobs |
| Resend | 2.29.0 | Transactional email |
| pydantic | 2.13.3 | Request/response validation |
| psycopg2-binary | 2.9.12 | PostgreSQL driver (prod) |
| python-multipart | 0.0.26 | OAuth2 form parsing |

**Deploy:** Railway (`Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port 8000`)

---

## 3. Folder Structure

```
visionary-studio/
├── CONTEXT.md                 ← This file
├── README.md                  ← Outdated; see this file instead
├── .gitignore
│
├── backend/
│   ├── main.py                ← FastAPI app, lifespan, health endpoints, seeds
│   ├── Procfile               ← Railway start command
│   ├── requirements.txt
│   ├── emails.py              ← Confirmation & admin notification emails
│   ├── recordatorios.py       ← APScheduler jobs (reminders + club expiry alerts)
│   ├── recordatorios_logic.py ← Pure reminder logic (testable, no I/O)
│   ├── .env                   ← Local env (ADMIN_*/ADMIN2_* etc.)
│   ├── auth/
│   │   └── security.py        ← bcrypt + JWT helpers (24h expiry)
│   ├── database/
│   │   └── connection.py      ← Engine, session, migration helpers
│   ├── models/
│   │   ├── reserva.py         ← Reserva (bookings + blocked slots)
│   │   ├── usuario.py         ← Admin/barber accounts
│   │   ├── resena.py          ← Reviews
│   │   ├── stamp_card.py      ← StampCard + StampToken (loyalty)
│   │   ├── club.py            ← ClubPlan, ClubMiembro, ClubGrupo, ClubPago, ClubConsumo, ClubServicioExtra
│   │   └── finanzas.py        ← PagoSilla, Gasto
│   ├── routers/
│   │   ├── auth.py            ← Login + token verification + user list
│   │   ├── reservas.py        ← Reservations + blocking + member-exclusive slot enforcement
│   │   ├── club.py            ← Visionary Club (planes, miembros, grupos, consumos, stats)
│   │   ├── stamps.py          ← Stamp card QR + redemption
│   │   ├── finanzas.py        ← PagoSilla + Gastos (admin-only)
│   │   └── resenas.py         ← Public reviews CRUD
│   └── tests/
│       └── test_recordatorios.py
│
└── frontend/
    ├── AGENTS.md / CLAUDE.md  ← Next.js 16 agent notes
    ├── app/                   ← Next.js App Router
    │   ├── layout.tsx         ← Root layout (fonts, floating buttons)
    │   ├── page.tsx           ← Landing page
    │   ├── globals.css        ← Tailwind theme + calendar styles
    │   ├── sitemap.ts
    │   ├── reservar/page.tsx  ← Public booking wizard (5 steps)
    │   ├── login/page.tsx     ← Admin login
    │   ├── admin/
    │   │   ├── page.tsx       ← Full admin panel (main; ~3100 lines)
    │   │   └── reservas/page.tsx  ← Stub/placeholder only
    │   ├── cancelar/page.tsx  ← Self-service cancellation
    │   ├── barbero/page.tsx   ← Barber stamp-QR page (auto-detects Lobo vs Ian from session)
    │   ├── card/page.tsx      ← "Mi Tarjeta" — stamp cards by phone
    │   ├── club/
    │   │   ├── page.tsx       ← Visionary Club member portal (lookup by phone, shows QR + balance)
    │   │   └── qr/[token]/page.tsx  ← Staff scan page (register consumo)
    │   ├── stamp/[token]/page.tsx   ← Stamp redemption page (client scans barber QR)
    │   ├── components/
    │   │   ├── layout/        ← Navbar, Footer
    │   │   ├── sections/      ← Hero, Servicios, Galeria, Equipo, Contacto, VisionaryClub
    │   │   ├── club/          ← PlanesClub (public plan cards)
    │   │   └── ui/            ← WhatsAppButton, LocationButton, StampCardButton
    │   └── lib/
    │       └── barberos.ts    ← Barber config + time slot definitions
    └── public/                ← Static assets (logo, photos, favicons, barberia.mp4)
```

---

## 4. Frontend Routes & Pages

| Route | File | Auth | Description |
|---|---|---|---|
| `/` | `app/page.tsx` | Public | Landing: Hero → Servicios → Galeria → Equipo → Contacto + VisionaryClub section |
| `/reservar` | `app/reservar/page.tsx` | Public | 5-step booking wizard (Barbero → Servicio → Adicionales → Fecha y Hora → Confirmar) |
| `/cancelar?id={id}` | `app/cancelar/page.tsx` | Public | Cancels reservation via API link from email |
| `/card` | `app/card/page.tsx` | Public | "Mi Tarjeta": enter phone → shows all stamp cards (per-barber) with discount status |
| `/stamp/[token]` | `app/stamp/[token]/page.tsx` | Public | Stamp redemption landing (client scans barber's QR; JWT, 5 min TTL) |
| `/barbero` | `app/barbero/page.tsx` | JWT | Barber's stamp-QR screen (auto-detects Lobo vs Ian from `/auth/verificar`, refreshes QR every 5 min) |
| `/club` | `app/club/page.tsx` | Public | Visionary Club portal: phone → member card (balance, plan, QR, payment history); includes PlanesClub section |
| `/club/qr/[token]` | `app/club/qr/[token]/page.tsx` | JWT | Staff scan page for registering a member's consumo (corte/barba/mascarilla) |
| `/login` | `app/login/page.tsx` | Public | Admin login → stores JWT in `localStorage` |
| `/admin` | `app/admin/page.tsx` | JWT required | Full admin dashboard (see §8) |
| `/admin/reservas` | `app/admin/reservas/page.tsx` | — | **Unused stub** — all admin logic is in `/admin` |

### Floating UI
- `WhatsAppButton` — bottom-right, links to `https://wa.me/50662009558`
- `LocationButton` — above WhatsApp, links to Google Maps
- `StampCardButton` — home page only, links to `/card`
- Hidden on `/admin` and `/login` via `usePathname()` check in `layout.tsx`.

### Landing sections
- **Navbar:** "Mi Tarjeta" (`/card`) + "Reservar Cita" (`/reservar`)
- **Hero:** "Visionary Club" CTA linking to `/club`
- **VisionaryClub.tsx** — renders `PlanesClub` (fetches active plans from `/club/planes/publico`, shows price + services + pasos)
- **Equipo.tsx** — two cards: Alonso "Lobo" Lobo and Ian Bustos Navarrete (stats, "Reservar" buttons, review form posting to `/resenas/`)

---

## 5. Business Domain

### Barbershop Info
- **Location:** Liberia, Guanacaste, Costa Rica
- **Google Maps:** `https://maps.app.goo.gl/zcfrCQAJDv4KLDfb9`
- **WhatsApp:** +506 6200-9558 (`https://wa.me/50662009558`)
- **Instagram:** `@lobo_barbero`
- **Payment:** At appointment (no online payment). Admin records payment method after service.

### Barbers (config: `frontend/lib/barberos.ts`)

| ID | Name | Specialty | Slot interval | Slots |
|---|---|---|---|---|
| 1 | Alonso Lobo | Owner & Master Barber | 30 min | 8:30, 9:00, 9:30, 10:00, 10:30 AM · 1:00, 1:30, 2:00, 3:00, 3:30 · 4:30, 5:00, 5:30, 6:00, 6:30 PM — **plus member-exclusive 2:30 PM and 7:00 PM** (see §7) |
| 2 | Ian Bustos Navarrete | Cortes modernos y atención al cliente | ~60–75 min | 1:00 PM, 2:00 PM, 3:00 PM, 4:30 PM, 5:30 PM, 6:30 PM |

Each barber has an **independent schedule**. Uniqueness is enforced per `(fecha, hora, barbero)`.

**Duration display quirk (Ian):** `getDuracionServicio()` in `reservar/page.tsx` shows different durations for Ian: Corte de Cabello / Corte y Barba = **60 min**, Marcado y/o Barba = **30 min**, Cejas = **10 min**. Lobo and everyone else see the durations hardcoded in the services list.

**Service duration is informational only.** Slot availability is determined by the barber's fixed time grid, not by service length. There is no overlap/blocking logic beyond exact time slot matching.

### Services (hardcoded in frontend)
Defined in both `app/reservar/page.tsx` and `app/components/sections/Servicios.tsx`:

| Service | Price (CRC) | Duration |
|---|---|---|
| Corte de Cabello | ₡4,000 | 30 min |
| Corte y Barba | ₡5,000 | 30 min |
| Marcado y/o Barba | ₡2,000 | 15 min |
| Cejas | ₡1,000 | 5 min |

### Adicionales (add-ons)
Available in booking step 3 ("Adicionales") — defined in `reservar/page.tsx`:

| Adicional | Price (regular) | Price (Visionary Club member) |
|---|---|---|
| Mascarilla facial | ₡1,000 | **₡750** |
| Pigmentación | ₡1,000 | **₡750** |

- Member price applies when `esMiembroClub && clubBarbero === barbero.nombre` (member's barber must match the booking barber). Stored per reservation in `adicionales` (JSON list) + `adicionales_precio` (total, CRC).

---

## 6. Booking Flow (`/reservar`)

### Steps (`pasos = ["Barbero", "Servicio", "Adicionales", "Fecha y Hora", "Confirmar"]`)
1. **Barbero** — select from `BARBEROS` (default: Alonso Lobo)
2. **Servicio** — select from hardcoded services list
3. **Adicionales** — optional: Mascarilla facial / Pigmentación (₡1,000, or ₡750 for club members)
4. **Fecha y Hora** — calendar + time slot grid (barber-specific slots)
5. **Confirmar** — client name, phone, email → POST to API

### Visionary Club integration in booking
On mount, reads `club_telefono` from `localStorage` → `GET /club/tarjeta/{telefono}`. If `estado === "activo"`:
- `esMiembroClub = true` and `clubBarbero = data.barbero`
- **Member price for adicionales** applies only when the booking barber matches the member's barber (`beneficiosMiembro`)
- If booking with **Alonso Lobo** and the member's barber is Lobo, the two **member-exclusive slots `2:30 PM` and `7:00 PM`** are appended to the slot grid (`HORARIOS_MIEMBRO`), shown with a 💎 badge, and are blocked for non-members on the backend

### Date Rules
- **Sundays disabled** (`date.getDay() === 0`)
- **Range:** today through +7 days only
- **Past slots today:** disabled if less than 5 minutes remain before slot time
- Date format sent to API: `toLocaleDateString("es-CR")` → **`DD/MM/YYYY`**
- Time format: **`H:MM AM/PM`** (e.g. `"5:00 PM"`)

### Occupied Slots
```
GET /reservas/ocupados?fecha={DD/MM/YYYY}&barbero={nombre}
```
Returns array of occupied time strings for that barber on that date (excludes `cancelada`, **includes `bloqueado`**). A slot blocked by Lobo at 2:30 PM or 7:00 PM therefore appears as unavailable to members in the booking grid.

### Client Data Persistence
Name, phone, email saved to `localStorage`:
- `cliente_nombre`, `cliente_telefono`, `cliente_email`
- `club_telefono` (set by the `/club` portal when a member looks up their card)
- `stamp_telefono` (used by `/card`)

### On Success
Shows confirmation screen. Backend sends confirmation email to client (includes `barbero` name, adicionales, and price).

---

## 7. Visionary Club

Paid monthly membership program. Each membership belongs to **one barber** (`club_miembros.barbero`), enforced by phone uniqueness (a phone can only be registered once, regardless of barber).

### Plans (seeded in DB by `seed_club_planes()` in `main.py`)

| Plan | Price (₡/mo) | Active | Included (per 30-day cycle) | Cupo |
|---|---|---|---|---|
| Essential | 7,500 | ✅ | 2 cortes | — |
| Grooming | 9,500 | ✅ | 2 cortes + 1 barba | — |
| Premium | 17,000 | ✅ | 4 cortes + 3 barbas | — |
| Student | 10,500 | ❌ (hidden) | 3 cortes | — |
| Visionary Black | 14,000 | ❌ (hidden) | 4 cortes | 20 |
| Visionary Friends 5 | 35,000 | ❌ (hidden) | 2 cortes | group plan (5 miembros) |

Plan activation/deactivation and price/service edits are done in **admin → Club** (Lobo only). Seed patches migrate legacy Premium (2→3 barbas) and Visionary Black (1→0 barbas) values on startup.

**Plan behavior:**
- `DIAS_VIGENCIA = 30` — every payment activates (or renews) a 30-day cycle; early renewal extends from the current `fecha_vencimiento`
- Balance **resets each cycle** — consumos and servicios-extra only count from the member's `fecha_inicio`
- **Mascarilla promo:** the first `PROMO_MASCARILLA_LIMITE = 10` members per (plan, barber) get one free mascarilla (`mascarilla_promo`); consumed via the normal consumo flow
- **Cupo máximo** (Visionary Black): enforced only on first activation, not on renewals

### Member states
`pendiente` (registered, not yet paid) → `activo` (paid/activated) → `vencido` (past `fecha_vencimiento`, computed) or `suspendido` (admin action). Expiry is computed dynamically in `_estado_efectivo()`.

### Per-barber memberships
- `ClubMiembro.barbero` and `ClubGrupo.barbero` — `"Alonso Lobo"` or `"Ian Bustos Navarrete"` (validated)
- Barber accounts (non-admin) can only see/manage **their own** members (`_verificar_barbero_miembro`)
- Admin (Lobo) sees all, and the admin Club view has a Lobo/Ian filter (profile-aware stats, pagos, grupos)
- Phone number is globally unique — a client can't hold a membership with both barbers

### Member-exclusive time slots (Lobo only)
- Slots: **`2:30 PM`** and **`7:00 PM`** — defined as `HORARIOS_MIEMBRO` in `frontend/app/reservar/page.tsx` and `HORARIOS_EXCLUSIVOS_MIEMBRO` in `backend/routers/reservas.py`
- Only **Alonso Lobo** offers them; Ian has no member-exclusive slots
- In the booking flow they are appended to the slot grid only for active club members whose barber is Lobo, and rendered with a 💎 badge
- **Backend enforcement** (`POST /reservas/`): if `barbero == "Alonso Lobo"` and `hora` is one of the two, the phone must match an active member (state `activo`, `barbero` match, `qr_token` set, `fecha_vencimiento` null or ≥ today) or the request is rejected with **403** `"Este horario es exclusivo para miembros activos de Visionary Club"`
- **Admin block tool** (`/admin` → Calendario): the "Bloquear / desbloquear horarios" grid shows both slots **only for Lobo**, in chronological order, with a 💎 badge (can block/unblock like any slot). Ian's grid is unchanged.
- `POST /reservas/bloqueos` has **no allowed-hours list** — it accepts any hour string, including the member-exclusive ones

### `es_miembro_club` on reservations
- `POST /reservas/` calls `_detectar_miembro_club()`: active membership for (phone, barber) **and** service maps to a balance type with saldo > 0 (Corte/Corte y Barba → corte; Marcado y/o Barba → barba)
- Result stored on the reserva as `es_miembro_club` (default false); used in admin (payment modal defaults to "membrésía", shown as 💎 on cards)
- `POST /reservas/backfill-membresia` (admin) re-evaluates the flag on pending reservations

### Adicionales pricing
Members pay **₡750** per adicional (vs ₡1,000 regular) when booking with the barber on their membership. Stored as `adicionales` (JSON) + `adicionales_precio` on the reserva.

### Servicios extra
Staff can add services **outside the plan balance** to a member (`POST /club/miembros/{id}/servicios-extra`): choose corte/barba/mascarilla, monto, paid or pending, method (sinpe/efectivo). Paid extras also create a `ClubPago` (`referencia = "servicio-extra:{id}"`). Extras of the vigente cycle count toward `_balance`. Deleting an extra also deletes its linked pago. Only **admin (Lobo)** can add/remove extras.

### Visionary Friends 5 (group plan)
`POST /club/grupos` — creates the group membership: exactly **5 miembros**, unique phones, one payment (default = plan price), all members activated with 30-day validity immediately. Group can be deactivated (`PATCH /club/grupos/{id}/estado`) suspending all 5 members.

### Member portal (public pages)
- `/club` — enter phone → `GET /club/tarjeta/{telefono}` → shows plan, estado, balance (cortes/barbas/mascarilla), QR code (points to `/club/qr/{qr_token}`), payment history, and servicios extra
- `/club/qr/[token]` — staff scan page (JWT): fetches member by QR token, registers consumo via `POST /club/miembros/{id}/consumo`
- **QR regeneration:** `POST /club/miembros/{id}/regenerar-qr`
- 1-minute debounce between consumos of the same type (prevents double-scan)

### Cron job (APScheduler)
`verificar_vencimientos_club` runs **daily at 10:00 CR time**:
- Finds active memberships expiring within 7 days
- Sends each such member a reminder email (if they have email and haven't been notified — sets `recordatorio_vencimiento_enviado`)
- Sends an admin summary email (`Club — N membresía(s) por vencer`) to `jose12roberto17@gmail.com`

---

## 8. Admin Panel (`/admin`)

Single large client component (~3100 lines). Eight views via tab switcher (`VISTAS`):

| Vista | Purpose |
|---|---|
| **Lista** | Filterable/searchable reservation list (chip + icon tabs) |
| **Calendario** | Month grid + day detail + barber-specific blocking |
| **Ingresos** | Revenue dashboard (day / rolling 7-day week / month) |
| **Canceladas** | Recently cancelled reservations |
| **Reseñas** | Landing-page review moderation |
| **Club** | Visionary Club management |
| **Silla** | Pago de Silla (see below) — **Lobo (admin) only** |
| **Gastos** | Business expenses — **Lobo (admin) only** |

`VISTAS_LOBO = {"silla", "gastos"}` — only admins see these; barbers get Club + standard views.

### Auth Flow
1. Login at `/login` → `POST /auth/login` (OAuth2 form: username + password)
2. JWT stored as `localStorage.admin_token`; `usuario_rol` and `usuario_barbero` stored alongside
3. On `/admin` load: verifies token via `GET /auth/verificar` → `{ username, rol, barbero }`
4. **Profile switching (admin only):** Lobo logs in once and switches between "Todos", "Lobo", "Ian" via buttons (`perfil_actual` in localStorage). When a specific profile is selected, the `GET /reservas/?barbero=` query includes it.
5. Ian's account (`ian`) has no switcher — always sees only his own reservations (`rol: "barber"`).
6. `esCuentaIan()` detects Ian accounts by barbero string or username containing "ian" (or `admin2`) — used to hide the profile switcher and personalize UI.
7. All authenticated API calls use header: `Authorization: Bearer {token}`

### Lista view filters
- `pendiente` (default), `confirmada`, `cancelada`, `todas`
- Text search: name, phone, service
- Reservation cards show a 💎 badge for `es_miembro_club` reservations

### Payment Modal
Clicking ✓ on a `pendiente` reservation records payment:

**Methods:** SINPE, Efectivo, Mixto (SINPE + Efectivo split), **Membresía** (auto-preselected when `es_miembro_club`)

**Optional extras:**
- Propina (tip in colones)
- Pago en dólares (USD amount, converted with live rate from `https://api.exchangerate-api.com/v4/latest/USD`, fallback ₡520/USD)

**Stored format:** JSON string in `metodo_pago` (same shapes as before — `{tipo, monto|montoSinpe|montoEfectivo, propina{monto}, dolares{monto}}`). Legacy plain strings `"sinpe"` / `"efectivo"` still parsed.

### Income Calculations ("Ingresos" view)
Only `confirmada` reservations count. **Ingresos = reserva revenue + Silla + Club payments.**

```
ingreso_colones(reserva) = base_monto + propina + (dolares × tipo_cambio)
ingreso_hoy/semana/mes   = Σ reservas + silla + club Pagos (split Lobo / Ian)
ganancia_neta            = ingresos − gastos
```

- **Club payments** (`/club/pagos`) are included in income (sums + per-barber breakdown "Lobo ₡X · Ian ₡Y")
- **Silla** (`/finanzas/silla`) — money Lobo pays for the chair ("Pago de Silla"); tracked per day/week/month, counts toward income
- **Gastos** (`/finanzas/gastos`) — business expenses; shown in a red "Gastos del período" card and **subtracted** to compute **Ganancia Neta** (green/red card, per day/week/month)

### Calendar & Slot Blocking
- Select a day in month calendar → shows that day's appointments (all barbers)
- **Barber selector** for blocking section → shows that barber's slot grid
- **Lobo's grid includes the member-exclusive slots 2:30 PM and 7:00 PM** (with 💎 badge) — Ian's does not
- Click empty slot → block; click blocked slot → unblock
- Bulk: "Bloquear día" / "Desbloquear día" for selected barber (cover all listed slots including 💎 ones)
- Blocked slots stored as `estado: "bloqueado"` reservations (not a separate table); they are filtered out of reservation lists but included in `/ocupados`
- "Los horarios con cita no se pueden bloquear"

### Club view (admin)
- Plan management: toggle active, edit price/cortes/barbas
- Member list with search + estado filter (todas/activo/pendiente/vencido/suspendido), per-barber filter
- Create member (nombre, teléfono, email, plan, barbero) — phone unique, plan price not auto-charged; activation happens via **Registrar pago** (modal: metodo sinpe/efectivo + referencia; creates `ClubPago`, activates/renews 30-day cycle, assigns mascarilla promo if plan/barber under limit)
- Detail modal: balance, payment history, consumos, servicios extra (add/remove — removes linked pago too), anular consumo (restores balance), QR display, regenerate QR
- **Scan QR** modal: paste `/club/qr/{token}` URL or token → registers consumo
- **Nuevo Grupo** flow: 5 miembros for "Visionary Friends 5" (members activated immediately with 30-day vigencia)
- Stats cards: miembros activos, pagos del mes, servicios consumidos, por vencer (≤7 días), revenue totals with Lobo/Ian split
- CSV export: "miembros-club.csv" (anular / suspender buttons per row)

---

## 9. Database

### Engine
- **Local default:** SQLite → `sqlite:///./visionary_studio.db`
- **Production:** PostgreSQL via `DATABASE_URL` env var
- Auto-creates tables on startup: `Base.metadata.create_all(bind=engine)`
- Manual column migrations via `ensure_*()` helpers in `database/connection.py` (SQLite `PRAGMA table_info` / Postgres `ADD COLUMN IF NOT EXISTS`):
  reservas: `recordatorio_*`, `cancelada_en`, `adicionales`, `adicionales_precio`, `es_miembro_club` · club_miembros: `email`, `recordatorio_vencimiento_enviado`, `barbero` · club_grupos: `barbero` · stamp_cards: `barbero`
- `ensure_resenas_table()` and `ensure_club_servicios_extra_table()` create those tables if missing

### Tables

| Table | Model | Notes |
|---|---|---|
| `reservas` | `Reserva` | Bookings + `bloqueado` pseudo-reservations |
| `usuarios` | `Usuario` | `username` unique, `rol` (`admin`/`barber`), `barbero` (null = all) |
| `resenas` | `Resena` | `aprobado` defaults True |
| `stamp_cards` | `StampCard` | Unique `(cliente_telefono, barbero)`; `barbero` default `'Lobo'` |
| `stamp_tokens` | `StampToken` | Single-use JWT backing the stamp QR |
| `club_planes` | `ClubPlan` | `servicios` = JSON string `{cortes, barbas, mascarilla}` |
| `club_miembros` | `ClubMiembro` | Phone unique; `barbero` (default 'Alonso Lobo'); optional `grupo_id` |
| `club_grupos` | `ClubGrupo` | "Visionary Friends 5" group purchases |
| `club_pagos` | `ClubPago` | One row per payment; `referencia = "servicio-extra:{id}"` links extra payments |
| `club_consumos` | `ClubConsumo` | Balance debits; `anulado` + `motivo_anulacion` |
| `club_servicios_extra` | `ClubServicioExtra` | Off-plan paid/pending services; counted in vigente-cycle balance |
| `pagos_silla` | `PagoSilla` | Pago de Silla (date-only, CR timezone) |
| `gastos` | `Gasto` | Business expenses (date-only, CR timezone) |

**Datetime convention:** club & finanzas models store **naive CR local datetimes** (`America/Costa_Rica`, UTC-6, no DST). Reservas use string dates (`DD/MM/YYYY`) + 12-hour times.

---

## 10. API Endpoints

Base URL: `{API}/` (local: `http://localhost:8000`). Interactive docs: `{API}/docs`.

### Root & Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | `{ "message": "Visionary Studio API funcionando" }` |
| GET | `/health/reminders` | No | Scheduler status, Resend key configured, next run time |
| GET | `/health/reminders/debug` | No | Pending reservations reminder eligibility debug |

### Auth (`/auth`)

| Method | Path | Auth | Body / Params | Response |
|---|---|---|---|---|
| POST | `/auth/login` | No | Form: `username`, `password` | `{ access_token, token_type: "bearer" }` |
| GET | `/auth/verificar` | Bearer | — | `{ username, rol, barbero }` |
| GET | `/auth/usuarios` | Admin | — | List all users `[{ username, rol, barbero }]` |

JWT payload includes `sub` (username), `rol`, `barbero`. Expires in **24 hours**.

### Reservas (`/reservas`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reservas/` | No | Create reservation. 409/400 on conflict. **403 if 2:30/7:00 PM slot and not active Lobo member.** Sends confirmation email. |
| GET | `/reservas/` | **Bearer** | List reservations. Optional `?barbero=`. Admins see all/filter; barbers only their own. |
| GET | `/reservas/ocupados` | No | Query: `fecha`, `barbero`. Returns occupied hour strings (**includes `bloqueado`**) |
| POST | `/reservas/bloqueos` | Bearer | Body: `{ fecha, hora, barbero }`. Any hour allowed (no allowed-hours list) |
| DELETE | `/reservas/bloqueos` | Bearer | Query: `fecha`, `hora`, `barbero`. Removes block |
| GET | `/reservas/{reserva_id}` | No | Get single reservation |
| GET | `/reservas/cancelar/{reserva_id}` | No | Client self-cancel via email link |
| PATCH | `/reservas/{reserva_id}` | Bearer | Body: `{ estado, metodo_pago? }` |
| DELETE | `/reservas/{reserva_id}` | Bearer | Soft cancel (sets `cancelada`) |
| PATCH | `/reservas/restaurar/{reserva_id}` | Admin (`get_admin_actual`) | Restore cancelled → pendiente |
| DELETE | `/reservas/eliminar/{reserva_id}` | Admin dep | Hard delete |
| DELETE | `/reservas/limpiar-canceladas-viejas` | Admin dep | Purge cancelled older than 7 days |
| POST | `/reservas/backfill-membresia` | Admin (`get_admin_actual`) | Re-evaluates `es_miembro_club` on pending reservations |

### Club (`/club`) — all staff endpoints require Bearer; `_staff_only` (admin or barber) unless noted

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/club/planes` | Bearer | List plans + member counts (+ `?barbero=` filter) |
| PATCH | `/club/planes/{id}` | Admin | Toggle plan active |
| PUT | `/club/planes/{id}` | Admin | Edit precio / cortes / barbas |
| GET | `/club/planes/publico` | No | Public list of active plans (no admin data) |
| POST | `/club/miembros` | Staff | Create member (`barbero` validated; phone unique) — starts as `pendiente` |
| GET | `/club/miembros` | Staff | List (`?estado=`, `?barbero=`) |
| GET | `/club/miembros/{id}` | Staff | Full detail (pagos, consumos, servicios_extra) |
| PATCH | `/club/miembros/{id}/estado` | Staff | `{estado: "activo"\|"suspendido"}` |
| POST | `/club/miembros/{id}/pago` | Staff | Register payment → activate/renew 30-day cycle (validates plan activo, cupo, método sinpe/efectivo) |
| POST | `/club/miembros/{id}/consumo` | Staff | Register consumo (corte/barba/mascarilla) w/ 1-min debounce |
| POST | `/club/miembros/{id}/anular-consumo` | Staff | Anular latest (or by `consumo_id`); restores balance + mascarilla promo flag |
| POST | `/club/miembros/{id}/servicios-extra` | Admin | Add off-plan service (monto, pagado, metodo, nota); paid → also creates ClubPago |
| DELETE | `/club/miembros/{id}/servicios-extra/{extra_id}` | Admin | Remove extra + its linked pago |
| POST | `/club/miembros/{id}/regenerar-qr` | Staff | New QR token |
| POST | `/club/grupos` | Staff | Create "Visionary Friends 5" group (5 miembros) |
| GET | `/club/grupos` | Staff | List groups (`?barbero=`) |
| PATCH | `/club/grupos/{id}/estado` | Staff | `{activo: bool}` — suspends/reactivates all 5 members |
| GET | `/club/stats` | Staff | `{ miembros_activos, pagos_mes_total, pagos_mes_cantidad, servicios_mes, por_vencer[] }` (`?barbero=`) |
| GET | `/club/pagos` | Staff | All club payments (`?barbero=`) |
| GET | `/club/tarjeta/{telefono}` | No | Public member card by phone (balance, QR token, pagos, extras) |
| GET | `/club/qr/{qr_token}` | Staff | Staff scan → member detail (adds `error` if suspendido/vencido) |

### Stamps (`/stamps`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stamps/qr?barbero=Lobo\|Ian` | No* | Generate single-use stamp QR (JWT, 5 min TTL, qr_url → `/stamp/{token}`) |
| POST | `/stamps/canjear/{token}` | No | Redeem: increments card (unique per `(telefono, barbero)`); 5 cuts = 50%, 10 = free; 12th resets to 1 |
| GET | `/stamps/card/{telefono}` | No | All stamp cards for a phone (array; 404 if none) |

\* `/stamps/qr` is unauthenticated but the admin UI calls it from logged-in pages; treat the 5-minute single-use QR as the de-facto guard.

**Stamp tiers:** `_discount_for`: 10 cuts → "¡Corte gratis!" (100%) · 5 cuts → "50% de descuento" · else "Precio normal". Cards are **per barber** (unique telefono+barbero).

### Finanzas (`/finanzas`) — admin-only (`_admin_only`, "Solo Lobo puede gestionar finanzas")

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/finanzas/silla` | Admin | Create PagoSilla `{ monto, nota? }` (today, CR date) |
| GET | `/finanzas/silla` | Admin | List pagos silla (desc by fecha/id) |
| DELETE | `/finanzas/silla/{id}` | Admin | Remove pago silla |
| POST | `/finanzas/gastos` | Admin | Create Gasto `{ descripcion, monto }` |
| GET | `/finanzas/gastos` | Admin | List gastos |
| DELETE | `/finanzas/gastos/{id}` | Admin | Remove gasto |

### Reseñas (`/resenas`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/resenas/` | No | Create review (`calificacion` 1–5, `comentario` ≤500 chars) |
| GET | `/resenas/` | No | Latest 5 approved reviews (landing page) |
| GET | `/resenas/todas` | Bearer (any) | All reviews (admin moderation) |
| DELETE | `/resenas/{id}` | Admin (`get_current_admin`) | Delete review |

---

## 11. Email System

**Provider:** Resend · **From:** `Visionary Studio <reservas@visionarystudiobarbershop.com>`

### Confirmation Email (`emails.enviar_confirmacion_cliente`)
- Triggered on `POST /reservas/`
- Brand colors (#0A0A0A, #C9A035); includes service, date, time, **barbero**, price, adicionales + price, maps/WhatsApp/Instagram links, cancel link
- Cancel link: `{FRONTEND_URL}/cancelar?id={reserva_id}`

### Admin Notification (`emails.enviar_notificacion_admin`)
- Exists but is **NOT called** from `crear_reserva`

### Reminder Emails (`recordatorios.enviar_recordatorio`)
Automated via APScheduler (`America/Costa_Rica`):

| Type | When sent | Subject |
|---|---|---|
| `dia_previo` | Day before appointment, from 14:00 CR onward | "Recordatorio: Tu cita es mañana" |
| `1h` | 52–68 minutes before appointment | "Recordatorio: Tu cita es en 1 hora" |

Scheduler runs every **3 minutes** (`TICK_MINUTES = 3`). Only `estado == "pendiente"`. Disable with `DISABLE_REMINDER_SCHEDULER=true`.

### Membership expiry alerts (club)
`verificar_vencimientos_club` — **daily at 10:00 CR** (job id `vencimientos_club_visionary`):
- Members expiring in ≤ 7 days receive a reminder email (only once — `recordatorio_vencimiento_enviado`)
- An admin summary email is sent to Lobo (`jose12roberto17@gmail.com`): subject `Visionary Club — N membresía(s) por vencer`

---

## 12. Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Prod yes | `sqlite:///./visionary_studio.db` | PostgreSQL or SQLite connection string |
| `SECRET_KEY` | Prod yes | `evolution-x-secret-key-2026` | JWT signing key |
| `ADMIN_USERNAME` | Yes* | — | **Lobo** admin login (no default; missing ⇒ no account seeded, warning logged) |
| `ADMIN_PASSWORD` | Yes | — | Lobo password (bcrypt-hashed at startup) |
| `ADMIN_IS_ADMIN` | No | `false`-ish if unset | `true` → account gets `rol: "admin"`, barbero name "Alonso Lobo" |
| `ADMIN2_USERNAME` | Yes* | — | **Ian** account (second barber) |
| `ADMIN2_PASSWORD` | Yes | — | Ian password |
| `ADMIN2_IS_ADMIN` | No | — | `true` → admin; otherwise `rol: "barber"`, barbero name "Ian Bustos Navarrete" |
| `RESEND_API_KEY` | Prod yes | — | Resend email API key |
| `FRONTEND_URL` | Prod yes | `http://localhost:3000` | Used in email cancel/confirmation links |
| `DISABLE_REMINDER_SCHEDULER` | No | — | `true`/`1`/`yes`/`on` disables APScheduler |

\* Seeding accounts: on startup `seed_usuarios()` reads up to two accounts from `ADMIN_*` / `ADMIN2_*` (no defaults; if missing, no account is created and a warning is logged). `is_admin=true` → `rol: "admin"` + barbero `"Alonso Lobo"`; otherwise `rol: "barber"` + barbero `"Ian Bustos Navarrete"`.

> **Important:** `BARBER_1_*` / `BARBER_2_*` env vars mentioned in older docs are **no longer used** — replaced by `ADMIN_*` / `ADMIN2_*`.

### Frontend (`frontend/.env.local`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Prod yes | `http://localhost:8000` | Backend API base URL |

---

## 13. Design System

### Color Palette (`frontend/app/globals.css` — `@theme`)

| Token | Hex | Usage |
|---|---|---|
| `gold` | `#E0B84C` | Primary accent, buttons, highlights |
| `gold-light` | `#F0C95A` | Gradients, hover accents |
| `gold-dark` | `#B8872E` | Gradient start |
| `gold-muted` | `#C9A035` | Email templates, calendar active |
| `dark` | `#0A0A0A` | Page background |
| `dark-card` | `#1A1A1A` | Cards, panels |
| `dark-surface` | `#2D2D2D` | Secondary surfaces |
| `dark-border` | `#2A2A2A` | Borders |

Inline extras: floating buttons `#D4A017`, WhatsApp green `#25D366`, calendar bg `#252525`, hover `#A07828`.

### Typography
- Body: **Montserrat** (`--font-sans`) · Accent/headings: **Playfair Display** (`--font-serif`, used sparingly)
- Style: uppercase headings, wide letter-spacing

### Component Classes
```css
.btn-gold       /* Gold filled button */
.btn-outline    /* Gold border, hover fill */
.section-padding
```

---

## 14. External Integrations

| Service | URL / ID | Used for |
|---|---|---|
| Resend | API key env | Transactional emails |
| Google Maps | `maps.app.goo.gl/zcfrCQAJDv4KLDfb9` | Location links |
| WhatsApp | `wa.me/50662009558` | Contact button, admin WA links |
| Instagram | `@lobo_barbero` | Social links |
| Exchange Rate API | `api.exchangerate-api.com/v4/latest/USD` | USD→CRC in admin income (fallback 520) |

---

## 15. Local Development

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
# Create backend/.env with required vars
python -m uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs
```

> **Windows note:** `uvicorn.exe` may be blocked by Smart App Control / WDAC ("Una directiva de Control de aplicaciones bloqueó este archivo"). Use `python -m uvicorn main:app --reload` instead — `uvicorn main:app` alone fails for the same reason.

### Frontend
```bash
cd frontend
npm install
# Create frontend/.env.local with NEXT_PUBLIC_API_URL
npm run dev
# → http://localhost:3000
```

### Tests
```bash
cd backend
python -m unittest tests.test_recordatorios
```
No frontend tests.

---

## 16. Deployment Notes

- **Frontend:** Vercel (auto from git)
- **Backend:** Railway via `Procfile` (`web: uvicorn main:app --host 0.0.0.0 --port 8000`)
- **Database:** PostgreSQL on Railway in production
- **CORS:** Wide open (`allow_origins=["*"]`)
- **Multi-replica:** Set `DISABLE_REMINDER_SCHEDULER=true` on all but one backend instance

---

## 17. Known Quirks & Technical Debt

1. **README outdated** — references NobelCut/Evolution X; actual brand is Visionary Studio
2. **`GET /reservas/` requires auth** but ownership filtering happens only via optional `?barbero=` param (any authenticated user can list reservations)
3. ~~`PATCH /reservas/{id}` and `DELETE /reservas/{id}` have no auth~~ — **resolved:** both now require Bearer (`get_usuario_actual`)
4. ~~Confirmation email barber name hardcoded~~ — resolved: dynamic `barbero` param
5. **`enviar_notificacion_admin` never called** on new bookings
6. **Services & barbers are frontend-only** — changing prices/names requires code edits; member-exclusive slots are duplicated in `reservar/page.tsx` (`HORARIOS_MIEMBRO`), `admin/page.tsx` (`HORARIOS_MIEMBRO_LOBO`) and `backend/routers/reservas.py` (`HORARIOS_EXCLUSIVOS_MIEMBRO`) — keep in sync
7. **`/admin/reservas` is an empty stub** — all admin functionality lives in `/admin/page.tsx`
8. **`app/page.tsx` metadata export** appears after default export (likely broken/unused)
9. **`layout.tsx` is `"use client"`** — cannot export static metadata
10. **No overlap detection** — booking blocks only the exact slot time
11. **Passwords hashed at startup only for seeded accounts** — changing `ADMIN_PASSWORD`/`ADMIN2_PASSWORD` requires server restart **and only applies on first seed** (existing users are skipped); reset via DB or recreate users
12. **Legacy `DATABASE_URL` default** mentions `evolution_x.db`; both `evolution_x.db` and `visionary_studio.db` exist in `backend/`
13. **Member-exclusive slots are not in `lib/barberos.ts`** — they're injected client-side only when booking with Lobo as an active member, and enforced server-side; a member without JS sees neither the slots nor their exclusivity
14. **Member phone uniqueness is global** — a phone registered for one barber cannot join the other barber's club
15. **CONTEXT was updated Nov 2026** — prior June 2026 scan referenced Axel Ruiz (replaced by Ian Bustos Navarrete) and pre-club state

---

## 18. Key Files Quick Reference

| Task | File(s) to edit |
|---|---|
| Add/change barber or time slots | `frontend/lib/barberos.ts` |
| Add/change member-exclusive slots | `frontend/app/reservar/page.tsx` (`HORARIOS_MIEMBRO`), `frontend/app/admin/page.tsx` (`HORARIOS_MIEMBRO_LOBO`), `backend/routers/reservas.py` (`HORARIOS_EXCLUSIVOS_MIEMBRO`) — all three |
| Add/change services/prices/adicionales | `frontend/app/reservar/page.tsx`, `frontend/app/components/sections/Servicios.tsx` |
| Club plans seed data | `backend/main.py` (`seed_club_planes`) |
| Club business logic (planes/miembros/consumos) | `backend/routers/club.py` |
| Club DB models | `backend/models/club.py` |
| Member portal UI | `frontend/app/club/page.tsx`, `PlanesClub.tsx` |
| Admin panel features | `frontend/app/admin/page.tsx` |
| Stamp card flow | `backend/routers/stamps.py`, `frontend/app/stamp/[token]/page.tsx`, `frontend/app/barbero/page.tsx`, `frontend/app/card/page.tsx` |
| PagoSilla / Gastos / Ganancia Neta | `backend/routers/finanzas.py`, `frontend/app/admin/page.tsx` (Ingresos + Silla + Gastos views) |
| API endpoints / validation | `backend/routers/reservas.py` |
| DB schema | `backend/models/*.py` + migration helpers in `database/connection.py` |
| Email templates | `backend/emails.py`, `backend/recordatorios.py` |
| Reminder timing logic | `backend/recordatorios_logic.py` |
| Auth / JWT | `backend/routers/auth.py`, `backend/auth/security.py` |
| Colors / global styles | `frontend/app/globals.css` |
| Landing page sections | `frontend/app/components/sections/*.tsx` |

---

## 19. Date/Time Conventions (Critical)

- **Reservas/blocked slots:** strings — date `DD/MM/YYYY`, time `"H:MM AM/PM"` (single-digit hours OK)
- **Club/finanzas models:** naive datetimes in **CR local time (UTC-6)**, no DST (`_ahora_cr()` / `_hoy_cr()` helpers)
- **Parsing:** `recordatorios_logic.parse_cita_cr(fecha, hora)` → timezone-aware `America/Costa_Rica`
- **Calendar locale:** `es-ES` in react-calendar
- **Sanitization:** `toLocaleDateString("es-CR")` everywhere for display/storage

When modifying scheduling, always test with CR timezone semantics.

---

## 20. Contact & Ownership

- **Developer:** José Roberto — [@JoseRCerdas17](https://github.com/JoseRCerdas17)
- **License:** MIT (per README)
