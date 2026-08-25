# Reporte — DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001

```yaml
task_id: "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001"
phase: "final_human_decision_recorded"
outcome: "DONE_PENDING_REVIEW"
mode: "HUMAN_AUTHZ_DECISION_PREPARATION"
implementation: false
permissions_changed: false
runtime: false
final_marker_invented: false
usuarios_is_role: false
authz_decision: "RESOLVED"
view: "ZP+AD ALL_PLANTS; GG ASSIGNED_PLANTS; REST NO"
finalize: "ZP+AD ALL_PLANTS; REST NO"
supersede: "ZP+AD ALL_PLANTS; REST NO"
physical_gaps:
  - "END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL"
  - "HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001.md"
files_not_touched:
  - "lib/"
  - "test/"
  - "sql/"
  - "frontend-dashboard/"
  - "docs/director-ia/"
  - "vba/"
next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "AUTHZ nombra QUIÉN. HOW de FINAL es arquitectura posterior."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

**AUTHZ_DECISION = RESOLVED.**

Quién: ZP+AD (VIEW/FINALIZE/SUPERSEDE ALL_PLANTS). GG solo VIEW ASSIGNED_PLANTS. Resto NO. USUARIOS no es rol y no obtiene autoridad financiera.

Cómo se materializa FINAL: **no definido**. latest / is_current / mes cerrado / ARR completo ≠ FINAL. No hay botón FINAL. VBA/pgAdmin son evidencia de proceso, no marcador físico.

Gaps preservados (no se corrigen aquí; no prueban FINAL): `END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL`; `HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE`.

## Ejecución

- Rama: `decision/director-ia-financial-actual-authz-001` (≠ `main`).
- HEAD: `30a0fae8 Merge branch 'docs/director-ia-financial-actual-capabilities-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. Solo se cambió `status` en CURRENT_TASK.

---

## 1. Dónde viven los roles (catálogo vs uso)

| Sitio | Qué hay | Evidencia |
|-------|---------|-----------|
| `public.roles` (`clave`, `nombre`, `nivel`) | Tabla física. Seed **solo** inserta GO / SG / SEH. El resto de claves se espera en DB (admin / carga previa). | `server.js` 2184–2204 |
| `public.usuarios.rol_id` + `permisos_json` | Usuario → rol; overrides por usuario de claves del catálogo. | `server.js` 2207–2218, 5538–5556 |
| JWT `req.dashboardAuth.role` | Token emitido al pedir dashboard / AR / Director IA / DICF. **No copia todas las claves:** colapsa a ZP / AD / CF_CDMX / GA / GV / **GG**. | `server.js` 5033–5043, 8218–8234, 17019–17027; `lib/dashboard-auth.js` 33–36, 115–125 |
| `lib/usuario-permisos.js` `permisosPorRol` | Defaults por clave (y algunos aliases). Clave no listada → todos los flags `false`. | L42–203 |
| Frontend | Lee `role` del JWT (sin verificar firma). Bloqueos UI por string de rol + `tokenHasPermiso` si el JWT trae `permisos`. | `frontend-dashboard/lib/auth.ts`; `IgfForecastClient.tsx` 268–279 |
| Función IGF «Usuarios» | **No es rol.** `ADMIN_FUNCTION = USUARIOS`. Clave administrativa. Ver §7A. | `IgfForecastClient.tsx` 889–896; `server.js` 5523–5536, 7447–7780 |

No hay enum único. Los tokens están **dispersos** (hardcodes de string). No existe rol `USUARIOS`, `SUPERADMIN` ni `admin`. `scope=seh` y `igfExcel` son scopes JWT, no roles.

---

## 2. Tokens canónicos encontrados

No se usó la lista de ejemplo ZP/GG/GA/GV como catálogo. Cada token siguiente tiene evidencia física.

### 2.1 Roles con rama de permisos y/o semilla SQL

