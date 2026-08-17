# Reporte — ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
runtimes_inspected:
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "lib/director-ia-e2e.js"
  - "test/director-ia-e2e.test.js"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-E2E-001.md"
  - "fixtures/director-ia/"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK lista "conflict classification requires classification_criterion".
    02 §9 exige classification_criterion para N4 (diagnóstico), no como campo del
    objeto de conflicto §11. 04 §conflicts[] tampoco declara ese campo. La
    "regla de tipificación del Builder" aparece en la fila OPEN de 02 §11.
    Congelar classification_criterion sobre el objeto conflicto sería G2; no se
    resolvió.
  - >
    02 §19 D4 vacía explícitamente absence/resolution/causal/materiality.
    evidence_rules también está vacío en runtime. D4 no prohíbe un catálogo
    futuro de evidence_rules no causales; sí prohíbe inventar rules para tests.
    Poblar el catálogo es decisión G2, no calibración G8 por sí sola.
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-EVIDENCE-N3-001. G2/G8 permanecen PENDING_IF_REQUIRED y no se autoaprobaron."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2: PENDING_IF_REQUIRED. Decisiones físicas identificadas en §13; no se resolvieron."
  - "G8: PENDING_IF_REQUIRED. Materias reservadas identificadas en §14; no se calibraron."
  - "G3 permanece N/A."
  - "Veredicto: NO-GO para IMPL-EVIDENCE-N3-001."
```

## Ejecución

- Rama: `architecture/evidence-n3-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T16:00:34-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `PENDING_IF_REQUIRED`. **No usado.** Toda decisión que exigiría editar `02` u otro contrato se identificó y **no** se resolvió.
- G8: `PENDING_IF_REQUIRED`. **No usado.** No se fijaron `wi`, `k`, Fs, umbrales, materiality, severity ni reglas causales.
- G3: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin evidence rules, conflict classifier, thresholds, causal/resolution/materiality rules, tests ni fixtures nuevos. Sin commit, push, merge. Sin IMPL-EVIDENCE-N3-001.

Numeración: **D1–D20** son las `audit_questions` de `CURRENT_TASK.md`. No se confunden con **D1–D15** físicos de `02` §19.

Ninguna categoría N3 ni tipo A–E queda implementable por aparecer aquí. No se inventaron umbrales, causalidad, Tipo E ni evidence para desbloquear el Reasoning Engine.

---

## 1. Executive result

N3 está vacío por **fail-closed contractual**, no por bug. `RULE_REGISTRY.evidence_rules` es `Object.freeze([])`. `to_n3()` corta en ese vacío y devuelve `[]` aunque existan facts N2. `to_n4()` usa el mismo corte: sin `evidence_rules` no hay diagnósticos. El clasificador físico `tipifyConflicts` solo agrupa `entity|metric_or_event|period` y, si hay ≥2 values distintos, emite `primary_type: "A"`, `OPEN`, `governance_escalation: false`. No existe clasificador B/C/D/E. Tipo E solo sobrevive si ya entra por `emit_bundle`; `assemble` nunca lo produce.

Eso no autoriza fabricar N3 para desbloquear hipótesis. `05` D5/D9 y el E2E vigente son fail-closed: `evidence[]` vacío → 0 hipótesis / 0 recommendations sustantivas.

**Separación (no un único blocker):**

| Franja | ¿Implementable ya sin G8? | ¿Bloquea IMPL-EVIDENCE-N3-001 hoy? |
|--------|---------------------------|-------------------------------------|
| N3 contradicción no causal + `MATERIALITY_NOT_ASSESSED` + `causal_status=NON_CAUSAL` | Semántica sí; **catálogo/identity de `evidence_rule` exige G2** | Sí, hasta G2 de schema/identity/alcance v1 |
| Conservar default Tipo A por tensión de valor | Ya existe; no requiere G8 | No (ya está en runtime) |
| Co-ocurrencia / tendencia / desviación / deterioro | Nombres contractuales; faltan referencias, pares, periodos comparables y, si hay umbral, G8 | Sí (PHYSICAL_UNKNOWN + DATA_GAP; umbrales = G8) |
| Clasificador B/C/D/E | Constitución nombra tipos; **classification_criterion operativo no congelado** | Sí (G2). Tipo E además DATA_GAP |
| Severity / impacto productivos | Después del tipo (`02` §11, Constitución IV) | G8 (`02` §18) |
| Causal N3 / `CAUSAL_RULE_APPROVED` | Prohibido hasta regla causal versionada | G8 + gobernanza Motor |
| `RESOLVED` / `SUPERSEDED` / `UNDER_REVIEW` como máquina completa | `OPEN` ya se emite | G2 + `resolution_rules` no vacíos |
| `MAT_*` / confianza numérica N3 | N3 deriva/preserva; sin G8 solo `NOT_ASSESSED` / dimensiones null | G8 no bloquea N3 no causal con `NOT_ASSESSED` |

**Veredicto: NO-GO para IMPL-EVIDENCE-N3-001.** La auditoría se completa sin modificar contratos ni runtime. Un IMPL estrecho de contradicción no causal + default A **podría** ser GO condicionado **solo tras G2 humano**; esta tarea no lo crea ni lo autoriza.

