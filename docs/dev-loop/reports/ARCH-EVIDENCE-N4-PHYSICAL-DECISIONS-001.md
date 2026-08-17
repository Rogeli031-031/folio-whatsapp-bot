# Reporte — ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"
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
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
runtimes_inspected:
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-n3/"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "lib/director-ia-e2e.js"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    02 §9 exige classification_criterion en el ensamblaje N4. 04 §8 exige
    applied_rule_id en diagnoses[] IES. 02 §20 no congela schema Bundle de
    Diagnosis. No se unificó; unificar es G2.
  - >
    04 §8 marca severity, impact y confidence como obligatorios en IES.
    02 §18 deja umbrales de severidad sin calibrar (G8). No existe token
    contractual tipo SEVERITY_NOT_ASSESSED. Inventarlo sería G2; usarlo
    productivo sería G8. No se resolvió.
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-EVIDENCE-N4-001."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2: PENDING_IF_REQUIRED. Decisiones listadas en §15; no se autoaprobaron."
  - "G8: PENDING_IF_REQUIRED. Materias listadas en §16; no se calibraron."
  - "Veredicto: NO-GO para IMPL-EVIDENCE-N4-001."
```

## Ejecución

- Rama: `architecture/evidence-n4-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T17:00:56-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `PENDING_IF_REQUIRED`. **No usado.**
- G8: `PENDING_IF_REQUIRED`. **No usado.**
- G3: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin diagnostic rules, runtime N4, tests, fixtures, thresholds ni IMPL-EVIDENCE-N4-001. Sin commit, push, merge.

Numeración: **D1–D18** son las `audit_questions` de `CURRENT_TASK.md`. No se confunden con D1–D15 de `02` §19 ni D1–D16 de `02` §20.

N3 CONTRADICTION no se trata como Diagnosis. Tipo A no se trata como categoría N4. Severity ≠ impact ≠ materiality ≠ conflict type.

---

## 1. Executive result

N4 está vacío por contrato y por runtime: `to_n4()` retorna `[]`. `02` §20 D14 lo exige: la existencia de N3 no autoriza diagnósticos sin diagnostic rule. No hay `diagnostic_rules` en el registry. Solo existe `N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` v1.0.

El catálogo de **nombres** de categoría es contractual (Motor §6 / `04` §8). El **criterio operativo** que liga N3 CONTRADICTION o Tipo A a una de esas categorías **no** está congelado.

No hay franja N4 implementable **sin G2 y sin G8**.

Candidato más cercano (solo tras G2; no diseñado aquí): categoría `conflicto no resuelto` anclada a Evidence N3 CONTRADICTION + conflicto Tipo A `OPEN`, con `MATERIALITY_NOT_ASSESSED` y `classification_criterion` versionado. Aun esa franja exige G2 de identity/schema/criterio y una decisión G2 o G8 sobre `severity` / `impact` / `confidence` (obligatorios en `04`, umbrales no calibrados en `02` §18, sin token `NOT_ASSESSED` para severity).

**Veredicto: NO-GO para IMPL-EVIDENCE-N4-001.**

---

## 2. Contracts/runtime inspected