| Token canónico | Aliases físicos (no fusionados como rol distinto) | Significado **solo si está documentado** | Evidencia |
|----------------|---------------------------------------------------|------------------------------------------|-----------|
| `AD` | Nombre/usuario: `asistente` + `direccion` → se trata como AD al emitir JWT | **Asistente de Dirección** | `server.js` 10588, 10786, 12494, 13704, 14065; `FolioDrawer.tsx` 729 |
| `ZP` | `DIR_ZP`, `DIRZP`, `DIRECTOR_ZP`, `DZP` (`permisosPorRol`); `DIRECTORZP`, `DIR-ZP` (`isDirectorZPForDashboard` / `dicf-acciones.roleNorm`); nombre `director`+`zp` | **Director ZP** | `lib/dashboard-es-zp.js` 7–15; `lib/usuario-permisos.js` 73; mensajes WhatsApp / dashboard «Director ZP» |
| `GG` | JWT fallback: cualquier clave no mapeada a ZP/AD/CF_CDMX/GA/GV se emite como `GG` | **No hay expansión de acrónimo en catálogo SQL.** Uso: aprobación de planta. Mención: «gerente (GG)» | `lib/delta-ingreso-ai.js` 246; `server.js` 4260, 8234. **No se infiere «Gerente General».** |
| `GA` | — | **Gerente Administrativo** | `server.js` 18676, 20885 |
| `GV` | — | **No documentado** (no inferir). Comportamiento: «solo tiene acceso a Delta ingreso Forecast y acciones DICF en tu planta» | `server.js` 10905–10908 |
| `CF_CDMX` | Comparte defaults de permiso con `CDMX` en `permisosPorRol` (**tokens distintos**) | **Contralor financiero CDMX** | `server.js` 13878, 13844; JWT si clave=`CF_CDMX` o nombre contralor+cdmx |
| `CDMX` | Usado en WhatsApp / SQL de destinatarios; **no** es automáticamente JWT `CF_CDMX` | **Contralor** / **Contralor Financiero** (mensajes WhatsApp) | `server.js` 18694, 20272, 20411, 4415–4421 |
| `GO` | — | **Gerente Operaciones** | `server.js` 2196 |
| `SG` | — | **Subgerente** | `server.js` 2197 |
| `SEH` | — | **Seguridad e Higiene** | `server.js` 2198, 6659, 17121 |
| `ZC` | — | Agrupado en mensaje con Contralor financiero `(CDMX/ZC)`. **Letras ZC no expandidas.** | `server.js` 20883–20885 |

### 2.2 Tokens / equivalencias adicionales (no semilla)

| Token / forma | Naturaleza | Evidencia |
|---------------|------------|-----------|
| `FINANZAS` | Solo **comentario de ejemplo** de filtro `r.nombre` en destinatarios. No hay rama `permisosPorRol`. No es seed. | `server.js` 4489 |
| Nombre «Director… ZP» | Equivalencia a ZP al emitir JWT / DICF | `lib/dashboard-es-zp.js` 13–14 |
| Nombre «Asistente… Dirección» | Equivalencia a AD | `server.js` 5033–5036 |
| Nombre «Contralor… CDMX» | Equivalencia a CF_CDMX | `server.js` 5037–5040 |
| Cualquier otra `public.roles.clave` | Admin lista `SELECT` de toda la tabla. Defaults = vacío (`false`). Al pedir dashboard/Director IA el JWT **se etiqueta `GG`**. | `server.js` 7470–7483, 8234; `usuario-permisos.js` 203 |

### 2.3 No son roles de aplicación

| Cosa | Qué es |
|------|--------|
| `USUARIOS_ADMIN_CLAVE` (= `CLASIFICACION_PRIV_CLAVE`) | Clave de `ADMIN_FUNCTION` USUARIOS. **No** es `rol_clave`. Ver §7A. |
| JWT `scope: "seh"` | Enlace exclusivo a `/seh` |
| JWT `igfExcel` | Descarga Excel «Cómo cambió» (15 min) |
| Firmas «DIRECTOR DE FINANZAS» / «COORD. ADMON Y FINANZAS» | Texto de póliza/Excel, no `rol_clave` |
| `req.user` / `req.dashboardUser` | Pasados al chat; authz de planta/rol usa `req.dashboardAuth` |
| Owner contractual FINANZAS | Owner de evidencia ACTUAL_FINANCIAL; **no** es token de rol |

