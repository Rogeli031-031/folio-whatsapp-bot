# Reporte — ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-OPERATIONAL-HARDENING-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "package.json"
  - "frontend-dashboard/package.json"
  - ".env"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRODUCTIZATION-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-ENDPOINT-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-001.md"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 permanecen PENDING_IF_REQUIRED; no se usaron. El NEXT_TASK propuesto tampoco los exige."
  - "G8 permanece N/A."
  - "Veredicto NO-GO para declarar production-ready. CONDITIONAL-GO para permanecer live restringido (JWT + ENABLE_DIRECTOR_IA + dashboard) hasta el hardening."
  - "El humano debe fijar el presupuesto de timeout al autorizar el NEXT_TASK (candidato 60s; no es contrato)."
```

## Ejecución

- Rama: `architecture/director-ia-operational-hardening-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T11:54:47-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21`.
- G2/G3: `PENDING_IF_REQUIRED`, **no usados**. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status` del bloque G1) → este reporte → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin commit, push, merge. Sin siguiente tarea.

Auditoría física de `server.js`, transporte dashboard, ARR, cliente UI, health existente, auth, pool, flags y reportes in_scope. Baseline live: commit `5230146a`, Render LIVE, frontend `npm ci && npm run build` PASS, regresión Director IA 351/0.

G2/G3 no fueron necesarios para cerrar el alcance: no se tocan contratos ni se introduce epistemología. Si el NEXT_TASK pretendiera redefinir AcquisitionStatus o crear un contrato de SLO, habría que detenerse; esa vía **no** se recomienda.

---

## 1. Executive verdict

**NO-GO** para declarar el Director IA **production-ready**.

El path cognitivo ya está live:

`Dashboard UI → POST /api/director-ia/cycle → ARR → OP → EB → EKS → IES → RE → CP(DASHBOARD) → UI`

Eso no basta. El ciclo HTTP **puede quedar indefinidamente colgado**: no hay timeout efectivo de ARR (`computePronosticoProyByPlant` sin `statement_timeout`), ni de `cycle.run`, ni de `fetch` en el cliente. `connectionTimeoutMillis` (15s) solo cubre **obtener** un cliente del pool, no la query.

Los eventos `cycle_request_started|completed|failed` existen en el transporte y los tests los cubren **con logger inyectado**. `server.js` **no pasa `logger`** a `configureDirectorIaDashboardCycle`. En producción esos eventos **no llegan** a logs.

`/health` es liveness `"OK"`. `/health-db` prueba el pool, no ARR. No hay readiness de Director IA. No hay CI de repo. El build frontend **sí** debe ser gate obligatorio del loop: ya falló en Render por TypeScript.

**CONDITIONAL-GO** para permanecer live **restringido** (JWT dashboard + `plantas_permitidas` + bloqueo GA + `ENABLE_DIRECTOR_IA`) mientras se ejecuta **un** hardening mínimo: timeout + logger cableado + readiness ligera + abort de cliente + smoke/post-deploy. Sin métricas sofisticadas, sin persistencia/sesión, sin retry, sin rate limiter como primer paso.

Candidato ganador: **A_HEALTH_TIMEOUT_SMOKE**.

---

## 2. Production baseline

| Hecho | Evidencia |
|-------|-----------|
| Endpoint | `POST /api/director-ia/cycle` + `dashboardAuthMiddleware` (`server.js` ~10446) |
| UI | `DirectorIaCyclePanel` en `/director-ia` |
| Auth/authz | JWT; `assertDashboardPlantaAccessForActionRegister`; `dashboardBlockGAFinancialKpis` **antes** del ciclo |
| ARR | `loadArrProyForDirectorIaDashboardCycle` → `computePronosticoProyByPlant` (todas las plantas del grid, no un lookup puntual) |
| Flag | `ENABLE_DIRECTOR_IA` (`isDirectorIaEnabled`); FE `is-enabled.ts` + `{ enabled: false }` del backend |
| Deploy | commit `5230146a` LIVE (G1) |
| Build FE | `npm ci && npm run build` = `next build && node scripts/prepare-standalone.js` PASS (hotfix tipos) |
| Tests | `test/director-ia-*.test.js` 351 pass / 0 fail |
| Retry | Ausente en cliente (`cycle-client-core.js` no contiene `retry`) y en transporte |
| Timeout app | **Ausente** (deuda ya anotada en IMPL endpoint: no se inventó política) |
| Logger productivo | **No cableado** |