| Superficie | Uso |
|------------|-----|
| Constitución III | N4 = clasificación determinística; ningún diagnóstico sin regla y soporte; N5 = causal/probabilístico |
| Constitución IV–V | Tipo antes que severidad; Tipo E no se suaviza; no acusar mala fe |
| EKE §6 | Taxonomía mínima N4; dueño del contrato = EB; dueño de modelos = Motor; prohibidas causas probables y recomendaciones |
| EKE §7 | Modelos mentales (comercial, financiero, operativo, ejecutivo) |
| `02` §9 | `classification_criterion`; soporte facts y/o evidence; severity/impact **después** de tipificar conflictos |
| `02` §11 / §11B | Resolución no por weight; materiality N4 deriva o `NOT_ASSESSED`; `confidence ≠ materiality ≠ severity` |
| `02` §15 | N4 permitido: categoría + severidad + criterio + soporte |
| `02` §18 | Umbrales de severidad = G8 |
| `02` §19 D3/D4/D10 | Barreras; conjuntos gobernados vacíos; `NOT_ASSESSED` hasta G8 |
| `02` §20 D14 | N4 fuera del IMPL N3; N3 no autoriza N4 |
| `04` §8 | Schema IES de `diagnoses[]`; severity/impact/confidence/model obligatorios |
| `05` | N4 es ancla; RE no crea N4; hyp/rec pueden citar `supporting_diagnosis_ids` |
| Runtime EB | `to_n4()` = `[]`; sin `diagnostic_rules` |
| IES | `projectDiagnoses` clona el Bundle; no inventa N4 |
| RE/CP/E2E | Consumen `diagnoses[]` vacío de forma fail-closed |

---

## 3. Current N4 physical reality

```js
function to_n4() {
  return [];
}
```

`RULE_REGISTRY` tiene una `evidence_rule` CONTRADICTION. `absence_rules`, `resolution_rules`, `causal_rules`, `materiality_rules` vacíos. No existe set `diagnostic_rules`.

N1/N2 productivos. N3 productivo solo CONTRADICTION no causal, `MATERIALITY_NOT_ASSESSED`. Conflicto simple = Tipo A `OPEN`. Clasificador B/C/D/E no implementado. Tipo E solo si ya entra por `emit_bundle`.

Listas vacías de N4 son válidas (`02` §19 D3). No es un bug.

---

## 4. D1–D18 findings

### D1 — Schema físico mínimo

**Clasificación: PHYSICAL_UNKNOWN + REQUIRES_G2** (Bundle); **CONTRACTUAL** (campos IES en `04` §8, no implementables tal cual sin mapear).

`02` no congela un objeto Diagnosis de Bundle (a diferencia de Evidence N3 en §20). `04` §8 sí lista campos IES.

Mínimo **exigido por contratos** para que un diagnóstico exista (Constitución III + EKE §6 + `02` §9), sin inventar Bundle:

- identidad (`diagnosis_id`);
- categoría del catálogo Motor §6;
- `classification_criterion` / regla identificable;
- soporte en facts y/o evidence existentes;
- no hipótesis; no suavizar Tipo E.

Campos IES `04` adicionales obligatorios en **proyección**: `severity`, `impact`, `confidence`, `model`, `applied_rule_id`, `validity`, `coverage_token`, `coverage_state`, `materiality`. Congelar cuáles viven en Bundle vs IES = **G2**. No se redefine `04`.

### D2 — Registry de diagnostic rules

**Clasificación: REQUIRES_G2.**

N4 exige regla (`02` §9, EKE §6, Constitución III). El registry v1 actual es de **evidence** rules. `02` §19 D4 no lista `diagnostic_rules` como set gobernado; tampoco lo crea. Reutilizar `evidence_rules` para N4 mezclaría N3 y N4. Identity/versión/status de una diagnostic rule no está congelada. Sin G2 no hay rule ejecutable.

### D3 — Inputs de la rule

**Clasificación: CONTRACTUAL.**

`02` §9: soporte en **hechos y/o evidencias**. `04` §8: `supporting_fact_ids` y `supporting_evidence_ids` condicionales; al menos evidence o facts **según regla**. Una rule futura puede consumir solo N3, solo N2, o ambos. Esta auditoría no elige. N3 CONTRADICTION es input **legítimo** si una rule lo cita; no es input **suficiente** por sí solo.

### D4 — Soporte mínimo

**Clasificación: CONTRACTUAL** (al menos un banco); **REQUIRES_G2** (cuál exige cada rule).

