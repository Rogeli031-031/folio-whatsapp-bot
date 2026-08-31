# SPRINT1-DIRECTOR-IA-COMMERCIAL-TREND-WINDOW-PARITY-AUDIT-001

tipo: AUDITORÍA ARQUITECTÓNICA Y FUNCIONAL — SOLO LECTURA
outcome: INFORME
DASHBOARD_BEHAVIOR_CHANGED: NO (esperado en cualquier implementación posterior)

```yaml
task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-TREND-WINDOW-PARITY-AUDIT-001
outcome: AUDIT_ONLY
current_task_untouched: true
current_task_id: SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-001
current_task_status: DONE_PENDING_REVIEW
loop_gate: "Esta auditoría no abre CURRENT_TASK ni autoriza implementación."
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-TREND-WINDOW-PARITY-AUDIT-001.md
files_not_touched:
  - código de producto
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/
  - authoritative forecast run pack
  - PROM / IGF / ARR / Excel
  - gráfica ArrVentaGraficaModal
git: none
sql: none
secrets_check: none
```

No se implementó. No se rediseñó el Estado Ejecutivo. Forecast/PROM/cutoff/transporte/bootstrap quedan fuera.

Clasificación de afirmaciones: **PROVEN** | **LIKELY** | **NOT_PROVEN** | **BLOCKED**.

---

## A. Resumen ejecutivo

Hay **dos huecos distintos**. Ninguno es un fallo del Estado Ejecutivo de magnitudes FORECAST.

**Hueco 1 — Estado Ejecutivo (aditivo).**
Tras Tendencias (CASA↓ / Comisionista↑) el compositor salta a Riesgos (acciones vencidas). El pack ya tiene un slot `DRIVERS`, pero **no** es la gráfica «Top clientes · Δ venta»: es `commercial_materiality` de `arr.dicf_cliente_mes` (mes calendario cacheado). El LLM además recibe «No empieces por clientes ni por materialidad». Por eso no aparece «quién mueve la tendencia». **PROVEN.**

**Hueco 2 — Pregunta directa observada.**
«¿Qué clientes tienen una tendencia negativa en ventas? ¿y qué comentarios tienen?» **no** entra a `commercial_trend` ni a `commercial_state`. El planner queda `unknown`. Si el hilo viene de «¿Cómo vamos?» (parent `plant_diagnosis`), hereda diagnóstico de planta + bitácora/DICF/AR agrupados por **3 meses anclados a la última sesión de bitácora**, no a hoy ni a la ventana de la gráfica. Julio/junio/mayo y la omisión de agosto encajan con ancla = última bitácora en julio. **PROVEN** el routing; **LIKELY** la ancla julio (hace falta `MAX(fecha)` de producción).

La fuente autoritativa de la gráfica **ya existe** y Director IA **ya la consume** en `commercial_trend` (sin comentarios). No hay que inventar un segundo motor de delta.

Contrato de paridad propuesto (análogo a FORECAST):

```
MISMA_PLANTA + MISMO_CANAL + MISMA_VENTANA + MISMO_MOTOR
= MISMOS_CLIENTES_Y_DELTAS
```

Motor: `lib/commercial-trend-engine.js`. Comentarios: enriquecimiento posterior, no causa.

---

## B. Reproducción del fallo observado

Pregunta:

«¿Qué clientes tienen una tendencia negativa en ventas? ¿y qué comentarios tienen?»

| Detector | Resultado | Evidencia |
|---|---|---|
| `isCommercialTrendQuestion` | false | Exige `tendencia` **y** (canal CASA/COMISIONISTA **o** rango «último mes / 3 meses / 30d / 90d» **o** «venimos»). Solo «tendencia» no basta. `lib/director-ia-commercial-trend.js` `isCommercialTrendQuestion` ~80–92. **PROVEN** |
| `isCommercialStateListQuestion` | false | Requiere dejaron / disminuyeron / aumentaron / nuevos. «tendencia negativa» no mapea. `lib/director-ia-commercial-state.js` ~60–117. **PROVEN** |
| `isExecutiveStatusQuestion` | false | Sin cue «cómo vamos» / situación. **PROVEN** |
| `planDirectorIaQuestion` | `unknown` / `no_rule_matched` | No hay regla para «clientes + tendencia negativa + comentarios». `lib/director-ia-planner.js` ~619–622. **PROVEN** |