---

## 3. D1–D30 findings

### D1 — health/readiness

**Parcial. REQUIRED_HARDENING.**

- Backend `GET /health` → `200` texto `OK` (liveness Render).
- `GET /health-db` → `SELECT 1` al pool; en error 500 con `e.message` (fuga de driver; deuda previa).
- `GET /health-proyectos` no es Director IA.
- Frontend `GET /health` → `{ ok: true, service: "folio-dashboard" }`.
- Ninguno dice si `ENABLE_DIRECTOR_IA` está on, si el transporte está configurado (`503 Servicio no disponible` solo se ve al POST), ni si ARR es operable.

No se puede saber, antes de tráfico de usuario, si el ciclo está listo.

### D2 — degradación ARR sin ciclo completo

**No. REQUIRED_HARDENING / no confundir con health de pool.**

ARR productivo ejecuta `computePronosticoProyByPlant` → `buildPronosticoVentaDescMaps` (grids de venta/descuento de **todas** las plantas). `/health-db` no cubre eso. Meter el cómputo completo en un health check sería costoso y colgaría el probe.

Probe admisible: flag + pool + (opcional) `SELECT 1` a `arr.provincia_plants`. La degradación **semántica** de ARR sigue viéndose en un ciclo con timeout (502 `TOOL_ERROR`), no en un ping.

### D3 — timeout

**No existe timeout efectivo. BLOCKER.**

| Capa | ¿Timeout? |
|------|-----------|
| `arrSource` / `adaptArr` | `await invokeArrSource` sin race ni `statement_timeout` |
| `realCycle.run` / `transport.handle` | `await` sin tope |
| `handlePostDashboardCycle` | `await resolvePlant` + `await transport.handle` sin tope |
| Pool | `connectionTimeoutMillis` 15s **solo connect** |
| Cliente `fetch` | sin `AbortController` / `signal` |
| Chat legado | axios 45s (irrelevante para este path) |
| IGF UI | 120s abort (evidencia de que otras pantallas ya lo necesitaron) |

Si ARR no resuelve, el request HTTP, el `client` de pool (`finally` no corre hasta que el await termine) y la UI en «Consultando…» permanecen ocupados. Un timeout de plataforma Render, si existe, no libera el trabajo en Node ni mapea a `TOOL_ERROR`.

Clasificación: **BLOCKER** de production-ready. No es G2: es transporte.

### D4 — abort / desconexión del cliente

**El ciclo sigue. REQUIRED_HARDENING (servidor) + UX (cliente).**

No hay `req.on("close")` / `AbortSignal` hacia ARR. Si el usuario navega o el browser corta, Express/Node continúa hasta que ARR vuelva (o nunca). El `client.release()` está en `finally` — correcto si el await termina; inútil si no termina.

### D5 — retry

**Confirmado: no hay retry automático. Eso es correcto.**

Cada POST es un ciclo nuevo, nuevo `trace_id`, `append_snapshot` (EKS memoria o pg). Reintentar duplica snapshots y relee ARR. Sin idempotencia demostrada **no** se debe añadir retry. El cliente hace una sola `fetch`.

### D6 — logging productivo

**Código sí, producción no. OBSERVABILITY_REQUIRED (casi blocker de soporte).**

`emitLog` emite `cycle_request_started|completed|failed` con `request_id`, `trace_id` (null al start), `planta_id`, `duration_ms`, `http_status`, statuses. Tests lo prueban con logger inyectado.