---

## 2. Contracts/runtime inspected

| Superficie | Uso |
|------------|-----|
| Constitución III | N3 = relaciones determinísticas entre ≥2 hechos con reglas; ninguna evidencia sin hechos |
| Constitución IV | Tipos A–E; tipo antes que severidad; no promediar; permanece abierto hasta evidencia suficiente |
| Constitución V | Tipo E: exponer, no suavizar, no acusar mala fe; reportado vs verificado; ausencia de acción/responsable/evidencia |
| EKE §5 | Tipos mínimos N3 (correlación, desviación, tendencia, ausencia de mitigación, incumplimiento, recuperación/deterioro, contradicción, riesgo emergente/oportunidad); prohibida causalidad informal |
| EKE §8 | Tabla A–E de aplicación; Tipo E = responsable/permiso/estado inconsistente; actividad reportada vs verificada; ausencia de acción, responsable o evidencia ante desviación |
| `02` §8 | Permitido/prohibido N3; `applied_rule` obligatorio |
| `02` §9 | N4 exige `classification_criterion` + soporte; severidad después de tipificar |
| `02` §11 / §11B | Objeto conflicto; máquina `resolution_status`; materiality N3 deriva/preserva; `confidence ≠ materiality ≠ severity` |
| `02` §18 | `wi`, `k`, umbrales de severidad, Fs, ventanas R, reglas causales = G8 |
| `02` §19 D3/D4/D9/D10 | Barreras secuenciales; conjuntos gobernados vacíos; no `RESOLVED` sin ruleset; `NOT_ASSESSED` hasta G8 |
| `04` §7 | Schema IES de `evidence[]`: `relation_type`, `applied_rule_id`, `supporting_fact_ids`, `causal_status`, `materiality` |
| `04` §conflicts | Tokens `CONF_TYPE_*`; `severity` independiente del tipo; no `GRAVE` como tipo |
| `05` | Sin `supporting_evidence_ids` no hay hipótesis/recommendation sustantiva; no fabricar evidence |
| Runtime EB | `RULE_REGISTRY` vacío; `to_n3`/`to_n4`/`tipifyConflicts`/`emit_bundle`/`assemble` |
| Tests EB | Barrera N3 vacía; Tipo E solo vía `emit_bundle`; no `RESOLVED` sin rule |
| E2E | Pipeline real: `evidence[]=[]`; Tipo A no E; overlay E no productivo |

---

## 3. Why N3 is empty today

### Por qué `RULE_REGISTRY.evidence_rules` vacío hace que `to_n3()` devuelva `[]`

Código literal (`lib/director-ia-evidence-builder.js`):

```js
function to_n3(n2) {
  if (!Array.isArray(n2) || n2.length === 0) return [];
  if (RULE_REGISTRY.evidence_rules.length === 0) return [];
  return [];
}
```

`RULE_REGISTRY.evidence_rules` es `Object.freeze([])`. El segundo `if` corta **aunque** `n2.length > 0`. El `return []` final es inalcanzable hasta que existan rules. Constitución III y `02` §8 prohíben relación sin `applied_rule`. `02` §19 D3: listas vacías son válidas y no equivalen a salto de nivel. D4: no se inventan reglas para completar tests. El test `ningún N3 sin N2` afirma `n3 === []` y `evidence_rules.length === 0`.

Esto es **fail-closed**, no omisión accidental.

### Por qué `to_n4()` queda igualmente vacío

```js
function to_n4(n3, context) {
  const facts = (context && context.facts) || [];
  if ((!Array.isArray(n3) || n3.length === 0) && facts.length === 0) return [];
  if (RULE_REGISTRY.evidence_rules.length === 0) return [];
  return [];
}
```

N4 exige `classification_criterion` + soporte (`02` §9). El runtime **acopla** N4 al mismo `evidence_rules` vacío; no hay `diagnosis_rules` en el registry. Aunque haya facts, el segundo `if` corta. N3 vacío + registry vacío ⇒ `diagnoses[]` vacío. No es un salto de nivel: es barrera D3.

### Por qué el clasificador físico emite `primary_type: "A"`

`tipifyConflicts` agrupa por `factKey = entityId|metric_or_event|period`. Si el grupo tiene ≥2 facts y `JSON.stringify(value)` produce ≥2 valores distintos → un conflicto con:

- `primary_type: "A"`
- `secondary_types: []`
- `weight_assessment: null`
- `resolution_status: "OPEN"`
- `applied_resolution_rule_id: null`
- `interpretation_constraint: "no_resolve_by_weight"`
- `governance_escalation: false`

No hay rama B, C, D ni E. Periodos distintos **no** agrupan (el periodo está en la clave) → ni siquiera conflicto, aunque EKE Tipo B sea “mismo concepto, periodos distintos presentados como vigentes”. E2E `type-e-conflict.json` confirma: dos `venta_t` distintas, misma entidad/periodo → `CONF_TYPE_A_DATA`, no E. El overlay Tipo E está etiquetado `not_from_assemble`.

