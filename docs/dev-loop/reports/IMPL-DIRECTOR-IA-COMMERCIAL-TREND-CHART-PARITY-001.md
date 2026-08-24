# Reporte — IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture: "B — shared backend engine"
first_slice: "B — series + OLS + top-6 movers"
new_intent: "commercial_trend"
phrasebook: false
internal_http: false
comments_included: false
destination: "chat legado (askDirectorIa + conversation_state + planner + loader) + GET /api/arr/venta-serie delegando al mismo motor; NO Motor N1–N5; NO IES; NO Reasoning Engine; NO HTTP interno"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Commercial trend chart parity is not module coverage."
sql_017: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"
  - "lib/commercial-trend-engine.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-tools.js"
  - "server.js"
  - "test/director-ia-commercial-trend.test.js"
  - "test/director-ia-intra-session-topic-return.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "frontend-dashboard/"
  - "lib/director-ia-capabilities.js"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**Arquitectura B implementada.** Un solo motor en `lib/commercial-trend-engine.js`. El dashboard (`GET /api/arr/venta-serie`) y Director IA (`commercial_trend`) delegan al mismo código.

First slice **B**: serie diaria + OLS + top-6 movers. Comments **fuera** del motor y del pack de chat. El wrapper HTTP del dashboard sigue adjuntando comentarios por `cliente_nombre` para no cambiar el contrato visible de la gráfica.

No hay SQL paralelo de chat. No se copió `linearTrend` solo a Director IA. No hay HTTP interno. Una matemática.

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-commercial-trend-chart-parity-001` (≠ `main`).
- HEAD base: `75625b65 Merge branch 'architecture/director-ia-commercial-trend-chart-parity-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, SQL, matriz, commit, push, merge.
- Frontend no modificado: OLS se prueba contra la fórmula de `ArrVentaGraficaModal.tsx` sin cambiar el renderer.

---

## Confirmaciones

| Requisito | Estado |
|-----------|--------|
| Shared engine | `lib/commercial-trend-engine.js`. Dashboard y chat llaman `loadCommercialTrend`. |
| Dashboard parity | `GET /api/arr/venta-serie` delega + `toVentaSerieHttpBody`. Comments solo en el wrapper HTTP. |
| 30/90 | `1m` = 30 días trailing (`end−29`). `3m` = 90 (`end−89`). |
| MAX(fecha) | Ancla = último día disponible. No hoy. No mes calendario. |
| Channels | `LIKE '%comisionista%'` → COMISIONISTA; resto → CASA. Alias COMISIONISTAS → `comisionista`. |
| OLS | `x` = índice de puntos filtrados, `y` = `venta_ton`, `n<2` → null / `INSUFFICIENT_DATA`. Signo: UP/DOWN/FLAT. No first-vs-last. |
| Top-6 | Mismo delta vs periodo previo igual y misma selección que el dashboard. Mover ≠ causa. |
| Comments excluded | Motor y pack de chat: `comments_included: false`. Sin join por `cliente_nombre` en el motor. |
| Intent | Un solo `commercial_trend`. Slots: `range_days`, `channel`, `plant`. |
| Conversation | CASA 90d → COMISIONISTAS (mismo rango, requery) → Compáralos (dos llamadas, mismo rango) → quién explica = contributor → háblame del primero = handoff canónico. |
| Partial data | 0 filas → `INSUFFICIENT_DATA`, no tendencia cero. Un canal ausente se declara. Error fail-closed. |
| 52.5% | 10.5 / 20. 0.0 pp. |

---

## Motor compartido

Extracción fiel de la lógica que vivía en `GET /api/arr/venta-serie`:

- Resolución de planta (alias `public.plantas` + `arr.provincia_plants` + `ventas_diarias_cliente`).
- Ventana trailing anclada a `MAX(fecha)`.
- Split de canal idéntico.
- Serie: omite días con venta=0 y descuento=0 (semántica existente).
- Top-6 por `|delta_ton|` vs periodo previo de igual duración.
- OLS idéntico al frontend.

API: `loadCommercialTrend`, `assembleCommercialTrend`, `toVentaSerieHttpBody`, `linearTrend`, `computeTrendFromPoints`.

El endpoint conserva query params, authz GA/GV, forma HTTP y el adjunto de comments. El chat no consume esos comments.

---

## Chat legado

- Planner: `commercial_trend` **después** de brief/desviaciones diarias, **antes** de `arr_status`. Un intent. Semántica, no phrasebook.
- Tool: `get_commercial_trend` (read-only, dominio `arr`, sin comments).
- Conversation state: `commercial_trend` inheritable. Slots `active_range_days` / `active_channel`. Kinds `channel_switch`, `comparison`, `contributors`. Estado = routing; evidencia se requery cada turno.
- Canal no especificado → `both` (dos llamadas independientes; no usa `ambos` sumado para comparar).
- Rango default 30 si no hay rango.
- «¿Quién explica más la caída?» = mayor mover matemático. Prompt obliga: contribuye ≠ causa.
- «Háblame del primero» puede resolver el mover seleccionado con `cliente_key` canónico si es único. **No** hay perfil longitudinal 3M.
- Authz GA/GV fail-closed. Sin cross-plant.

`FRAME_ALLOWED` del test de topic-return acepta `active_range_days` y `active_channel` porque el snapshot ahora guarda esos slots de routing. No son evidencia.

---

## Conversación de producto

1. «¿Cómo vamos en CASA los últimos 3 meses?» → `commercial_trend`, CASA, 90d, requery.
2. «¿Y COMISIONISTAS?» → mismo 90d, canal COMISIONISTA, requery fresco.
3. «Compáralos.» → dos llamadas, mismo rango, evidencia fresca y defendible.
4. «¿Quién explica más la caída?» → contributor / mover, no causalidad.
5. «Háblame del primero.» → handoff del mover seleccionado si la resolución canónica es segura.

Preservados: daily executive brief, daily sales, daily discount, daily cross-metric, commercial_state, natural followup, topic return, action-person, IGF reviewable, persistent memory.

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal + parity `test/director-ia-commercial-trend.test.js` | **18/18** |
| Topic return (FRAME_ALLOWED) | pass |
| Daily sales / discount / brief / cross-metric | pass |
| Natural followup / continuity | pass |
| Action-person | pass |
| IGF reviewable | pass |
| Persistent memory | pass |
| `node scripts/test-director-ia-planner.js` | **58/58** |
| `node scripts/test-director-ia-capabilities.js` | **56/56** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **28/28** |
| `node --test test/director-ia-*.test.js` | **933/933** |
| `git diff --check` | clean |

Paridad obligatoria (mismo fixture / planta / rango / canal): engine, adapter HTTP y pack de Director IA coinciden en `range_start`, `range_end`, fechas, `venta_ton` por día, top-6, slope OLS y `n` observaciones.

---

## Límites (READY_WITH_LIMITS, no reabiertos)

- Comments de gráfica siguen solo en el wrapper HTTP del dashboard. No hay paridad de comments en chat.
- Sin perfil longitudinal 3M del cliente.
- Frontend no consume metadata OLS del backend; el renderer sigue igual. Paridad OLS se prueba en JS.
- Inventario `docs/director-ia/` no se toca (sync documental es la NEXT_TASK).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001`

STOP.