`configureDirectorIaDashboardCycle({ pool, assertPlantaAccess, blockGAFinancialKpis, getPlantCodeArrFromPlantaNombre, arrSource, eks })` **omite `logger`**. `logger` default `null` → no-op.

401 ocurre en `dashboardAuthMiddleware` **antes** del transporte: log `[dashboardAuth] auth header presente: true/false` (booleano, no JWT). 403 GA/planta no pasan por `emitLog`.

### D7 — visibilidad de errores

**Parcial.**

| Caso | HTTP | ¿Operador lo ve hoy? |
|------|------|----------------------|
| TOOL_ERROR | 502 + `code` | Body sí; log de ciclo no (logger null) |
| 500 inesperado | `error: "Error interno"` | Body sí; log de ciclo no |
| 401 | `Token inválido o expirado` | stdout auth header presente |
| 403 | `Sin acceso…` / GA | respuesta HTTP; no evento de ciclo |
| Hang | ninguno | **invisible** |

Product-safe: no se devuelve stack al caller del ciclo. `health-db` sí puede filtrar `e.message`.

### D8 — métricas

**Solo logs (y esos no están cableados). DEBT_NON_BLOCKING respecto al hang.**

No hay contadores de volumen/latencia/error-rate ni de AcquisitionStatus. No se demuestra dependencia física de un sistema de métricas para dejar de colgarse. El mínimo es logger stdout + timeout.

### D9 — alerting

**No específico. DEBT_NON_BLOCKING.**

Render alerta de deploy fallido (el typecheck del frontend ya lo demostró). No hay alerta de 5xx sostenidos ni de ARR. Sin timeout, un hang puede no ser 5xx. Alertas sofisticadas no van primero.

### D10 — correlación trace_id

**Diseñada; rota en hang y en logs productivos.**

`trace_id` lo crea la fachada ARR, viaja en el body, la UI lo muestra (`ref {trace_id}`) si hay respuesta. Al `started` el log usa `trace_id: null` (aún no existe). Si ARR cuelga, no hay trace. Si logger no está cableado, el operador no correlaciona por logs aunque la UI muestre `ref`.

### D11 — logging sensible

**Transporte: diseñado limpio. Cableado: N/A. Auth: aceptable.**

Eventos de ciclo: no JWT, no raw ARR, no IES/RE completos, no stack. Test endpoint lo afirma con logger inyectado. `dashboardAuth` no imprime el token. No inspeccionar `.env` real.

Riesgo residual: `health-db` `e.message`; JWT secret default en código si faltan env (`folio-dashboard-secret-change-in-production`) — deuda **previa**, no del ciclo.

### D12 — 401/403 vs fallo Director IA

**Sí, distinguibles.** Authz **antes** de `transport.handle`. 401/403 no invocan el ciclo. TOOL_ERROR 502 / 500 interno / 200 + `acquisition_status` son otra familia. UI: `authFailure` → `onUnauthorized`; `authorizationFailure` separado.

### D13 — rate limiting

**No existe (`express-rate-limit` ausente). DEBT_NON_BLOCKING / follow-up.**

Protección actual: JWT + plantas + GA + botón `disabled` mientras `inFlight` (un tab). No hay tope entre pestañas/usuarios. ARR es caro (grid de todas las plantas). Eso es riesgo de **agotamiento**, no evidencia de que un rate limiter deba ir **antes** del timeout: sin tope de tiempo, un solo request cuelga un slot de pool.

### D14 — concurrencia

**Semántica OK; recursos no acotados.**

Tests: requests paralelos no comparten `trace_id`. `deps` de módulo es config, no estado de request. Cada POST hace `pool.connect()`. EKS pg serializa por `trace_id`; traces distintos son independientes. No hay store de sesión del ciclo.

Riesgo: N ciclos concurrentes = N cómputos ARR completos sobre `PG_POOL_MAX` (default 20), compartido con WhatsApp/dashboard.

### D15 — resource limits

