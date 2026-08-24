# Reporte — ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
first_slice: "daily_sales_plus_business_evidence"
first_slice_id: "C"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
default_reference: "B_same_weekday_recent"
intent_proposed: "daily_sales_deviation"
discount_in_first_impl: false
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Daily deviation is not module coverage. M9 remains monthly."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002.md"
  - "sql/arr_forecast_schema.sql"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/arr-load.js"
  - "lib/cliente-comentarios.js"
  - "lib/dicf-acciones.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-DAILY-DEVIATION-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

El first slice mínimo que responde una pregunta ejecutiva real es **C — `daily_sales_plus_business_evidence`**.

Hoy «¿Por qué bajó la venta ayer?» cae en `financial_diagnosis` y recibe IGF/ARR/M9 **mensual**. Las tablas diarias **existen**. M9 las agrega a `YYYY-MM`. Eso es infraestructura, no falta de dato.

El pack del slice C debe entregar cuatro capas **separadas**, sin programar la causa:

1. **Detección:** kg de ayer, referencia B, delta. Siempre «comparado contra X».
2. **Explicación matemática:** clientes (y canal, que sí existe en venta) cuya contribución **reconstruye** el delta de kg.
3. **Evidencia de negocio:** DICF y `arr.cliente_comentarios` solo por `cliente_key`; bitácora solo a grano planta. Comentario ≠ causa.
4. **Hueco:** contribuidores materiales sin evidencia registrada, para que GPT diga qué falta saber.

**Referencia default:** B (promedio de los mismos días de semana recientes, ventana 14 días cerrados). Es la regla ya canónica del forecast ARR. No es el día anterior.

**Descuento/kg:** auditado; **fuera** del IMPL. Fórmula planta = `SUM(monto)/SUM(kg)`. Sin canal en la tabla de descuento. No promediar promedios.

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`.

---

## Ejecución

- Rama: `architecture/director-ia-daily-deviation-readiness-001` (≠ `main`).
- HEAD de partida: `1a6e8bca Merge branch 'audit/director-ia-conversational-product-gap-002'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Transición `AUTHORIZED` → `IN_PROGRESS` solo cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, tests, matriz, contratos, SQL, commit, push, merge.
- G2/G3: **N/A** (runtime-only del chat legado). Detalle en § Contratos.

---

## 1. Inventario físico de fuentes diarias

### Venta — fuente exacta

| Campo | Hecho |
|---|---|
| Tabla | `arr.ventas_diarias_cliente` (`sql/arr_forecast_schema.sql`) |
| Unidad | `kg` (`NUMERIC(18,4)`) |
| Planta | `plant_code` → `public.plantas` vía el mismo `SQL_PROV_MAP` que M9 |
| Cliente | `cliente_norm` |
| Canal | **Sí:** `canal`, `subcanal`. PK = `(plant_code, fecha, cliente_norm, canal, subcanal)` |
| Fecha | `fecha DATE` (calendario, no timestamptz) |
| Producto/SKU | **No existe.** No inventarlo. |

**No usar** `arr.venta_toneladas_diarias_provincia`: es planta-día, `venta_ton INTEGER` redondeado, no descompone cliente/canal.

### Descuento — fuente exacta (auditado; no entra al IMPL)

| Campo | Hecho |
|---|---|
| Monto | `arr.descuentos_diarios_cliente.monto` (siempre ≤ 0 en comentario de DDL) |
| Kg | `arr.ventas_diarias_cliente.kg` del **mismo** `plant_code`+`fecha` (y, a grano cliente, `cliente_norm`) |
| Cliente | **Sí** (`cliente_norm`) |
| Canal | **No** en la tabla de descuento. PK = `(plant_code, fecha, cliente_norm)` |
| Precomputado planta | `arr.descuento_por_kilo_diario_provincia.descuento_por_kg` — **no** es fuente de verdad: no descompone y puede no coincidir con `SUM(monto)/SUM(kg)` |

`arr.cliente_categoria_mes` es catálogo **mensual** cliente→canal. No es el canal del día. Asignar el monto diario a canal con esa tabla o prorratear un monto-cliente entre varias filas de venta **inventaría** un split. First slice descuento, cuando exista: **solo cliente**.

### Dónde M9 se vuelve mensual

`lib/director-ia-m9-deltas.js`:

- `getDeltaVentaClientes` (~145–189): lee `arr.ventas_diarias_cliente` y `GROUP BY year, month, cliente_norm`. **Tira `fecha` y `canal`.**
- `getDeltaDescuentoClientes` (~220–290): `GROUP BY year, month, cliente_norm`; ratio cliente-mes = `monto/kg`.
- Periodos default: dos `YYYY-MM` más recientes con datos (`default_latest_two`).

