# Reporte — ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
first_slice: "daily_discount_plus_business_evidence"
first_slice_id: "D"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
default_reference: "B_same_weekday_14d_pooled_sum_sum"
intent_proposed: "daily_discount_deviation"
new_intent: true
mix_effect_in_first_slice: false
channel_in_first_slice: false
average_of_averages: false
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Daily discount/kg is not module coverage. M9 remains monthly. daily_sales_deviation intact."
sql_017_executed: false
tradeoff: "deferred"
topic_return: "deferred"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001.md"
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
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001.md"
  - "sql/arr_forecast_schema.sql"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/weekly-discount-narrative.js"
  - "lib/arr-refresh-provincia.js"
  - "lib/dicf.js"
  - "lib/cliente-comentarios.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** El first slice mínimo que sostiene la pregunta ejecutiva es **D — `daily_discount_plus_business_evidence`**.

Hoy «¿Por qué subió el descuento/kg ayer?» es `unknown` y clarifica. Las tablas diarias **existen**. M9 las corta a `YYYY-MM`. Eso es infraestructura, no falta de dato. **No se programa la causa.** Primero la matemática.

El pack debe entregar cuatro capas **separadas**:

1. **Detección:** `R = SUM(monto)/SUM(kg)` de ayer CDMX vs referencia B pooled; delta. Siempre «comparado contra X».
2. **Contribución reconciliable:** quién movió el ponderado planta (`contrib_i = monto_i/K − monto_i,ref/K_ref`). `SUM(contrib_i) = ΔR`. Ratio propio alto ≠ mayor mover.
3. **Evidencia de negocio:** DICF + `arr.cliente_comentarios` solo por `cliente_key`. Comentario ≠ causa. Acción ≠ causa. Responsable ≠ culpable.
4. **Hueco:** contribuidores materiales sin evidencia suficiente, para que GPT diga qué falta.

**Referencia default (una):** B — mismos ISODOW en ventana 14 días cerrados, **pooled** `SUM(monto_ref)/SUM(kg_ref)`. **Prohibido** promediar ratios diarios.

**Mix vs rate:** auditado; **fuera** del first slice (ensancha; la contribución aditiva ya responde «quién movió»).

**Canal:** no existe en la fuente de descuento. No inventarlo.

**Intent nuevo:** `daily_discount_deviation`. Daily gana sobre monthly. No mezclar con `daily_sales_deviation`.

Baseline: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`.

---

## Ejecución

- Rama: `architecture/director-ia-daily-discount-kg-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, tests, matriz, contratos, SQL, commit, push, merge.
- G2/G3: **N/A** (runtime-only del chat legado). Detalle en § Contratos.

---

## 1. Inventario físico

### `arr.descuentos_diarios_cliente`

Fuente: `sql/arr_forecast_schema.sql` (DDL espejo en `server.js`).

| Campo pedido | Hecho físico |
|---|---|
| fecha | `fecha DATE`. Calendario, no timestamptz. |
| planta | **`plant_code VARCHAR(20)`**, no `planta_id`. Resolver como M9/venta diaria: `public.plantas` + `arr.provincia_plants` (`SQL_PROV_MAP`). |
| cliente | `cliente_norm VARCHAR(200)`. |
| cliente_key | **No existe** en esta tabla. |
| monto | `monto NUMERIC(18,2) NOT NULL`. Comentario DDL: siempre ≤ 0 (Total + Notas + Factura×1.16 + Comisión extra). Unidad: MXN. |
| kg | **No existe** en esta tabla. |
| grain | PK `(plant_code, fecha, cliente_norm)` → **una fila por cliente/día**. Sin canal. |

**No usar como fuente de verdad:** `arr.descuento_por_kilo_diario_provincia` (planta-día, 2 decimales, INNER JOIN kg∩monto; no descompone cliente).

Tablas de origen (`descuentos_notas`, `_factura`, `_comision_extra`): desglose de validación. El unificado ya suma. First slice: tabla unificada.

### Kg — otra tabla, join físico

`arr.ventas_diarias_cliente.kg NUMERIC(18,4)`. PK `(plant_code, fecha, cliente_norm, canal, subcanal)` → **varias filas por cliente/día**.

Join al grano del descuento:

```
kg_cliente_día = SUM(kg) GROUP BY plant_code, fecha, cliente_norm
```

Luego FULL OUTER JOIN con monto por el mismo triple. Patrón ya usado en `lib/weekly-discount-narrative.js` `fetchAggByCliente`.