**Riesgo real, no blocker epistémico.**

- ARR por request: grids de **todas** las plantas.
- `bodyParser.json({ limit: "120mb" })` aplica al POST cycle (parsea el body entero aunque solo se usen 3 campos).
- `year` entero `> 0` sin techo (p. ej. 999999) puede inflar `Date`/lookback.
- EKS pg: append por ciclo (disco). EKS memoria si runtime off: crecimiento en proceso.
- Hang: slot de pool no se libera.

Timeout + `finally`/`release` es el control mínimo. Rate limit / techo de year son follow-up.

### D16 — rollout

**Suficiente para restricted-live. No hay gradualidad cycle-only.**

`ENABLE_DIRECTOR_IA` (BE + FE page). JWT + `plantas_permitidas`. Ruta solo dashboard. No allowlist de usuarios para `/cycle` distinta del módulo. Apagar el flag apaga **todo** Director IA (chat/context/ciclo), no solo el ciclo. Aceptable: el slice live **es** el módulo.

FE `is-enabled.ts` lee `ENABLE_DIRECTOR_IA` (no `NEXT_PUBLIC_*`) en `app/director-ia/page.tsx` (RSC). Coordinar env del servicio frontend y backend. Kill de backend solo deja UI visible si el page gate está on, pero el POST responde `{ enabled: false }`.

### D17 — kill switch

**Sí, de módulo, no de endpoint. Aceptable bajo la regla de decisión.**

`ENABLE_DIRECTOR_IA` off → 200 `{ enabled: false }` sin ciclo. Requiere cambio de env + restart típico de Render, no revert de commit. No hay switch in-process. Rollout sin kill cycle-specific es aceptable porque el endpoint ya está restringido (JWT + plantas + flag).

### D18 — smoke productivo seguro

Definido en §12. No WhatsApp. No inventar plantas. Un E2E autorizado **sí** hace `append_snapshot` si EKS pg está started (append-only de conocimiento, no muta ARR/folios). El smoke **mínimo sin write** es health + 401 + 400.

### D19 — post-deploy

Definido en §12. Incluye el **build real del frontend** y un POST que **termine** (no cuelgue).

### D20 — observabilidad frontend

**Parcial. REQUIRED_HARDENING por hang de UI.**

Muestra headline, statuses, `trace_id` si vino. Sin `console.log` en el panel (test). `catch` de `fetch` pone `transport_error` **solo si fetch rechaza**; un hang no rechaza. Sin telemetry de cliente (correcto: no enviar JWT/ARR).

### D21 — build gate frontend

**Sí, obligatorio en el loop para cambios UI.** Ya falló en Render (`DirectorIaCyclePanel.tsx:45` typecheck). No hace falta G6: cada `CURRENT_TASK` de UI debe listar `npm ci && npm run build` en `frontend-dashboard` como `required_validation`. `tsc` suelto no sustituye.

### D22 — CI

**No hay `.github/workflows`. DEBT_NON_BLOCKING vs hang.**

La única red es loop local + build Render. No mezclar “crear CI” con el primer hardening. El gate de merge sigue siendo humano (G4).

### D23 — security headers

**Hereda CORS del server; no helmet/CSRF dedicado.**

CORS allowlist `DASHBOARD_URL` / localhost. API cycle usa `Authorization: Bearer` (no cookie de sesión del ciclo). OPTIONS 204. Sin `helmet`. CSRF de cookie no es el vector principal. Suficiente para restricted-live; no es el primer blocker.

### D24 — input abuse

**Validación mínima presente; techos incompletos. DEBT_NON_BLOCKING.**

`planta_id` entero > 0; `month` 1–12; `year` entero > 0 **sin rango**. `plant_code` de cliente se ignora (resolver server-side). Authz antes de ARR. Year/planta extremos + ARR full-grid = coste. Techos (p. ej. year 2000–2100) son follow-up, no sustituyen timeout.

### D25 — config operacional