Tras «¿Cómo vamos?», CEL deja `parent_intent=plant_diagnosis`. `askDirectorIa` hace `inheritParentIntent`. **LIKELY** en producción (flujo típico; no hay log de ese turno).

Esa ruta carga AR + DICF + bitácora + ARR + IGF + commercial_state y, si hay bitácora+DICF/AR, `shouldUseMonthlyIntegratedChat` es true porque `isNarrativeQuestion` coincide con `\bclientes?\b` (`NARRATIVE_SIGNAL_RE`, `lib/director-ia-chat.js` ~399–400, ~1210–1227). El prompt pide **Resumen [Mes Año]** de los últimos 3 meses. **PROVEN.**

No usó `GET /api/arr/venta-serie` ni `loadCommercialTrend`. **PROVEN.**

---

## C. Traza UI completa (gráfica)

```
ArrVentaGraficaModal
  state: range default "1m", canal default "casa"
  → fetchArrVentaSerie(token, { empresa, range, canal })
  → GET /api/arr/venta-serie?empresa=&range=&canal=
  → commercialTrendEngine.loadCommercialTrend
  → toVentaSerieHttpBody
  → server adjunta comentarios (últimos 2 por nombre)
  → UI: serie + Top 6 Δ venta + Últimos comentarios
```

Evidencia: `frontend-dashboard/components/ArrVentaGraficaModal.tsx` ~136–169, ~467–475; `frontend-dashboard/lib/api.ts` `fetchArrVentaSerie` ~1602–1614; `server.js` `GET /api/arr/venta-serie` ~15067–15164; `lib/commercial-trend-engine.js`.

**Director IA no está en esta traza.** El modal de chat (Acciones) solo transporta `planta` + `upload_day`. No `range`, no `canal`, no `fecha_desde`/`fecha_hasta`. `DirectorIaChatPanel.tsx` ~83–88; `chat-request.js` `buildDirectorIaChatBody`. **PROVEN.**

---

## D. Fuente autoritativa de Δ venta

**Motor único:** `lib/commercial-trend-engine.js`.

| Campo | Origen |
|---|---|
| cliente | `TRIM(v.cliente_norm)` de `arr.ventas_diarias_cliente` (`queryClientTons` ~479–495) |
| Actual | SUM(kg)/1000 en `[fecha_desde, fecha_hasta]` |
| Prev | misma query en `[fecha_prev_desde, fecha_prev_hasta]` |
| Δ | `actual − previo`, `selectTopMovers` ~213–245 |
| tipo | nuevo / perdido / disminucion / aumento (mismas reglas que `tipoLabel` de la UI) |
| canal | filtro SQL `canalSqlFor`: CASA = NOT LIKE '%comisionista%'; COMISIONISTA = LIKE '%comisionista%'; join `arr.cliente_categoria_mes` (~72–90, ~479–492) |
| periodo | trailing anclado a `MAX(fecha)` de ventas de esa planta (`queryFechaBounds` + `resolveRangeWindow` ~155–187, ~521–537) |
| ranking | `sort` por `abs(delta_ton)`, `slice(0, 6)` |

Tablas: `arr.ventas_diarias_cliente`, `arr.cliente_categoria_mes`, `arr.descuentos_diarios_cliente` (serie; el top no usa descuento).

**No** es `computeDicf`, **no** es `arr.dicf_cliente_mes`, **no** es Delta Venta modal A/B, **no** es M9.

---

## E. Semántica de clasificación comercial

**Gráfica / engine** (`selectTopMovers`):

