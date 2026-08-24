# Reporte — ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_first_slice: "B_sales_plus_discount"
selected_letter: "B"
new_intent: "daily_executive_brief"
intent_required: true
phrasebook: false
plant_diagnosis_overloaded: false
income_in_first_slice: false
generic_registry: false
materiality: "B_relative_deviation_plus_always_show_both_blocks"
destination: "chat legado (askDirectorIa + conversation_state + planner + loaders diarios), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp (no es cobertura de módulo)"
percentage_policy: "Daily executive brief is not module coverage."
sql_017: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-discount.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-m9-deltas.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** First slice **B**: componer `daily_sales_deviation` + `daily_discount_deviation` en un brief de panorama diario.

No existe hoy un parent genérico diario. `plant_diagnosis` es mensual/multi-fuente: **no** se sobrecarga. Se necesita intent canónico **`daily_executive_brief`**.

Principio: panorama diario ≠ métrica individual. El runtime reúne valor / referencia / delta / contribuciones / gaps de cada métrica. GPT dice qué destaca, si fue mixto, qué merece atención y qué no está explicado. **No** se programa «buen día» / «mal día». **No** causalidad.

Ingreso diario **no** entra: no hay fuente física al grano diario compatible. No se construye un registry de N KPIs.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`.

---

## Ejecución

- Rama: `architecture/director-ia-daily-executive-brief-001` (≠ `main`).
- HEAD: `f22cadb6 Merge branch 'audit/director-ia-production-conversation-gap-008'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Planner read-only sobre la canónica y hold-outs (repite GAP-008).

---

## Fallo actual (confirmado)

| Pregunta | Planner | GPT |
|----------|---------|-----|
| ¿Cómo nos fue ayer? | `unknown` 0.35 | No |
| ¿Qué tal estuvo ayer? | `unknown` 0.35 | No |
| Dame el resumen de ayer. | `unknown` 0.35 | No |
| ¿Cómo cerramos el día? | `unknown` 0.35 | No |
| ¿Qué pasó ayer? | `unknown` 0.35 | No |
| ¿Algo importante de ayer? | `unknown` 0.35 | No |
| ¿Cómo estuvo la venta ayer? | `daily_sales_deviation` 0.92 | Sí (path intacto) |

`isDailySalesDeviationQuestion` / `isDailyDiscountDeviationQuestion` exigen `ayer` **y** el nombre de la métrica (`lib/director-ia-planner.js` L103–122). `askDirectorIa` L2945–2954: unknown sin inherit → clarificación. Ninguna de esas frases está en `lib/` (no hay phrasebook que romper).

El usuario que no sabe si se movió la venta o el descuento **no puede empezar**.

---

## Inventario físico diario

| Métrica | Estado | Grano | Fecha | Pack |
|---------|--------|-------|-------|------|
| Venta kg | Implementada | un día | CDMX; default ayer; hoy no cerrado; 0 filas ≠ 0 | `loadDailySalesDeviationForChat` (`opts.targetDate`) |
| Descuento/kg | Implementada | un día | **Misma** semántica | `loadDailyDiscountDeviationForChat` (`opts.targetDate`) |
| Ingreso | **No diario** | M9 mensual: `kg × (margen_$/kg − \|desc_$/kg\|)` | Dos `YYYY-MM` | `loadDeltaIngresoForChat` |
| Otras | ARR diario existe como filas; weekly LD / IGF no son día calendario cerrado | — | No first slice | — |

Ambos packs diarios ya exponen: target, referencia same-weekday 14d, delta, contribuciones (venta: cliente+canal; descuento: cliente, **sin canal**), evidencia DICF/comments por `cliente_key`, `information_gaps`, limitations, provenance.

Loaders aceptan `opts.targetDate` y, si falta, usan `yesterdayYmd(today CDMX)`. Hoy se empuja a ayer (`hoy_no_es_dia_completo`).

