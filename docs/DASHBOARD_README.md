# Dashboard de Folios — Guía de implementación

## Resumen

Plataforma interna "Dashboard de Folios" nivel corporativo:
- **Vista ejecutiva** (Director ZP): KPIs, Kanban por etapa/planta/categoría, panel lateral con detalle/timeline/adjuntos.
- **Vista operativa** (GG): solo sus plantas; acciones de carrito (agregar/quitar folios de la semana).
- **Seguridad**: tokens JWT con expiración 20 min; ZP ve todo, GG solo sus plantas.

---

## Cómo correr (paso a paso)

Sí tienes que hacer esto si quieres usar el Dashboard. Son dos programas: el **backend** (el bot que ya tienes) y el **frontend** (la página web del dashboard). Se ejecutan por separado.

---

### Requisitos previos

- **Node.js** instalado (versión 18 o superior). Si no lo tienes: descarga desde [nodejs.org](https://nodejs.org) e instala.
- Tu proyecto ya tiene el bot funcionando (PostgreSQL, Twilio, etc.).

---

### Paso 1: Backend (Node + Express)

El backend es tu `server.js` actual. Solo hay que instalar una dependencia nueva (JWT) y, si quieres que el enlace del dashboard funcione al escribir "dashboard" en WhatsApp, definir dos variables de entorno.

**1.1 Abrir terminal en la carpeta del proyecto**

- En Windows: abre PowerShell o CMD.
- Navega a la carpeta del bot. **Sustituye TU_USUARIO por tu nombre de usuario de Windows** (el que ves en `C:\Users\`). Ejemplo si tu usuario es "SUBDIRECCION":
  ```powershell
  cd "C:\Users\SUBDIRECCION\Desktop\Open AI\folio-whatsapp-bot"
  ```
  Si el proyecto está en otra ubicación, usa esa ruta (con comillas si tiene espacios).

**1.2 Instalar dependencias (incluye JWT para el dashboard)**

```powershell
npm install
```

Esto instala todo lo que usa `package.json`, incluido `jsonwebtoken`.

**1.3 Variables de entorno para el Dashboard**

Puedes usar un archivo `.env` en la raíz del proyecto (junto a `server.js`). Si ya tienes `.env`, agrega estas líneas; si no, créalo:

- **DASHBOARD_JWT_SECRET** (o JWT_SECRET): una contraseña secreta larga para firmar los tokens. En producción es obligatoria. Ejemplo:
  ```
  DASHBOARD_JWT_SECRET=mi-clave-secreta-muy-larga-12345
  ```
- **DASHBOARD_URL** (o FRONTEND_URL): la URL donde vas a abrir el dashboard. Solo importa para el **enlace** que el bot envía por WhatsApp.
  - **En tu PC (pruebas):** si el frontend lo corres en `http://localhost:3000`, puedes poner:
    ```
    DASHBOARD_URL=http://localhost:3000
    ```
  - **En producción:** la URL real del dashboard, por ejemplo `https://dashboard.tudominio.com`.

Si no defines `DASHBOARD_JWT_SECRET`, el código usa un valor por defecto (sirve para probar, no para producción).

**1.4 Levantar el backend**

```powershell
node server.js
```

Deberías ver que escucha en un puerto (por ejemplo 10000). Déjalo abierto; el bot y la API del dashboard están activos.

---

### Paso 2: Frontend (Next.js 14) — la página del Dashboard

El frontend es la aplicación web que muestra el Kanban, KPIs y el panel lateral. Va en la carpeta `frontend-dashboard`.

**2.1 Abrir otra terminal** (la del backend déjala corriendo).

**2.2 Ir a la carpeta del frontend**

```powershell
cd "C:\Users\SUBDIRECCION\Desktop\Open AI\folio-whatsapp-bot\frontend-dashboard"
```

(Sustituye SUBDIRECCION por tu usuario de Windows si es distinto.)

**2.3 Instalar dependencias del frontend**

```powershell
npm install
```

Puede tardar un poco la primera vez (Next.js, React, etc.).

**2.4 Variables de entorno del frontend (opcional para pruebas)**

En `frontend-dashboard` puedes crear un archivo `.env.local` con:

- **NEXT_PUBLIC_API_URL**: URL del backend. Si backend y frontend corren en tu PC:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:10000
  ```
  (Cambia `10000` si tu `server.js` usa otro `PORT`.)

Si no pones `NEXT_PUBLIC_API_URL`, el frontend usa por defecto un proxy hacia `http://127.0.0.1:10000` (válido cuando backend está en el mismo equipo).

**2.5 Levantar el frontend**

```powershell
npm run dev
```

Al terminar de compilar verás algo como: **Local: http://localhost:3000**. Abre esa URL en el navegador.

---

### Paso 3: Entrar al Dashboard (cómo obtener el enlace con token)

El dashboard **no** se abre solo con `http://localhost:3000/dashboard`: esa ruta pide un **token** en la URL. El token lo genera el backend cuando un usuario escribe en WhatsApp.

**Opción A — Desde WhatsApp (recomendada):**

1. Backend y frontend están corriendo.
2. Desde un número dado de alta como ZP o GG, escribe en WhatsApp al bot: **dashboard** o **dashboard resumen**.
3. El bot te responderá con un mensaje y un **enlace largo** que termina en `?t=eyJ...` (ese es el token).
4. Copia ese enlace y ábrelo en el navegador. Entrarás al dashboard con permisos de ese usuario.

**Opción B — Solo para ver la página sin datos:**

Si abres `http://localhost:3000/dashboard` sin `?t=...`, verás el mensaje "Acceso no autorizado". Es normal: sin token no se puede cargar datos.

---

### Resumen rápido

| Qué hacer | Dónde | Comando |
|-----------|--------|---------|
| Instalar deps backend | Carpeta `folio-whatsapp-bot` | `npm install` |
| Variables backend | Archivo `.env` en raíz | `DASHBOARD_JWT_SECRET=...` y `DASHBOARD_URL=...` |
| Levantar backend | Carpeta `folio-whatsapp-bot` | `node server.js` |
| Instalar deps frontend | Carpeta `frontend-dashboard` | `npm install` |
| Variables frontend (opc.) | Archivo `frontend-dashboard/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:10000` |
| Levantar frontend | Carpeta `frontend-dashboard` | `npm run dev` |
| Abrir dashboard | Navegador | Enlace que te envía el bot por WhatsApp (dashboard / dashboard resumen) |

---

### ¿Cuándo usar los ejemplos cURL?

Los **cURL** son para **desarrolladores** que quieren probar la API del dashboard desde la terminal (sin abrir el navegador). **No son obligatorios** para usar el dashboard.

- Si solo vas a usar la página web y WhatsApp, **no necesitas ejecutar cURL**.
- Si quieres probar la API a mano (por ejemplo para integrar otra herramienta), necesitas un token: el más fácil es obtenerlo escribiendo "dashboard" en WhatsApp, copiar el enlace y extraer la parte `t=eyJ...` del mismo. Ese valor es el token que pondrías en los ejemplos de abajo.

---

## Ejemplos cURL (Backend) — opcional

Solo si quieres probar los endpoints desde la terminal. Necesitas un token válido (p. ej. del enlace que te envía el bot por WhatsApp: la parte después de `?t=`).

**Windows (PowerShell):** en los ejemplos, usa comillas y una sola línea, o ` (backtick) al final de cada línea para continuar.

**1) Kanban**

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/dashboard/kanban?solo_activos=true"
```

**2) KPIs**

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/dashboard/kpis?solo_activos=true"
```

**3) Folio por ID** (cambia 123 por un ID real de folio)

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/folios/123"
```

**4) Timeline de un folio**

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/folios/123/timeline"
```

**5) Media (lista) y URL firmada**

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/folios/123/media"
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/folios/123/media/1/url"
```

**6) Finanzas (stub)**

```powershell
curl -s -H "Authorization: Bearer TU_JWT_AQUI" "http://localhost:10000/api/folios/123/finanzas"
```

**Token por query (alternativa):** en lugar de `Authorization: Bearer ...`, puedes usar:  
`"http://localhost:10000/api/dashboard/kanban?t=TU_JWT_AQUI&solo_activos=true"`

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