---

## 3. Alcance de planta actual (observado)

Scopes usados aquí son **descriptivos del runtime actual**, no decisiones ACTUAL_FINANCIAL.

| Token | Alcance actual observado | Evidencia |
|-------|--------------------------|-----------|
| `ZP` / aliases → JWT `ZP` | **ALL_PLANTS** (global por role; JWT sin lista de plantas) | `server.js` 5044–5048, 6645, 7955–7957 |
| `AD` | **ALL_PLANTS** | igual |
| `CF_CDMX` (JWT) | **ALL_PLANTS** | igual |
| `GG` (JWT) | **ASSIGNED_PLANTS** (`plantas_permitidas` = planta del usuario + equivalentes). Si no hay planta: lista vacía (fail al pedir planta concreta). | `server.js` 5047–5048, 6278 |
| `GA` | **ASSIGNED_PLANTS** | igual |
| `GV` | **ASSIGNED_PLANTS** (DICF/`assertGVPlantaNombreAccess`) | `server.js` 10920–10926 |
| `CDMX` (clave bot) | Pendientes **todas las plantas** en estatus LISTO_PARA_PROGRAMACION; corporativo si se pide. JWT: solo es global si se mapea a `CF_CDMX`. | `server.js` 4255–4270, 5037–5043 |
| `GO` / `SG` / `SEH` | Usuario tiene `planta_id`. WhatsApp nivel 6 **no** puede comando `dashboard`. Comando `DirectorIA` emite JWT **role=GG** + plantas asignadas. | `server.js` 16999–17006, 8218–8238 |
| `ZC` | Sin rama de alcance dashboard. WhatsApp: crear folio. JWT si existiera → colapsa a `GG`. | `server.js` 20883, 8234 |
| Otra clave | Defaults deny. JWT dashboard/Director IA → **`GG`** + planta asignada | `server.js` 8234 |

`permisos_json` **no cambia** el alcance de plantas; solo flags del catálogo.

---

## 4. Acceso IGF actual (forecast; no ACTUAL_FINANCIAL)

Default `acceso_igf_forecast_kpis` (`lib/usuario-permisos.js`):

| Token | Default flag | ¿Las rutas IGF lo usan? |
|-------|--------------|-------------------------|
| AD, ZP (+aliases), GG, CF_CDMX/CDMX, GV | `true` | **Parcial.** API IGF bloquea por **rol JWT**, no por el flag. |
| GA | `false` | Backend `dashboardBlockGAFinancialKpis` 403. FE redirige a `/dashboard`. |
| GO, SG, SEH | `false` | Sin rama IGF propia. |
| ZC / otra clave | `false` (vacío) | — |

Bloqueos duros de API (`server.js`):

- `dashboardBlockGAFinancialKpis` — JWT `role === "GA"` (`10877–10883`). Usado en `/api/dashboard/igf-forecast` y vecinos (`12003+`).
- `dashboardBlockGVForbidden` — JWT `GV`: «solo Delta ingreso Forecast y acciones DICF» (`10905–10909`). **GV tiene el flag IGF en true y está bloqueado en rutas IGF.**
- Chat Director IA annex IGF: GA 403 (`lib/director-ia-igf-arr.js` 458–459). GV: `assertGVPlantaNombreAccess`.
- FE: `IgfForecastClient.tsx` 268–279 — GA → `/dashboard`; GV → `/`.

**Conclusión física:** el flag `acceso_igf_forecast_kpis` es catálogo/UI/overrides. La puerta IGF de API es principalmente **hardcode de rol** (GA/GV) + JWT válido. Un `SÍ` de IGF **no** se copia a ACTUAL_FINANCIAL.

---

## 5. Acceso Director IA actual