Necesarios para operar el ciclo (no secretos): `ENABLE_DIRECTOR_IA`, `DATABASE_URL`, `DASHBOARD_JWT_SECRET` (o `JWT_SECRET`), `DASHBOARD_URL`/`CORS_ORIGIN`, `PG_POOL_MAX`, `PG_CONNECTION_TIMEOUT_MS`, `EKS_POOL_MAX`, `DATABASE_SSL`. Frontend: mismo flag si se usa el page gate; `NEXT_PUBLIC_API_URL` según deploy.

Falta documentar/readiness-checkear: transporte configurado, timeout (aún inexistente). No añadir keys en esta tarea.

### D26 — fallos ARR no cubiertos

Cubiertos por tests: throw → TOOL_ERROR; empty; unresolved; scope incomplete; unusable result.

**No cubiertos:** Promise que nunca resuelve; query pg indefinida; pool starvation; abort de cliente a mitad; year absurdo que no tira pero es caro; timeout de plataforma vs app.

### D27 — supportability

**Hoy no.** Sin logs de ciclo en prod y sin timeout, un operador no diagnostica un colgado. Con logger cableado + timeout + `trace_id` en 502, sí puede correlacionar UI `ref` ↔ stdout **sin** IES/RE/JWT/raw ARR. Hang actual: no.

### D28 — SLO candidatos (no contrato)

Solo referencia operativa, no congelar:

| Candidato | Valor ilustrativo | Nota |
|-----------|-------------------|------|
| Disponibilidad del transporte | ciclo termina (200/4xx/502) dentro del timeout | Hang = incumplimiento |
| Latencia p95 | < presupuesto de timeout (candidato 60s) | ARR full-grid puede ser lento |
| Error-rate 5xx | TOOL_ERROR vs 500 internos separados | 200 + EMPTY no es error |
| Build FE | `npm ci && npm run build` PASS | ya falló una vez |

### D29 — comparación de candidatos

Ver §14. Ganador **A**.

### D30 — NEXT_TASK

Ver §17. Exactamente uno: `IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001`.

---

## 4. Operational readiness matrix

| capability | exists | required before production-ready | gap | risk | gate required | recommended action |
|------------|--------|-----------------------------------|-----|------|---------------|-------------------|
| health/readiness | liveness `/health` + pool `/health-db`; no DI/ARR | sí (ligero) | no readiness de flag/transporte | REQUIRED_HARDENING | no G2/G3 | probe flag+pool; no ARR full |
| ARR dependency readiness | no (solo pool) | sí, vía timeout+ciclo, no health pesado | no detección de cómputo ARR | REQUIRED_HARDENING | no | timeout → TOOL_ERROR; no meter grid en /health |
| timeout | no | **sí** | hang indefinido | **BLOCKER** | no | race ARR + request HTTP |
| abort/cancellation | no | sí (server libera pool; client UX) | trabajo huérfano | REQUIRED_HARDENING | no | timeout server; AbortController FE |
| retry | ausente (correcto) | no añadir | — | READY | no | no retry sin idempotencia |
| logging | código+tests; **no** stdout prod | sí (mínimo) | logger null en configure | OBSERVABILITY_REQUIRED | no | cablear console adapter |
| metrics | no | no (no dependencia física vs hang) | — | DEBT_NON_BLOCKING | no | follow-up |
| alerting | deploy Render only | no primero | 5xx/ARR | DEBT_NON_BLOCKING | no | follow-up |
| trace correlation | UI+body; logs prod no | sí | logger null; hang sin trace | OBSERVABILITY_REQUIRED | no | logger + timeout |
| rate limiting | no | no primero | abuso/concurrencia | DEBT_NON_BLOCKING | no | follow-up |
| concurrency | traces aislados | acotar recursos | N×ARR vs pool 20 | DEBT_NON_BLOCKING | no | timeout primero |
| resource limits | pool max; body 120mb | timeout sí | year sin techo; grid completo | REQUIRED_HARDENING (timeout) | no | timeout; techos after |
| rollout | flag+JWT+plantas | restricted-live sí | no gradual cycle-only | READY (restricted) | no | mantener |
| kill switch | ENABLE_DIRECTOR_IA módulo | sí (existe) | no cycle-only; restart env | READY (restricted) | no | usar flag |
| smoke test | no formal prod | sí | — | REQUIRED_HARDENING | no | §12 |
| post-deploy validation | Render build FE | sí, más checks | no checklist ciclo | REQUIRED_HARDENING | no | §12 |
| frontend build gate | Render sí; loop no formal | **sí** | loop no lo exige siempre | REQUIRED_HARDENING | no G6 | required_validation UI |
| CI | no GitHub Actions | no primero | merge humano | DEBT_NON_BLOCKING | G4 humano | no en NEXT_TASK |
| security headers | CORS; no helmet | restricted-live sí | — | DEBT_NON_BLOCKING | no | follow-up |
| input abuse | parse básico | timeout > techos | year unbounded | DEBT_NON_BLOCKING | no | follow-up |
| supportability | no en hang | sí | logs+timeout | **BLOCKER** conjunto | no | A |