Ingreso diario exigiría margen $/kg al día. Esa serie **no** existe. Inventarlo violaría la Constitución (rellenar vacíos). **C queda fuera.**

---

## Comparación A / B / C / D

| Opción | Qué es | Veredicto |
|--------|--------|-----------|
| **A** sales only | Brief = solo venta | Insuficiente. El ejecutivo no sabe si el movimiento está en descuento. Esconde la segunda métrica ya lista. |
| **B** sales + discount | Componer los dos packs compatibles | **Seleccionado.** Mínimo brief útil. Misma fecha/planta. Provenance separada. |
| **C** + income | Añadir ingreso diario | **No.** No hay ingreso al grano diario. No metas. |
| **D** registry N KPIs | Framework extensible | **No.** Solo hay dos métricas diarias compatibles. Un registry es sobre-arquitectura. |

First slice = **B**.

---

## Intent canónico

**Sí: `daily_executive_brief`.**

No hay parent diario genérico. `daily_sales_deviation` como parent del brief **sesga a venta**. `plant_diagnosis` mezcla grano mensual y otras fuentes.

| Pieza | Decisión |
|-------|----------|
| Dominios | `arr` + `dicf` + `cliente_comentarios` (unión de los dos packs) |
| Inheritable | **Sí.** «¿Qué te llama la atención?» hereda el brief. |
| Precedencia | Métrica explícita + `ayer` **gana** (`daily_sales` / `daily_discount` se detectan antes). El brief no las roba. |
| Reconocimiento | Semántica de **panorama de un día cerrado** (ayer / el día / resumen del día) **sin** exigir venta ni descuento. Hold-outs viven en **tests**. Cero frases de producción en `lib/`. |
| «¿Cómo cerramos el día?» | Sin token `ayer`. Default = ayer CDMX (misma regla que los loaders). No inventar otro día. Fecha `YYYY-MM-DD` del turno gana. `hoy` no cierra el día. |

---

## Pack del brief

Estructura (no respuesta preescrita):

- `target_date`, planta
- bloque `sales` (o limitation/error)
- bloque `discount` (o limitation/error)
- cada bloque: valor, referencia, delta, contribuciones, evidencia, gaps, limitations, provenance
- `shared`: solo fecha + planta
- **No** fusionar causas ni gaps en un único claim

Composición: dos llamadas a loaders existentes con el **mismo** `targetDate` y `planta_id`. Sin HTTP interno. Sin writes.

`pending_information_gap`: **un** objeto (no se rediseña el estado). `missing_fields` prefijados por métrica (`sales:…`, `discount:…`). `derivePendingInformationGap` puede concatenar limitations + `information_gaps` de ambos bloques. No anidar intents en el state.

---

## Materialidad

| Candidato | Veredicto |
|-----------|-----------|
| A siempre mostrar ambas | **Sí como presentación.** No ocultar una métrica «porque no es material». |
| B deltas + GPT | **Sí como salience.** Runtime no etiqueta importante/no. |
| C umbrales | **No.** Arbitrario. No hay ruleset G8. |
| D score aprendido | **No.** |

Runtime aporta números comparables. GPT formula: mixto, qué destaca, qué no está explicado. Prohibido: «buen día», «mal día», «el descuento causó la venta».

---

## Estado conversacional

| Campo | Brief |
|-------|--------|
| `parent_intent` | `daily_executive_brief` |
| `active_date` | YYYY-MM-DD de ayer (o fecha explícita) |
| `last_evidence_bundle_type` | `daily_executive_brief` |
| `pending_information_gap` | bundle con campos por métrica |
| `previous_frame` | sin cambio de esquema; un solo prior |

**Métrica nombrada reemplaza parent** (no nest). Reutiliza el switch cross-metric ya integrado.

Hoy `dailyParent` es solo sales \| discount (`conversation-state.js` L537–538). El IMPL debe tratar `daily_executive_brief` como **parent diario** para que «¿Y la venta?» / «¿Y el descuento?» cambien al pack destino, **conserven `active_date`** y no clarifiquen.

