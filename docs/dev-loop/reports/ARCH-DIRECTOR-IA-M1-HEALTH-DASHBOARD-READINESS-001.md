# Reporte — ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M1-HEALTH-DASHBOARD-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "sql/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "package.json"
  - "package-lock.json"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
  - "Render config/env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A. G3 = N/A. El contrato/inventario actual basta; solo falta wiring/UI."
  - "G8 permanece N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Ejecución

- Rama: `architecture/director-ia-m1-health-dashboard-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T17:28:37-06:00`.
- G2/G3: auditados como **N/A** (no preventivos). G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin smoke productivo. Sin commit, push, merge. Sin siguiente tarea.

## Veredicto

El slice mínimo para pasar M1 Health dashboard de `NOT_STARTED` a COMPLETE operativo es **solo frontend**:

consumir `GET /health-director-ia` en `DirectorIaShell`, desacoplado del cycle panel, sin backend nuevo, sin auth nueva, sin contratos nuevos.

El endpoint existente **es suficiente**. No hace falta G2/G3.

---

## 1. Matriz / documentación canónica (solo lectura)

### Definición canónica de M1

`docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` Parte 2, **M1 — Health**:

| Campo | Valor físico |
|---|---|
| ID | M1 |
| Módulo | Health |
| Propósito empresarial | Monitoreo de servicio y DB |
| Cobertura actual | **NO INTEGRADA** |
| Información que sí consulta | Ninguna |
| Información que no consulta | `/health`, `/health-db`, `/health-proyectos` |
| Archivos citados | `server.js`, `frontend-dashboard/app/health/route.ts` |
| Endpoints citados | `GET /health`, `GET /health-db`, `GET /health-proyectos` |
| Permisos | Sin auth en health |
| Riesgo | BAJO |
| Prioridad (Parte 7) | **Baja** |
| Resultado final (Parte 9) | listado en «Dominios no integrados (NO INTEGRADA)» |

Cobertura **COMPLETA** en Parte 1 = «Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente».

`GET /health-director-ia` **no** aparece en esa matriz (documento con fecha 2026-08-04; el endpoint de readiness es posterior).

### Índice arquitectónico

`docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md`:

- Lista `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` como **Complemento / inventario de fuentes**.
- **No** define un módulo constitucional «M1 Health dashboard».
- El identificador **M1** de `03-EXECUTIVE-KNOWLEDGE-STORE.md` (patrón SQL `sql/` + script) es **otro M1**. No es esta tarea.

### Evidencia requerida para COMPLETE (esta tarea)

Baseline autorizado: M1 = Health dashboard sobre `GET /health-director-ia`.

Eso **no** reabre la matriz como herramienta de chat sobre `/health` `/health-db` `/health-proyectos`. Completar el dashboard de readiness **no** exige que el LLM consulte esos tres endpoints.

Actualizar la etiqueta de cobertura en `docs/director-ia/` **no** forma parte del slice IMPL. Queda inventario desfasado hasta un acto documental aparte. No es G2 preventivo del wiring.

---

## 2. Backend health (físico)

### Ruta

- Método: `GET`
- Path: `/health-director-ia`
- Registro: `server.js` línea del `app.get("/health-director-ia", directorIaDashboardCycle.handleGetDirectorIaReadiness)` junto a `/health`, `/health-db`, `/health-proyectos`.
- Handler: `handleGetDirectorIaReadiness` en `lib/director-ia-dashboard-cycle-transport.js`.
- Constante: `READINESS_PATH = "/health-director-ia"`.

### Auth

**No requiere JWT.** No usa `dashboardAuthMiddleware`. Es pública, igual que `/health`.

Contraste: `POST /api/director-ia/cycle` **sí** lleva `dashboardAuthMiddleware`.

### Status codes y shape reales

Handler físico:

1. Flag off → **HTTP 200**

```json
{ "ok": true, "service": "director-ia", "enabled": false, "ready": false }
```

2. Flag on y falta `deps.transport.handle` o `deps.pool.connect` → **HTTP 503**

```json
{ "ok": false, "service": "director-ia", "enabled": true, "ready": false }
```

3. Flag on y existen transport + pool → **HTTP 200**

```json
{ "ok": true, "service": "director-ia", "enabled": true, "ready": true }
```

El handler **no** emite HTTP 500. Un 500 de este path sería fallo de infraestructura/Express, no un código de negocio del readiness.

### Qué significa `enabled`

`ENABLE_DIRECTOR_IA` verdadero (`true` / `1`) vía `isDirectorIaEnabled` (o `deps.isEnabled` en tests). No implica datos ARR, ni `ACQUIRED_OK`, ni conclusión.

### Qué significa `ready`

Flag on **y** hay transporte inyectado **y** hay `pool.connect`. Readiness **ligera**. No ejecuta `SELECT 1`, ARR, EKS, IES, RE ni CP.

### Qué valida

- Flag Director IA.
- Presencia de `deps.transport.handle`.
- Presencia de `deps.pool.connect`.

### Qué NO valida