Constitución: ningún diagnóstico sin soporte. IDs deben existir en el mismo Bundle. N4 no duplica N1/N2/N3 ni reescribe procedencia. Para un hipotético diagnóstico anclado a CONTRADICTION, el mínimo natural sería ≥1 `supporting_evidence_id` de esa Evidence (y los facts que ella ya cita). Eso **no** está escrito como rule; afirmarlo como norma sería G2.

### D5 — `classification_criterion`

**Clasificación: PHYSICAL_UNKNOWN + REQUIRES_G2.**

`02` §9 lo nombra como regla obligatoria. `04` usa `applied_rule_id`. No hay objeto físico (`rule_id` + `rule_version` + `status`) para diagnostic rules. Sin identity estable, N4 sería interpretación libre. G2 debe congelar forma (p. ej. paralelo a `applied_rule` de N3) **sin** convertir nombre de función JS en norma.

### D6 — Catálogo autorizado

**Clasificación: CONTRACTUAL** (nombres). No se crean categorías.

Únicas categorías: riesgo comercial; riesgo financiero; riesgo operativo; falla de ejecución; falla de gobernanza; riesgo de cumplimiento; oportunidad comercial; recuperación en curso; situación estable; información insuficiente; conflicto no resuelto.

Modelos (Motor §7): comercial, financiero, operativo, ejecutivo. Asignar modelo a categoría = G2 (no congelado).

### D7 — ¿CONTRADICTION permite N4 hoy?

**Clasificación: REQUIRES_G2** (criterio); señales **CONTRACTUAL/presentes**; no automático.

`conflicto no resuelto` existe en el catálogo. N3 CONTRADICTION afirma incompatibilidad de facts. Tipo A `OPEN` afirma conflicto de datos no cerrado. **Ningún contrato dice** “si hay CONTRADICTION entonces emitir `conflicto no resuelto`”. `02` §20 D14 lo niega expresamente como autorización automática.

No es riesgo, incumplimiento, deterioro ni causa. No retipifica A.

### D8 — Severity

**Clasificación: REQUIRES_G8** (ordinal productivo); **REQUIRES_G2** si se quiere placeholder; **no CONTRACTUAL** como enum usable hoy.

`02` §9: severity se calcula **después** del tipo de conflicto. `02` §15 incluye severidad en lo permitido de N4. `04` §8: campo obligatorio en IES. `02` §18: umbrales no fijados. `04` §C: etiquetas libres (`HIGH`, `MEDIUM` del ejemplo) son ilustrativas, no productivas.

No hay `SEVERITY_NOT_ASSESSED` en contratos. Inventarlo = G2. Calibrar ordinal = G8. Usar materiality o Tipo A como severity = prohibido.

¿Bloquea IMPL? **Sí**, salvo G2 que autorice un valor no calibrado explícito o G8 que fije el enum. Esta tarea no elige.

### D9 — Impact

**Clasificación: REQUIRES_G8** (tipificación productiva); **REQUIRES_G2** (si se difiere en Bundle).

`04` §8: `impact` obligatorio, “impacto tipificado”. `02` §9: impacto después de tipificar conflictos. Distinto de severity y de materiality (`02` §11B). Ejemplo IES `PARTIAL_SCOPE` es ilustrativo. Sin catálogo productivo de impact. No derivable de CONTRADICTION ni de Tipo A.

### D10 — Materiality

**Clasificación: CONTRACTUAL** para preservar `MATERIALITY_NOT_ASSESSED`; **REQUIRES_G8** para `MAT_*`.

`02` §11B: N4 deriva desde facts/evidence bajo rollup del ruleset, o `NOT_ASSESSED`. Facts y N3 actuales son `NOT_ASSESSED`. Emitir `NOT_ASSESSED` **no** requiere G8. Rollup `MAT_*` sí. Materiality no es severity.

N4 **puede existir** (si hubiera rule) con `NOT_ASSESSED`. Eso no basta para un IMPL completo por D8/D9/D5.

### D11 — Confidence

