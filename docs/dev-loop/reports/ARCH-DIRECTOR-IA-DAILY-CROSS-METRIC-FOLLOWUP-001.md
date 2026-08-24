# Reporte — ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
determination: "READY_WITH_LIMITS"
selected_first_slice: "B_contextual_metric_switch_after_unknown"
selected_letter: "B"
new_intent: false
phrasebook: false
previous_frame_used: false
persistent_memory_used: false
destination: "chat legado (askDirectorIa + conversation_state + planner), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Cross-metric daily follow-up is not module coverage."
sql_017: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-discount.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** First slice: **B — post-planner contextual metric switch**.

Principio físico: **conservar fecha ≠ conservar métrica.**

Hoy, tras un hilo diario válido, «¿Y el descuento?» y «¿Y la venta?» son `unknown`. Strategy B hereda el **intent** anterior. `askDirectorIa` L2895–2898 hace `forceIntent` de esa métrica. Se recarga el pack viejo. El pack de la métrica nombrada **no se pide**. Es simétrico.

No se elige A: separar métrica de fecha **en el planner aislado** haría standalone a «¿Y el descuento?» sin `ayer` y el loader **inventaría ayer**. Eso viola el no-date.

No se elige C: ambos intents ya existen.

No se elige D: phrasebook prohibido.

La señal de métrica **ya está** en `isDailySalesDeviationQuestion` / `isDailyDiscountDeviationQuestion` (tokens `venta`/`vendi*` y `descuento`). B la reutiliza **sin** el gate `ayer`, **solo** cuando el parent es diario y `active_date` es válida.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`.

---

## Ejecución

- Rama: `architecture/director-ia-daily-cross-metric-followup-001` (≠ `main`).
- HEAD: `3f5153b7 Merge branch 'audit/director-ia-conversational-product-gap-007'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Invocación read-only de `detectDirectorIaIntent` + `resolveConversationTurn` sobre los pares obligatorios y hold-outs.

---

## Falla actual (trazada)

Detectores (`lib/director-ia-planner.js` L100–113):

```
isDailySalesDeviationQuestion  = /ayer/ AND (venta|vendimos|vendio|vendi)
isDailyDiscountDeviationQuestion = /ayer/ AND /descuento/ AND NOT sales
```

Sin `ayer` el planner aislado es `unknown` 0.35.

`resolveConversationTurn`: `isolatedUnknown` + parent diario válido → `inherit = true`, `inherit_parent_intent = parent viejo`. «¿Y el descuento?» además es `kind=pronoun` (`el` ∈ `PRONOUN_TOKENS`) → `isDailyFollowUpKind` refuerza el inherit. «¿Y la venta?» es `kind=other` y **también** hereda por `unknown`.

`askDirectorIa` L2894–2898: inherit diario → `forceIntent` del parent. El planner **no vuelve a mirar** el texto.

Loaders (`L3146`, `L3252`): `targetDate: continuityTurn.active_date`. Fecha sí se conserva. Métrica no.

`invalidate_gap` solo es `true` en `plantMismatch`. Un inherit de ventas **copia** el gap de ventas al HILO del turno que el usuario cree de descuento.

`conversationStateForIntent` llama `shouldCapturePrevious` si el intent inheritable cambia. Un switch ingenuo sales→discount **evictaría** el `previous_frame` de planta. B no usa `previous_frame` para decidir el switch y **no debe capturarlo** como si fuera topic return.

---

## Traza obligatoria (física ahora → deseada)

Estado T1 simulado: parent = intent de T1, `active_date=2026-08-19`, `previous_frame=plant_diagnosis`.

| Par | Planner T2 | kind | inherit hoy | forceIntent hoy | Pack hoy | Deseado |
|-----|------------|------|-------------|-----------------|----------|---------|
| venta ayer → ¿Y el descuento? | unknown 0.35 | pronoun | **sales** | sales | sales | discount + misma fecha + requery discount |
| descuento ayer → ¿Y la venta? | unknown 0.35 | other | **discount** | discount | discount | sales + misma fecha + requery sales |
| venta ayer → ¿Y el descuento/kg? | unknown | pronoun | sales | sales | sales | discount (token `descuento` ya cubre `/kg`) |
| descuento ayer → ¿Y las ventas? | unknown | other | discount | discount | discount | sales (lema `ventas`; ver señal) |
| venta ayer → ¿Y margen? | unknown | other | sales | sales | sales | **no switch**; inherit sales |
| venta ayer → ¿Y eso? | unknown | other | sales | sales | sales | inherit sales (same-metric) |
| venta ayer → ¿Y el presupuesto? | unknown | pronoun | sales | sales | sales | **no switch** a discount; no path diario nuevo |