| tipo | regla |
|---|---|
| nuevo | prev ≤ 0 y actual > 0 |
| perdido | prev > 0 y actual ≤ 0 → UI «Dejó de comprar» |
| disminucion | delta < 0 (ambos > 0) |
| aumento | delta > 0 |

Umbral de inclusión: `|delta| >= 0.001` t. Materialidad operativa de la gráfica = **top 6 por |Δ|**, no share, no k de Constitución. **PROVEN.**

**Otra semántica (no mezclar):** `arr.dicf_cliente_mes` / DICF / `commercial_state` / `buildCommercialMateriality` (`lib/director-ia-plant-diagnosis.js` ~620–715): mes **calendario**, `kg_mes_real`, top 5 dejaron + top 5 disminuyeron, canal/subcanal en la fila. Periodo distinto, motor distinto. **PROVEN.**

Reutilizar F (gráfica) para el bloque nuevo. No crear un tercer ranking.

---

## F. Semántica 1 mes (1M)

**No es el mes calendario actual.**

`RANGE_DAYS["1m"] = 30`. `resolveRangeWindow`: `start = MAX(fecha) − 29 días`; `end = MAX(fecha)`. Span = 30 días (inclusivo).

Prev: los 30 días **inmediatamente anteriores** a `fecha_desde`.

Ancla: `MAX(fecha)` de `arr.ventas_diarias_cliente` de esa planta, **no** `upload_day` del chat ni corte IGF. Si la última venta es 2026-08-31, 1M ≈ 2026-08-02→08-31 vs 2026-07-03→08-01. Si es 08-27, la ventana se corre. Agosto incompleto entra como días con venta; día sin fila ≠ 0 (`assemblePoints` omite ceros). **PROVEN.**

---

## G. Semántica 3 meses (3M)

**No son 3 meses calendario.**

`3m` = 90 días trailing: `MAX(fecha) − 89` hasta `MAX(fecha)`. Prev = 90 días previos de igual span.

Distinto de `client_profile` («3 meses calendario CDMX ≠ 90d trailing», `lib/director-ia-client-profile.js` ~45) y de bitácora (3 meses calendario desde última sesión). **PROVEN.**

---

## H. CASA vs COMISIONISTA

La gráfica recalcula **toda** la serie y el top-6 al cambiar `canal` (`useEffect` deps `[token, empresa, range, canal]`). Rankings **cambian** por canal. **PROVEN.**

Director IA `commercial_trend`: dos llamadas al motor, mismo rango, `channel=casa|comisionista|both`. Comentarios de gráfica **excluidos** (`comments_included: false`, `lib/director-ia-commercial-trend.js` ~253–259, ~320).

Comentarios: ligados a `planta_id` + `lower(trim(cliente_nombre))`, **sin canal** (`server.js` ~15121–15133). El mismo comentario puede verse en CASA o COMISIONISTA si el nombre coincide. **PROVEN.**

Director IA **puede** atribuir movers al canal de la corrida del motor. No debe mezclar listas. Estado Ejecutivo hoy solo verbaliza **dirección OLS**, no movers.

---

## I. Fuente y semántica de comentarios

UI: «Últimos comentarios» / «Delta Ingreso Cliente Forecast · 2 más recientes» (`ArrVentaGraficaModal.tsx` ~473–475).

Tabla: `arr.cliente_comentarios`.
Helper: `lib/cliente-comentarios.js`.
Adjuntados **solo** en `GET /api/arr/venta-serie` **después** del motor (`server.js` ~15100–15157).
Orden: `created_at DESC, id DESC`, `rn <= 2`.
Filtro: planta equivalente + nombre. **Sin** filtro por `fecha_desde`/`fecha_hasta` del delta.

Un comentario puede ser de **otro mes** que el delta. El caso GRUPO MOVE «Dejó de comprar −161 t» + «COMPRA DIARIAMENTE» es coherente con el código: el comentario no está acotado al periodo. **PROVEN.**

Director IA `commercial_trend` **no** carga esos comentarios. M11 / perfil / daily deviation sí leen `arr.cliente_comentarios` por `cliente_key`, también sin amarrar al trailing 30/90. **PROVEN.**