**Clasificación: CONTRACTUAL** (confianza es del hecho, `02` §4); **REQUIRES_G8** para score N4; **REQUIRES_G2** para el campo IES obligatorio.

`04` exige `confidence` en diagnosis. N2 tiene dimensiones `null`. N3 no tiene score. `02` §18 no calibra `wi`/`k`/Fs. Inventar confidence N4 o usarla como clasificador = prohibido. Placeholder vs omisión en Bundle = G2.

### D12 — Frontera causal

**Clasificación: CONTRACTUAL.**

N4: categoría determinística + criterio + soporte. Prohibido: “causa probable”, “se debe a”, hipótesis, recomendaciones (EKE §6, `02` §9/§15, `04` §8, Constitución III/V). N5: interpretación causal/probabilística (`05`). Correlación N3 ≠ causa N4.

### D13 — Relación con Tipo A

**Clasificación: CONTRACTUAL.**

N4 puede **referenciar** un conflicto (`04` `related_conflict_ids` opcional) y clasificar la **situación** si una rule lo dice. No puede cambiar `primary_type`, `resolution_status` ni `governance_escalation`. Tipo A no es diagnosis. CONTRADICTION no retipifica (`02` §20 D10–D11).

### D14 — Resolution

**Clasificación: CONTRACTUAL.**

Diagnosis no es evidence de cierre. `RESOLVED` exige `applied_resolution_rule_id` + evidence nueva/suficiente (`02` §11, §19 D9). `resolution_rules=[]`. Weight no cierra. N4 no infiere cierre.

### D15 — Tipo E

**Clasificación: CONTRACTUAL** (preservación); **DATA_GAP** (producción).

Si un conflicto E ya existe: no minimizar, no omitir, no bajar severity por `UNDER_REVIEW` (`02` §11, Constitución V). N4 no fabrica E desde CONTRADICTION ni desde Tipo A. Señales de gobernanza siguen ausentes en N2. Categoría `falla de gobernanza` no se usa para inventar E.

### D16 — Aporte a N5

**Clasificación: CONTRACTUAL.**

N4 puede aportar: categoría, criterio, soporte, `related_conflict_ids`, materiality preservada. RE puede citar `supporting_diagnosis_ids` en hyp/rec (`05`). N4 no crea hypothesis, no cambia `hypothesis_strength`, no garantiza causal inference, no emite recommendations. N3 ya puede habilitar N5 estructuralmente; N4 no es prerrequisito de hyp si hay evidence (`05` D9: rec exige diagnosis **o** evidence).

### D17 — Readiness productiva con N3 actual

**Clasificación: BLOCKER de IMPL** (falta G2); señales parciales presentes.

Señales hoy: N3 CONTRADICTION; Tipo A OPEN; facts en tensión; `MATERIALITY_NOT_ASSESSED`; coverage `EXISTE_CONFLICTO` cuando hay OPEN.

Falta: diagnostic rule identity; schema Bundle; `classification_criterion` físico; criterio “CONTRADICTION → conflicto no resuelto”; manejo de severity/impact/confidence.

No hay rule N4 implementable **sin G2**. No hay rule N4 completa **sin G2 o G8** para severity/impact/confidence.

### D18 — GO/NO-GO

**NO-GO.** Ver §18.

---

## 5. Diagnosis schema readiness