| Mecanismo | Comportamiento | Evidencia |
|-----------|----------------|-----------|
| Flag entorno | `ENABLE_DIRECTOR_IA` = `true`/`1`. Sin eso, UI/rutas no sirven. **No es rol.** | `lib/director-ia.js` 12–18 |
| HTTP | `dashboardAuthMiddleware` (JWT). `planta_id` + `assertPlantaAccess` (ZP/AD/CF_CDMX global; resto lista). | `server.js` 9924–9963, 7954–7959 |
| Chat | Misma JWT. Loaders fallan closed por planta. GA/GV restringidos en dominios financieros/ARR según loader. | p.ej. `director-ia-client-profile.js` 305–320; `director-ia-igf-arr.js` 458 |
| WhatsApp `DirectorIA` | Cualquier actor dado de alta. **No** comprueba `acceso_consola_whatsapp_ar`. GO/SG/SEH **sí** pueden este comando (nivel 6). | `server.js` 17088–17107, 16999–17006 |
| Flag `acceso_consola_whatsapp_ar` | Default `true` solo GO/SG/SEH; `false` en el resto. **No se enforcea** en el comando `DirectorIA` leído. | `usuario-permisos.js` 193–200 |

No hay rol «Director IA». No hay permiso ACTUAL_FINANCIAL.

---

## 6. Auditoría del mecanismo (solo observar)

| Pregunta | Hallazgo |
|----------|----------|
| ¿Dónde se aplica authz hoy? | Backend: `dashboardAuthMiddleware` + hardcodes de `role` + `plantas_permitidas` + `authHasPermiso` en algunos flujos de folio. Frontend: ocultar/redirigir (no es enforcement). |
| ¿Backend vs frontend? | **Enforcement real = backend.** Frontend se puede saltar; no es autoridad. |
| ¿Plant scope server-side? | Sí (`assertDashboardPlantaAccessForActionRegister`, `assertGVPlantaNombreAccess`, `buildDashboardWhere`, loaders Director IA). |
| ¿Roles centralizados? | **No.** Tabla `public.roles` + defaults en `permisosPorRol` + decenas de `=== "GA"` / `=== "GG"` dispersos + colapso JWT a 6 valores. |
| ¿El mecanismo actual podría representar VIEW/FINALIZE/SUPERSEDE después? | Observación: el catálogo `PERMISOS_CATALOGO` + `permisos_json` **ya** permite flags booleanos por usuario. **Esas tres claves no existen.** Los hardcodes de rol no expresan tres autoridades independientes. **No se diseña aquí.** |
| ¿Harán falta campos nuevos? | Probable si HUMAN_APPROVER quiere VIEW ≠ FINALIZE ≠ SUPERSEDE. **No se implementa ni se elige.** |

Colapso JWT → `GG` (claves no mapeadas, incl. GO/SG/SEH/ZC/CDMX-sin-nombre): hecho físico. HUMAN_APPROVER debe saberlo al asignar. No se «arregla» en esta fase.

VBA `modIgfUpload`: no aporta catálogo de roles de aplicación.

---

## 7A. Función administrativa USUARIOS (no es rol)

Corrección humana: **no** inventar token de rol `USUARIOS`. No mezclarlo con AD / ZP / GG.