Sin contexto diario:

| Turno | Resultado físico | Deseado |
|-------|------------------|---------|
| ¿Y el descuento? (sin parent, sin fecha) | unknown, clarify | **igual**. No inventar ayer. |
| ¿Y el descuento? (parent=plant, sin `active_date`) | inherit plant | **igual**. No abrir pack diario. |

Simetría: el fallo es el mismo en ambos sentidos. El first slice es simétrico.

---

## Comparación A / B / C / D

| | Qué es | Por qué no / sí |
|---|--------|-----------------|
| **A** Separar métrica de fecha en el planner aislado | Quitar `ayer` de `isDaily*` | «¿Y el descuento?» pasaría a standalone 0.92. `standalone` **borra** `active_date` (L605–606). El loader hace `targetDate \|\| yesterday`. **Inventa ayer** sin hilo. Con parent planta, **rompe** inherit de planta. |
| **B** Switch contextual post-planner | `unknown` + parent diario + `active_date` válida + métrica **distinta** inequívoca → intent destino, misma fecha | Arregla el sitio del daño (`inherit`/`forceIntent`) sin cambiar el planner aislado. Reusa tokens existentes. |
| **C** Intent nuevo cross-metric | Tercer intent | Innecesario. Los dos packs y los dos intents ya existen. |
| **D** Phrasebook | Listar «y el descuento» | Prohibido. GAP-003. Hold-outs viven en tests. |

**Seleccionado: B.**

A no se implementa como cambio de planner. B **sí** extrae helpers de los regex ya existentes (`venta`/`vendi*` / `descuento`) para **leer** la métrica nombrada. Eso es reuse, no first slice A.

---

## Señal de métrica (sin phrasebook)

Reutilizar la semántica **ya escrita** en L100–113, **sin** exigir `ayer`:

- **sales:** `venta` o `ventas` (mismo lema; `\bventa\b` hoy **no** mata `ventas`) o `vendimos` / `vendio` / `vendi`.
- **discount:** `descuento` o `descuentos`. `/kg`, `por kilo` no se listan: ya contienen `descuento`.
- **exclusión mutua:** si el turno nombra **ambas**, no switch (regla actual: venta+descuento no fusiona; no adivinar).
- **no métrica diaria:** `margen`, `presupuesto`, `eso`, `lo otro`, `cómo estuvo`, `qué más` → no switch.

No copiar a producción: «¿Qué pasó con el descuento?», «¿Y en descuento cómo quedó?», «¿Qué tal las ventas?», «¿Cómo salió la venta?», «¿Y el descuento por kilo?». Esos hold-outs **ejercitan** los tokens; no son routing.

---

## Herencia de fecha

Permitida **solo si** se cumplen todas:

1. `parent_intent` ∈ {`daily_sales_deviation`, `daily_discount_deviation`}
2. `active_date` existe y pasa `sanitizeActiveDate` (`YYYY-MM-DD`)
3. el loader destino sigue pudiendo usarla (hoy/futuro ya se remapean a ayer CDMX con limitation)
4. el turno **no** trae otra fecha

Reglas:

| Señal en el turno | Fecha efectiva |
|-------------------|----------------|
| ninguna | `active_date` del hilo |
| `ayer` | ayer CDMX (coincide con la semántica del hilo si el hilo es ayer) |
| `hoy` | **no** pasar el `active_date` viejo; el loader ya trata hoy como no cerrado → ayer + limitation |
| `YYYY-MM-DD` distinta | esa gana |
| `lunes` / otro weekday | **LIMIT:** no hay parser de weekday de usuario (el mapa `WEEKDAY_ES` es etiqueta de referencia, no input). No heredar en silencio. Clarificar. |
| sin `active_date` | no switch diario; no inventar ayer |

No usar `previous_frame.active_date`. No usar memoria persistente.

---

## Transición de estado (tras switch)

| Campo | Acción |
|-------|--------|
| `parent_intent` | destino (`daily_discount_deviation` o `daily_sales_deviation`) |
| `last_evidence_bundle_type` | destino |
| `active_date` | heredada o fecha explícita ganadora, revalidada por el loader |
| `pending_information_gap` | **reemplazar** con `derivePendingInformationGap` del pack fresco. El gap de ventas no es gap de descuento. |
| `invalidate_gap` | `true` en el switch |
| entidades del pack diario | no arrastrar contribuidores del pack viejo; requery |
| `previous_frame` | **conservar el incoming**. No `shouldCapturePrevious`. Esto no es topic return. |
| persistente | no participa (`daily_not_persisted` se mantiene) |

