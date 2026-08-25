# Reporte — ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001

```yaml
task_id: "ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_source_strategy: "B_reusable_taller_mayor_unit_read_model"
selected_source_strategy_letter: "B"
selected_routing_strategy: "B_taller_mayor_unit_parent"
selected_routing_strategy_letter: "B"
selected_intent: "taller_mayor"
intent_required: true
existing_taller_at_reusable_as_parent: false
existing_taller_at_reusable_as_source: true
existing_folio_status_reusable_as_parent: false
phrasebook: false
second_llm_router: false
unit_identity: "planta_id + canonical token from public.folios.unidad via unidad-taller"
unit_is_economico_column: false
unit_master_exists: false
placa_exists: false
taller_mayor_field: "public.folios.subcategoria"
taller_mayor_canonical_value: "REPARACIÓN MAYOR"
taller_mayor_runtime_match: "matchTallerTipoCol = REPARACION + MAYOR after NFD"
period_semantics: "este_mes = current YYYY-MM America/Mexico_City against mes_cargo"
highest_amount_default: "unit with max SUM(importe) after unit list"
reviewability: "classifyCancellationEligibility on active_folio; no plant-wide hop"
history_default: "same plant + same canonical unit + Taller Mayor only"
destination: "chat legado (planner + conversation_state + in-process loader); NO Motor N1–N5; NO IES; NO Reasoning Engine; NO persistencia; NO schema; NO SQL de producto"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp unless module matrix policy independently changes"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M5-TALLER-AT-READINESS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/unidad-taller.js"
  - "lib/taller-at-excel.js"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-m6-gastos-inversiones.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "frontend-dashboard/components/CrearFolioModal.tsx"
  - "server.js (folios.unidad, mes_cargo, usuarios no unit master)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.**

Hay first slice seguro. La unidad **sí** tiene identidad física usable: `(planta_id, token canónico de public.folios.unidad)`. No hay catálogo, placa ni columna `económico`. No hace falta inventar un master.

Taller Mayor **no** se infiere por importe ni por concepto. Vive en `public.folios.subcategoria` = `REPARACIÓN MAYOR` (UI) y se reconoce con `matchTallerTipoCol` (`REPARACION` + `MAYOR` tras NFD). Categoría: `TALLER`.

Fuente **B**: read model reutilizable, runtime, solo lectura, sobre Folios ya existentes. Reusa `unidad-taller`, `expandTallerRows`, `matchTallerTipoCol`, el SELECT M5 y `classifyCancellationEligibility`. **No** persistencia.

Routing **B**: intent padre canónico **`taller_mayor`**. `taller_at` **no** se extiende (sigue siendo unidad nombrada + `YYYY-MM` + todos los tipos). `folio_status` **no** se sobrecarga. Periodo, unidad y folio son **slots**.

«¿Todavía se puede detener?» con `active_folio` **no** puede saltar al IGF reviewable de planta.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001`.

---

## Ejecución

- Rama: `architecture/director-ia-taller-mayor-unidad-001` (≠ `main`).
- HEAD: `eee0a4db`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, persistencia, commit, push, merge.

---

## 1. Identidad de unidad

### Qué es `public.folios.unidad`

Campo `VARCHAR(100)` de texto libre en el folio. En Taller guarda el **número de unidad operativa** (AT/PT/S/C/U), el mismo que el negocio llama informalmente «económico» o «carro».

**No** es:

- una columna `economico`
- una placa
- un FK a catálogo
- un `at_id`

No hay otra key mejor en el repo. WhatsApp y el Excel Taller homologan el **mismo** campo (`lib/unidad-taller.js`).

### Canonicalización

`unidad-taller` produce tokens `AT-15`, `PT-03`, `U-56`, `C-33`, `S-xx`. `T` → `AT`. Un folio puede guardar **varias** unidades (`AT-144, AT-142`); `expandTallerRows` parte el importe.

Identidad conversacional:

```text
(planta_id, canonical_unit_token)
```

Tras expandir listas. **No** el string crudo. **No** el display «carro».

### ¿Puede repetirse entre plantas?

Sí. No hay UNIQUE `(planta, unidad)`. El mismo `AT-15` puede existir en otra planta. **Misma planta obligatoria.** Fail-closed. No selección cross-plant.

### Prohibido

- fuzzy
- join por `concepto`
- merge silencioso de homónimos / prefijos distintos
- tratar una lista multi-unidad como una sola unidad sin expandir
- agrupar filas sin token (unidad vacía = no entra al ranking; missing ≠ 0)

---

## 2. Taller Mayor — campo físico