| field | required | contract owner | source | derivation allowed | requires rule | requires G8 | notes |
|-------|----------|----------------|--------|--------------------|---------------|-------------|-------|
| `diagnosis_id` | Sí (04; 02 D5 IDs) | EB / 04 proyección | idFactory | No semántica | No | No | Forma Bundle no congelada |
| categoría / `primary_classification` | Sí | Motor §6; 04 | rule | No inventar categoría | Sí | No | Catálogo cerrado |
| `secondary_classifications` | No | 04 | rule | Sí si rule | Sí | No | Sin ranking ficticio |
| `classification_criterion` | Sí (02 §9) | 02 | rule identity | No | Sí | No | Forma física G2 |
| `applied_rule_id` | Sí (04) | 04 | rule | Mapear desde criterion | Sí | No | Nombre IES ≠ Bundle |
| `supporting_fact_ids` | Condicional | 04 / 02 §9 | N2 | No inventar facts | Según rule | No | Deben existir |
| `supporting_evidence_ids` | Condicional | 04 / 02 §9 | N3 | No inventar evidence | Según rule | No | CONTRADICTION es candidato |
| `related_conflict_ids` | No | 04 | conflictos | Referencia, no retipifica | No | No | Tipo A puede citarse |
| `materiality` | Sí si el objeto lo declara; 04 sí | 02 §11B / Motor | N2/N3 | Preservar `NOT_ASSESSED` | Rollup si `MAT_*` | Solo `MAT_*` | No es severity |
| `severity` | 02 §9/§15; 04 sí | 02 + 04 | calibración | No desde tipo/materiality | Sí para ordinal | **Sí** ordinal | Sin enum productivo |
| `impact` | 02 §9; 04 sí | 02 + 04 | calibración | No desde CONTRADICTION | Sí | **Sí** tipificado | Ejemplo `PARTIAL_SCOPE` ilustrativo |
| `confidence` | 04 sí | 02 §4 hecho; 04 diagnosis | N2 dims / G8 | No score N4 propio | Sí si se afirma | **Sí** score | Dimensiones N2 = null |
| `model` | 04 sí | Motor §7 | G2 | No | Sí | No | No asignado a categorías |
| `validity` | 04 sí | 04 | G2 | Posible desde ciclo | No congelado | No | Bundle no lo define |
| `coverage_token` / `coverage_state` | 04 sí | Motor / 04 | bundle coverage | IES ya mapea coverage | No para N4 per se | No | No es diagnosis |
| `traceability` | Implícito 02 | 02 | trace + rule | Preservar | Identity G2 | No | Paralelo N3 |

---

## 6. Diagnostic category readiness matrix

| diagnostic_category | contract authority | required N2 inputs | required N3 inputs | classification_criterion | causal | severity required | requires G8 | physical readiness | notes |
|---------------------|--------------------|--------------------|--------------------|--------------------------|--------|-------------------|-------------|--------------------|-------|
| conflicto no resuelto | EKE §6; 04 §8 | Facts en tensión o coverage de conflicto | CONTRADICTION es señal útil, no automática | No congelado | NO | 02/04 lo esperan; enum no existe | Severity/impact si productivos | Señales N3+A presentes; rule ausente | Candidato G2. No es Tipo A. |
| información insuficiente | EKE §6 | Ausencias tipificadas / facts incompletos | No exige CONTRADICTION | No congelado | NO | Igual | Si se afirma ordinal | DATA_GAP de criterio; señales de coverage existen | No diagnosticar dominio no observado como cubierto |
| situación estable | EKE §6 | Serie/comparables sin tensión | No hay N3 de estabilidad | No congelado | NO | Igual | Probable (qué es “estable”) | DATA_GAP | No inferir de ausencia de CONTRADICTION |
| riesgo comercial | EKE §6; modelo comercial | Hechos comerciales | Patrón bajo rule | No congelado | NO | Sí si se emite | YES (umbral de riesgo) | DATA_GAP | No desde contradicción de venta sola |
| riesgo financiero | EKE §6 | Hechos financieros + referencia | Desviación diferida | No congelado | NO | Sí | YES | DATA_GAP | N3 desviación no implementada |
| riesgo operativo | EKE §6 | Acciones/operación | Según rule | No congelado | NO | Sí | YES | DATA_GAP | |
| riesgo de cumplimiento | EKE §6 | Compromiso/vencimiento | Incumplimiento diferido | No congelado | NO | Sí | Posible | DATA_GAP | |
| falla de ejecución | EKE §6 | Acción vs compromiso | Según rule | No congelado | NO | Sí | Posible | DATA_GAP | |
| falla de gobernanza | EKE §6; Const. V | Señales Tipo E | No CONTRADICTION | No congelado | NO | Sí | No para tipificar E | DATA_GAP + no inventar E | Preservar E si ya existe |
| oportunidad comercial | EKE §6 | Hechos de oportunidad | Patrón diferido | No congelado | NO | Sí | Posible | DATA_GAP | |
| recuperación en curso | EKE §6 | Serie de mejora | Tendencia/deterioro diferidos | No congelado | NO | Sí | YES si umbral | DATA_GAP | “Hay deterioro” no es N4 hoy |