Trato correcto: HECHO (delta/tipo) ≠ REGISTRADO (comentario) ≠ CAUSA. Ya escrito en el addendum de tendencia: «Mover != causa», «Comments != causa».

---

## J. Freshness / por qué desapareció agosto

**No** es «agosto no existe en ARR». La gráfica de agosto lo demuestra.

Bitácora para chat:

1. `loadBitacoraForChat` (`lib/director-ia-bitacora.js` ~361–387): ventana de 3 meses desde `MAX(COALESCE(fecha, created_at))` de **esa planta**, no desde hoy.
2. `filterBitacoraToMonthWindow` / `formatBitacoraMonthlyBlocks` (`lib/director-ia-chat.js` ~754–788, ~919–924): ancla = última sesión; keys = ese mes y los 2 anteriores.

Si la última bitácora de Acapulco es julio 2026 → headings Julio, Junio, Mayo. Agosto no entra. El LLM recibe «Resumen [Mes Año]» de esos meses (`BITACORA_MONTHLY_RESPONSE_RULE` ~454–459).

**PROVEN** el mecanismo. **LIKELY** ancla julio en ese turno. **BLOCKED** confirmar `MAX(fecha)` de producción (esta auditoría no consulta la DB).

No hay exclusión explícita del mes corriente. Agosto falta porque **no está en la ventana anclada**, no porque el corte IGF lo quite.

---

## K. Routing actual de Director IA

```
pregunta observada
  → no CEL, no commercial_trend, no commercial_state
  → planner unknown
  → [LIKELY] inherit plant_diagnosis
  → loadPlantDiagnosisForChat (AR, DICF, bitácora, ARR, IGF, CS)
  → monthly_integrated (clientes ∈ NARRATIVE)
  → OpenAI: Resumen Jul/Jun/May + AR/DICF
```

`commercial_trend` **sí** existe para «cómo vamos en CASA los últimos 3 meses» y ya imprime top movers (sin comments). La pregunta observada no activa ese intent.

Estado Ejecutivo «¿Cómo vamos?»: CEL + `loadCommercialTrendForChat({ channel: "both", range_days: 30, compare: true })` **hardcodeado** (`lib/director-ia-chat.js` ~3058–3061). Tendencia = 30d trailing, no 1M/3M de la UI abierta. **PROVEN.**

---

## L. Estado del contexto transportado

| Dato | ¿Llega al POST /chat? |
|---|---|
| planta_id / planta_nombre | Sí |
| upload_day (IGF) | Sí, si vino de Acciones |
| range 1m/3m de la gráfica | **No** |
| canal CASA/COMISIONISTA de la gráfica | **No** |
| fecha_desde / fecha_hasta | **No** |
| conversation_state.active_range_days / active_channel | Solo **después** de un turno `commercial_trend` |

Se pierde entre el modal de la gráfica y el modal del chat: no hay props ni query para `range`/`canal`. **PROVEN.**

`conversation_state` ya tiene slots `active_range_days` y `active_channel` (`lib/director-ia-conversation-state.js` empty state + sanitize). Sirven al inherit de `commercial_trend`, no al Estado Ejecutivo ni a la gráfica. **PROVEN.**

---

## M. Helpers/tools reutilizables

| Pieza | Uso |
|---|---|
| `commercial-trend-engine.loadCommercialTrend` | Misma verdad que la gráfica (sin comments) |
| `loadCommercialTrendForChat` | Chat `commercial_trend` + CEL tendencia 30d |
| `selectTopMovers` | Top 6 \|Δ\| |
| `GET /api/arr/venta-serie` | HTTP Dashboard + comments |
| `arr.cliente_comentarios` | Enriquecimiento |
| `buildCommercialMateriality` | **Otra** semántica (no reutilizar para el bloque gráfico) |
| `loadCommercialStateForChat` / DICF | Listas mes calendario |
| M11 expediente | Cliente único + comments + acciones; sin causalidad |