---

## 5. Failure-mode matrix

| failure | current behavior | observable | safe for production | gap | action |
|---------|------------------|------------|---------------------|-----|--------|
| ARR timeout / hang | await eterno; pool retenido; UI Consultando | no | **no** | BLOCKER | timeout → 502 TOOL_ERROR |
| ARR throw | TOOL_ERROR 502 | body sí; log ciclo no | sí si timeout+log | OBSERVABILITY_REQUIRED | cablear logger |
| ARR empty | 200 ACQUIRED_EMPTY | UI yes | sí | READY | none |
| entity unresolved | 200 ENTITY_UNRESOLVED | UI yes | sí | READY | none |
| scope incomplete | 200 QUERY_SCOPE_INCOMPLETE | UI yes | sí | READY | none |
| auth 401 | middleware; no ciclo | header presente bool | sí | READY | none |
| authz 403 | GA/planta; no ciclo | HTTP | sí | READY | none |
| unexpected 500 | `Error interno` | body; log ciclo no | sí (product-safe) | OBSERVABILITY_REQUIRED | logger |
| frontend network failure | catch → transport_error | UI; sin trace | sí si fetch falla | hang no cubierto | AbortController |
| frontend build failure | Render typecheck | deploy fail | hotfix ya PASS | loop no obliga build | gate en CURRENT_TASK UI |

---

## 6. Health/readiness

Liveness actual es suficiente para que Render no mate el proceso. **No** es readiness de Director IA.

Readiness mínima recomendada (NEXT_TASK, sin G2):

1. `ENABLE_DIRECTOR_IA` on/off explícito.
2. Pool operacional `SELECT 1` (reutilizar patrón `/health-db` sin filtrar `e.message` al cliente, o campo `ok` booleano).
3. Transporte configurado (`deps.transport` presente) → si no, 503 ya existe en POST; el probe debe decirlo **antes**.
4. **No** ejecutar `computePronosticoProyByPlant`.

ARR “¿está sano?” se demuestra con un ciclo que **termina** dentro del timeout.

---

## 7. Timeout / abort / retry

- Timeout ARR: **no**.
- Timeout HTTP completo: **no**.
- Abort cliente → cancela trabajo server: **no**.
- Retry automático: **no** (correcto; no proponerlo).

El timeout debe envolver **resolvePlant + cycle.run** (no solo `arrSource`): si solo se recorta ARR, EKS pg o IES podrían colgar igual. Mapeo ya existente: `TOOL_ERROR` → 502. Candidato de presupuesto (no contrato): **60s**, env `DIRECTOR_IA_CYCLE_TIMEOUT_MS`, cliente abort ligeramente por encima o igual como backstop UX.

No usar retry al vencer el timeout.

---

## 8. Logging / metrics / alerts