`emit_bundle` conserva Tipo E si ya viene; el filtro `visible` no oculta E. `assemble` **nunca** lo produce.

---

## 4. D1–D20 findings

### D1 — Interfaz física mínima de `evidence_rule`

**Clasificación: REQUIRES_G2** (forma de identity/schema); semántica mínima **CONTRACTUAL**.

Contrato exige: relación entre ≥2 hechos (`Constitución III`), `applied_rule` identificable (`02` §8), `supporting_fact_ids` existentes (`04` §7), `relation_type` del catálogo Motor §5, `causal_status` (`NON_CAUSAL` default seguro), `materiality` derivada o `MATERIALITY_NOT_ASSESSED` (`02` §11B).

El runtime no define campos de una rule. Inventar `{id, match, emit}` sería norma. G2 debe congelar identity/versión/campos de `evidence_rule` v1 **antes** de IMPL. G8 no es necesario para una rule de contradicción sin umbral.

### D2 — Categorías N3 candidatas

| Categoría | Clasificación | Notas |
|-----------|---------------|-------|
| CONTRADICTION | CONTRACTUAL (nombre + permitido `02` §8 / EKE §5); identity REQUIRES_G2 | Señales N2 ya existen (mismo grouping que Tipo A). Sin threshold. No es Tipo E. |
| CO_OCCURRENCE | PHYSICAL_UNKNOWN + DATA_GAP; umbral si se exige “fuerza” = REQUIRES_G8 | Contrato permite co-ocurrencia bajo regla. Falta catálogo de pares de métricas/eventos. |
| TREND | PHYSICAL_UNKNOWN + DATA_GAP; dirección con umbral = REQUIRES_G8 | Exige hechos comparables entre periodos. “Comparable” no está congelado. |
| DEVIATION | PHYSICAL_UNKNOWN + DATA_GAP + REQUIRES_G8 si hay magnitud | Exige referencia/compromiso. N2 actual no trae baseline. |
| DETERIORATION | PHYSICAL_UNKNOWN + DATA_GAP + REQUIRES_G8 | EKE: mejora/empeoramiento bajo regla. Sin serie ni umbral de empeoramiento. |
| CONSISTENCY_RELATION | No es tipo N3 | `02` §7: Cs es dimensión de confianza del **hecho**. No colapsar a `relation_type`. |

No se aprueba ninguna categoría por conveniencia.

### D3 — Shape de input/output

**Clasificación: CONTRACTUAL** para campos N2 existentes y campos IES de evidence; **REQUIRES_G2** para el objeto rule.

Facts N2 actuales (`to_n2`): `fact_id`, `statement` (`restated_observation`), `metric_or_event`, `value`, `unit`, `period`, `entity`, `supporting_observation_ids`, `absence_state`, `confidence` (Fs/R/Cb/Cs/Cb_ov todos `null`), `materiality` (`MATERIALITY_NOT_ASSESSED`), `applied_materiality_rule_id` (`null`).

No hay: responsable, permiso, estado de gobernanza, actividad reportada vs verificada, acción abierta, baseline, compromiso, `classification_criterion`.

Salida N3 mínima según `04` §7: `evidence_id`, `relation_type`, `statement_token`, `supporting_fact_ids`, `applied_rule_id`, `confidence`, `scope`, `causal_status`, `materiality`, `traceability`. `02` no serializa el objeto N3 con el mismo detalle que `04`; el Bundle debe pasar `validate_structure` (D12). Congelar el objeto N3 de Bundle vs proyección IES = G2 si hay divergencia.

### D4 — Soporte mínimo

**Clasificación: CONTRACTUAL.**

Constitución III: ≥2 hechos. `04`: `supporting_fact_ids` deben existir en `facts[]`. Lineage se hereda de esos facts/observaciones (D5/D6 de `02` §19: IDs opacos; lineage 03A preservado; no `k`). Un solo fact no autoriza N3. Listas vacías no saltan el nivel.

### D5 — Identity de `applied_rule`

**Clasificación: REQUIRES_G2.**

Hoy `ruleset_versions.evidence_builder = "2.1"` y `physical = evidence-builder-2.1-physical-v1`. No hay IDs de evidence rules. Un string interno de implementación no es norma institucional. G2 debe decidir: namespace, versión, quién autoriza el alta, y que el código no se convierta en catálogo tácito. G8 no versiona identity.

### D6 — Materiality N3

**Clasificación: CONTRACTUAL** para preservar `MATERIALITY_NOT_ASSESSED`; **REQUIRES_G8** para `MAT_*`.

`02` §11B: N3 **deriva/preserva** desde facts soporte (p. ej. máximo determinista de `MAT_*` ya evaluados) o `NOT_ASSESSED`; no evaluación libre. Facts actuales son todos `NOT_ASSESSED`. Emitir `NOT_ASSESSED` + `applied_materiality_rule_id: null` **no requiere G8**. Emitir `MAT_*` sí. Prohibido usar materiality como severity.

### D7 — Confidence N3

