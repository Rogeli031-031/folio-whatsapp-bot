# Dashboard de Folios — Guía de implementación

## Resumen

Plataforma interna "Dashboard de Folios" nivel corporativo:
- **Vista ejecutiva** (Director ZP): KPIs, Kanban por etapa/planta/categoría, panel lateral con detalle/timeline/adjuntos.
- **Vista operativa** (GG): solo sus plantas; acciones de carrito (agregar/quitar folios de la semana).
- **Seguridad**: tokens JWT con expiración 20 min; ZP ve todo, GG solo sus plantas.

---

## Cómo correr

### Backend (Node + Express)

```bash
cd folio-whatsapp-bot
npm install
```

Variables de entorno (además de las ya existentes):

- `DASHBOARD_JWT_SECRET` o `JWT_SECRET`: secreto para firmar tokens (obligatorio en producción).
- `DASHBOARD_URL` o `FRONTEND_URL`: URL base del frontend para los enlaces que envía el bot (ej. `https://dashboard.midominio.com`).

```bash
node server.js
# Por defecto escucha en PORT (ej. 10000).
```

### Frontend (Next.js 14)

```bash
cd frontend-dashboard
npm install
```

Variables de entorno:

- `NEXT_PUBLIC_API_URL`: URL del backend (ej. `http://localhost:10000`). Si no se define, el frontend usa el proxy `/api-backend` (rewrite a `http://127.0.0.1:10000` en dev).
- `NEXT_PUBLIC_APP_URL`: URL pública del frontend (opcional, para enlaces).

```bash
npm run dev
# http://localhost:3000
```

En producción (Render, etc.): definir `NEXT_PUBLIC_API_URL` apuntando al backend y desplegar el frontend como estático o con `next start`.

---

## Ejemplos cURL (Backend)

Obtener un token no se hace por cURL (el token se genera cuando el usuario escribe "dashboard" en WhatsApp y el bot responde con el enlace). Para probar los endpoints necesitas un token válido (por ejemplo generado en código o con un usuario de prueba).

### 1) Kanban

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/dashboard/kanban?solo_activos=true"
```

### 2) KPIs

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/dashboard/kpis?solo_activos=true"
```

### 3) Folio por ID

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/folios/123"
```

### 4) Timeline de un folio

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/folios/123/timeline"
```

### 5) Media (lista) y URL firmada

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/folios/123/media"

curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/folios/123/media/1/url"
```

### 6) Finanzas (stub)

```bash
curl -s -H "Authorization: Bearer TU_JWT_AQUI" \
  "http://localhost:10000/api/folios/123/finanzas"
```

También se puede pasar el token por query: `?t=TU_JWT_AQUI`.

---

## Comandos WhatsApp

El bot responde con un mensaje corto y un enlace con token (válido 20 min).

### ZP (Director)

- **dashboard** → Enlace al tablero general + resumen breve.
- **dashboard zp** → Mismo enlace (vista ZP).
- **dashboard resumen** → KPIs (folios activos, $ comprometido, pend. ZP, más antiguo) + enlace.
- **dashboard etapa &lt;ESTADO&gt** / **dashboard planta &lt;X&gt** / **dashboard categoria &lt;X&gt** → Por ahora mismo enlace; los filtros se aplican en la UI del dashboard.

### GG

- **dashboard gg** → Enlace filtrado a sus plantas.
- **carrito** → Instrucciones + enlace al dashboard con "mi semana".
- **carrito agregar F-202602-001** → Agrega el folio al presupuesto semanal (si está LISTO_PARA_PROGRAMACION y hay presupuesto ABIERTO).
- **carrito quitar F-202602-001** → Quita el folio del presupuesto semanal.

### Ejemplo de mensaje (ZP)

```
📊 Dashboard de Folios

Folios activos: 42
$ comprometido: $1,250,000.00
Pend. aprob. ZP: 5
Más antiguo: F-202601-012 (18 días)

🔗 Acceso (válido 20 min):
https://dashboard.midominio.com/dashboard?t=eyJhbGc...
```

### Ejemplo de mensaje (GG – carrito)

```
🛒 Carrito (presupuesto semanal)

En el dashboard GG puedes seleccionar folios para la semana.

Comandos:
• carrito → ver link
• carrito agregar F-XXX → (en dashboard)
• carrito quitar F-XXX → (en dashboard)

O usa: seleccionar folios 001 002 010

🔗 https://dashboard.midominio.com/dashboard?t=eyJhbGc...&mi_semana=1
```

---

## Archivos creados o modificados

### Nuevos

- `lib/dashboard-auth.js` — Creación y verificación de JWT; middleware de auth.
- `frontend-dashboard/` — App Next.js 14 (TypeScript, Tailwind):
  - `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
  - `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/dashboard/page.tsx`
  - `components/KPIHeader.tsx`, `FiltersBar.tsx`, `KanbanBoard.tsx`, `EtapaColumn.tsx`, `PlantaSection.tsx`, `FolioCard.tsx`, `FolioDrawer.tsx`
  - `lib/auth.ts`, `lib/api.ts`
- `docs/DASHBOARD_README.md` — Esta guía.

### Modificados

- `package.json` — Añadida dependencia `jsonwebtoken`.
- `server.js`:
  - Require de `lib/dashboard-auth`.
  - Constantes `ETAPAS_ORDER`, `CATEGORIAS_FOLIO`; helpers `parseDashboardFilters`, `buildDashboardWhere`, `cardFromFolioRow`.
  - Rutas: `GET /api/dashboard/kanban`, `GET /api/dashboard/kpis`, `GET /api/folios/:id`, `GET /api/folios/:id/media`, `GET /api/folios/:id/media/:mediaId/url`, `GET /api/folios/:id/timeline`, `GET /api/folios/:id/finanzas`.
  - Funciones: `getFolioById`, `getHistorialByFolioId`, `listFolioArchivosByFolioId`.
  - Comandos WhatsApp: `dashboard` / `dashboard resumen` / `dashboard gg` / `carrito` / `carrito agregar` / `carrito quitar` con generación de token y enlace.

---

## No romper

- Webhook WhatsApp: `POST /twilio/whatsapp` sin cambios de contrato.
- Flujos de aprobación y estatus de folios (constante `ESTADOS`).
- Carrito / selección existente: "seleccionar folios 001 002 010" y presupuestos semanales siguen igual; los comandos "carrito" reutilizan `linkFoliosToPresupuesto` y presupuesto_folios.

---

## Endpoints – Contratos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/kanban` | Board por etapa → planta → categoría (query: planta_id, categoria, etapa, solo_activos, mi_semana, fecha_desde, fecha_hasta). |
| GET | `/api/dashboard/kpis` | KPIs para el header (total_activos, total_mxn, pendientes_zp, avg_aging, top_planta, top_categoria, oldest). |
| GET | `/api/folios/:id` | Detalle de un folio. |
| GET | `/api/folios/:id/media` | Lista de adjuntos (folio_archivos). |
| GET | `/api/folios/:id/media/:mediaId/url` | URL firmada para descarga. |
| GET | `/api/folios/:id/timeline` | Historial (folio_historial). |
| GET | `/api/folios/:id/finanzas` | Stub (PENDIENTE_INTEGRACION, monto_mxn si existe). |

Todos exigen `Authorization: Bearer <token>` o `?t=<token>`.
