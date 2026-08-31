# SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001
outcome: DONE
current_task_status: DONE_PENDING_REVIEW
validation_level: LOCAL / TESTED / DONE_PENDING_REVIEW
production_pass: NOT_CLAIMED
DASHBOARD_BEHAVIOR_CHANGED: NO
ui_1m_3m_transport: NOT_IMPLEMENTED
git: none
sql: none
secrets_check: none
```

## Cambio realizado

Extensión **aditiva** de Director IA:

1. El Estado Ejecutivo de «¿Cómo vamos?» incluye un slot nuevo `COMMERCIAL_MOVERS` («Movimientos comerciales relevantes») **después de TREND y antes de RISKS**. `DRIVERS` (`arr.dicf_cliente_mes`) permanece intacto.
2. Ese slot reutiliza `top_movers` del motor `lib/commercial-trend-engine.js` ya cargado (30d, CASA y COMISIONISTA por separado). No hay segundo cálculo de delta.
3. Preguntas inequívocas de movers (disminuyeron / dejó de comprar / aumentó / nuevos / tendencia negativa / comentarios del conjunto) entran a `commercial_trend`. Bitácora, DICF mensual y Action Register no sustituyen el Δ venta.
4. Comentarios se adjuntan como **declaraciones registradas** (`arr.cliente_comentarios`, 2 más recientes por nombre/planta, misma semántica que venta-serie). No son causa. Un comentario contradictorio no cambia el hecho cuantitativo.

## Evidencia de que fue aditivo

- `ANSWER_HIERARCHY` inserta `COMMERCIAL_MOVERS` entre `TREND` y `TARGET_COMMITMENT`. No se eliminó ni reordenó Situación, Magnitudes, Tendencias, DRIVERS, Riesgos, Ejecución ni Próxima Decisión.
- `selectTopMovers` sigue solo en `lib/commercial-trend-engine.js`.
- Forecast / pack autoritativo / cutoff / bootstrap / follow-ups / PROM / IGF / ARR / Excel / Dashboard no se tocaron.
- Semántica del Estado Ejecutivo permanece 30d trailing. No se transporta selector UI 1M/3M ni canal de la gráfica.

## Routing antes / después

| Pregunta | Antes | Después |
|---|---|---|
| «¿Cómo vamos?» | CEL Estado Ejecutivo | Igual + slot movers |
| «¿Qué clientes disminuyeron?» | `commercial_state` (DICF mes) | `commercial_trend` |
| «¿Quién dejó de comprar?» | `plant_diagnosis` (regla singular) | `commercial_trend` |
| «¿Qué clientes dejaron de comprar?» | `commercial_state` | `commercial_trend` |
| «¿Quién aumentó?» / «¿Qué clientes son nuevos?» | `commercial_state` | `commercial_trend` |
| «tendencia negativa + comentarios» | `unknown` → inherit `plant_diagnosis` o `client_analysis` | `commercial_trend` |
| «¿Por qué dejó de comprar Arturo?» | `plant_diagnosis` | `plant_diagnosis` (conservado) |
| «¿Qué comentarios tiene Tortillería Erick?» | `client_profile` | `client_profile` (no secuestrado) |

El planner no elimina `commercial_state`. Solo las preguntas inequívocas de Δ venta ganan `commercial_trend` primero. La regla de comentarios+clientes cede si `isCommercialTrendQuestion` es true.

## Fuente de top movers

`lib/commercial-trend-engine.js` → `selectTopMovers` / `clientes_top` → `loadCommercialTrendForChat` → `channels.{casa,comisionista}.top_movers`.

Clasificación del motor (sin redefinir): `perdido` / `disminucion` / `aumento` / `nuevo`.
Verbalización: Dejó de comprar / Disminuyó / Aumentó / Nuevo.

## Fuente de comentarios

`lib/cliente-comentarios.js` `loadRecentCommentsByClienteNombres` — mismo SELECT que `GET /api/arr/venta-serie` (últimos 2 por `lower(trim(cliente_nombre))` + plantas equivalentes). No filtrados por la ventana del delta. `server.js` no se modificó.

## Confirmación de no duplicación

- No se reimplementó delta ni ranking.
- No se creó un segundo umbral de materialidad.
- Comentarios: helper extraído con la semántica existente; Dashboard no cambia.

## Archivos modificados

- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-commercial-trend.js`
- `lib/director-ia-planner.js`
- `lib/cliente-comentarios.js`
- `test/director-ia-commercial-movers-additive.test.js` (nuevo)
- `test/director-ia-conversational-continuity.test.js`
- `test/director-ia-plant-diagnosis.test.js`
- `test/director-ia-m11-commercial-dossier.test.js`
- `scripts/test-director-ia-planner.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001.md`

## Archivos no tocados

- `docs/director-ia/`
- Forecast / authoritative run pack / PROM / IGF / ARR / Excel
- `frontend-dashboard/` (gráfica, selector 1M/3M, chat-request)
- `server.js` / endpoints Dashboard
- `lib/commercial-trend-engine.js`

## Pruebas ejecutadas

| Suite | Resultado |
|---|---|
| `test/director-ia-commercial-movers-additive.test.js` | 13/13 |
| `test/director-ia-commercial-trend.test.js` | pass |
| `test/director-ia-conversational-executive-status.test.js` | pass |
| forecast / run pack / follow-up / bootstrap / Golden Set (batch 196) | 196/196 |
| `node --test test/director-ia-*.test.js` | **1296/1296 pass, 0 fail** |

No se afirma PASS de producción.

## Regresiones verificadas

- Golden Set Q1–Q4.
- Tendencias CASA/COMISIONISTA independientes.
- Magnitudes Forecast y follow-up «¿Y el descuento?».
- Bootstrap directo con `upload_day`.
- `DRIVERS` sigue `arr.dicf_cliente_mes`.
- «¿Por qué dejó de comprar Arturo?» sigue `plant_diagnosis`.

## Limitaciones conocidas

- Ventana del Estado Ejecutivo = 30d trailing anclado a `MAX(fecha)`, no el toggle 1M/3M de la UI.
- Comentarios no están ligados al periodo del delta (igual que la gráfica).
- Listas DICF (`commercial_state`) siguen existiendo para otras rutas; las preguntas de movers ya no las usan como primaria.
- Producción no validada.

## Contratos consultados

- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-TREND-WINDOW-PARITY-AUDIT-001.md`
- `docs/dev-loop/LOOP_PROTOCOL.md`
- `docs/dev-loop/CURRENT_TASK.md`

Contratos en `docs/director-ia/` no modificados.

## Desvíos

- Rama de trabajo: `main` (desvío vs LOOP_PROTOCOL §8.1). No commit / no push / no merge.
- `scripts/test-director-ia-planner.js` actualizado para no contradecir el routing autorizado.

## next_task_proposed

Ninguna autorizada. Un DONE no abre la siguiente. Transporte UI 1M/3M + canal queda fuera.

## human_decision_needed

- G5: HUMAN_APPROVER CLOSED o REJECTED.
- Validación de producción posterior al deploy (HUMAN_APPROVER).