**No** prorratear `monto` entre canales. Eso inventaría split. Canal en ventas sirve **solo** para derivar `cliente_key` de evidencia, no para el ratio.

### `cliente_key`

No hay columna en descuento. Derivación canónica (igual que venta diaria / DICF): `buildClienteKey(planta_id, grupo, canal, subcanal, cliente_norm)` sobre las filas de **venta del mismo día** de ese `cliente_norm` + grupos DICF. Join de comentarios/acciones **solo** por esas keys. **Sin join por nombre.**

`arr.cliente_categoria_mes` es catálogo **mensual**. No es el canal del día. No usarlo para fabricar canal del descuento.

### Semántica null / 0

| Caso | Significado |
|---|---|
| Día sin filas de venta **y** sin filas de descuento | Día sin registros. Ratio **indefinido**. ≠ 0. |
| Filas de venta, cero filas de descuento | No afirmar 0. Limitation `discount_day_without_rows`. (El refresh provincia hace INNER JOIN; no materializa 0.) |
| Cliente con kg y sin fila de descuento | `monto_i = 0` en el universo del join (contribución definida). |
| Cliente con monto y `kg_i = 0` | Ratio cliente **indefinido**. `contrib_i = monto_i / K_planta` si `K>0`. Limitation `monto_sin_kg`. |
| `K_planta = 0` | Ratio planta **indefinido**. No 0. |
| `monto` NOT NULL en DDL | No hay null de monto en fila existente. |

---

## 2. Fórmula planta (KEEP_DETERMINISTIC)

```
R(día, planta) = SUM(monto) / SUM(kg)
```

sobre el universo cliente-día del join. **kg_total es denominador. monto_total es numerador.**

**Confirmado en producto:**

- `lib/dicf.js`: «descuento = real (suma descuentos / suma kg)».
- `lib/dashboard-arr-forecast.js` / Excel: `|SUM(descuento MXN)| / SUM(kg)` (el valor absoluto es presentación; el runtime guarda `monto` ≤ 0).
- `lib/arr-refresh-provincia.js`: `total_monto / NULLIF(total_kg, 0)`.
- `lib/weekly-discount-narrative.js` `descKg`: `monto / kg` si `kg > 0`, else null.

**Prohibido:**

- `AVG(monto_i / kg_i)`
- `AVG(R_día)` en la referencia
- `buildDeltaDescuentoDatosPayload` de M9: `totalDeltaRatio = suma(ratios) / N` → **average-of-averages**. No copiar.

**Signo / unidad:** `$/kg`. `monto` ≤ 0. Un ratio más negativo = más descuento por kg en el registro. El pack **reporta el número firmado y el delta**. GPT interpreta «subió» frente a esos hechos. El código **no** traduce «subió» a un filtro de culpables.

---

## 3. Ayer

Misma semántica que `daily_sales_deviation` (no simetría de fórmula; sí de calendario):

| Tema | Determinación |
|---|---|
| Timezone | `America/Mexico_City` |
| Ayer | calendario de hoy en esa TZ − 1 día. Día **completo**. |
| Hoy | no es día cerrado. No sustituir en silencio por otro día salvo limitation explícita (como venta diaria). |
| Fecha objetivo | explícita en el pack (`target_date`). `active_date` efímero. |
| UTC del host | no es calendario de negocio. |

---

## 4. Referencias A–E — exactamente una

| Id | Meaning | Availability | Seasonality / DOW | Missing days | Mix volumen | N | Veredicto |
|---|---|---|---|---|---|---|---|
| A día anterior | Secuencial | Misma tablas, `fecha−1` | Lunes vs domingo distorsiona «subió» | Un día faltante tumba la ref | Un día | 0–1 | Fácil y engañosa. Hecho secundario opcional, **no** el delta que se descompone. |
| **B same-weekday 14d pooled** | Vs el mismo ISODOW reciente | Ventana 14 días **cerrados** antes del target; solo días **con filas** | Absorbe patrón semanal | N explícito; N=0 → limitation | Pooled: un martes con más kg pesa más (correcto para SUM/SUM) | 0–2 típico | **Default.** Misma familia que venta diaria **sin** copiar AVERAGE de ratios. |
| C MTD | `SUM(monto MTD)/SUM(kg MTD)` | Fácil | Mezcla lun–dom | Días faltantes sesgan | Mix del mes ≠ del día | variable | Engañosa para un domingo. |
| D rolling agregado | Ventana reciente SUM/SUM | Fácil | Mezcla DOW | Igual | Igual | variable | No es «el martes típico». |
| E existente | `descuento_por_kilo_diario_provincia` / forecast mensual / IGF `com_desc_kg` | Sí, pero **otro grano** | No aplica al día pedido | — | — | — | No como delta diario. |