---

## 7. Rule registry readiness

| Set | Estado | N4 |
|-----|--------|----|
| `evidence_rules` | 1 rule CONTRADICTION | No es diagnostic registry |
| `diagnostic_rules` | **No existe** | G2 para crearlo |
| `absence_rules` | vacío | No autoriza N4 |
| `resolution_rules` | vacío | N4 no cierra |
| `causal_rules` | vacío | N4 no causal |
| `materiality_rules` | vacío | N4 = `NOT_ASSESSED` |

---

## 8. Classification criterion boundary

`classification_criterion` es la regla auditable, no un comentario libre y no el `primary_type` del conflicto.

Falta G2: campos, versión, `ACTIVE`, persistencia en el Diagnosis, relación con `applied_rule_id` de `04`.

Sin criterion versionado, cualquier N4 sería interpretación. Por eso no hay IMPL.

---

## 9. Severity / impact / materiality / G8 boundary

| Concepto | Qué es | Qué no es | Hoy | Gate |
|----------|--------|-----------|-----|------|
| Conflict typing | A–E | Diagnosis | Solo A | G2 para B–E |
| Evidence N3 | Relación entre facts | Diagnosis | CONTRADICTION | — |
| Diagnosis N4 | Categoría Motor | Hyp, tipo de conflicto | `[]` | G2 + (G8 o placeholder) |
| Hypothesis N5 | Causa/probabilidad | N4 | RE | — |
| Severity | Gravedad **después** del tipo | Materiality, tipo, impact | Sin enum | G8; placeholder = G2 |
| Impact | Efecto tipificado | Severity, MAT_* | Sin catálogo | G8 / G2 |
| Materiality | Relevancia ejecutiva | Severity | `NOT_ASSESSED` | G8 solo `MAT_*` |

---

## 10. Causal language boundary

| phrase/semantic | allowed in N4 | reason | belongs to N5 | notes |
|-----------------|---------------|--------|---------------|-------|
| Existe una contradicción operativa | NO como diagnosis automática | Es semántica N3/conflicto, no categoría Motor | No necesariamente | Puede **citar** N3; emitirla como N4 exige rule G2. “Operativa” no está en el catálogo. |
| Los datos son inconsistentes bajo la regla X | Condicional | Permitido solo si X es `classification_criterion` existente | No | Hoy X no existe para N4. N3 ya dice inconsistencia de values. |
| Hay deterioro | NO | Categoría cercana es recuperación en curso; N3 deterioro diferido; umbral G8 | Si se afirma causa del deterioro | DATA_GAP |
| La causa probable es... | NO | EKE §6; `02` §9/§15; Const. III | SÍ | Prohibido en N4 |
| El problema se debe a... | NO | Causalidad informal | SÍ | Prohibido |
| La fuente A es incorrecta | NO | Selección de verdad/prioridad de fuente | Posible N5, no N4 | N3 CONTRADICTION no elige valor verdadero |
| Se requiere revisión | NO como diagnosis | No es categoría Motor; `UNDER_REVIEW` es resolution, no N4 | Rec/verification N5 | N4 no abre revisión |
| Existe riesgo | NO genérico | Solo categorías `riesgo *` con rule | Puede hipoteizar riesgo | DATA_GAP + G8 |
| Existe incumplimiento | NO | N3 incumplimiento diferido; no es nombre exacto del catálogo | Posible N5 | DATA_GAP |
| Hay fraude | NO | Constitución V; semántica N3 D6 prohibida; no hay rule | Solo con evidencia institucional, no N4 actual | Prohibido |