- Conectividad real a PostgreSQL.
- Esquema `eks.*` ni `query_context_metadata`.
- ARR / OP / EB / EKS / IES / RE / CP.
- JWT, plantas, GA.
- `/health`, `/health-db`, `/health-proyectos`.
- Disponibilidad del frontend Next (`frontend-dashboard/app/health/route.ts` es otro servicio: `{ ok: true, service: "folio-dashboard" }`).

### ¿El endpoint basta para M1 dashboard?

**Sí.** No proponer backend nuevo. No cambiar el endpoint. No añadir auth.

Nota de cliente: `apiFetch` en `frontend-dashboard/lib/api.ts` lanza si `!res.ok`. **No** reutilizar `apiFetch` tal cual: un 503 legítimo (`ready: false`) se convertiría en throw.

---

## 3. Frontend actual

Evidencia: **cero** referencias a `/health-director-ia` o `/health` en `frontend-dashboard/modules/director-ia/**`.

| Pieza | Hallazgo |
|---|---|
| `DirectorIaShell.tsx` | Header solo con título «Director IA». Tras token monta filtros, `DirectorIaCyclePanel`, mejora continua, bitácora, entidades, contexto. No consume health. |
| `DirectorIaCyclePanel.tsx` | Solo `fetchDirectorIaCycle`. Estados de **ciclo** (`loading` / `transport_error` / outcomes `ACQUIRED_*` / `ABSTAIN`). No health. |
| `lib/api.ts` (módulo) | `fetchDirectorIaContext`, `fetchDirectorIaChat`, `fetchDirectorIaCycle`, mejora continua. Sin health. Cycle usa URL `/api-backend` + `NEXT_PUBLIC_API_URL`. |
| `frontend-dashboard/lib/auth.ts` | JWT query/storage. Health **no** debe exigir token en el fetch. El shell sí exige token para **ver** la página. |
| `app/director-ia/page.tsx` | `isDirectorIaEnabled()` (env Next) → `DirectorIaDisabled` o `DirectorIaShell`. Distinto del `enabled` HTTP del backend. |
| `app/health/route.ts` | Health del frontend Next. No es M1 Director IA. |
| Tests | `test/director-ia-dashboard-cycle-client.test.js` y `test/director-ia-operational-hardening.test.js` cubren cycle/readiness **backend**. No hay test de indicador UI de health. |

### Dónde debe vivir el indicador

**Header de `DirectorIaShell`**, junto al título, **fuera** de `DirectorIaCyclePanel`.

No mezclar con headlines de ciclo (`ACQUIRED_OK`, `ABSTAIN`, etc.).

### Wrapper / fetch / auth a reutilizar

- Misma resolución de URL que el ciclo: `NEXT_PUBLIC_API_URL` o `/api-backend` + rewrite `next.config.js`.
- `fetch` GET `/health-director-ia`.
- **Sin** header `Authorization`.
- Función nueva en `frontend-dashboard/modules/director-ia/lib/api.ts`, p. ej. `fetchDirectorIaHealth`.
- No meter health en `cycle-client-core.js`.
- No usar `apiFetch` sin adaptar el 503.

### ¿Requiere token?

El **endpoint no**. El **módulo de página sí** (gate actual de shell). El indicador se muestra después de ese gate; el GET de health permanece público.

### ¿Desacoplado del cycle panel?

**Sí, obligatorio.** Health no debe deshabilitar, ocultar ni abortar el cycle panel.

---

## 4. Semántica obligatoria

Tres capas distintas:

1. **Health/readiness técnica** (`enabled` / `ready` / HTTP del GET).
2. **Estados de adquisición/ciclo** (`ACQUIRED_OK`, `ACQUIRED_EMPTY`, `TOOL_ERROR`, `ABSTAIN`, etc.).
3. **Conclusión de negocio** (hechos, hipótesis, recomendaciones).

`ready=true` ≠ `ACQUIRED_OK` ≠ «datos disponibles» ≠ «operación saludable».

Copy prohibido (aunque `ready=true`):

- «Todo está bien»
- «Datos disponibles»
- «Operación saludable»

---

## 5. Estados UI mínimos

| Estado | Condición física | Texto visible recomendado | ¿Bloquea cycle panel? |
|---|---|---|---|
| `loading` | GET en vuelo | «Comprobando disponibilidad técnica…» | No |
| `ready` | HTTP 200 y `enabled===true` y `ready===true` | «Servicio Director IA: listo (técnico)» | No |
| `disabled` | HTTP 200 y `enabled===false` | «Director IA deshabilitado en el servidor» | No |
| `unavailable` | HTTP 503 y `enabled===true` y `ready===false` | «Servicio Director IA no disponible (técnico)» | No |
| `transport_error` | red caída, HTTP 500, status inesperado, cuerpo no parseable | «No se pudo consultar la disponibilidad técnica» | No |

No hay evidencia contractual para bloquear el cycle panel. Preferencia de la tarea: **no bloquear**.

---

## 6. Refresh

**Decisión: one-shot al montar `DirectorIaShell` + refresh manual (un botón).**