**Política default (una):** **B pooled.**

```
M_ref = SUM(monto)  sobre fechas same-weekday en la ventana
K_ref = SUM(kg)     sobre las mismas fechas
R_ref = M_ref / K_ref     si K_ref > 0
```

**No** `AVERAGE_d (SUM(monto_d)/SUM(kg_d))`. Eso es average-of-averages.

Declarar siempre: tipo, fechas, N, `R_ref`. Si N=0: no inventar referencia. Si N=1: limitation.

A puede mostrarse etiquetado («vs día calendario anterior = …») **sin** ser el delta descompuesto.

---

## 5. Contribución cliente (crítica)

Identidad ya usada en producto (`contribPlanta` = `monto_i / kg_total_planta` ≡ participación × ratio cliente):

```
R_t = M_t / K_t
R_r = M_r / K_r          (M_r, K_r pooled B)
contrib_i = (monto_i,t / K_t) − (monto_i,r / K_r)
SUM_i contrib_i = R_t − R_r     EXACTO
```

Universo = unión de clientes con monto o kg en target **o** en fechas B. Ausente = monto 0 / kg 0 en ese lado (no borra al otro).

`monto_i,r` = SUM(monto del cliente en las fechas B). No promedio de contribuciones diarias.

**Qué demuestra:** quién **movió el ponderado planta**. Un cliente con ratio altísimo y kg irrelevantes aporta poco a `monto_i/K`. Un cliente con mucho kg a ratio cerca del promedio puede mover más.

**Qué no demuestra:** causa, culpa, «condición comercial».

**Reconciliación:** test `SUM(contrib_i) ≈ ΔR` (tolerancia de redondeo). Share = `contrib_i / ΔR` si `ΔR ≠ 0`.

**Prohibido rankear por** `monto_i/kg_i` como «quién movió». Tests: highest ratio ≠ biggest mover.

Mostrar en pack, separados: `kg_t`, `monto_t`, `r_i,t` (null si kg=0), `kg_r`, `monto_r`, `r_i,r`, `contrib_i`.

---

## 6. Mix effect

Separar rate vs mix es **posible** con una identidad Laspeyres/Paasche sobre shares `s_i = kg_i/K` y ratios `r_i`, y **suma** si se fijan convenciones de alta/baja.

**No entra al first slice.** Motivos:

- La pregunta «quién movió el promedio» ya queda exactamente en `contrib_i`.
- Referencia pooled + clientes que entran/salen exige supuestos extra.
- Ensancha el pack y empuja a GPT a narrar una descomposición económica que el ejecutivo no pidió primero.

Limitation explícita: `contrib_i` mezcla tasa y participación; un ratio cliente igual puede mover R si cambió su kg o el K planta.

Canal-mix: **imposible** sin inventar split del monto. Fuera.

---

## 7. Evidencia de negocio

| Fuente | Join | Semántica |
|---|---|---|
| `arr.cliente_comentarios` | `planta_id` + `cliente_key` NOT NULL | `created_at` existe. Relacionado, no causal. «Competencia» = declaración. |
| `arr.dicf_acciones` | `planta_id` + `cliente_key` | Abierta/vencida/fecha compromiso/responsable de **acción**. Acción ≠ causa del descuento. Responsable ≠ culpable del aumento. |

Bitácora: grano planta, no cliente_key. No unir por nombre. Fuera del join cliente del first slice (igual que venta diaria).

Gaps: contribuidor material (`|contrib|` o share sobre umbral, **no score de desempeño**) sin comentario ni acción ligada → `explanation_gap`. Persona nombrable **solo** si hay responsable físico de acción.

GPT debe poder decir, con este pack:

> Ayer el descuento/kg fue X contra Y (referencia B, N=…). El movimiento matemático se concentró en…. Para estos clientes hay comentario/acción. Para estos no encuentro explicación suficiente y falta X.

El código **no** redacta esa frase.

---

## 8. Routing

Hoy:

| Pregunta | Planner | Resultado |
|---|---|---|
| ¿Por qué subió el descuento/kg ayer? | `isDailySalesDeviationQuestion` **excluye** descuento sin venta → no diario. `delta_discount` exige `cambio\|variacion\|delta`, no «subió». `financial_diagnosis` exige caída ingreso/venta/margen. | **`unknown` → clarifica. Sin pack.** |
| ¿Cómo cambió el descuento? | `delta_discount` 0.85 | M9 **mensual**. Grano incorrecto si el usuario dijo ayer. |