Tool catalog: `get_commercial_trend` / motor compartido (`lib/director-ia-tools.js` ~444).

---

## N. Relación con commercial_state

`commercial_state` = listas DICF / `arr.dicf_cliente_mes` (cache mes). No es la gráfica trailing. No debe sustituir Δ venta de venta-serie. CEL `DRIVERS` usa esta fuente. **PROVEN.**

---

## O. Relación con DICF

DICF = acciones / estado comercial de ingreso forecast por cliente-mes. Enriquecimiento: «¿tiene acción?» vía `cliente_key`. No es el ranking de la gráfica. **PROVEN.**

---

## P. Relación con Action Register

AR = compromisos / vencidas. Slot CEL `RISKS` / `EXECUTION`. «17 acciones vencidas» no explica CASA↓. Ya dice «Eso no prueba causa comercial» (`lib/director-ia-conversational-executive-layer.js` ~1237–1240). **PROVEN.**

---

## Q. Relación con Bitácora

Bitácora = lo discutido. Ventana 3 meses desde última sesión. No es Δ venta. No debe sustituir la gráfica. **PROVEN.**

---

## R. Riesgo de causalidad falsa

Protecciones ya escritas:

- commercial_trend: «Mover != causa», «Comments != causa» (~32–35, ~320).
- CEL: Tendencia ≠ venta ≠ forecast ≠ contribución ≠ causa (~1411).
- M11: sin causalidad.
- Comentarios no filtrados por periodo del delta.

El caso MOVE es el riesgo canónico: contradicción comentario vs tipo. Director IA debe mostrar ambos y **no** afirmar causa. **PROVEN** el riesgo; el wording de Estado Ejecutivo aún no aplica esa regla a movers porque **no los verbaliza**.

---

## S. Propuesta de paridad

```
MISMA_PLANTA
+ MISMO_CANAL          (casa | comisionista, no fusionar)
+ MISMA_VENTANA        (token 1m/3m = 30/90 trailing desde MAX(fecha))
+ MISMO_MOTOR          (commercial-trend-engine)
= MISMOS clientes, Prev, Actual, Δ, tipo
```

Comentarios: **misma** query de venta-serie (últimos 2 por nombre/planta), etiquetados como REGISTRADO, no como periodo del delta.

No duplicar `selectTopMovers`. No usar DICF como fallback de movers.

---

## T. Propuesta del bloque «Movimientos comerciales relevantes»

**Solo propuesta.** Entre Tendencias y Riesgos. No borrar magnitudes ni tendencias.

Jerarquía CEL actual: `SITUATION → MAGNITUDE → TREND → TARGET → DRIVERS → RISKS → …`
El slot `DRIVERS` hoy es DICF-cache. Opciones posteriores (no decidir aquí): (1) nuevo slot `COMMERCIAL_MOVERS` alimentado por `top_movers` del **mismo** `loadCommercialTrend` que ya corre en «¿Cómo vamos?»; (2) no reutilizar `DRIVERS` para no mezclar semánticas.

Contenido mínimo por canal (máx. 3 por lado, o top-6 global partido por signo):

- cliente, tipo, Δ t; opcional Prev/Actual;
- comentario más reciente si existe, con fecha; si no: «sin comentario reciente»;
- no dump de 6+6 con párrafos largos.

CASA y Comisionista **separados**. Positivos/negativos: en Estado Ejecutivo priorizar el lado que **explica la dirección OLS** de ese canal (CASA↓ → caídas/perdidos; Comisionista↑ → aumentos/nuevos), 1–2 del lado contrario si son materiales. **Propuesta**, no umbral nuevo: reutilizar top-6 \|Δ\| ya calculado.

Preguntas directas: handler/intent que llame el motor (como `commercial_trend`) + comments on-demand, sin plant_diagnosis.

---

## U. Precedencia temporal propuesta (evaluada, no adoptada)

La analogía FORECAST (explícito → body → last-upload → UNAVAILABLE) encaja, con matices:

1. **Periodo explícito en la pregunta** («en agosto», «este mes», «últimos 3 meses»).
   - «últimos 3 meses» / «90 días» → token `3m` (90d trailing). Ya existe en `resolveCommercialTrendSlots`.
   - «este mes» / «agosto» → hoy `period_kind=calendar_month` (otra fuente ARR, **sin** OLS ni top-6 de venta-serie). **No** forzar 1M=agosto. Si se pide paridad gráfica, «agosto» es **otro** contrato (calendario) y hay que decirlo o aclarar. **PROVEN** la bifurcación.
2. **Ventana UI transportada** (`range` + `canal`) — **hoy no existe**. Sería el análogo de `upload_day`. Correcto **si** se implementa el transporte. Hasta entonces no puede ganar.
3. **conversation_state** `active_range_days` / `active_channel` si el padre es `commercial_trend`. Ya existe. No aplicar a inherit de `plant_diagnosis`.
4. **Default canónico documentado** para Estado Ejecutivo: el código **ya** usa 30d + both. Conservarlo evita cambiar la tendencia validada. Documentar: «Tendencias del Estado Ejecutivo = 1M/30d trailing, no necesariamente el toggle 3M de la gráfica».
5. **UNAVAILABLE / aclarar** si piden «la ventana de la gráfica» y no hay transporte.

Validación: **sí** como contrato futuro; **no** adoptar (2) hasta que la UI lo envíe. No inventar 1M = mes calendario.

---

## V. Continuidad / follow-ups

`commercial_trend` ya es inheritable y conserva `active_range_days` / `active_channel` (CASA 90d → Comisionista mismo rango; tests en `test/director-ia-commercial-trend.test.js`).

Falta: persistir `active_entity` del mover; follow-up «¿y los comentarios?» / «¿tiene acción?» sin cambiar planta/canal/ventana; no heredar `plant_diagnosis` para «clientes + tendencia».

Cliente nombrado («Tortillería Erick») → M11 / `client_profile`, no relajar a bitácora mensual.

---

## W. Matriz de tests (implementación posterior)

Los 30 del pedido, más:

31. 1M ≠ mes calendario (30d desde MAX(fecha)).
32. 3M = 90d, no 3 YYYY-MM.
33. Comentario fuera de ventana no se afirma como del periodo.
34. «tendencia negativa + comentarios» no hereda plant_diagnosis si hay identidad de motor.
35. CEL no pierde Forecast / Actual / util / resultado / CASA / Comisionista.
36. `DRIVERS` DICF no se hace pasar por top-6 de la gráfica.

---

## X. Archivos que eventualmente habría que modificar

**Mínimo probable (no tocar ahora):**

- `lib/director-ia-conversational-executive-layer.js` — slot aditivo movers (sin reescribir magnitudes).
- `lib/director-ia-commercial-trend.js` / `lib/director-ia-chat.js` — routing de preguntas de movers + comments; Estado Ejecutivo ya carga el trend 30d.
- `lib/director-ia-planner.js` — no dejar `unknown` → inherit plant_diagnosis.
- Tests nuevos.

**Transporte UI (solo si se aprueba precedencia 2):**

- `DirectorIaChatPanel` / `chat-request.js` / modal Acciones — `range`, `canal`.
- **No** modificar `ArrVentaGraficaModal` ni el motor.

**No tocar:** pack FORECAST, PROM, IGF, Excel, `computeIgfForecastMiniPayload`, `selectTopMovers` (salvo reutilizar).

Comments: reutilizar el SELECT de `server.js` ~15121 o extraerlo a `cliente-comentarios.js` **sin** cambiar la gráfica.

---

## Y. Riesgos residuales

- Mezclar DICF-mes con trailing 30/90.
- Tratar 1M como «agosto».
- Comentario contradictorio como causa.
- Dump de 12 clientes.
- Hardcode 30d del Estado Ejecutivo vs 3M abierto en UI (documentar, no silenciar).
- Ancla bitácora ≠ hoy (agosto «desaparece»).
- Comentario sin canal.
- MAX(fecha) ARR ≠ cutoff IGF.