**Clasificación: CONTRACTUAL** (pertenece al hecho; sin producto calibrado); **REQUIRES_G8** para score numérico.

`02` §4: confianza del **hecho**; `wi`/`k` pendientes. Runtime: dimensiones null. `04` exige campo `confidence` en evidence. Sin G8: exponer dimensiones no calibradas o no afirmar precisión (`02` §18, D7). Inventar un score N3 propio o usar confidence como clasificador de conflicto está prohibido.

### D8 — Frontera causal

**Clasificación: CONTRACTUAL** (prohibición); causal productiva **REQUIRES_G8**.

Sin `causal_rules`: solo `NON_CAUSAL` o correlación declarada como correlación (`04` `causal_status`). Prohibido “por eso”, “causa”, “provoca” (`02` §8). `CAUSAL_RULE_APPROVED` / `CONTRIBUTION_QUANTIFIED` exigen regla causal versionada (`02` §18). Lista vacía por defecto.

### D9 — Interfaz del clasificador A–E

**Clasificación: REQUIRES_G2.**

`02` §11 define el objeto (`primary_type`, `secondary_types`, `weight_assessment`, `resolution_status`, …) y dice que OPEN exige “regla de tipificación del Builder”. No congela `classification_criterion` como campo del conflicto. `04` proyecta tokens `CONF_TYPE_*` y exige `severity`/`impact`/`confidence` en IES — esos tres no están en el objeto Bundle §11. Mapear Bundle→IES sin inventar severity = G2 o dejar severity IES no productiva hasta G8.

El default A actual **no** es classification_criterion institucional; es heurística de tensión de valor.

### D10 — Tipo A

**Clasificación: CONTRACTUAL** (significado); criterio físico actual **CONTRACTUAL-aplicado** con límite.

EKE: “Dos hechos incompatibles sobre la misma entidad/métrica/periodo”. El runtime implementa exactamente esa clave + values distintos. Eso es el único tipo con criterio físico vigente. No se redefine. No se convierte en E.

### D11 — Tipo B

**Clasificación: PHYSICAL_UNKNOWN + REQUIRES_G2.**

EKE: “Mismo concepto, periodos distintos presentados como vigentes”. El `factKey` **incluye** `period`, así que dos periodos no se agrupan y **no** generan conflicto. Falta criterio operativo de “presentados como vigentes” (¿flag? ¿mismo statement? ¿ausencia de vigencia?). Inventarlo sería G2. No es G8 (no es umbral numérico).

### D12 — Tipo C

**Clasificación: PHYSICAL_UNKNOWN + REQUIRES_G2 + DATA_GAP.**

EKE: “Misma observación, reglas distintas (no se elige una en silencio)”. N2 no transporta “regla de interpretación” alternativa. `evidence_rules` está vacío: no hay dos rules aplicables al mismo observation_id. Sin esa señal, no hay clasificador C.

### D13 — Tipo D

**Clasificación: PHYSICAL_UNKNOWN + REQUIRES_G2.**

EKE: “Un modelo afirma cobertura completa y otro dominio crítico está `NO_CONOZCO`”. Cobertura del Bundle es un agregado (`applyCoverage` → `EXISTE_CONFLICTO` si hay OPEN). No hay objeto “modelo afirma CONOZCO completo” vs dominio crítico `NO_CONOZCO`. Qué es “dominio crítico” es política, no umbral G8. Señales parciales existen en `acquisition_statuses` / `source_health`; el criterio de tipificar D no está congelado.

### D14 — Tipo E

**Clasificación: BLOCKER productivo + DATA_GAP + REQUIRES_G2** (criterio de señales). **No** REQUIRES_G8 para *tipificar*.

Constitución V + EKE §8: responsable/permiso/estado inconsistente; actividad reportada vs verificada; ausencia de acción, responsable o evidencia ante desviación. N2 actual no emite esas señales. Contradicción de `value` **no** es E. `governance_escalation` es obligatorio cuando el tipo ya es E (`02` §11); no se infiere por materiality ni confidence. Ver §7.

### D15 — `secondary_types`

**Clasificación: REQUIRES_G2.**

El campo existe (`[]` hoy). Contrato no da algoritmo de concurrencia ni ranking. Un conflicto puede ser A+E solo si **ambos** criterios se cumplen. Sin criterios B–E operativos, `secondary_types` permanece vacío. Inventar ranking = prohibido.

### D16 — Severity

**Clasificación: REQUIRES_G8.**

Constitución IV / `02` §9/§11: severity **después** del tipo. `02` §18: umbrales de severidad no fijados. `04` exige `severity` e `impact` en IES. El Bundle §11 no lista `severity` como campo del objeto EB. Materiality ≠ severity. Weight no cierra. Sin G8 no hay mapeo ordinal productivo. Un IMPL N3 no debe inventar GRAVE/CRÍTICO.

### D17 — Resolution

**Clasificación: CONTRACTUAL** para `OPEN` y fail-closed; máquina completa **REQUIRES_G2** + sets no vacíos (no G8).