| Campo | Hallazgo físico |
|-------|-----------------|
| Clasificación | `ADMIN_FUNCTION = USUARIOS` |
| AUTH_MECHANISM | `ACCESS_KEY` / clave administrativa |
| ROLE_TOKEN | **N/A.** No hay `rol_clave` «USUARIOS» en `permisosPorRol`, seed SQL ni JWT. |
| Botón | Etiqueta «Usuarios» en IGF Forecast. Visible si hay JWT (`token &&`). **Sin** chequeo de rol en el botón. | `IgfForecastClient.tsx` 889–896 |
| Página / ruta | **No** hay ruta `/usuarios`. Es modal `UsuariosAdminModal` montado en la misma página IGF. | `IgfForecastClient.tsx` 2326–2331; `UsuariosAdminModal.tsx` |
| Unlock FE | Input «Clave de acceso privada». Sin clave no lista ni edita. | `UsuariosAdminModal.tsx` 18, 312–315 |
| Backend | `dashboardAuthMiddleware` **más** `assertUsuariosAdminClave`. 403 «Clave de acceso incorrecta» si no coincide. **No** hay `role ===` en estos handlers. | `server.js` 5531–5536, 7451–7779 |
| Constante | `USUARIOS_ADMIN_CLAVE = CLASIFICACION_PRIV_CLAVE` (misma clave que `priv_clave` de clasificación). | `server.js` 5523–5526 |
| Transporte de clave | body `clave`, query `clave`, header `X-Usuarios-Admin-Clave`. | `server.js` 5531–5535; `frontend-dashboard/lib/api.ts` 2851–2856 |
| Operaciones reales | unlock; meta (plantas + `public.roles` + defaults); listar usuarios; Excel; crear; PATCH (teléfono, email, nombres, `planta_id`, `rol_id`, `activo`, `permisos_json` / reset); DELETE soft (`activo=false`); DELETE hard si `hard=1`. | `server.js` 7451–7779 |
| ¿Administra roles/permisos? | **Sí, de usuarios existentes:** asigna `rol_id` y overrides `permisos_json` del catálogo actual (`PERMISOS_CATALOGO`). **No** crea un rol «USUARIOS». Hoy **no** hay flags VIEW/FINALIZE/SUPERSEDE ACTUAL_FINANCIAL que administrar. |
| ¿Usuario/rol separado detrás? | **No.** Quien abre el modal es el JWT del dashboard (el mismo de IGF). La clave no es un usuario. No hay actor «admin usuarios» en `public.roles`. |
| Autoridad financiera | **NONE.** HUMAN_APPROVER: la clave no otorga VIEW, FINALIZE ni SUPERSEDE. |

---

## 7. Matriz VIEW (resuelta por HUMAN_APPROVER)

Fuente: HUMAN_APPROVER 2026-08-25. **No** se heredó de IGF. **No** hay fila «USUARIOS».

| ROL | VER ACTUAL_FINANCIAL | ALCANCE DE LECTURA |
|-----|----------------------|--------------------|
| AD | YES | ALL_PLANTS |
| ZP (aliases documentados: DIR_ZP, DIRZP, DIRECTOR_ZP, DZP, DIRECTORZP, DIR-ZP) | YES | ALL_PLANTS |
| GG | YES | ASSIGNED_PLANTS |
| GA | NO | NONE |
| GV | NO | NONE |
| CF_CDMX | NO | NONE |
| CDMX | NO | NONE |
| ZC | NO | NONE |
| GO | NO | NONE |
| SG | NO | NONE |
| SEH | NO | NONE |
| OTRA_CLAVE / cualquier otro rol físico no autorizado expresamente | NO | NONE |

ADMIN_FUNCTION USUARIOS: **no es fila de esta matriz.** VIEW = no concedido (no es rol de lectura).

---

## 7B. Matriz FINALIZE / SUPERSEDE (resuelta por HUMAN_APPROVER)

Fuente: HUMAN_APPROVER 2026-08-25. VIEW no implica FINALIZE ni SUPERSEDE. **No** hay fila USUARIOS.

| ROL | MARCAR FINAL | ALCANCE FINALIZACIÓN | CORREGIR / SUPERSEDE | ALCANCE SUPERSESSION |
|-----|--------------|----------------------|----------------------|----------------------|
| ZP (+ aliases documentados) | YES | ALL_PLANTS | YES | ALL_PLANTS |
| AD | YES | ALL_PLANTS | YES | ALL_PLANTS |
| GG | NO | NONE | NO | NONE |
| GA | NO | NONE | NO | NONE |
| GV | NO | NONE | NO | NONE |
| CF_CDMX | NO | NONE | NO | NONE |
| CDMX | NO | NONE | NO | NONE |
| ZC | NO | NONE | NO | NONE |
| GO | NO | NONE | NO | NONE |
| SG | NO | NONE | NO | NONE |
| SEH | NO | NONE | NO | NONE |
| OTRA_CLAVE / no autorizado expresamente | NO | NONE | NO | NONE |

---

## 7C. Proceso empresarial (HUMAN_APPROVER; no es diseño técnico)