---

## 11. Conflict and Type E boundary

- N4 ≠ clasificador A–E.
- Tipo A `OPEN` puede coexistir con un futuro `conflicto no resuelto`; no se fusionan.
- N4 no añade `secondary_types`, no pone `governance_escalation`, no calcula severity de conflicto.
- Tipo E: preservar si ya está; no fabricar; no usar CONTRADICTION como E.
- `falla de gobernanza` no se emite sin señales E y rule.

---

## 12. N4 → N5 boundary

N4 puede dar al RE una categoría anclada y IDs. El RE sigue dueño de hipótesis, recomendaciones, strength y abstención.

N4 no obliga hyp. N3 ya puede satisfacer `supporting_evidence_ids`. Rec puede anclarse a diagnosis **o** evidence (`05`). Fabricar N4 para “desbloquear” RE está prohibido.

---

## 13. Data gaps

| Señal ausente | Impide |
|---------------|--------|
| Diagnostic rule identity | Cualquier N4 |
| Baseline / compromiso / serie | riesgo, desviación, deterioro, recuperación, incumplimiento |
| Acción / responsable / reportado vs verificado | falla de ejecución; Tipo E; falla de gobernanza |
| Criterio de “estable” / “insuficiente” | esas categorías |
| Enum severity / impact / confidence N4 | Diagnosis IES completo |
| Modelo mental por categoría | Campo `model` de `04` |

N2/N3 actuales **sí** traen: contradicción de values, Tipo A OPEN, `NOT_ASSESSED`. Eso no llena los gaps de rule/schema/severity.

---

## 14. Productive N4 feasibility with current N3

**Cero N4 productivo hoy.**

Franja **candidata** (no implementable, no diseñada):

- Categoría: `conflicto no resuelto`.
- Señales: N3 CONTRADICTION + conflicto Tipo A `OPEN` + facts soporte.
- Materiality: `MATERIALITY_NOT_ASSESSED`.
- Causal: no.
- Exige G2: registry diagnostic, identity, schema Bundle, criterion, ligazón CONTRADICTION→categoría, `model`, y cómo llenar severity/impact/confidence sin calibrar.
- Si G2 exige ordinales productivos → además G8.
- No convierte A en E. No resuelve. No es hyp.

Sin ese G2, **no** hay subset G8-free implementable (a diferencia de N3 CONTRADICTION, que ya tenía `applied_rule` y `NOT_ASSESSED` explícitos).

---

## 15. G2 decisions required

No aprobadas.

1. ¿Existe `diagnostic_rules` como registry separado? Campos mínimos.
2. Schema Bundle Diagnosis v1 vs proyección `04` (`classification_criterion` vs `applied_rule_id`).
3. ¿`conflicto no resuelto` se deriva de N3 CONTRADICTION + Tipo A OPEN?
4. Identity/versión de esa rule (si se aprueba).
5. Soporte mínimo (solo evidence, solo facts, o ambos).
6. Asignación de `model` (¿ejecutivo?).
7. Cómo satisfacer `severity` / `impact` / `confidence` de `04` sin G8 (placeholder explícito vs diferir IMPL hasta G8). **No inventar token aquí.**
8. `validity` / coverage en Bundle.
9. Alcance v1: ¿solo `conflicto no resuelto` u otras categorías?

---

## 16. G8 decisions required

No calibradas.