| Pieza | Hecho |
|-------|--------|
| Campo | `public.folios.subcategoria` |
| Valor UI | `REPARACIÓN MAYOR` (`CrearFolioModal.tsx` `SUBCATEGORIAS.TALLER`) |
| Runtime | `matchTallerTipoCol`: NFD + `REPARACION` **y** `MAYOR` → `tipo = "mayor"` |
| Categoría | `categoria` contiene `TALLER` (M5: `LIKE '%TALLER%'`) |
| Otros tipos | `PASIVO/RECUPERACIÓN` → pasivo; `PREVENTIVO` → preventivo; resto → otros |
| Importe | **No** define Mayor |
| Concepto | **No** define Mayor |
| M4 | Familia TALLER agregada; **no** recorta Mayor |
| M5 / M6 | M5 = todos los tipos TALLER por unidad nombrada. M6 = GASTOS, no Taller |
| CANCELADO | Fuera del listado/suma (igual M5 y dashboard) |

---

## 3. Periodo — «este mes»

| Pieza | Hecho |
|-------|--------|
| Convención de apoyos | `public.folios.mes_cargo` `VARCHAR(7)` = `YYYY-MM` |
| Dashboard / M4 / M5 / M6 / reviewable | Filtran por `mes_cargo`, no por `creado_en` ni pago |
| «Este mes» | Mes calendario actual `America/Mexico_City` (`currentYearMonthCdmx`) contra `mes_cargo` |
| M5 hoy | Exige token `YYYY-MM`; **no** resuelve «este mes» |

First slice: default = mes CDMX actual. Explícitos: `YYYY-MM` y mes nombrado del año corriente. «Mes pasado» no está resuelto de forma segura en `resolveYearMonthFromQuestion` (ignora «pasado»); no copiar ese hueco en silencio. No usar 90d trailing.

---

## 4. Fuente A/B/C/D

| Opción | Veredicto |
|--------|-----------|
| **A** pack genérico de Folios + filtros | `folio_status` es 1 folio / listado de etapa. No agrupa por unidad ni recorta Mayor. Sobrecargarlo mezcla M2. |
| **B** read model Taller Mayor por unidad | **Seleccionado.** Runtime, SELECT-only, reusa Folios + `unidad-taller` + `expandTallerRows` + `matchTallerTipoCol` + eligibility. |
| **C** summary persistido | Innecesario. Prohibido en esta tarea. |
| **D** Folios crudos → GPT | GPT decidiría identidad/clasificación/importe. Prohibido. |

**Seleccionado: B.**

---

## 5. Routing A/B/C/D e intent

### Intents existentes (no padres de este hilo)

| Intent | Por qué no es el padre |
|--------|------------------------|
| `taller_at` | Unidad **nombrada** + `YYYY-MM` + **todos** los tipos TALLER. Debe seguir existiendo. |
| `folio_status` | Etapa/estatus de folio o kanban. «¿En qué estatus va?» suelto lo robaría. |
| `folio_history` | Historial de **un** folio, no de unidad. |
| `expense_analysis` | GASTOS. |
| `investment_analysis` | INVERSIONES. |
| `igf_reviewable_supports` | Recorte IGF **de planta**. Hoy se traga «¿Todavía se puede detener?». |
| `client_profile` / `commercial_trend` / brief | Otros objetos. Preservar. |

### Routing

| Opción | Veredicto |
|--------|-----------|
| **A** sobrecargar `folio_status` | No. |
| **B** padre Taller Mayor / unidad | **Seleccionado.** Intent nuevo `taller_mayor`. Slots: periodo, `active_unit`, `active_folio`. |
| **C** phrasebook | Prohibido. |
| **D** segundo router LLM | Prohibido. |

**Seleccionado: B.** Un padre. Follow-ups no son intents nuevos.

`taller_at` se **reusa como fuente** (SELECT / expand / homologación), no como padre.

Precedencia: `isIgfReviewableSupportsQuestion` **no** gana si `parent_intent = taller_mayor` y hay `active_folio` (o unidad con un solo folio). Plant-wide reviewable se preserva cuando **no** hay folio/unidad de este hilo.

---

## 6. Lista y «el más alto»

La lista (misma planta, Taller Mayor, `mes_cargo` = periodo) debe poder producir por unidad:

- token canónico
- count de folios (tras expandir)
- `SUM(importe)`
- refs de folio (`folio_id`, `numero_folio`)
- estatus
- concepto registrado
- reviewability derivable por folio
- limitations / provenance

Varios folios en la misma unidad: **no se pierden**. Se listan.

**«¿Cuál tiene el importe / apoyo más alto?»** después de una lista **por unidad** = la **unidad** con mayor `SUM(importe)` en el hilo. No el folio suelto.

- Empate de unidades → clarificar. No silent pick.
- La unidad ganadora tiene N>1 folios → se selecciona la **unidad**, no un folio. «¿Qué folio es?» / «detener» con N>1 → clarificar folio.
- N=1 → `active_unit` + `active_folio` juntos.

---

## 7. Estado (routing, no evidencia)