`lib/director-ia-financial-diagnosis.js` ensambla IGF + ARR snapshot + esos M9. Prompt: «Declara period mismatch» — **no** niega el día pedido.

El bug de producto es este corte, no la ausencia de tablas.

---

## 2. Planner / intent

Hoy (`lib/director-ia-planner.js` ~390–395): `porque` + `bajo` + `venta` → `financial_diagnosis` 0.9. `ayer` no participa.

`delta_discount` exige `cambio|variacion|delta` + `descuento`. «¿Por qué subió el descuento/kg ayer?» **no entra**.

Follow-ups:

- «¿Contra qué…?» / `comparado contra que` → `period_switch` → clarificación fuera de slice.
- «¿Qué clientes explican más?» → `client_analysis` standalone (DICF/listas).
- `^y ayer` → `period_switch`.

**Determinación:** se necesita **intent nuevo** `daily_sales_deviation`. No subintentar `financial_diagnosis`: ese pack es mensual por diseño; mezclar granos es el fallo actual. Detectar **antes** de la regla de caída financiera, cuando haya `ayer|hoy|diario` + venta.

Frases que el IMPL debe resolver (venta):

- «¿Por qué bajó la venta ayer?»
- «¿Contra qué la estás comparando?»
- «¿Qué clientes explican más?»
- «¿Sabemos por qué?»
- «¿Qué falta investigar?»

Monthly `financial_diagnosis` / `delta_sales` / `delta_discount` se preservan si **no** hay grano diario.

---

## 3. Semántica de «ayer»

| Tema | Determinación |
|---|---|
| Timezone | `America/Mexico_City` (negocio). Ya canónico: `FORECAST_BUSINESS_TZ` default, bitácora/AR/DICF/M3. |
| Hoy | `toLocaleDateString("en-CA", { timeZone })`. **No** `getLocalTodayYmd()` del reloj del servidor (UTC puede desalinear el calendario). |
| Ayer | fecha calendario de hoy en esa TZ **menos un día**. Fecha completa `YYYY-MM-DD`. |
| Día incompleto | El producto trata **hoy** como no cerrado (`arr-load` ignora `fecha = hoy`; forecast excluye el día de carga de reales). «Ayer» es el candidato a día cerrado. |
| Medianoche | Usar TZ de negocio, no UTC del host. |
| Sin filas en ayer | `DATA_NOT_FOUND` / día sin registros. **No** convertir a 0. Exponer `last_closed_date` como limitación; **no** sustituir silenciosamente la fecha pedida. |
| Suma kg = 0 con filas | 0 real, distinto de ausencia. |

No hay timezone por planta distinto en el schema. CDMX = calendario de negocio para todas las plantas de este producto.

---

## 4. Referencias A–E

| Id | Significado | Disponibilidad | Fin de semana / festivo | ¿Canónica? | Veredicto |
|---|---|---|---|---|---|
| A día anterior | Secuencial | Misma tabla, `fecha-1` | Lunes vs domingo distorsiona «bajó» | Default `fechaHasta` en un export ARR usa ayer, **reloj local**, no TZ | Fácil y engañosa |
| **B mismo DOW reciente** | Vs martes típico si ayer fue martes | 14 días **cerrados** antes del objetivo; forecast ya hace 2 observaciones por DOW (`suma÷2`) | Absorbe patrón semanal; festivo en el mismo DOW sigue distorsionando | **Sí:** `lib/dashboard-arr-forecast.js` ~1957 | **Default** |
| C promedio diario MTD | Media de días del mes al corte | Fácil | Mezcla lun–dom | Acumulado MTD existe; no es baseline diario comparable | Engañosa para un domingo |
| D rolling N días | Suaviza | Fácil | Igual mezcla DOW | No canónica como «esperado del día» | No |
| E referencia de producto | Forecast mensual / IGF / toneladas provincia | Mensual o grano planta | No aplica al día | Forecast mensual ≠ día | No como delta diario |

**Política default (una):** B.

Texto obligatorio del pack: «comparado contra el promedio de los últimos 2 [día-de-semana] cerrados en la ventana de 14 días, misma regla que el forecast ARR».

- Si hay 1 sola observación: usarla y declarar `reference_observations=1`.
- Si hay 0: referencia `DATA_NOT_FOUND`; **no** afirmar que bajó; **no** caer a A en silencio.

A puede figurar como **hecho secundario etiquetado** («vs día calendario anterior = …») **sin** ser el delta que se descompone. Un solo delta de descomposición: el de B.

---

