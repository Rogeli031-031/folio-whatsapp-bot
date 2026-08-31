# SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001
outcome: DONE
current_task_status: DONE_PENDING_REVIEW
validation_level: LOCAL / TESTED / DONE_PENDING_REVIEW
production_pass: NOT_YET_PROVEN
PRODUCTION_PASS: NOT_YET_PROVEN
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

---

## HUMAN REVIEW — PRODUCTION REGRESSION

Corrección dentro de la misma tarea. `status` permanece `DONE_PENDING_REVIEW`. No se abrió otra tarea.

### Respuesta de producción observada

Corte 31 de agosto de 2026, «¿Cómo vamos?». Magnitudes Clave mostró:

- Venta Actual
- Forecast venta
- Descuento (Forecast)
- Utilidad Operativa (Forecast)
- Resultado Final (Forecast)

y **omitió**:

- IGF almacenado
- IGF descuento almacenado

Después apareció COMMERCIAL_MOVERS con 6 CASA + 6 COMISIONISTA. Comentarios se verbalizaron entre paréntesis (p. ej. «disminuyó … (falta de pipas)»), forma que parece causal.

### Campos que desaparecieron

IGF almacenado (FORECAST_STORED `venta_ton`) e IGF descuento almacenado (FORECAST_STORED `com_desc_kg`). No desaparecieron del pack ni de la fuente.

### Trazado físico

| Paso | Resultado | Clasificación |
|---|---|---|
| A. IGF almacenado aguas arriba | `buildExecutiveStatusPack` sigue leyendo `igf.compromiso_lines` / `igfCompositionLine(..., "venta_ton")` (~1148–1163). No se tocó el loader IGF ni el pack Forecast. | PROVEN |
| B. IGF descuento almacenado aguas arriba | Mismo pack, `igfCompositionLine(..., "com_desc_kg")` (~1165–1186). | PROVEN |
| C. Llegan al Estado Ejecutivo | Ambos se `items.push` como MAGNITUDE `FORECAST_STORED` incondicionalmente, con o sin COMMERCIAL_MOVERS. | PROVEN |
| D. Llegan a slots | `included_slots` incluye MAGNITUDE si cualquier magnitud está AVAILABLE. COMMERCIAL_MOVERS no filtra MAGNITUDE. | PROVEN |
| E. Llegan al prompt final | `formatPackForPrompt` imprime `item.summary` y `venta_ton` / `com_desc_kg` de cada MAGNITUDE. | PROVEN |
| F. El LLM los recibe y los omite | La respuesta de producción escribió Magnitudes **completas** (5 líneas) **sin** stored, y **después** Tendencias + 12 movers. Truncamiento por `max_tokens: 1000` cortaría el **final**, no el medio de Magnitudes. La omisión es de **selección**. | PROVEN |
| G. Qué cambió COMMERCIAL_MOVERS | 1) Slot REQUIRED con dump de hasta 12 movers en el prompt. 2) Instrucción nueva: incluir COMMERCIAL_MOVERS. 3) Foco de «cómo vamos» **exigía** Descuento (Forecast) y **no** exigía IGF stored. 4) «no hagas dump / Selecciona por materialidad / breve». 5) PRECEDENCIA KPI: «FORECAST_STORED no los pisa» sin decir que **coexiste**. | PROVEN |

No hay código que borre IGF stored al añadir movers. No se reconstruyó ni se perdió la fuente.

### Causa raíz PROVEN

**Composición / preservación del prompt**, no pérdida de dato ni de Forecast.

El pack y el prompt **sí** contienen IGF stored. El contrato de foco de «¿Cómo vamos?» mandaba incluir Descuento (Forecast) y COMMERCIAL_MOVERS, y **no** mandaba conservar FORECAST_STORED. El LLM eligió las líneas mandatorias y omitió las stored. COMMERCIAL_MOVERS agravó la presión de selección (bloque REQUIRED + 12 líneas + «no dump»).

Mecanismo responsable:

- `lib/director-ia-conversational-executive-layer.js` `executiveQuestionFocusLines` (foco de «cómo vamos» sin garantía stored).
- `formatPackForPrompt` (PRECEDENCIA sin coexistencia explícita; dump verbal de todos los movers).
- `formatCommercialMoversSummary` / `formatPackForPrompt` COMMERCIAL_MOVERS (proyección 6+6).

No es `buildAuthoritativeForecastRunPack`, ni PROM, ni `computeIgfForecastMiniPayload`, ni Dashboard.

### Corrección mínima aplicada

1. Garantía de foco: si FORECAST_STORED `venta_ton` / `com_desc_kg` están AVAILABLE, el prompt **exige** «IGF almacenado» e «IGF descuento almacenado» en Magnitudes Clave. Coexisten con Forecast. No se omiten por COMMERCIAL_MOVERS.
2. PRECEDENCIA: FORECAST_STORED no pisa Forecast **y** cuando AVAILABLE **coexiste**.
3. Compactación **solo verbal** de COMMERCIAL_MOVERS: 2 negativos + 2 positivos por canal, en el orden ya rankeado del motor. Payload conserva Top 6. El engine no se tocó.
4. Comentario: hecho cuantitativo en una frase; `Comentario registrado: «…»`; «El comentario no es la causa». Prohibido el paréntesis causal.

### Por qué no modifica Forecast

No se editó el run pack, mini payload, PROM, cutoff, bootstrap ni follow-ups. Las cifras stored siguen saliendo de `assembled.sources.igf`.

### Por qué no modifica Dashboard

No se tocó gráfica, 1M/3M, endpoints ni UI. `commercial-trend-engine.js` intacto.

`DASHBOARD_BEHAVIOR_CHANGED = NO`

### Compactación de COMMERCIAL_MOVERS

Sí, solo presentación del Estado Ejecutivo: `projectChannelMoversVerbal` (2+2 por canal). Preguntas directas siguen con el conjunto del motor.

### Tests nuevos/modificados

- `test/director-ia-commercial-movers-additive.test.js`: bloque «HUMAN REVIEW — preservación…» (5 tests). Fixtures distintos a 1261 / 1491.5 / 1536.5405.
- Ajustes de aserción al nuevo wording de movers/comentarios.

### Suite final real

- Focales movers: 18/18
- Batch forecast + CEL + trend + golden + continuity + plant diagnosis + M11: 221/221
- `node --test test/director-ia-*.test.js`: **1301/1301 pass, 0 fail**

`PRODUCTION_PASS = NOT_YET_PROVEN`

### Limitaciones restantes

- La respuesta final sigue siendo prosa del LLM; la garantía local es pack+prompt+contrato de foco, no un post-procesador que reinserte líneas.
- `max_tokens: 1000` no se cambió (la omisión observada no fue corte de cola).
- 1M/3M UI no se transporta.
- Validación visual de producción pendiente del HUMAN_APPROVER.