| Slot | Contenido |
|------|-----------|
| `parent_intent` | `taller_mayor` |
| `planta_id` | planta del request |
| `active_period_months` | `YYYY-MM` de `mes_cargo` (ya existe el slot) |
| `active_unit` | token canónico (kind nuevo en `active_entities`, p. ej. `unit`) |
| `active_folio` | `folio_id` (+ display `numero_folio`) cuando esté resuelto |

No guardar filas, importes ni claims. **Requery** cada turno.

`sanitizeActiveEntities` hoy solo hidrata keys de `client` / AR. El IMPL debe aceptar kinds `unit` / `folio` **sin** tratarlos como `cliente_key`.

---

## 8. Reviewability (regresión)

Reglas **reusar** `classifyCancellationEligibility` (`lib/director-ia-igf-reviewable-supports.js`):

| Estatus | Grupo |
|---------|--------|
| `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS` | no cancelable |
| `CANCELADO` | excluido |
| Resto | reviewable = cancelable bajo reglas actuales |

El rol **no** cambia el conjunto; cambia quién puede cancelar en dashboard. Chat = **read-only**.

Invariantes: reviewable ≠ recomiendo cancelar ≠ ahorro ≠ reversión contable.

Con `active_folio`: aplicar la regla a **ese** folio. No listado IGF de planta.

Sin folio y N unidades/folios: clarificar. No inventar.

TALLER **sí** alimenta cubos IGF (no está en la exclusión INVERSIONES/DYO/COMISIONES). «¿Cómo afectaría al IGF si no entrara?» puede conservar el folio y, si se reusa el overlay live existente **filtrado a ese folio**, es lícito. First slice **no** exige escenario de planta.

---

## 9. Historial y «cuánto llevamos»

**«¿Qué otros Folios ha tenido esa unidad?»**

Default: misma planta + mismo token + **solo Taller Mayor** + periodos distintos del mes activo (o todos los meses Mayor). No mezclar GASTOS/INVERSIONES en silencio.

«¿Y de Taller?» / «todos los tipos» = ampliar tipos TALLER. «Todos los folios» = explícito.

**«¿Cuánto llevamos en reparaciones de esa unidad?»**

Default: hereda el periodo del hilo (`SUM` Taller Mayor). «En total» / «histórico» = expandir el horizonte **en voz alta**. No cambiar el mes en silencio.

---

## 10. Authz, GPT, partial-data

Authz: misma puerta de Folios que M5 (`assertFolioStatusAccess` / planta / `plantas_permitidas`). Fail-closed. Lectura ≠ permiso de cancelar. GA/GV: no ampliar IGF; este slice es Folios Taller, no KPI financiero ARR.

Runtime owns: identidad, folio, planta, periodo, clasificación Mayor, `SUM`, estatus, reviewability, historial, authz, provenance, ausencia.

GPT owns: síntesis, qué destaca, resumir el concepto **registrado**, qué investigar, wording de follow-up.

Prohibido: diagnóstico mecánico; «hay que cancelar porque es caro»; claim de ahorro.

Partial-data: unidad sin concepto; N folios; sin historial; mes sin filas Mayor. missing ≠ 0.

---

## 11. Contratos — G2 / G3

Chat legado. Read model. No IES. No Evidence Builder N1–N4. No Reasoning Engine N5. No schema. No SQL de producto.

Constitución / EKE / `04` / `05` **no** se tocan.

**G2 = N/A. G3 = N/A.**

---

## 12. First slice (exactamente uno)

```text
lista Taller Mayor del mes actual por unidad
  + seleccionar unidad / folio
  + detalle (concepto, folio, estatus, importe)
  + reviewability del folio seleccionado
  + historial básico Taller Mayor de esa unidad
```

Routing: inherit del padre; «detener» no abre IGF de planta si hay folio.

### Diferido

- mantenimiento predictivo / lifetime cost
- catálogo de unidades / placa / económico
- mutaciones / cancelación
- schema / SQL
- «mes pasado» robusto
- overlay IGF de planta
- extender `taller_at` a Mayor
- phrasebook

### Límites (READY_WITH_LIMITS)

1. Identidad = token homologado, no económico/placa.
2. Multi-unidad se expande; no se fusiona.
3. `taller_at` y `folio_status` se preservan.
4. `UNSUPPORTED_RULES.taller_at` + `matchesAllowedReadableIntent` deben dejar pasar el padre nuevo (hoy el canónico no choca; «taller»+«unidad» sí entra a M5).
5. IGF hipotético de un folio = reuso filtrado o limitation; no contabilidad nueva.

---

## 13. Tests de diseño (si se autoriza IMPL)

Hold-outs en **tests**, no en `lib/`.

Lista → unidad → detalle → reviewability → historial. Regresiones: IGF reviewable de planta, `folio_status`, `taller_at`, `client_profile`, `commercial_trend`, topic return, brief, suite completa.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** No es cobertura de módulo. M5 **sigue PARTIAL**.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001`

STOP.