## 5. Fórmulas (KEEP_DETERMINISTIC)

### Venta (first slice)

```
kg_ayer(planta)     = SUM(kg) WHERE fecha = ayer
kg_ref(planta)      = AVERAGE_d in B of SUM(kg) WHERE fecha = d
delta_kg            = kg_ayer - kg_ref
contrib_cliente     = kg_ayer(cliente) - kg_ref(cliente)
contrib_canal       = kg_ayer(canal) - kg_ref(canal)
```

Universo: outer join; ausente = 0 kg **solo si el día existe como conjunto de filas**. Día sin registros de planta ≠ 0.

**Reconstrucción:** `SUM(contrib_cliente) = delta_kg` y `SUM(contrib_canal) = delta_kg` sobre el mismo universo. Auditable en tests.

Top contribuidores = mayor |contrib| o contrib más negativa si la pregunta es «bajó». Share = contrib / delta cuando delta ≠ 0. Top ≠ causa.

### Descuento/kg (auditado; diferido)

```
R(día) = SUM(monto_descuento) / SUM(kg)
```

Si `SUM(kg)=0`: ratio **indefinido**, no 0. No promediar `monto/kg` de clientes. No usar `descuento_por_kilo_diario_provincia`.

Quién movió el promedio (aditivo, reconstruye `ΔR`):

```
contrib_i = monto_i_ayer / kg_total_ayer - monto_i_ref / kg_total_ref
SUM(contrib_i) = R_ayer - R_ref
```

**Prohibido** rankear por el `monto/kg` propio del cliente. Un cliente con ratio alto y kg irrelevantes no «movió» R.

Mix vs tasa intra-cliente es un desglose posterior; no first slice.

Canal descuento: **no existe** sin inventar.

---

## 6. Evidencia de negocio (capa 3)

Join físico, no por nombre libre (mismo patrón que `plant_diagnosis` / M11):

| Fuente | Join | Ventana razonable | ¿Causa? |
|---|---|---|---|
| `arr.dicf_acciones` | `cliente_key` derivado de planta + canal + subcanal + `cliente_norm` (`buildClienteKey`) | `created_at` / `fecha_compromiso` cercanos al día objetivo; **fechar** cada fila | No. Acción ≠ por qué bajó. Vencida ≠ negligencia. |
| `arr.cliente_comentarios` | `cliente_key` NOT NULL | `created_at` (CDMX) en ventana corta alrededor de ayer; declarar fecha | No. «Competencia» = declaración almacenada. |
| `arr.director_ia_bitacora` | `planta_id` + `fecha`. **Sin** `cliente_key` | Ventana planta, no cliente | Relacionada a planta, no explicación de un cliente |
| Action Register | Sin join cliente fiable | No en first slice diario | No |
| `arr.dicf_cliente_mes` (commercial_state) | Mensual | **Excluir** del pack diario | Mezclaría grano, el mismo error que M9 |

Sin `cliente_key` derivable: cobertura desconocida, no «no hay comentario».

---

## 7. Hueco de información (capa 4)

Determinístico: lista de top contribuidores con `evidence_status`:

- `has_related_comment`
- `has_related_action`
- `unexplained`

GPT redacta: «No encuentro evidencia suficiente que explique este movimiento; falta saber X» (p. ej. motivo comercial del cliente Y que aporta Z% del delta). **No** workflow, **no** `buildGapWhatAnswer` enlatado, **no** pending_work_items diarios en este slice.

---

## 8. Conversación

`INHERITABLE_INTENTS` hoy = `plant_diagnosis` \| `expediente_comercial`. El hilo diario **muere**.

First slice **requiere** continuidad efímera:

- Heredar `daily_sales_deviation`.
- `active_date` (ayer resuelto) en el eco de estado. Requery del pack; no memoria cross-session diaria.
- Nuevos kinds (o reclass): `reference_probe` («¿contra qué…?») **no** es `period_switch`.
- «¿Qué clientes explican más?» **no** es `client_analysis` standalone si hay padre diario.
- «¿Sabemos por qué?» / «¿Qué falta investigar?» → inherit + GPT sobre capas 3–4, no early-return rígido.

`period_switch` (`^y ayer`, semana anterior) sigue **fuera** de este slice.

No ampliar `pending_work_items` a desviación diaria.

---

## 9. Candidatos A/B/C/D — exactamente uno