Mínimo production-ready: cablear `logger` a stdout con el payload **ya definido** (event, request_id, trace_id, planta_id, duration_ms, http_status, acquisition_status, ies_status, reasoning_status, code). Sin JWT, sin raw ARR, sin IES/RE, sin stack.

Métricas/alerting de plataforma: follow-up. No desbloquean el hang.

---

## 9. Trace / supportability

Flujo sano: UI `ref` = body `trace_id` = log `cycle_request_completed.trace_id`. Hoy el eslabón de log está cortado y el hang no emite trace. Tras A: operador correlaciona 502 con `TOOL_ERROR` + duration_ms + planta_id.

---

## 10. Security / rate limiting / input abuse

Authz antes del ciclo: **listo**. Rate limit: no prerequisite demostrado frente a hang. Input: validar enteros; techo de year follow-up. CORS heredado suficiente para Bearer dashboard.

---

## 11. Rollout / kill-switch

Restricted-live ya es el rollout. Kill: `ENABLE_DIRECTOR_IA` (módulo). No se exige kill cycle-only ni feature flag nuevo en el NEXT_TASK.

---

## 12. Smoke / post-deploy validation

### Smoke seguro (sin WhatsApp, sin datos inventados)

**Sin write EKS (siempre, cada deploy):**

1. `GET {backend}/health` → 200 `OK`.
2. `GET {backend}/health-db` → 200 `ok: true` (o probe nuevo equivalente).
3. `GET {frontend}/health` → 200.
4. `POST /api/director-ia/cycle` sin `Authorization` → 401 (no ciclo).
5. `POST` con JWT válido, sin `planta_id` → 400 `INVALID_INPUT` (no ciclo).

**E2E opcional (una planta ya autorizada al operador, year/month ya usados en dashboard ARR):**

6. `POST` con `planta_id`+`year`+`month` reales. Debe **terminar** dentro del timeout. 200 (cualquier `acquisition_status` fail-closed) o 502 `TOOL_ERROR` son outcomes operativos válidos. 401/403/hang no. Side effect: `append_snapshot` si EKS pg started — no muta ARR.

### Checklist post-deploy mínimo

- [ ] Deploy backend LIVE; frontend `npm ci && npm run build` PASS.
- [ ] `ENABLE_DIRECTOR_IA` alineado BE/FE.
- [ ] Smoke 1–5 verdes.
- [ ] Un POST autorizado **no cuelga** (paso 6 cuando haya timeout).
- [ ] Stdout muestra `cycle_request_*` (tras cablear logger), sin JWT.
- [ ] UI muestra `ref` si hubo `trace_id`.
- [ ] Si el cambio tocó FE: el typecheck de Next formó parte del build Render.

---

## 13. Frontend build / CI gate

El fallo real de Render fue TypeScript, no `npm audit`. **Recomendación:** todo `CURRENT_TASK` que toque `frontend-dashboard/**/*.ts(x)` o `.d.ts` debe exigir el comando exacto `npm ci && npm run build` en `frontend-dashboard`. No G6. No sustituir por `tsc` suelto.

CI GitHub: deuda, no NEXT_TASK.

---

## 14. Candidate comparison

| candidate | value unlocked | production risk reduced | prerequisites | G2 | G3 | config | recommended |
|-----------|----------------|-------------------------|---------------|----|----|--------|-------------|
| **A_HEALTH_TIMEOUT_SMOKE** | request siempre termina; probe; smoke | hang, pool stuck, UI infinita, ceguera ops | flag+JWT ya live | no | no | timeout ms opcional | **SÍ — único NEXT** |
| B_OBSERVABILITY_METRICS_ALERTS | dashboards 5xx | no evita hang; logs ya diseñados | timeout para que el evento exista | no | no | vendor | no primero; logger de A basta |
| C_ROLLOUT_KILL_SWITCH | gradualidad extra | ya hay flag+JWT | — | no | no | env | ya READY restricted |
| D_RATE_LIMIT_SECURITY | tope de abuso | no libera request colgado | timeout primero | no | no | limiter | follow-up |
| E_PERSISTENCE_SESSION | historial/conversación | **ninguna** física para este slice | — | no* | no* | store | **no**; sin dependencia física |