---

## Z. DASHBOARD_BEHAVIOR_CHANGED esperado

**NO.** Cualquier implementación posterior debe reutilizar el motor y, si acaso, extraer el SELECT de comments. No cambiar la gráfica, el endpoint de serie, PROM ni Forecast.

---

## Preguntas Q1–Q23

**Q1.** `lib/commercial-trend-engine.js` (`selectTopMovers` + `queryClientTons` sobre `arr.ventas_diarias_cliente`), servido por `GET /api/arr/venta-serie`. **PROVEN.**

**Q2.** Sí, vía `loadCommercialTrend` / `commercial_trend` / CEL tendencia. Sin comments. **PROVEN.**

**Q3.** La pregunta no clasifica a `commercial_trend`; hereda (LIKELY) `plant_diagnosis` + bitácora mensual. **PROVEN** + **LIKELY**.

**Q4.** Falta intent/handler de movers+comments y (opcional) transporte range/canal. El motor no falta. **PROVEN.**

**Q5.** 30 días trailing desde MAX(fecha). No mes calendario. **PROVEN.**

**Q6.** 90 días trailing desde MAX(fecha). **PROVEN.**

**Q7.** Ventana actual vs la inmediatamente anterior de la **misma** duración. **PROVEN.**

**Q8.** Query `range` + `canal` solo en `/api/arr/venta-serie`. El chat no lo envía. **PROVEN.**

**Q9.** No. **PROVEN.**

**Q10.** Filtro SQL sobre canal de `cliente_categoria_mes` / venta; UI y engine: `casa` \| `comisionista`. **PROVEN.**

**Q11.** `arr.cliente_comentarios`, 2 más recientes por nombre+planta. **PROVEN.**

**Q12.** Ligados al **cliente**, no al periodo del delta. **PROVEN.**

**Q13.** Prompt monthly_integrated + ventana de 3 meses anclada a la última bitácora. **PROVEN** mecanismo.

**Q14.** Agosto no está en esa ventana si la ancla es julio. **LIKELY** ancla; **PROVEN** código.

**Q15.** Planner `unknown` → inherit `plant_diagnosis` → monthly_integrated. **PROVEN** / **LIKELY** inherit.

**Q16.** Sí: `commercial-trend-engine` + `loadCommercialTrendForChat`. Comments: query de venta-serie. **PROVEN.**

**Q17.** Sí, si se reimplementa delta. No, si se reutiliza el motor. **PROVEN.**

**Q18.** Sí: el Estado Ejecutivo ya llama el trend 30d; los `top_movers` están en el objeto y no se verbalizan. Comments requerirían un attach posterior, sin tocar Dashboard. **PROVEN** movers; comments = trabajo extra acotado.

**Q19.** Mínimo si se quiere paridad con el toggle UI: `range` (`1m`\|`3m`) y `canal`. Planta ya viaja. **PROVEN** la ausencia.

**Q20.** Sí para follow-ups de `commercial_trend` (ya existe). No usar el inherit de `plant_diagnosis` como ventana de gráfica. **PROVEN.**

**Q21.** Primario: motor venta-serie (Δ, tipo, canal, ventana). Enriquecimiento: comments, DICF, AR, bitácora, con linkage. **PROVEN** separación.

**Q22.** Conservar «mover ≠ causa»; mostrar HECHO vs REGISTRADO; no inferir causa del comentario; contradicción MOVE como test. **PROVEN** contratos parciales.

**Q23.** Cambio mínimo posterior: (a) verbalizar `top_movers` del trend **ya cargado** en CEL, por canal, entre Tendencias y Riesgos; (b) rutar «clientes + tendencia/bajaron/aumentaron + comentarios» a `commercial_trend` + attach de comments, sin plant_diagnosis; (c) no tocar Forecast/gráfica; (d) transporte UI solo si se exige paridad con el toggle 1M/3M. **Propuesta; no implementada.**

---

Esta auditoría no autoriza implementación ni la siguiente tarea.

STOP.