Evidencia: loader destino fresco. Authz/provenance/ausencia actuales. Shared date ≠ shared evidence.

GPT no repara un pack equivocado. El runtime cambia intent y requery **antes** de GPT.

---

## Same-metric, ambigüedad, mensual

**Same-metric (B de follow-up se conserva):**  
«¿Y eso?», «¿Qué más?», «¿Y cómo estuvo?», «¿Quién lo movió más?» sobre el **mismo** parent → inherit normal + `forceIntent` del parent. No switch.

**No adivinar:**  
«¿Y margen?», «¿Y lo otro?», «¿Y el presupuesto?», «¿Y cómo estuvo?» → no son la otra métrica diaria. Siguen inherit del parent (o el standalone mensual si el planner ya lo forma). No forzar sales/discount.

**Mensual:**  
«¿Cómo va el descuento este mes?», «¿Y la venta mensual?» hoy son `unknown` + inherit **diario**. B **no** las convierte en daily_discount / daily_sales con `active_date` de ayer. Señal `mes` / `mensual` / `este mes` **bloquea** el switch diario.

LIMIT: este slice **no** construye el path mensual. Si el planner aislado no forma `delta_*` / `financial_diagnosis` / `arr_status`, el turno no debe caer al pack diario de la otra métrica. Inherit del parent o clarify; no ayer inventado.

---

## Fronteras

- **previous_frame:** no decide el switch; no se evicta.
- **Memoria persistente:** no.
- **Topic return** («Volvamos a…»): intacto. Standalone con `ayer` sigue ganando.
- **Planner aislado con `ayer`:** intacto (GAP-002 / GAP-005).
- **Strategy B unknown + estado válido:** intacta cuando el turno **no** nombra la otra métrica diaria.

---

## Hold-outs (solo tests; no routing)

Sobre parent `daily_sales_deviation` + `active_date` válida, deben **switch** a discount (tokens de descuento, sin fecha nueva, sin mes):

- ¿Qué pasó con el descuento?
- ¿Y en descuento cómo quedó?
- ¿Y el descuento por kilo?

Sobre parent `daily_discount_deviation` + fecha válida, deben **switch** a sales:

- ¿Qué tal las ventas?
- ¿Cómo salió la venta?

Deben **quedarse** en el parent (no switch):

- ¿Y eso?
- ¿Qué más?
- ¿Y cómo estuvo?
- ¿Y margen?
- ¿Y lo otro?

Deben **bloquear** switch diario (señal mensual):

- ¿Cómo va el descuento este mes?
- ¿Y la venta mensual?

Sin hilo diario / sin `active_date`:

- ¿Y el descuento? → no inventar ayer.

Fecha explícita:

- ¿Y el descuento de hoy? → no reusar `active_date` viejo a ciegas; semántica `hoy` del loader.
- ¿Y la venta del lunes? → no adivinar el lunes; clarificar (LIMIT).

---

## Tests a diseñar en IMPL (no ejecutar aquí)

Positivos: sales→discount; discount→sales; `descuento/kg`; `ventas` sin repetir fecha; misma `active_date`.

Fecha: `hoy` no silencia la remoción de día incompleto; `YYYY-MM-DD` nueva gana.

Negativos: sin contexto diario no inventa fecha; «¿Y eso?» same-metric; margen/presupuesto no switch; mensual no usa pack diario de ayer.

Estado: parent y bundle cambian; gap viejo no sobrevive; requery del loader destino; `previous_frame` de planta no se evicta.

Regresión: follow-up natural same-metric; topic return; daily sales; daily discount; action-person; persistent memory; suite Director IA.

---

## Límites (READY_WITH_LIMITS)

1. Weekday de usuario (`lunes`…) no se parsea. Clarificar; no heredar fecha en silencio.
2. Path mensual de «descuento este mes» **no** se construye. Solo se impide el switch diario.
3. No hay tercera métrica diaria (margen, ingreso).
4. Inventario `docs/director-ia/` no se toca en esta tarea (runtime-only; sync documental es otra tarea humana).

---

## G2 / G3

Runtime-only. Destino: chat legado. No Motor N1–N5. No IES. No Reasoning Engine. No contrato nuevo. No intent nuevo.

- G2: **N/A**
- G3: **N/A**
- G8: **N/A**

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** El IMPL esperado tampoco mueve módulos.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001`

Implementar B: si el parent es diario, hay `active_date` válida y el turno nombra la **otra** métrica diaria con la semántica existente (sin exigir `ayer`, sin phrasebook, sin mensual), cambiar `inherit_parent_intent` / `forceIntent` al destino, conservar o revalidar fecha, requery del pack destino, reemplazar gap, no evictar `previous_frame`.

STOP.