D9 `02` §19: sin ruleset de resolución no se emite `RESOLVED`. `weight_assessment` nunca cierra. Runtime degrada `RESOLVED` sin `applied_resolution_rule_id` o con `resolution_rules=[]` a `OPEN`. `UNDER_REVIEW` / `SUPERSEDED` exigen reglas de revisión/supersesión distintas (`02` §11). `OPEN` al tipificar **ya** es implementable.

### D18 — Dependencia N4

**Clasificación: CONTRACTUAL** (barrera); IMPL-N4 fuera de alcance.

N4 exige classification_criterion + soporte en facts y/o evidence (`02` §9). Taxonomía Motor §6. N3 vacío no impide N4 *si* una diagnosis_rule citara solo facts — pero el runtime ata N4 a `evidence_rules`. Abrir N4 ahora reabriría identity de diagnosis rules (G2) y no es esta tarea. Mínimo útil: al menos N3 no causal o diagnosis_rules explícitas + soporte. No se abre IMPL-N4.

### D19 — Readiness productiva con facts actuales

**Clasificación: DATA_GAP** para casi todo; CONTRADICTION **físicamente señalizable** sin G8.

Con N2 actual (restatement 1:1 de observación: métrica, valor, periodo, entidad) lo único detectado sin nueva fuente es **tensión de valores** (ya Tipo A). Una evidence de contradicción podría citar esos `fact_id` **si** G2 autoriza `applied_rule_id`. No hay datos para B/C/D/E, tendencia, desviación, deterioro, ausencia de mitigación, incumplimiento. Ver §12.

### D20 — GO/NO-GO

**NO-GO** para `IMPL-EVIDENCE-N3-001`. Ver §16.

Separación:

- (a) Implementable **sin G8** (tras G2, no ahora): contradicción no causal; default A; `OPEN`; `MATERIALITY_NOT_ASSESSED`; `NON_CAUSAL`; conservar E si ya viene.
- (b) G2: schema/identity de evidence_rule; alcance v1 de categorías; si v1 incluye clasificador A–E o solo A; criterio operativo B/C/D/E; `classification_criterion` en conflicto vs solo N4; Bundle vs IES severity.
- (c) G8: `wi`/`k`/Fs/R; `MAT_*`; umbrales de severidad; reglas causales; cualquier umbral de desviación/tendencia/deterioro.
- (d) Datos/tools: responsable, permiso, reportado vs verificado, acción abierta, baseline/compromiso, vigencia temporal, pares de métricas, contratos de tool para `ABSENCE_CONFIRMED`.

---

## 5. N3 rule readiness matrix

| rule_category | contract authority | required fact inputs | output semantic | causal | requires threshold | requires G8 | physical readiness | classification | notes |
|---------------|--------------------|----------------------|-----------------|--------|--------------------|-------------|--------------------|----------------|-------|
| CONTRADICTION | Constitución III; `02` §8; EKE §5 contradicción | ≥2 facts, misma entidad/métrica/periodo, values incompatibles | Relación de incompatibilidad; `relation_type` contradicción; `NON_CAUSAL` | NO | NO | NO | Señales N2 presentes; falta `evidence_rule` identity | CONTRACTUAL + REQUIRES_G2 (catalog) | No es Tipo E. No usa materiality/confidence para clasificar. |
| CO_OCCURRENCE | `02` §8 co-ocurrencia; EKE correlación | ≥2 facts; regla de qué pares co-ocurren | Correlación/co-ocurrencia declarada como tal | NO | NO salvo que la rule exija magnitud | Solo si hay umbral de “fuerza” | Sin catálogo de pares | PHYSICAL_UNKNOWN + DATA_GAP | `CORRELATED` ≠ causal. |
| TREND | `02` §8 tendencia; EKE tendencia | Hechos comparables, ≥2 periodos, misma métrica/entidad | Dirección entre periodos | NO | YES si “dirección” exige delta mínimo | YES si hay umbral | Periodos comparables no congelados; N2 no marca series | PHYSICAL_UNKNOWN + DATA_GAP + REQUIRES_G8 si umbral | Sin umbral arbitrario. |
| DEVIATION | `02` §8 desviación; EKE desviación | Fact observado + fact/regla de referencia o compromiso | Diferencia respecto a referencia | NO | YES (qué cuenta como desvío) | YES | N2 sin baseline/compromiso | PHYSICAL_UNKNOWN + DATA_GAP + REQUIRES_G8 | Anomalía `02` §7 no es error por sí sola. |
| DETERIORATION | EKE recuperación/deterioro | Serie comparable + regla de empeoramiento | Empeoramiento bajo regla | NO | YES | YES | Sin serie ni regla | PHYSICAL_UNKNOWN + DATA_GAP + REQUIRES_G8 | No inferir “caída” causal. |
| NON_COMPLIANCE / ABSENCE_OF_MITIGATION | `02` §8 si la regla lo define; EKE incumplimiento / ausencia de mitigación | Compromiso/vencimiento + (no)acción; o problema + acción abierta | Incumplimiento o problema sin mitigación | NO | Depende de la rule | NO para tipificar existencia; G8 si hay umbral de atraso | N2 sin acción/responsable/vencimiento | DATA_GAP + REQUIRES_G2 (definir rule) | Cercano a señales Tipo E; no colapsar a E sin criterio. |
| EMERGING_RISK / OPPORTUNITY | EKE §5 | Patrones definidos por regla | Patrón de riesgo/oportunidad | NO por defecto | Probable YES | YES si el patrón es numérico | Sin patterns | PHYSICAL_UNKNOWN + REQUIRES_G2 + probable G8 | No implementar en v1. |
| CONSISTENCY_RELATION | `02` §7 Cs | N/A como N3 | Dimensión de confianza del hecho | NO | G8 para score Cs | YES para Cs numérico | No es `relation_type` | No colapsar | Prohibido usarlo como tipo N3. |
| CAUSAL_RELATION | `02` §8 prohibido; `02` §18; `04` causal_status | Regla causal aprobada + facts | `CAUSAL_RULE_APPROVED` | YES | Según rule | YES | `causal_rules=[]` | REQUIRES_G8 | Prohibido informal. |