- No polling.
- No retry automático.
- Un segundo GET solo si el usuario pulsa actualizar.

No hay requisito físico de polling: el endpoint es barato y el indicador no es un SLO.

---

## 7. Errores (mínimo)

| Caso | Estado UI | Nota |
|---|---|---|
| Network error | `transport_error` | No es `TOOL_ERROR` ni `ABSTAIN` |
| HTTP 500 | `transport_error` | No cognitivo |
| HTTP 503 con shape de readiness | `unavailable` | No throw tipo `apiFetch` |
| `enabled=false` (200) | `disabled` | Distinto de `DirectorIaDisabled` por env Next |
| `ready=false` con enabled true (503) | `unavailable` | No es «sin datos» |

---

## 8. Definición binaria de M1 COMPLETE (operativo)

M1 Health dashboard es COMPLETE **si y solo si** se cumplen todos:

1. Backend: se reutiliza `GET /health-director-ia` sin cambio de ruta, auth, shape ni semántica.
2. Frontend: el indicador vive en `DirectorIaShell` (header), no en `DirectorIaCyclePanel`.
3. Existe `fetchDirectorIaHealth` (o equivalente) en `frontend-dashboard/modules/director-ia/lib/api.ts` con la misma base URL que el ciclo.
4. El GET no envía `Authorization`.
5. Estados: `loading` / `ready` / `disabled` / `unavailable` / `transport_error` con el copy de §5.
6. One-shot + refresh manual; sin polling; sin retry.
7. El cycle panel sigue operable con cualquier estado de health.
8. Tests mínimos de §9 en verde.
9. Copy sin confundir readiness con `ACQUIRED_*` / `ABSTAIN` / conclusión de negocio.
10. Sin cambios a `docs/director-ia/*`, auth/authz, `package.json`, lockfiles, Render env.

Falso (no COMPLETE) si falta cualquiera.

No es COMPLETE de inventario matriz «COMPLETA» sobre `/health` `/health-db` `/health-proyectos`. Ese alcance **no** es este slice.

---

## 9. Tests mínimos del siguiente IMPL

Archivo candidato: `test/director-ia-dashboard-health-client.test.js` (y guards en shell/api). Backend readiness existente no se reescribe.

Cubrir al menos:

| Caso | Aserción |
|---|---|
| `ready=true` | HTTP 200 + `enabled/ready true` → estado `ready` + copy técnico |
| `enabled=false` | HTTP 200 + `enabled false` → `disabled` |
| `ready=false` | HTTP 503 + `enabled true` + `ready false` → `unavailable` |
| network error | fetch throw → `transport_error` |
| HTTP error (500 / status inesperado) | `transport_error` |
| `loading` | estado mientras el GET no resuelve |
| no interferencia con cycle panel | health no deshabilita/oculta `DirectorIaCyclePanel`; no importa cycle core |
| auth/fetch | URL `/health-director-ia` (vía `/api-backend` o `NEXT_PUBLIC_API_URL`); **sin** `Authorization` |
| no polling / no retry | un GET al montar; segundo GET solo por click; fuente sin `setInterval` / retry |
| semántica | copy no contiene «Todo está bien», «Datos disponibles», «Operación saludable»; no usa `ACQUIRED_OK` / `ABSTAIN` como label de health |
| no backend | `server.js` / handler de readiness intactos |

---

## 10. Gates

| Gate | Esta auditoría | Siguiente IMPL |
|---|---|---|
| G1 | `AUTHORIZED` (esta tarea) | Requerido para el IMPL (humano) |
| G2 | **N/A** | **N/A** — no se redefine arquitectura ni contratos D1–D9; inventario no se reescribe en el IMPL |
| G3 | **N/A** | **N/A** — no hay contrato nuevo |
| G8 | **N/A** | **N/A** |

El contrato actual basta. Solo falta wiring/UI. G2/G3 no se usan preventivamente.

Si un IMPL futuro quisiera marcar la matriz M1 como COMPLETA para `/health` `/health-db` `/health-proyectos` o añadir herramienta de chat: **STOP** y pedir G2. Esa vía no se recomienda ahora.

---

## 11. NEXT_TASK (propuesta; no autorizada; no ejecutada)

**`IMPL-DIRECTOR-IA-M1-HEALTH-DASHBOARD-001`**

Alcance mínimo:

- `fetchDirectorIaHealth` en `frontend-dashboard/modules/director-ia/lib/api.ts`
- Indicador + refresh manual en header de `DirectorIaShell.tsx`
- Tests de §9
- Sin tocar backend, contratos, auth, cycle panel semantics, polling, retry

---

## Acciones NO realizadas

- No implementación UI/backend.
- No modificación de contratos ni `docs/director-ia/*`.
- No cambio de auth/authz.
- No smoke productivo.
- No commit / push / merge.
- No se autorizó ni ejecutó el NEXT_TASK.

## Cierre

- `status` = `DONE_PENDING_REVIEW`
- Slice mínimo fijado sin redefinir arquitectura.
- STOP.