| Id | Qué cubre | ¿Responde la pregunta ejecutiva? | Riesgo |
|---|---|---|---|
| A `daily_sales_detection_only` | valor, ref, delta | Detecta «bajó vs X»; no el «por qué» ni siquiera matemático | Mínimo y insuficiente |
| B `daily_sales_decomposition` | + top contribuidores | Explica el movimiento en kg; «¿sabemos por qué?» queda vacío o alucinado | Omite el north star de huecos |
| **C `daily_sales_plus_business_evidence`** | + evidencia ligada + unexplained | Sí: las cinco frases del hilo, sin programar causa | Joins `cliente_key` ya existen; bitácora limitada a planta |
| D `sales_and_discount_daily_pack` | venta + descuento/kg | Dos preguntas a la vez | Ratio, sin canal, routing distinto; infla el IMPL |

**Seleccionado: C.**

A no contestaría «por qué». B contestaría solo la capa 2. D mete descuento «por similitud»; la tarea lo prohíbe si sube el riesgo. C es el mínimo que sostiene el hilo listado.

Descuento/kg: camino y fórmula quedan auditados; IMPL **no** los implementa.

---

## 10. Authz y ausencia

Mismo techo que M9/ARR, **sin ampliar**:

- Planta actual + `plantas_permitidas`. Fail-closed. No cross-plant.
- `GA` y `GV`: `SOURCE_RESTRICTED` en el bloque de venta diaria (M9 ya bloquea Delta a ambos).
- `SOURCE_RESTRICTED` ≠ missing (`absence = null`).
- Distinguir: 0 real; null; día sin registros; día incompleto (hoy); `DATA_NOT_FOUND`; `TOOL_ERROR`.

---

## 11. KEEP / LET GPT

| KEEP_DETERMINISTIC | LET_GPT_REASON |
|---|---|
| Fecha objetivo, TZ, referencia B, kg, delta, contribuciones, reconstrucción, top-N aritmético, provenance, authz, null≠0, unexplained flags | Síntesis, «qué llama la atención», narrativa, hipótesis **etiquetadas**, relación comentario/acción sin afirmar causa, qué falta saber, follow-ups |

No programar experto causal. No Recommendation N5.

---

## 12. Contratos — G2 / G3

- Constitución N5: hipótesis solo como hipótesis. Este pack no es IES ni Reasoning Engine.
- EKE §15: no sustituye el chat por el Motor. Añade un intent del **chat legado**, igual que `plant_diagnosis` / `financial_diagnosis`.
- `04` / `05`: runtime IES/RE sigue pendiente; no se usa.
- `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` lista desviaciones diarias como **diferidas**. Esta ARCH **no** edita contratos. Un DOCS sync posterior (otra G1) puede des-diferir tras el IMPL.

**G2 = N/A. G3 = N/A.** Runtime-only. Si HUMAN_APPROVER lee EKE §15 como «no tocar routing del chat», G5 puede REJECTED. No es contradicción que obligue `STOPPED`.

---

## 13. Límites (READY_WITH_LIMITS)

- Descuento/kg diario diferido.
- Producto/SKU inexistente.
- Canal en descuento inexistente.
- Bitácora sin `cliente_key`.
- Referencia B distorsiona si el mismo DOW fue festivo.
- `cliente_key` no derivable → evidencia desconocida, no ausencia afirmada.
- Continuidad de periodo apilada (`¿y la semana anterior?`) fuera de slice.
- Capacidades/fuentes aún marcan esto diferido hasta un DOCS sync humano.

---

## 14. Tests a diseñar en el IMPL (no ejecutados aquí)

- Ayer CDMX; no reloj UTC; hoy no es objetivo; día sin filas ≠ 0.
- Totales, B, delta; `SUM(contrib)=delta`; canal reconstruye; null/missing.
- Evidencia: comentario relacionado ≠ causa; unexplained contributor.
- Hilo de las cinco frases; no `client_analysis`; no `period_switch` en «¿contra qué?».
- Regresión: M9 mensual, `financial_diagnosis`, `plant_diagnosis`, continuidad planta, memoria persistente.

Descuento/kg: tests de fórmula ponderada **no** en este IMPL (diferido); la readiness ya fija la fórmula para no reabrirla.

---

## 15. Efecto porcentual

Antes: 10.5 / 20 = 52.5%.  
Después de esta readiness: 10.5 / 20 = 52.5%.  
IMPL esperado: **0.0 pp**. No es cobertura de módulo M0–M20. M9 sigue mensual.

---

## NEXT_TASK (no autorizada, no ejecutada)

`IMPL-DIRECTOR-IA-DAILY-DEVIATION-001`

Alcance implícito de C: intent `daily_sales_deviation`; pack diario venta (detección B + descomposición cliente/canal + evidencia `cliente_key` + unexplained); continuidad efímera con `active_date`; no M9 mensual; no descuento/kg; no IES/N5; no contratos.

STOP.