---

## 6. Conflict A–E readiness matrix

| type | contractual meaning | required signals | classification_criterion | governance_escalation | severity dependency | requires G8 | physical readiness | notes |
|------|---------------------|------------------|--------------------------|----------------------|---------------------|-------------|--------------------|-------|
| TYPE_A | Conflicto de datos: hechos incompatibles misma entidad/métrica/periodo (EKE §8) | ≥2 facts; misma clave; values distintos | Implícito en runtime: `factKey` + `JSON.stringify(value)`. No hay ID de criterio versionado | `false` hoy | Severity **después** del tipo; umbrales G8 | NO para tipificar; YES para severity productiva | READY (default vigente) | No convertir en E. Weight no resuelve. |
| TYPE_B | Conflicto temporal: mismo concepto, periodos distintos presentados como vigentes | Mismo concepto; periodos distintos; señal de “vigente” | No congelado. Runtime **no** agrupa periodos distintos | No por ser B | Después del tipo | NO para tipificar | NOT READY | G2: qué es “presentado como vigente”. |
| TYPE_C | Conflicto de interpretación: misma observación, rules distintas | Mismo `observation_id` / hecho; ≥2 rules aplicables; no elegir en silencio | No congelado | No por ser C | Después del tipo | NO para tipificar | NOT READY | DATA_GAP: N2 no lleva rules de interpretación. |
| TYPE_D | Conflicto de cobertura: un modelo afirma cobertura completa y dominio crítico está `NO_CONOZCO` | Afirmación de cobertura completa + dominio crítico `NO_CONOZCO` | No congelado. `applyCoverage` no emite tipo D | No por ser D | Después del tipo | NO para tipificar | NOT READY | “Dominio crítico” = G2/política, no umbral G8. |
| TYPE_E | Gobernanza: responsable/permiso/estado inconsistente; reportado vs verificado; ausencia de acción, responsable o evidencia ante desviación | Señales de gobernanza en facts/observaciones (hoy ausentes) | No congelado. No existe en `assemble` | `true` **cuando el tipo ya es E** (`02` §11) | Después del tipo; no usar MAT_* como proxy | NO para tipificar | BLOCKED (datos + criterio) | Ver §7. Conservación sí está implementada en `emit_bundle`. |

Qué falta para B/C/D/E **sin inventar norma**:

- **B:** criterio de vigencia concurrente (G2) + facts que no escondan el periodo en la clave de grouping, o un grouping distinto autorizado.
- **C:** transporte de “regla de interpretación aplicada” o dos `applied_rule` sobre la misma observación (G2 + datos).
- **D:** definición de “modelo afirma cobertura completa” y “dominio crítico” (G2); mapear `acquisition_statuses` a ese criterio.
- **E:** señales N2 de responsable/permiso/estado/reportado/verificado/acción (DATA_GAP) + criterio de cuáles combinaciones obligan E (G2). No usar contradicción A.

---

## 7. Type E exact blocker analysis

Tipo E **no** está bloqueado por G8. Está bloqueado por **ausencia de señales en N2** y por **falta de classification_criterion operativo** (G2).

Hechos actuales (`to_n2`) son restatements de observación: métrica, valor, unidad, periodo, entidad. No hay:

- responsable / owner / permiso / rol inconsistente;
- estado de gobernanza (asignado vs ejecutado, autorizado vs vigente);
- actividad reportada vs actividad verificada;
- acción abierta, vencimiento, evidencia de mitigación;
- desviación ya tipificada como N3 a la que “falte” acción.

El fixture E2E `type-e-conflict.json` es dos ventas distintas. `assemble` → Tipo A. El overlay E está marcado `not_from_assemble` / `not_productive_n3`.

Asignar E a esa tensión sería **inventar Tipo E** y violaría: Constitución V (E es gobernanza, no dato), EKE §8, y la regla de esta tarea (“no convertir contradicción simple en Tipo E”).

Lo que **sí** existe y debe conservarse:

- Si un Bundle ya declara `primary_type: "E"` (o secondary E), `emit_bundle` no lo oculta ni lo suaviza.
- Tests EB y E2E demuestran conservación, no producción.
- `governance_escalation` es consecuencia del tipo E, no un score.