**Determinación:** **intent nuevo** `daily_discount_deviation`. No reutilizar `daily_sales_deviation` (el loader de venta declara no calcular descuento/kg). No subintentar `delta_discount` / `financial_diagnosis` (mensuales por diseño).

Detectar **antes** de `delta_discount` y de `financial_diagnosis`: `ayer` + `descuento` (sin exigir «cambio/delta»). Daily **gana** sobre monthly.

Si hay **venta y descuento** en la misma frase: first slice **no fusiona packs**. `daily_sales_deviation` se preserva para venta; no absorber descuento ahí. Pregunta de descuento/kg ayer (sin venta como sujeto) → intent nuevo.

**Conversación:** `parent_intent = daily_discount_deviation` inheritable (estrategia B). `active_date` efímero. Requery cada turno. Follow-ups (`¿Contra qué?`, `¿Quién movió más?`, `¿Fue general?`, `¿Sabemos por qué?`, `¿Qué falta?`) heredan. Hold-outs en tests, no phrasebook. No memoria cross-session de la fecha. SQL 017 no se toca. Topic stack no se toca.

Authz: mismo gate que venta diaria / M9 ARR (planta actual, `plantas_permitidas`, no cross-plant, fail-closed). GA `SOURCE_RESTRICTED`. No ampliar permisos.

---

## 9. A / B / C / D — exactamente uno

| Slice | Qué entrega | ¿Sostiene «por qué subió»? | ¿Sostiene «quién movió»? | ¿Sostiene «sabemos / qué falta»? |
|---|---|---|---|---|
| A ratio only | R vs ref | Parcial (número sin quién) | No | No |
| B + clientes «relevantes» | Rank por ratio propio | Engañoso | **No** (highest ratio ≠ mover) | No |
| C + contribución reconciliada | Matemática completa | Matemática sí; «por qué» no | **Sí** | GPT sin evidencia → inventa o se queda corto |
| **D C + comments/DICF + gaps** | Las cuatro capas | **Sí**, sin programar causa | **Sí** | **Sí** |

**Seleccionado: D.** La matemática de contribución **está demostrada** (identidad aditiva + `contribPlanta` existente). D no añade economía nueva: añade el join `cliente_key` ya canónico en venta diaria. A/B no cumplen el requisito crítico. C deja el «por qué» ciego.

Límites de D: sin mix split, sin canal, sin causalidad, sin trade-off, sin N5.

---

## 10. Contratos (G2/G3)

Chat legado operativo. **No** IES. **No** Reasoning Engine N5. Índice: el chat no es el pipeline constitucional N1–N5.

G2: **N/A** (no se edita `docs/director-ia/` en el IMPL propuesto).  
G3: **N/A** (no hay contrato nuevo).  
G8: **N/A**.

Porcentaje: **0.0 pp**. No es cobertura M0–M20. M8/M9 no cambian de etiqueta.

---

## 11. Tests a diseñar en el IMPL (no ejecutados aquí)

- Fórmula `SUM(monto)/SUM(kg)`; no AVG de ratios; `kg=0` indefinido; null ≠ 0.
- Ayer CDMX; hoy excluido.
- Referencia B pooled; N=0 / N=1; no average-of-averages.
- `SUM(contrib_i) = ΔR`; highest ratio ≠ biggest mover.
- Mix **no** presente en pack.
- Join `cliente_key` only; comentario ≠ causa; acción ≠ causa; gap.
- Conversación canónica + inherit B.
- Regresión: `daily_sales_deviation`, action-person, natural follow-up, persistent memory, plant/financial diagnosis, M9 monthly, suite.

---

## 12. Diferido

- Mix vs rate intra-cliente.
- Canal / prorrateo.
- Trade-off Arturo / margen cliente / oferta estructurada.
- SQL 017.
- Topic stack / «volvamos».
- Copiar `descuento_por_kilo_diario_provincia` o el total M9 de ratios.
- Causalidad, N5, Recommendation, score de personas.

Preservar: `daily_sales_deviation` intacto; action-person; estrategia B; memoria persistente (sin ejecutar 017).

---

## NEXT_TASK (no autorizada, no ejecutada)

`IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001`

First slice D. Intent `daily_discount_deviation`. Referencia B pooled. Contribución aditiva reconciliable. Evidencia por `cliente_key`. Sin causa programada. Sin average-of-averages. Sin canal inventado. Daily sobre monthly. No fusionar con venta diaria.

STOP.