Al salir brief → métrica: **capturar brief en `previous_frame`** (no `keepIncomingPreviousFrame`). El switch sales ↔ discount posterior **sí** conserva ese prior (comportamiento actual). «Volvamos al resumen» puede restaurar el brief. Un prior de planta más antiguo se evicta (límite ya aceptado: un frame).

Follow-ups abiertos con parent brief: requery del **pack brief**, no de una sola métrica.

No topic stack. No persistir `active_date` en SQL 017.

`askDirectorIa` hoy solo hace `forceIntent` para sales/discount (L2911–2914). El inherit del brief usará `inheritParentIntent` (como el resto) salvo que el IMPL necesite `forceIntent` simétrico.

---

## Datos parciales

| Situación | Comportamiento |
|-----------|----------------|
| Sales OK, discount error/403 | Brief de sales + limitation explícita de discount. No 0. |
| Discount OK, sales ausente | Simétrico. |
| Ambos sin filas | Decir «día sin registros ≠ cero» por métrica. |
| GA / SOURCE_RESTRICTED | Declarar restricción; no inventar. |
| Tool error | `SOURCE_ERROR` de esa métrica; la otra puede vivir. |

Authz: reutilizar `assertDailySalesAccess` / el gate de discount. Fail-closed. Misma planta.

---

## Conversación obligatoria

```text
¿Cómo nos fue ayer?
  → daily_executive_brief
  → ambos packs, misma active_date
  → GPT sintetiza; no afirma problema

¿Qué te llama la atención?
  → inherit brief; requery brief

¿Y la venta?
  → daily_sales_deviation; misma fecha; pack venta
  → previous_frame = brief

¿Y el descuento?
  → cross-metric vigente; pack descuento; brief sigue en previous_frame

¿Quién lo movió más? / ¿Sabemos por qué?
  → inherit de la métrica actual (ya construido)

¿Qué sigue sin explicación?
  → inherit del parent vigente (métrica si ya se cambió; brief si no)
```

Conversación 2 (hold-out «Dame el resumen de ayer.») = mismo brief.  
Conversación 3 (cerca de referencia): GPT puede decir que no ve desviación material; **no** inventar problema.  
Conversación 4 (venta↑ y desc/kg↑): tensión sin causalidad.  
Conversación 5: sales + «discount no disponible».  
Conversación 6: «¿Cómo estuvo la venta ayer?» **sin cambio**.

---

## Preservar

daily sales, daily discount, cross-metric (sales ↔ discount), topic return (un `previous_frame`), IGF reviewable supports, action-person, persistent memory. M9 mensual UNCHANGED.

---

## G2 / G3

Chat legado. **No** IES. **No** N5. **No** Knowledge Bundle. Constitución / EKE / 04 / 05 **no** se editan.

| Gate | Valor |
|------|--------|
| G2 | **N/A** |
| G3 | **N/A** |
| G8 | **N/A** (no umbrales; no firma IES) |

---

## Porcentaje

10.5 / 20 = **52.5%**. IMPL esperado: **0.0 pp**. El brief no es módulo M0–M20.

---

## Límites (READY_WITH_LIMITS)

- Ingreso diario diferido.
- Canal en descuento sigue fuera (regla del pack discount).
- Un solo `previous_frame`.
- «Qué sigue sin explicación» tras drill-down hereda la **métrica**, no reabre el brief solo.
- Parser de weekday de usuario sigue clarificando.
- SQL 017 no guarda la fecha del brief.

---

## Tests a diseñar en el IMPL

Routing semántico + hold-outs; métrica explícita gana; ayer CDMX / fecha explícita / hoy incompleto / 0 filas ≠ 0; composición sales+discount misma planta/fecha y provenance separada; brief → venta / descuento / follow-up abierto; cross-metric después del brief; un métrica ausente; 403; tool error; regresión daily + IGF reviewable + action-person + memory + suite.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`

STOP.