Blocker de Tipo E: **DATA_GAP + REQUIRES_G2**. No se resuelve en esta tarea. No se fabrica evidence de gobernanza para desbloquear RE.

---

## 8. Materiality / confidence / G8 boundary

| Concepto | Dueño | Hoy | Sin G8 permitido | G8 obligatorio | Prohibido |
|----------|-------|-----|------------------|----------------|-----------|
| Materiality N2 | Motor §7A + `02` §11B | `MATERIALITY_NOT_ASSESSED` | Preservar `NOT_ASSESSED` | `MAT_*` productivo | Degradar a `MAT_LOW`; usar como severity o como tipo de conflicto |
| Materiality N3 | Deriva/preserva | N/A (N3 vacío) | Propagar `NOT_ASSESSED` o máximo de `MAT_*` **ya** evaluados | Evaluar `MAT_*` nuevo | Evaluación libre en N3 |
| Confidence hecho | `02` §4–§7 | Fs/R/Cb/Cs/Cb_ov = `null` | Exponer dimensiones sin producto | `wi`, `k`, Fs, ventanas R | Score N3 inventado; confidence como clasificador A–E |
| Severity conflicto | Constitución IV; `02` §18 | No emitida en objeto Bundle §11 | Omitir o no afirmar ordinal productivo | Umbrales de severidad | `GRAVE` como tipo; materiality como severity |
| Tipo de conflicto | Constitución / EKE | Solo A | Tipificar A (y B–E si hay criterio+señales) | No | Usar confidence/materiality para elegir tipo |

G8 **no** bloquea N3 contradicción no causal con `NOT_ASSESSED` y `NON_CAUSAL`. G8 **sí** bloquea pretender precisión numérica, `MAT_*`, severity productiva y causalidad.

---

## 9. Causal boundary

**Determinístico y no causal (sin G8):** contradicción, co-ocurrencia/correlación-como-correlación, y —si existieran rules y datos— tendencia/desviación/incumplimiento descritos sin lenguaje causal (`02` §8 permitido). `causal_status = NON_CAUSAL` o `CORRELATED`.

**Prohibido hasta regla causal aprobada (G8 + gobernanza Motor):** “causa”, “debido a”, “provoca”, “explica la caída”, `CAUSAL_RULE_APPROVED`, `CONTRIBUTION_QUANTIFIED`, hipótesis del RE dentro del EB.

N3 no es el lugar para desbloquear el Reasoning Engine con causalidad informal. RE exige evidence IDs existentes; no al revés.

---

## 10. Resolution boundary

| Estado | ¿Ahora? | Qué falta |
|--------|---------|-----------|
| `OPEN` | Sí. `assemble` lo emite. Fail-closed correcto | Criterio A versionado (G2) si se quiere `applied` tipification rule id |
| `UNDER_REVIEW` | No productivo | Regla/gobernanza de revisión (G2); no baja severity; no oculta E |
| `RESOLVED` | Prohibido sin `applied_resolution_rule_id` + evidence nueva/suficiente + `resolution_rules` no vacío | G2 + set no vacío. No es G8. Weight nunca basta |
| `SUPERSEDED` | No productivo | Regla de supersesión distinta (G2); no usar para esconder |

`emit_bundle` ya degrada `RESOLVED` inválido a `OPEN`. Eso debe conservarse.

---

## 11. Data / source gaps

Bloquean N3/conflictos **aunque** G2 apruebe schema:

| Señal faltante en N2/OP actual | Impide |
|-------------------------------|--------|
| Responsable, permiso, estado de gobernanza | Tipo E |
| Actividad reportada vs verificada | Tipo E (Constitución V) |
| Acción abierta / vencimiento / mitigación | EKE ausencia de mitigación; parte de E; incumplimiento |
| Baseline / compromiso / referencia | DEVIATION |
| Serie temporal comparable + vigencia | TREND; Tipo B |
| Dos rules de interpretación sobre la misma observación | Tipo C |
| Afirmación de cobertura completa por modelo + dominio crítico | Tipo D |
| Catálogo de pares de métricas | CO_OCCURRENCE |
| Contrato de tool que prueba inexistencia + `absence_rules` | `ABSENCE_CONFIRMED` (D8 `02` §19); no es N3 pero bloquea hechos negativos |

Estas gaps no se llenan con LLM ni con umbrales.

---

## 12. Productive N3 feasibility

Con facts actuales (restatement 1:1, confidence null, materiality no evaluada):

1. **Ya ocurre:** conflicto Tipo A OPEN cuando dos values discrepan en la misma clave. Cobertura `EXISTE_CONFLICTO`. `evidence[]` vacío. RE: 0 hyp/rec. Correcto.
2. **Única N3 físicamente señalizable sin nueva fuente:** contradicción entre esos facts. Requiere `applied_rule_id` institucional (G2). Sin G8. `NON_CAUSAL`. `MATERIALITY_NOT_ASSESSED`.
3. **No productiva hoy:** tendencia, desviación, deterioro, co-ocurrencia (salvo rule de pares), incumplimiento, riesgo emergente, N4, B/C/D/E.
4. **No se fabrica N3** para que RE emita hipótesis. `05` lo prohíbe. El vacío es el comportamiento constitucional.