\*Persistencia/sesión como producto nuevo podría pedir G2/G3; **no** se recomienda.

---

## 15. Gate requirements

| Gate | Esta auditoría | NEXT_TASK propuesto |
|------|----------------|---------------------|
| G1 | autorizado | nuevo G1 humano |
| G2 | no usado | **N/A** (no editar `docs/director-ia/`) |
| G3 | no usado | **N/A** (no contrato nuevo; no SLO contractual) |
| G4 | no | no (agente no merge) |
| G8 | N/A | N/A |
| G6 | no | no (build gate vía `required_validation`, no cambiar LOOP_PROTOCOL) |

Si alguien pidiera redefinir `TOOL_ERROR` o publicar SLOs como contrato: **STOP** y G2/G3. No es el slice.

---

## 16. Minimum production-ready slice

Tras A, el sistema puede llamarse production-ready **restringido** (dashboard JWT, no WhatsApp) si:

1. Todo request de ciclo termina en tiempo finito (200/4xx/502/503), nunca hang.
2. Logger stdout de start/completion/failure con `trace_id` cuando exista y `duration_ms`.
3. Readiness ligera (flag + pool + transporte) distinta de liveness.
4. Cliente no queda en «Consultando…» indefinido.
5. Smoke 1–5 y un ciclo autorizado que termina.
6. Build FE real es gate de cambios UI.
7. Sin retry automático.

Fuera de ese slice: métricas, alerts, rate limit, techos de year, CI GitHub, helmet, sesión, persistencia extra.

---

## 17. Exactly one NEXT_TASK

**IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001** (propuesta; este reporte no es G5).

Objetivo: hacer que `POST /api/director-ia/cycle` y su cliente **terminen siempre** en un presupuesto finito, con logs productivos mínimos y readiness ligera, sin cambiar cognición ni contratos.

In_scope candidato (humano puede recortar al autorizar):

- `lib/director-ia-dashboard-cycle-transport.js` — timeout alrededor de resolve+handle; map hang → 502 `TOOL_ERROR` product-safe; no retry.
- `server.js` — pasar `logger` stdout al `configure` existente; env documentable `DIRECTOR_IA_CYCLE_TIMEOUT_MS` (default candidato 60s, no contrato); probe de readiness **o** extensión mínima de health **sin** ARR full-grid.
- `frontend-dashboard/modules/director-ia/lib/cycle-client-core.js` (+ `.d.ts` si hace falta) — `AbortController` / timeout de `fetch`; **sin** migrar a TS innecesario; **con** `npm ci && npm run build`.
- Tests focales + `test/director-ia-*.test.js`; `git diff --check`.

Out_of_scope: retry, métricas/alerts, rate limit, persistencia/sesión, WhatsApp, `docs/director-ia/`, package.json dependencias nuevas, G2/G3.

Gates: G2 N/A, G3 N/A, G8 N/A.

---

## 18. GO / CONDITIONAL-GO / NO-GO

| Pregunta | Veredicto |
|----------|-----------|
| ¿Production-ready? | **NO-GO** |
| ¿Puede seguir live restringido? | **CONDITIONAL-GO** (JWT + flag + dashboard; hang residual aceptado solo como deuda explícita hasta A) |
| ¿G2/G3 para esta auditoría? | No. Completada sin ellos. |
| ¿Siguiente incremento? | Solo A, con G1 nuevo |

---

## 19. STOP

Auditoría cerrada. Sin implementación. Sin commit, push, merge. Sin encadenar `IMPL-DIRECTOR-IA-OPERATIONAL-HARDENING-001`. Un humano debe CLOSED/REJECTED (G5) y, si procede, autorizar el NEXT_TASK con G1 nuevo.