1. Finanzas genera/envía el Excel financiero oficial.
2. En el mes hay múltiples versiones (cambian variables financieras y operativas).
3. ZP y AD son hoy los únicos que tienen los códigos VBA para cargar esas versiones.
4. ZP es, de esos actores, el único con acceso directo a PostgreSQL vía pgAdmin.
5. **No** existe botón explícito FINAL.
6. Operativamente, última versión + mes ya transcurrido participa en cómo se entiende el cierre. **No** se convierte esa práctica en semántica física FINAL.
7. VBA y exclusividad práctica de carga de ZP/AD = evidencia de proceso y de **quién** está autorizado. **No** sustituyen el marcador físico FINAL del contrato G3.

Autorización = **quién**. Materialización = **cómo** (arquitectura posterior).

No inventado aquí: botón FINAL, upload nuevo, UI nueva, auto-finalization, regla latest+fecha, regla ARR completo, trigger SQL.

Invariantes: latest ≠ FINAL. `is_current` ≠ FINAL. mes cerrado ≠ FINAL. ARR completo ≠ FINAL. mes histórico ≠ FINAL. mes ya no visible en UI ≠ dato ausente. versión en DB ≠ FINAL autoritario.

---

## 7D. PHYSICAL_GAP (preservar; no resolver)

**Código:** `END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL`

Al seleccionar el último día del mes en ARR, el sistema puede seguir mostrando/procesando venta proyectada, mientras la descarga Excel entrega venta total real.

No se corrige en esta tarea. **No** se asume como prueba de FINAL. Queda para arquitectura posterior (junto con, no en lugar de, el marcador FINAL).

### `HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE` (distinto del anterior)

Observación HUMAN_APPROVER: al pasar el calendario a un mes nuevo, la UI IGF Forecast se mueve al mes corriente (ej. 2026-09-01 proyecta septiembre). El mes anterior deja de ser seleccionable/visible en la vista normal.

El problema **no** es solo «el último día sigue proyectando». Hay un gap de producto/runtime aparte: las versiones IGF mensuales históricas pueden existir en DB, pero la UI normal no permite elegir e inspeccionar el mes cerrado previo.

No se resuelve en AUTHZ. No se confunde con semántica FINAL.

Mantener separados:

| Distinción | Pregunta |
|------------|----------|
| PERIOD_NAVIGATION | ¿Se puede consultar un YYYY-MM histórico? |
| PERIOD_COMPLETENESS | ¿ARR está comercialmente completo para ese YYYY-MM? |
| FINANCIAL_FINALITY | ¿Cuál versión de Finanzas es explícitamente FINAL? |

Invariantes: mes histórico ≠ FINAL. Mes ya no visible en UI ≠ dato ausente. Versión en DB ≠ FINAL autoritario.

La siguiente arquitectura de Financial Actual **debe auditar** si los loaders backend existentes pueden consultar un YYYY-MM histórico explícito aunque el frontend no lo exponga. Solo observación aquí.

---

## 8. AUTHZ_DECISION = RESOLVED

| Autoridad | ZP | AD | GG | REST | USUARIOS |
|-----------|----|----|----|------|----------|
| VIEW | YES ALL_PLANTS | YES ALL_PLANTS | YES ASSIGNED_PLANTS | NO / NONE | no es rol; NONE |
| FINALIZE | YES ALL_PLANTS | YES ALL_PLANTS | NO / NONE | NO / NONE | no es rol; NONE |
| SUPERSEDE | YES ALL_PLANTS | YES ALL_PLANTS | NO / NONE | NO / NONE | no es rol; NONE |

---

## 9. No hecho

No implementación. No código. No SQL. No schema. No UI. No cambio VBA. No marcador FINAL. No runtime. No IES.

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001`

Arquitectura: cómo materializar físicamente FINAL sobre el proceso existente (Excel Finanzas + carga VBA por ZP/AD; versiones múltiples en el mes), sin inferir FINAL de latest / `is_current` / mes cerrado / ARR completo / mes histórico / UI no visible. Auditar si loaders backend ya consultan YYYY-MM explícito. No resolver aquí `END_OF_MONTH_ARR_FORECAST_VS_EXCEL_ACTUAL` ni `HISTORICAL_IGF_PERIOD_NOT_NAVIGABLE`.

STOP.