Viabilidad productiva real de N3: **nula en runtime vigente**; **estrecha y condicional** (solo contradicción) después de G2; **amplia** solo con datos nuevos + (si hay umbrales) G8.

---

## 13. G2 decisions required

No aprobadas. No escritas en `docs/director-ia/`.

1. Schema e identity de `evidence_rule` v1 (campos, versión, quién autoriza el alta).
2. Alcance v1: ¿solo CONTRADICTION o también otras categorías no umbralizadas?
3. ¿El primer IMPL es solo N3 contradicción + conservar default A, o incluye clasificador A–E?
4. Criterio operativo Tipo B (“vigente”).
5. Criterio operativo Tipo C (qué cuenta como “misma observación, rules distintas”).
6. Criterio operativo Tipo D (“dominio crítico”, “modelo afirma cobertura completa”).
7. Criterio operativo Tipo E: combinaciones de señales que obligan E y `governance_escalation=true` (sin intuición).
8. ¿`classification_criterion` vive en el objeto conflicto Bundle, solo en N4, o como `applied_typification_rule_id`?
9. Mapear `severity`/`impact`/`confidence` exigidos por IES `04` desde un Bundle que hoy no los emite, **sin** inventar ordinales (¿G8 o campos no productivos?).
10. Si N4 sigue atado a `evidence_rules` o existe `diagnosis_rules` (fuera de IMPL N3, pero es acoplamiento físico real).

---

## 14. G8 decisions required

No calibradas.

- `wi`, `k`, escalado Fs, ventanas R (`02` §18).
- Ruleset de materiality (`MAT_*`).
- Umbrales de severidad / impacto por tipo de conflicto y diagnóstico.
- Reglas causales aprobadas (lista vacía).
- Cualquier umbral de desviación, tendencia o deterioro que HUMAN_APPROVER quiera productivo.
- Contratos de tool + `absence_rules` para `ABSENCE_CONFIRMED` (D8; frontera G8/gobernanza de tools).

G8 **no** es prerrequisito de: N3 contradicción no causal, default A, `OPEN`, `NOT_ASSESSED`, conservación de E.

---

## 15. Blockers

| ID | Blocker | Impide | No se resuelve aquí |
|----|---------|--------|---------------------|
| B1 | `evidence_rules=[]` + D4 no inventar rules | Cualquier N3 en `assemble` | G2 catalog |
| B2 | Sin classification_criterion operativo A–E | Sustituir default A por clasificador completo | G2 |
| B3 | N2 sin señales de gobernanza | Producir Tipo E | DATA_GAP + G2 criterio |
| B4 | Sin referencias/series/pares | TREND / DEVIATION / CO_OCCURRENCE / DETERIORATION | DATA_GAP; umbrales = G8 |
| B5 | `resolution_rules=[]` | `RESOLVED` / máquina completa | G2 + set |
| B6 | G8 pendiente | `MAT_*`, confidence calibrada, severity productiva, causal | G8 |
| B7 | Acoplamiento `to_n4` → `evidence_rules` | N4 útil | Fuera de alcance; G2 si se desacopla |

B1+B2 bloquean **IMPL-EVIDENCE-N3-001** como paquete. B3 no debe “resolverse” convirtiendo A en E. B6 no debe usarse para meter **todo** N3 en un solo blocker.

---

## 16. GO/NO-GO for IMPL-EVIDENCE-N3-001

**NO-GO.**

Razones (ninguna autoriza improvisar el IMPL):

1. No hay `evidence_rule` institucional. Implementar N3 ahora convertiría código en norma (D5).
2. El clasificador A–E no tiene criterios B–E congelados. Un IMPL “completo A–E” inventaría norma.
3. Tipo E no es producible desde facts actuales. Un IMPL que prometa E fabricaría gobernanza.
4. G2 no está autorizado en esta tarea. G8 no está autorizado. Esta auditoría no sustituye esos gates.
5. `implementation_followup_rule`: HUMAN_APPROVER revisa G2/G8 y el veredicto **antes** de crear IMPL. Esta tarea no crea IMPL-EVIDENCE-N3-001.

Franja que **un futuro G2** podría autorizar **sin G8** (no autorizada ahora): N3 CONTRADICTION no causal + `MATERIALITY_NOT_ASSESSED` + `NON_CAUSAL` + conservar Tipo A default + conservar E si ya viene + `OPEN`. Eso **no** es GO de esta tarea.

---

## 17. STOP

ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001 cerrado en `DONE_PENDING_REVIEW`.

G2 y G8 permanecen `PENDING_IF_REQUIRED`. No se modificó `docs/director-ia/`, ningún runtime, `server.js` ni `package.json`. No se crearon rules, classifier, thresholds, tests ni fixtures. No se creó IMPL-EVIDENCE-N3-001. Sin commit, push, merge ni siguiente tarea.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