- Umbrales de severidad de diagnóstico y de conflicto (`02` §18).
- Catálogo productivo de `impact`.
- Confidence de diagnosis (si no se difiere).
- `MAT_*` / rollup N4.
- `wi`, `k`, Fs.
- Umbrales de riesgo, deterioro, desviación, “estable”.
- Reglas causales (siguen prohibidas en N4 aunque se aprueben para N3).

G8 **no** es necesario para preservar `MATERIALITY_NOT_ASSESSED`. G8 **sí** bloquea N4 con severity/impact/confidence productivos.

---

## 17. Blockers

| ID | Gap | Clase | Bloquea IMPL-N4 |
|----|-----|-------|-----------------|
| B1 | Sin diagnostic rule / criterion identity | REQUIRES_G2 | Sí |
| B2 | Schema Bundle N4 no congelado | REQUIRES_G2 | Sí |
| B3 | Ligazón CONTRADICTION → categoría no escrita | REQUIRES_G2 | Sí para la única franja con señales |
| B4 | Severity/impact/confidence IES sin enum ni placeholder | REQUIRES_G2 o REQUIRES_G8 | Sí para Diagnosis “completo” 04 |
| B5 | Resto de categorías sin señales | DATA_GAP | Sí para esas categorías |
| B6 | Inventar E / causa / severity desde A | BLOCKER si se intenta | Absoluto |

B1–B4 impiden un IMPL seguro ahora. B6 es línea roja, no un trabajo pendiente.

---

## 18. GO/NO-GO for IMPL-EVIDENCE-N4-001

**NO-GO.**

| Parte | Estado |
|-------|--------|
| (a) Semántica contractual lista | Nombres de categoría Motor §6; barreras; N3≠N4; no causa; no resolver; preservar E; materiality `NOT_ASSESSED` |
| (b) G2 | Registry, schema, criterion, ligazón CONTRADICTION, model, placeholder vs omisión de severity/impact/confidence |
| (c) G8 | Severity/impact/confidence productivos; umbrales; `MAT_*` |
| (d) DATA_GAP | Riesgo, deterioro, incumplimiento, gobernanza, estabilidad, oportunidad |
| (e) Blockers | Emitir N4 sin rule; usar CONTRADICTION como causa/E/severity |

Esta tarea no crea `IMPL-EVIDENCE-N4-001`. HUMAN_APPROVER revisa G2/G8 antes de cualquier IMPL.

---

## Gate matrix

| decision/gap | blocks IMPL-EVIDENCE-N4-001 | requires G2 | requires G8 | requires source/tool change | owner | recommended next action |
|--------------|----------------------------|-------------|-------------|-----------------------------|-------|-------------------------|
| Diagnostic rule registry + identity | Sí | Sí | No | No | HUMAN_APPROVER / 02 | Decidir G2; no implementar |
| Bundle Diagnosis schema | Sí | Sí | No | No | 02 (no 04) | G2 |
| Criterion CONTRADICTION → `conflicto no resuelto` | Sí para esa franja | Sí | No | No | 02 | G2; no diseñar rule aquí |
| Severity/impact/confidence | Sí si se exige 04 completo | Sí si placeholder | Sí si ordinal | No | 02 + 04 + G8 | Separar placeholder vs calibración |
| Materiality `NOT_ASSESSED` | No | No | No | No | 02 §11B | Preservar |
| Categorías de riesgo/deterioro/E | Sí para esas categorías | Sí (rules) | A menudo | Sí (señales) | Motor + fuentes | No IMPL |
| Tipo E productivo | No para N4 de contradicción | Sí (criterio E) | No | Sí | Constitución | No fabricar |
| Calibrar G8 ahora | N/A | No | — | No | HUMAN_APPROVER | No; G8 no autorizado |

---

## 19. STOP

ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001 cerrado en `DONE_PENDING_REVIEW`.

G2 y G8 permanecen `PENDING_IF_REQUIRED`. Contratos y runtimes no modificados. Sin IMPL-EVIDENCE-N4-001. Sin commit, push, merge ni siguiente tarea.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
