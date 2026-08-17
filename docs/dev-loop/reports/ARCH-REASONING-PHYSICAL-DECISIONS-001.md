# Reporte — ARCH-REASONING-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-REASONING-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
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
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
runtimes_inspected:
  - "lib/director-ia-ies-builder.js"
  - "test/director-ia-ies-builder.test.js"
  - "fixtures/director-ia/ies/"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-op-eb-eks-integration.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-REASONING-001. Las decisiones físicas pendientes requieren G2 humano antes de cualquier implementación N5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2: PENDING_IF_REQUIRED. Varias decisiones físicas identificadas abajo requieren G2 para registrarse en 05; esta tarea no las resolvió ni las autoaprobó."
  - "G3 permanece N/A. No se creó contrato nuevo."
  - "G8 permanece N/A. No se inventó fórmula de hypothesis_strength, probability, confidence, materiality, severity ni ranking."
  - "Veredicto: NO-GO para IMPL-REASONING-001."
```

## Ejecución

- Rama: `architecture/reasoning-physical-decisions-001` (≠ `main`; no se cambió de rama).
- Encabezado YAML G1 ya coincidía con la autorización humana; el implementador no reescribió `authorized_by`, `authorized_at` ni `human_authorization`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T11:12:15-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `PENDING_IF_REQUIRED`. No autorizado. Toda decisión que exigiría editar `docs/director-ia/` se identificó y **no** se resolvió.
- G3: `N/A`. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime RE. Sin adapter LLM. Sin prompts. Sin tests/fixtures RE. Sin persistencia de Reasoning Run. Sin Channel Projection. Sin commit, push, merge. Sin IMPL-REASONING-001.

Numeración: **D1–D20** de este reporte son las `audit_questions` de `CURRENT_TASK.md`. No se confunden con **D1–D10** ya congelados en `05` v1.0 (INTERPRETATION, ABSTENTION, HYP_STRENGTH_*, separación Recommendation/Next Verification/Decision Option, Reasoning Run, semántica vs 06, rivales, OFFICIAL/ALTERNATIVE, `es-MX`, gate de status).

Ninguna RECOMMENDATION de este archivo queda aprobada por aparecer aquí.

---

## 1. Executive result

La frontera física **IES → Reasoning Engine** es auditable y está determinada:

- Entrada de conocimiento = **un IES emitido**, solo lectura.
- Entrada de sesión = parámetros no epistemológicos que **no** alteran el IES.
- Salida = Reasoning Result materializable en Reasoning Run **fuera** de EKS e IES.
- LLM, si opera, solo en N5 y **subordinado** al IES: sin tools, DB, fuentes operacionales ni conocimiento externo como verdad empresarial.

`05` v1.0 está **congelado** como contrato semántico. **No** está listo como contrato de realización física suficiente para IMPL-REASONING-001.

El IES Builder físico (`lib/director-ia-ies-builder.js`) produce IES `OFFICIAL` in-memory con `status` ∈ {`VALIDATED`,`PARTIAL`,`CONFLICTED`,`NO_KNOWLEDGE`}. Ese conjunto es exactamente el conjunto **consumible** por RE (`04` §18; `05` §2). Los estados no consumibles (`BUILDING`,`EXPIRED`,`SUPERSEDED`,`INVALID`) existen en contrato y el RE debe rechazarlos; el builder actual **no los emite**.

Realidad N3/N4: Evidence Builder vigente tiene `evidence_rules = []`; `to_n3`/`to_n4` devuelven `[]`. Las cuatro fixtures IES tienen `evidence: []` y `diagnoses: []`. Constitución VIII y `05` §4 exigen **al menos un** `supporting_evidence_id` existente para emitir hipótesis. Contra el IES físico actual, **no hay hipótesis sustantiva válida**. Eso no autoriza inventar evidencias; obliga abstención fail-closed.

**Veredicto: NO-GO para IMPL-REASONING-001.** La auditoría se completa sin modificar contratos. Las decisiones físicas pendientes se listan; no se autoaprueban.

---

## 2. Contracts/runtime inspected

| Superficie | Uso |
|------------|-----|
| Constitución III, V, VIII, IX | N5 = única capa LLM; IES inmutable; hipótesis con evidencias; Tipo E |
| EKE | RE fuera del Motor; no crea N1–N4; no convierte `NO_CONOZCO` en hipótesis |
| `02` | N3/N4; conflictos; RE no ensambla |
| `03` / `03A` | EKS no almacena Run; RE no consume OP directo |
| `04` v1.0 + §15/§18/§25 | Ciclo de vida IES; contrato de entrada RE; realization IES |
| `05` v1.0 | Contrato N5 auditado |
| `06` v1.0 propuesto | Presentación; no semántica RE |
| Índice | RE runtime PENDIENTE |
| IES Builder + tests + fixtures | Realidad física de entrada |
| OP / EB / EKS / helper | Cadena N1–N4; `evidence[]`/`diagnoses[]` vacíos |

Chat legado (`lib/director-ia-chat.js`) y Fases 1–3 **no** son pipeline constitucional N1–N5. No se reutilizan como RE.

---

## 3. Current physical reality

### Cadena existente

```
Observation Pipeline → Evidence Builder → Knowledge Bundle
        → EKS Snapshot (+ query_context_metadata)
        → IES Builder OFFICIAL in-memory
        → (no hay Reasoning Engine)
        → (no hay Reasoning Run store)
        → (Channel Projection no implementada)
```

### IES Builder (IMPL-IES-001, no merge a `main` en esta tarea)

| Hecho físico | Valor |
|--------------|--------|
| Interfaz | `createIesBuilder({ clock, idFactory }).build(snapshot)` / `validate(ies)` |
| `ies_type` | solo `OFFICIAL` |
| `alternative_context` | `null` |
| `ies_version` | `1` |
| `expires_at` | `null` (EXPIRES_AT_NULL_UNTIL_POLICY) |
| `status` emitido | mapeo 1:1 coverage → `VALIDATED` / `PARTIAL` / `CONFLICTED` / `NO_KNOWLEDGE` |
| `BUILDING` / `EXPIRED` / `SUPERSEDED` / `INVALID` | no producidos como `status` |
| `validate()` | retorna `{ ok, errors }`; **no** sella `status=INVALID` |
| `query_context` | solo desde `snapshot.query_context_metadata` |
| `evidence` / `diagnoses` | copia del Bundle; vacíos en runtime EB y fixtures IES |
| `open_questions[].blocks_hypothesis` | boolean copiado; si ausente: `true` solo si coverage `NO_CONOZCO` |
| `limitations[].limitation_id` | `lim_<tool_id>_<SOURCE_*\|TOOL_ERROR\|ENTITY_UNRESOLVED>` |
| `limitations[].statement_token` | el status contractual, no `LIM_*` ilustrativos de `04` §20 |
| Firma | `signature=null`; `signature_status=NOT_IMPLEMENTED`; digest `sha256:` ≠ firma |
| Persistencia IES | no existe |

### Evidence Builder

`RULE_REGISTRY.evidence_rules.length === 0` → `evidence: []`, `diagnoses: []`. Conflictos Tipo A por hechos incompatibles sí pueden existir. Tipo E aparece en fixture IES, no como producto automático de reglas N3.

### Documentación desactualizada (no contradicción G7)

`04` §25 y `05` §24 aún dicen «runtime IES pendiente». El runtime IES **existe** en este workspace (`lib/director-ia-ies-builder.js`). EKE índice también dice runtime IES pendiente. No se reescribe. No bloquea clasificar la frontera RE.

---

## 4. D1–D20 findings

### D1 — Interfaz runtime mínima

| | |
|--|--|
| **Classification** | PHYSICAL_UNKNOWN + RECOMMENDATION |
| **Contractual** | RE es capa N5; LLM opcional y subordinado; independencia de proveedor (`05` §1, §19). No congela factory vs servicio vs función pura. |
| **Physical unknown** | Forma de construcción, inyección de clock/idFactory/adapter, sync vs async. |
| **Recommendation (no aprobada)** | Mirror del IES: factory con `clock`, `idFactory` y `modelAdapter` inyectados; sin default ambiental de proveedor. |
| **Requires G2** | YES, para registrar la forma en `05` si se congela como decisión física (análogo a `04` §25 R1). |

### D2 — Input shape

| | |
|--|--|
| **Classification** | CONTRACTUAL (frontera) + PHYSICAL_UNKNOWN (esquema de sesión) |
| **IES** | Objeto IES completo (`04` §2). RE no recibe Bundle/Snapshot como bypass (`05` §2 Prohibido). |
| **analysis_mode** | Contrato: existe; ejemplos «diagnóstico, verificación, comparación». **No hay enum congelado.** |
| **canonical_reasoning_language** | Valor institucional vigente `es-MX`. Cambiable por política, no invariante universal. |
| **channel_hint** | Metadato opaco; **no** autoriza reglas de formato. Distinto de `query_context.channel` ya proyectado en el IES. |
| **maximum_semantic_depth** | Contrato: límite de profundidad; **sin escala ni tokens.** |
| **Requires G2** | YES para enum/escala de sesión si se quieren congelar. Opaque strings + validación de presencia podrían ser implementación, pero enumerarlos en IMPL sin G2 inventaría contrato. |

### D3 — Gate de lifecycle

| | |
|--|--|
| **Classification** | CONTRACTUAL; realización del rechazo es implementable; emisión de estados no consumibles es PHYSICAL_UNKNOWN del IES, no del RE |
| **Gate** | Antes de cualquier razonamiento: leer `ies.status`. |
| **Consumibles** | `VALIDATED`, `PARTIAL`, `CONFLICTED`, `NO_KNOWLEDGE`. |
| **No consumibles** | `BUILDING`, `EXPIRED`, `SUPERSEDED`, `INVALID` → error de contrato; no razonar situación vigente. |
| **Físico IES** | Solo emite los cuatro consumibles. `expires_at=null` ⇒ `EXPIRED` no ocurre. No hay supersesión durable. `validate()` no produce `INVALID` como status. |
| **Namespaces** | `ies.status=SUPERSEDED` ≠ `conflicts[].resolution_status=SUPERSEDED` (`04` §15). |
| **Requires G2** | NO para que RE rechace no-consumibles. YES si se quiere definir quién sella `INVALID`/`BUILDING` en runtime IES (fuera de esta tarea). |

### D4 — Frontera LLM/provider

| | |
|--|--|
| **Classification** | CONTRACTUAL (prohibiciones) + PHYSICAL_UNKNOWN (adapter) + BLOCKER para IMPL con LLM |
| **Request** | No definido. Debe poder recibir IES + sesión **sin** tools, SQL, loaders, secretos. |
| **Response** | No definido. Debe ser parseable hacia campos de Reasoning Result, no hacia N1–N4. |
| **Provider metadata** | Solo auditoría de Run (`model_reference`, `model_provider_reference`). |
| **Timeout/error** | No definido. Un fallo de proveedor **no** puede inventar conocimiento; fail-closed / abstención. |
| **No tool calls** | CONTRACTUAL (`05` invariantes 4–5). |
| **No hidden knowledge** | CONTRACTUAL (Constitución V; `05` §8, caso 11/13). |
| **Requires G2** | YES para congelar request/response/error del adapter. |
| **Requires provider decision** | YES (elección de proveedor es de implementación/auditoría, no normativa; la **interfaz** sí debe existir antes de IMPL). |

Chat legado OpenAI **no** es este adapter.

### D5 — Reasoning Result shape

| | |
|--|--|
| **Classification** | CONTRACTUAL (lista de campos) + PHYSICAL_UNKNOWN (sobre, tipos, IDs de resultado) |
| **Definido conceptualmente** | `interpretation`, `hypotheses[]`, `recommendations[]`, `next_verifications[]`, `decision_options[]`, `abstentions[]`, `clarification_requests[]`, `reasoning_limits`, `references` (`05` §3). |
| **No definido** | `reasoning_result_id`, `schema_version`, tipos JSON de `interpretation`/`reasoning_limits`/`references`, obligatoriedad de arrays vacíos vs omisión, ancla `ies_id`/`ies_version`/`ies_type` en el Result (sí están en Hypothesis/Run). |
| **Requires G2** | YES para sobre físico completo si se congela en `05`. |

### D6 — INTERPRETATION

| | |
|--|--|
| **Classification** | CONTRACTUAL (semántica) + PHYSICAL_UNKNOWN (estructura JSON) |
| **Es** | Lectura fiel del IES; separación hecho/evidencia/diagnóstico/conflicto/límite; no Nivel 6; no Diagnosis. |
| **PARTIAL** | Tres bloques: LO QUE SÉ / LO QUE PUEDO INFERIR / LO QUE NO PUEDO CONCLUIR. El tercero **sin relleno LLM**. |
| **Prohibido** | Agregar hechos, elevar materiality, resolver conflictos, rellenar `NO_CONOZCO`. Causalidad nueva → `hypotheses[]`. |
| **Requires G2** | YES si se congela objeto `{ known, inferable, not_concludable }` u otra forma. |

### D7 — Validaciones determinísticas post-modelo (Hypothesis)

| | |
|--|--|
| **Classification** | CONTRACTUAL; implementable contra IES físico |
| **supporting_fact_ids** | ⊆ `facts[].fact_id`; obligatorios si se emite hipótesis. |
| **supporting_evidence_ids** | ⊆ `evidence[].evidence_id`; **≥1 existente**. Si `evidence=[]`, **rechazar hipótesis** (no inventar ID). |
| **ies_id / ies_version** | Deben coincidir con el IES de entrada. |
| **validity_scope** | Obligatorio; forma física (planta/periodo/entidad/modelo) no esquematizada. Puede anclarse a `executive_scope` / facts; no inventar entidades. |
| **statement_language** | Obligatorio; vigente `es-MX`. |
| **hypothesis_strength** | Debe ser exactamente `HYP_STRENGTH_WEAK\|MODERATE\|STRONG`. |
| **conflicts/limitations citados** | IDs ⊆ IES; `limitations` obligatorio en la hipótesis. |
| **Requires G2** | NO para el conjunto de chequeos de pertenencia. YES para forma de `validity_scope`. |

### D8 — hypothesis_strength

| | |
|--|--|
| **Classification** | CONTRACTUAL (enum + criterios cualitativos + techos) + PHYSICAL_UNKNOWN (quién asigna el token) + BLOCKER si se inventa fórmula |
| **Tokens** | `HYP_STRENGTH_WEAK` / `MODERATE` / `STRONG`. |
| **Separación** | ≠ confidence, ≠ probability/%, ≠ materiality/`MAT_*`, ≠ severity. Sin `k`/`wi`. |
| **Techos contractuales (determinísticos posibles)** | Conflicto OPEN/UNDER_REVIEW que **tensiona el claim** → máximo WEAK o abstención; OQ `blocks_hypothesis=true` sobre el claim → abstener/bloquear (no STRONG); `SOURCE_*`/`TOOL_ERROR` en dominio causal necesario → no STRONG; `MATERIALITY_NOT_ASSESSED` **no** reduce strength; **prohíbe** lenguaje MAT. Conflicto no relacionado **no** techa todos los claims. |
| **“Tensión material del claim”** | Cualitativa en v1.0 (`05` §24 riesgo 5). **No** es `MAT_*`. No hay umbral numérico. |
| **Prohibido en esta auditoría y en IMPL** | Score, probability, confidence proxy, materiality proxy, fórmula. |
| **Requires G2** | YES para congelar mecanismo de asignación (p. ej. propuesta del modelo + techos determinísticos), **sin** convertirla en fórmula. G8 no aplica: no es calibración `k`/`wi`/materiality. |

### D9 — Hipótesis rivales

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN (cuándo el IES “permite ordenar”) |
| **Permitido** | Múltiples hipótesis; mismo `rival_group_id` si compiten; incompatibles vs complementarias. |
| **`is_primary_candidate`** | Default false. `true` solo si el IES permite ordenar (asimetría de soporte **y** `interpretation_constraint` / ausencia de contradicción frontal). |
| **Sin base** | Todas rivales, ninguna primaria, sin ranking. |
| **Prohibido** | % ficticios; ganador arbitrario del LLM; fusionar rivales en hecho. |
| **Requires G2** | YES si se quiere test determinístico de “permite ordenar”. Default `false` es implementable sin G2. |

### D10 — Abstention

| | |
|--|--|
| **Classification** | CONTRACTUAL; anclas físicamente presentes en IES |
| **NO_KNOWLEDGE** | Consumible; **0 hipótesis sustantivas**; ABSTENTION `NO_KNOWLEDGE`; no conocimiento del modelo; no recomendaciones que dependan del dato faltante; NEXT_VERIFICATION / CLARIFICATION solo si desbloquean fuente/alcance. |
| **Falta supporting_evidence** | No emitir hipótesis; `INSUFFICIENT_EVIDENCE`. **Esta es la condición vigente del IES físico.** |
| **Limitación bloqueante** | `SOURCE_RESTRICTED`, `TOOL_ERROR` de dominio necesario, `blocking_limitations[]`. |
| **Entidad unresolved** | `resolved_entities.resolution_state` AMBIGUOUS/UNRESOLVED; `source_health` `ENTITY_UNRESOLVED`; `knowledge_coverage.unresolved_entities`. |
| **Scope incompleto** | `QUERY_SCOPE_INCOMPLETE` / `incomplete_scopes`. |
| **Conflicto que impide claim** | `BLOCKING_CONFLICT`; Tipo E visible, no resuelto por RE. |
| **ABSTENTION no es segunda cobertura** | CONTRACTUAL. |
| **Requires G2** | NO para el catálogo `abstention_kind` de `05` §7. |

### D11 — Recommendation

| | |
|--|--|
| **Classification** | CONTRACTUAL; físicamente casi siempre no emitible hoy |
| **Exige** | ≥1 `supporting_diagnosis_id` **o** `supporting_evidence_id` existente; `condition`; `limitations`; no genéricas sin objeto. |
| **No es** | Mandato, hecho N2, ni Diagnosis. |
| **Físico** | `diagnoses[]` y `evidence[]` vacíos ⇒ **rechazar** recommendations. No completar con prosa. |
| **Requires G2** | NO. |

### D12 — Next verification

| | |
|--|--|
| **Classification** | CONTRACTUAL (separación) + PHYSICAL_UNKNOWN (enum de `purpose`) |
| **Es** | Acción epistémica futura (cerrar OQ, contrastar fuentes, resolver entidad, Tipo E institucional, completar scope). |
| **No es** | Recommendation de negocio. **RE no ejecuta** la tool. |
| **Anclas** | `open_question_id` / `conflict_id` / `limitation_id` del IES. |
| **SOURCE_NOT_INTEGRATED** | NEXT_VERIFICATION de integración, **no** aclaración al usuario para inventar el dato (`05` §15). |
| **Requires G2** | NO para la separación. YES si se congela catálogo de `purpose`. |

### D13 — Decision option

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN (test de “el IES permite comparar”) |
| **RE no elige.** No es decisión tomada. |
| **No crear** options si no hay base factual comparable. |
| **Trade-offs** | Sin inventar cifras ausentes del IES. |
| **Físico actual** | Sin evidence/diagnoses, base de comparación insuficiente → no emitir. |
| **Requires G2** | YES para criterio determinístico de “permite comparar”. |

### D14 — Clarification request

| | |
|--|--|
| **Classification** | CONTRACTUAL; anclas IES existentes |
| **Cuándo** | `QUERY_SCOPE_INCOMPLETE`; entidad unresolved/ambigua; pregunta ambigua de entrada; OQ resoluble con input de usuario. |
| **Prohibido** | Ocultar Tipo E; pedir al usuario datos de fuente no integrada. |
| **Requires G2** | NO. |

### D15 — Materiality y conflictos

| | |
|--|--|
| **Classification** | CONTRACTUAL; IES físico ya proyecta lo consumible |
| **Consume** | `MAT_*` o `MATERIALITY_NOT_ASSESSED` en facts/evidence/diagnoses y `highest_materiality_detected`. |
| **No** crea, eleva, reduce ni reinterpreta. Confidence/severity/priority no autorizan `MAT_*`. |
| **Conflictos** | Lee `CONF_TYPE_*`, `resolution_status`, `interpretation_constraint`, `weight_assessment`; **no los cambia**. Tipo A: no promediar. Tipo E: siempre visible; NEXT_VERIFICATION institucional; no suavizar. |
| **Físico** | Facts copian `MATERIALITY_NOT_ASSESSED`; Tipo E en summary fail-closed. |
| **Requires G2** | NO. **Requires G8** | NO (no calibrar). |

### D16 — OFFICIAL vs ALTERNATIVE

| | |
|--|--|
| **Classification** | CONTRACTUAL; físicamente solo OFFICIAL existe |
| **Regla** | Un `ies_id` (+ type/version) por ciclo. Dos IES ⇒ razonar separado o comparar **explícito**. No fusión. No tercer IES. Conservar `alternative_context`. |
| **Físico** | Builder rechaza `alternative_context !== null`. Entrada RE = un IES. |
| **Requires G2** | NO para un IES OFFICIAL. ALTERNATIVE sigue fuera (IES R5). |

### D17 — Reasoning Run

| | |
|--|--|
| **Classification** | CONTRACTUAL (naturaleza) + PHYSICAL_UNKNOWN (almacén e integridad) |
| **Definido** | `reasoning_run_id`; ancla IES; `generated_at`; model/provider refs; `reasoning_policy_version`; idioma; copias de salidas; interpretation opcional; references/limitations. Append-only. Fuera de EKS/IES. No realimenta N1–N4. |
| **Pendiente en `05` §18/§24** | Propietario de runtime/almacén físico. Persistencia. Campos de integridad del Run. |
| **In-memory first** | Analogía IES R2. **No está registrada en `05`.** Recomendación no aprobada. |
| **Requires G2** | YES para readiness de Run (in-memory vs persistencia, integridad). Persistencia SQL/retention **out of scope** y no se decide aquí. |

### D18 — Determinismo y replay

| | |
|--|--|
| **Classification** | CONTRACTUAL (separación) + PHYSICAL_UNKNOWN (qué se fija para auditoría) |
| **Determinístico** | Gate de status; pertenencia de IDs; techos de strength; rechazo de tools; no fusión OFFICIAL/ALTERNATIVE; abstención NO_KNOWLEDGE; no elevar MAT; no resolver conflictos. |
| **No determinístico** | Texto de interpretation/hypotheses del LLM; no se promete repetibilidad absoluta. |
| **Replay verificable** | Requiere Run con IES ancla + Result + metadata de modelo/política. Prompt/template/version «si aplica» (`CURRENT_TASK` D17) **no** está congelado en `05`. |
| **Requires G2** | YES para el mínimo de metadata de auditoría/replay. No se inventan seeds/temperature como contrato. |

### D19 — Independencia de proveedor

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN (interfaz mínima) |
| **Contrato** | No depende de OpenAI/GPT/Anthropic/Gemini. Refs solo en Run. |
| **Físico** | Sin adapter. Chat legado no cuenta. |
| **Requires G2** | YES (misma interfaz que D1/D4). |

### D20 — Runtime readiness / GO-NO-GO

| | |
|--|--|
| **Classification** | BLOCKER para IMPL-REASONING-001 |
| **GO/NO-GO** | **NO-GO** |
| **Por qué** | Faltan decisiones físicas (D1, D2 sesión, D4 adapter, D5 sobre, D6 JSON, D8 asignación de strength, D17 Run, D18 metadata) que un implementador no puede “resolver con criterio” sin G2. Además, el IES físico actual no contiene evidencias: cualquier IMPL honesta sería principalmente gate + abstención; eso no autoriza recortar `05` ni inventar N3. |

---

## 5. Reasoning Result source matrix

| Reasoning Result field/object | contract authority | source from IES | LLM generated allowed | deterministic validation | physical readiness | classification | notes |
|------------------------------|--------------------|-----------------|----------------------|--------------------------|--------------------|----------------|-------|
| `interpretation` | `05` §3.1; Const. V.3 | Lectura de facts/evidence/diagnoses/conflicts/limitations/coverage | CONDITIONAL | No hechos nuevos; no MAT nueva; no resolver conflictos; no rellenar NO_KNOWLEDGE; PARTIAL exige tres bloques | UNKNOWN (forma JSON) | PHYSICAL_UNKNOWN | Causalidad nueva debe ir a hypotheses |
| `interpretation.LO_QUE_SE` | `05` §3.1, §9 | Proyección fiel bancos IES | NO (contenido) / CONDITIONAL (redacción) | IDs citados ∈ IES | READY (contenido) / UNKNOWN (schema) | CONTRACTUAL | Redactar ≠ agregar |
| `interpretation.LO_QUE_PUEDO_INFERIR` | `05` §3.1, §9 | Solo claims con soporte IES | CONDITIONAL | Debe corresponder a `hypotheses[]` aceptadas | UNKNOWN | CONTRACTUAL | Vacío si no hay evidence |
| `interpretation.LO_QUE_NO_PUEDO_CONCLUIR` | `05` §3.1, §8–§9 | limitations, OQ, SOURCE_*, vacíos | NO | Sin relleno de entrenamiento | READY (anclas) | CONTRACTUAL | Caso 13 |
| `hypotheses[]` | `05` §4–§6; Const. VIII | fact_id, evidence_id, diagnosis_id, conflict_id, limitation, scope | CONDITIONAL | §4 + D7; ≥1 evidence_id existente | NOT_READY vs IES actual (`evidence=[]`) | CONTRACTUAL + BLOCKER de emisión | Fail-closed: no emitir |
| `hypotheses[].hypothesis_id` | `05` §4 | no | YES (id de salida N5) | no vacío; no colisionar con IDs IES como si fueran N1–N4 | UNKNOWN (fábrica de IDs) | PHYSICAL_UNKNOWN | Relacionado D1 idFactory |
| `hypotheses[].ies_id` / `ies_version` | `05` §4 | `ies.ies_id` / `ies.ies_version` | NO | igualdad exacta con entrada | READY | CONTRACTUAL | |
| `hypotheses[].statement` | `05` §4 | no como hecho | CONDITIONAL | etiquetado hipótesis; no copiar como N2 | UNKNOWN | CONTRACTUAL | |
| `hypotheses[].statement_language` | `05` §4, D9 de `05` | no | NO (debe ser el canónico de sesión) | = `canonical_reasoning_language` usado | READY (`es-MX`) | CONTRACTUAL | |
| `hypotheses[].supporting_fact_ids` | `05` §4 | `facts[]` | NO (IDs) | ⊆ fact_ids; no vacío si hay hipótesis | READY | CONTRACTUAL | |
| `hypotheses[].supporting_evidence_ids` | `05` §4; Const. VIII | `evidence[]` | NO (IDs) | ⊆ evidence_ids; **≥1** | NOT_READY (banco vacío) | CONTRACTUAL | Bloquea hipótesis, no el gate |
| `hypotheses[].supporting_diagnosis_ids` | `05` §4 | `diagnoses[]` | NO (IDs) | ⊆ diagnosis_ids si presentes | EMPTY | CONTRACTUAL | Opcional |
| `hypotheses[].conflict_ids` | `05` §4 | `conflicts[]` | NO (IDs) | ⊆ conflict_ids | READY | CONTRACTUAL | |
| `hypotheses[].limitations` | `05` §4 | `limitations[]` / coverage | CONDITIONAL (texto) | anclas existentes | READY | CONTRACTUAL | Obligatorio |
| `hypotheses[].validity_scope` | `05` §4 | `executive_scope`, fact.entity/period | CONDITIONAL | no inventar entidad/alcance | UNKNOWN (schema) | PHYSICAL_UNKNOWN | |
| `hypotheses[].hypothesis_strength` | `05` §5 | no (no es MAT/confidence) | CONDITIONAL (propuesta) | enum + techos D8; **no fórmula** | UNKNOWN (asignación) | PHYSICAL_UNKNOWN | G2, no G8 |
| `hypotheses[].rival_group_id` | `05` §6 | no | CONDITIONAL | agrupación coherente; sin ranking | UNKNOWN | CONTRACTUAL | |
| `hypotheses[].is_primary_candidate` | `05` §6 | `interpretation_constraint` como guía, no orden automático | NO si no hay base | default false; true solo con base IES | NOT_READY (criterio) | PHYSICAL_UNKNOWN | Sin ranking ficticio |
| `recommendations[]` | `05` §12; Const. V.14 | diagnosis_id o evidence_id | CONDITIONAL | ≥1 ancla existente; `condition`; no genérica | NOT_READY vs IES actual | CONTRACTUAL | Fail-closed |
| `next_verifications[]` | `05` §13 | OQ / conflict / limitation | CONDITIONAL | anclas ∈ IES; RE no ejecuta tool | READY (anclas) | CONTRACTUAL | Distinto de Recommendation |
| `decision_options[]` | `05` §14 | facts/evidence | CONDITIONAL | no presentar como decisión tomada; no cifras inventadas | NOT_READY | PHYSICAL_UNKNOWN | Test “permite comparar” |
| `abstentions[]` | `05` §7–§8 | status, coverage, limitations, OQ, entities, conflicts | NO (kind derivado) | `primary_anchor_ref` existe; kind del catálogo | READY | CONTRACTUAL | No es cobertura nueva |
| `clarification_requests[]` | `05` §15 | QUERY_SCOPE_INCOMPLETE, ENTITY_UNRESOLVED, OQ de input | CONDITIONAL | no para SOURCE_NOT_INTEGRATED ni para suavizar Tipo E | READY | CONTRACTUAL | |
| `reasoning_limits` | `05` §3 | limitations, coverage, source_health | CONDITIONAL | no contradecir IES | UNKNOWN (schema) | PHYSICAL_UNKNOWN | |
| `references` | `05` §3 | cualquier ID IES citado | NO | todos existen | READY | CONTRACTUAL | |
| Envelope Result (`result_id`, schema) | no congelado | n/a | n/a | n/a | UNKNOWN | PHYSICAL_UNKNOWN | Requiere G2 |
| Session echo (`analysis_mode`, idioma, channel_hint, depth) | `05` §2 | no (sesión ≠ IES) | NO | no mutan IES | UNKNOWN (tipos) | PHYSICAL_UNKNOWN | |

---

## 6. Lifecycle/abstention gate matrix

| condition | may_reason | may_emit_hypothesis | must_abstain | contract_reference | notes |
|-----------|------------|---------------------|--------------|--------------------|-------|
| `status=BUILDING` | NO | NO | NO (no hay ciclo vigente) | `04` §15; `05` §2 | Error de contrato. Builder actual no lo emite. |
| `status=VALIDATED` | YES | YES si ≥1 evidence_id y facts de soporte | NO por status | `04` §18; `05` §2 | Fixtures VALIDATED aún tienen `evidence=[]` → hipótesis NO |
| `status=PARTIAL` | YES LIMITED | YES LIMITED en dominio cubierto con evidence | YES sobre vacíos | `05` §9; `04` §18 | Tres bloques; no completar |
| `status=CONFLICTED` | YES LIMITED | LIMITED (rivales/WEAK; no ganador arbitrario) | YES si se exige conclusión única incompatible | `05` §10; caso 3 | No resolver; Tipo E visible |
| `status=NO_KNOWLEDGE` | YES LIMITED | **NO** (0 sustantivas) | **YES** (`NO_KNOWLEDGE`) | Const. IV C5; `05` §8; caso 2/11 | Consumible. NEXT_VERIFICATION/CLARIFICATION solo desbloqueo |
| `status=EXPIRED` | NO | NO | NO (no razonar vigente) | `04` §15; `05` §2 | `expires_at=null` hoy |
| `status=SUPERSEDED` | NO | NO | NO | `04` §15 | ≠ conflict SUPERSEDED |
| `status=INVALID` | NO | NO | NO | `04` §15 | `validate()` no sella este status |
| `evidence=[]` (cualquier status consumible) | YES LIMITED | **NO** | YES `INSUFFICIENT_EVIDENCE` si se pide hipótesis | Const. VIII; `05` §4 regla 1/4 | Realidad física actual |
| `diagnoses=[]` y `evidence=[]` | YES LIMITED | NO | YES para Recommendation | `05` §12 | |
| OQ `blocks_hypothesis=true` sobre el claim | YES LIMITED | NO ese claim | YES `BLOCKING_OPEN_QUESTION` | `05` §5, caso 10 | Default IES: true si NO_CONOZCO |
| `ENTITY_UNRESOLVED` / AMBIGUOUS | YES LIMITED | NO asignar responsable canónico | YES `UNRESOLVED_ENTITY` sobre esa entidad | `05` §7, caso 4 | |
| `QUERY_SCOPE_INCOMPLETE` | YES LIMITED | NO claims que requieran el alcance | YES `INCOMPLETE_SCOPE` | `05` §2 tabla reinterpretación | Clarification permitida |
| `SOURCE_NOT_INTEGRATED` | YES LIMITED | NO sobre ese dominio | YES si el claim lo requiere | `05` §8, caso 2 | NEXT_VERIFICATION integración, no clarificación inventada |
| `SOURCE_RESTRICTED` | YES LIMITED | NO sobre dominio restringido | YES `RESTRICTED_SOURCE` | `05` §7 | |
| `TOOL_ERROR` dominio necesario | YES LIMITED | no STRONG; posible abstención | YES `CRITICAL_TOOL_FAILURE` si el claim lo requiere | `05` §5, caso 9 | ≠ ausencia |
| `DATA_NOT_FOUND` | YES LIMITED | NO concluir inexistencia / ABSENCE_CONFIRMED | YES sobre el fenómeno no encontrado | `05` §2 | ≠ `ABSENCE_CONFIRMED` |
| `ABSENCE_CONFIRMED` (en fact) | YES | NO reabrir/negar | NO por sí (es conocimiento de ausencia) | `05` §2 | RE no reinterpreta |
| Conflicto OPEN/UNDER_REVIEW tensiona claim | YES LIMITED | máximo WEAK o abstener | YES `BLOCKING_CONFLICT` si impide conclusión pedida | `05` §5, §10 | ≠ MAT_* |
| Conflicto no relacionado | YES | sin techo global | NO | `05` §5 | |
| Tipo E OPEN/UNDER_REVIEW | YES LIMITED | no resolver ni acusar mala fe | NO suavizar | Const. V Tipo E; `05` caso 12 | NEXT_VERIFICATION institucional |
| `MATERIALITY_NOT_ASSESSED` | YES | YES si hay evidence (strength no baja por esto) | NO | `05` §16, caso 8 | Prohibido lenguaje MAT |
| Prompt “dime qué crees” + NO_KNOWLEDGE | YES LIMITED | **NO** | **YES** | `05` caso 11 | |
| Conocimiento general del modelo + PARTIAL | YES LIMITED | solo IES | YES sobre el hueco | `05` caso 13 | |
| Hipótesis de Run previo pedida como hecho | YES LIMITED | reiterar como hipótesis, nunca como hecho | YES si el usuario exige hecho N2 | `05` caso 14 | Run ≠ IES |
| OFFICIAL + ALTERNATIVE juntos | YES separado | por IES; no fusionar | N/A fusión | `05` §17, caso 6 | Físicamente solo OFFICIAL |
| IES no objeto / sin `ies_id` | NO | NO | NO | `04` §2; `05` §1 | Rechazo estructural |

---

## 7. LLM/provider boundary

```
                    ┌─ tools / SQL / loaders / OP / EKS writes / secretos ─ PROHIBIDO
IES (inmutable) ──►│
                    │  RE runtime (N5)
sesión (no epi.) ──►│     ├─ gate determinístico
                    │     ├─ adapter LLM (opcional, no normativo)
                    │     │     request: IES + sesión + política
                    │     │     response: candidatos semánticos N5
                    │     │     metadata: solo Run
                    │     │     error: fail-closed, no verdad
                    │     ├─ validador determinístico post-modelo
                    │     └─ Reasoning Result + Run (fuera EKS/IES)
                    └─ Channel Projection (06) ─ fuera de esta tarea
```

| Frontera | Estado |
|----------|--------|
| IES → RE | Solo lectura. Un IES. Sin Snapshot bypass. |
| Sesión → RE | No muta IES. `channel_hint` ≠ reglas WhatsApp/SSML. |
| RE → IES/Snapshot/Bundle/EKS | Escritura **prohibida**. |
| RE → tools/DB/fuentes | **Prohibida**. |
| Modelo → verdad empresarial | **Prohibida**. |
| Adapter request/response/timeout | **PHYSICAL_UNKNOWN**. Requiere G2. |
| Proveedor concreto | No contractual. Chat legado no es N5. |

---

## 8. Deterministic post-validation

Validaciones que **no** requieren LLM y **no** inventan fórmulas:

1. `ies.status` ∈ consumibles; si no → error, no Result vigente.
2. IES no se muta (comparar huella de entrada o trabajar sobre copia).
3. Toda hipótesis: `ies_id`/`ies_version` exactos; `statement_language`; `hypothesis_strength` ∈ enum; `supporting_fact_ids` ⊆ facts; `supporting_evidence_ids` ⊆ evidence y length ≥ 1; diagnosis/conflict/OQ IDs ⊆ IES; `limitations` presente; `validity_scope` no introduce entidad ausente.
4. Si `status=NO_KNOWLEDGE` o coverage `COV_NO_KNOWLEDGE` para el alcance necesario → `hypotheses[]` vacío; abstención `NO_KNOWLEDGE`.
5. Si `evidence.length===0` → 0 hipótesis.
6. `blocks_hypothesis=true` sobre el claim → no aceptar esa hipótesis.
7. Techo: conflicto OPEN/UNDER_REVIEW **citado como tensando el claim** → no STRONG (máximo WEAK) o abstener; no aplicar techo global a claims no relacionados.
8. `SOURCE_*` / `TOOL_ERROR` en dominio necesario del claim → no STRONG.
9. Recommendation: ≥1 diagnosis_id o evidence_id existente; si no, rechazar.
10. Next verification ≠ recommendation (campos/anclas distintos); ningún campo de ejecución de tool.
11. Decision option no marcada como elegida; sin cifras no presentes en IES.
12. Clarification no anclada a `SOURCE_NOT_INTEGRATED` como pedido de dato inventado.
13. Tipo E permanece en interpretation/result; no se borra ni se “suaviza”.
14. `MAT_*` de salida = copia de entrada; `MATERIALITY_NOT_ASSESSED` bloquea lenguaje MAT.
15. `is_primary_candidate=true` rechazado si no hay base contractual de orden (default false).
16. Sin tool-call en payload de adapter.
17. OFFICIAL/ALTERNATIVE: un `ies_id` por Result; prohibido mezclar facts de dos IES.

**No incluido (sería fórmula no autorizada):** score numérico de strength; umbral de “tensión material”; ranking de rivales; recálculo de coverage/confidence/materiality.

---

## 9. Hypothesis strength / rivals readiness

| Tema | Readiness |
|------|-----------|
| Enum WEAK/MODERATE/STRONG | CONTRACTUAL READY |
| Separación vs confidence/probability/MAT/severity | CONTRACTUAL READY |
| Techos cualitativos listados | CONTRACTUAL READY para **enforcement** post-modelo |
| Asignación inicial del token | PHYSICAL_UNKNOWN — **no** se propone fórmula |
| Calibración “tensión material del claim” | Diferida en `05` §24; cualitativa v1.0; **no G8** |
| Rivales + `rival_group_id` | CONTRACTUAL READY |
| `is_primary_candidate` | Default false READY; `true` UNKNOWN |
| Emisión real contra IES actual | **NO** — `evidence=[]` |

---

## 10. Recommendation / verification / decision-option separation

| Objeto | Pregunta que responde | Ancla mínima | ¿Ejecuta algo? | ¿Es verdad N1–N4? |
|--------|----------------------|--------------|----------------|-------------------|
| Recommendation | ¿Qué acción de negocio condicionada? | diagnosis **o** evidence | NO | NO |
| Next verification | ¿Qué falta saber / contrastar? | OQ / conflict / limitation | NO (RE no llama tools) | NO |
| Decision option | ¿Qué alternativas existen? | facts/evidence comparables | NO (RE no elige) | NO |
| Abstention | ¿Por qué no concluyo? | ancla IES del catálogo | NO | NO (no es cobertura) |
| Clarification | ¿Qué input de usuario desbloquea alcance? | scope/entity/OQ de usuario | NO | NO |

Confusiones prohibidas: “dar seguimiento” genérico ≠ Recommendation; “preguntar al usuario el estatus no integrado” ≠ Clarification; “la opción A es la decisión” ≠ Decision option.

---

## 11. Reasoning Run readiness

| Campo / semántica | `05` | Físico | Readiness |
|-------------------|------|--------|-----------|
| `reasoning_run_id` | conceptual | no runtime | UNKNOWN (fábrica) |
| Ancla IES | sí | IES tiene id/version/type | READY |
| Reasoning Result embebido | sí | Result sobre incompleto | UNKNOWN |
| provider/model metadata | auditoría | no adapter | UNKNOWN |
| prompt/template/version | CURRENT_TASK “si aplica”; `05` no congela | — | PHYSICAL_UNKNOWN |
| timestamps | `generated_at` | clock inyectable es analogía IES, no registrada en `05` | UNKNOWN |
| append-only | sí | no store | UNKNOWN |
| persistence | pendiente explícito | no SQL | NOT required for in-memory; in-memory **no registrado** |
| integrity/audit del Run | no equivalente a CANONICAL_JSON_V1 | — | PHYSICAL_UNKNOWN |
| fuera EKS/IES | sí | EKS no tiene tabla Run | CONTRACTUAL READY |

**Readiness global Run: NO-GO para IMPL** hasta G2 de al menos: (a) primer alcance in-memory vs persistencia; (b) campos mínimos de auditoría.

---

## 12. Replay / auditability analysis

| Parte | ¿Determinística? | ¿Replay absoluto? | Qué haría falta fijar (no aprobado) |
|-------|------------------|-------------------|-------------------------------------|
| Gate + validaciones §8 | SÍ | SÍ, dado el mismo IES + mismo Result candidato | — |
| Texto LLM | NO | NO | No prometible |
| Techos de strength | SÍ sobre un claim ya etiquetado | SÍ | — |
| Asignación WEAK/MODERATE/STRONG por el modelo | NO | NO | Mecanismo G2, no fórmula |
| IES ancla | SÍ (fingerprint IES) | Verificar huella IES | RECOMMENDATION: verificar `content_fingerprint` antes de razonar (no contractual en `05`) |
| Run | auditoría | verificable si conserva IES + Result + modelo + política | G2 metadata |

No se fija temperature, seed ni prompt productivo.

---

## 13. Physical unknowns

1. Interfaz runtime RE (factory/servicio/adapter).
2. Enum/escala de `analysis_mode` y `maximum_semantic_depth`; schema de `channel_hint`.
3. Request/response/timeout/error del adapter LLM.
4. Sobre físico de Reasoning Result (`result_id`, schema_version, tipos).
5. JSON de INTERPRETATION y `reasoning_limits`.
6. Schema de `validity_scope`.
7. Mecanismo de asignación de `hypothesis_strength` (sin fórmula).
8. Test de “IES permite ordenar” / “permite comparar opciones”.
9. Reasoning Run in-memory vs persistencia + integridad.
10. Metadata mínima de replay (prompt/template «si aplica»).
11. Quién emite `BUILDING`/`INVALID`/`EXPIRED`/`SUPERSEDED` en runtime IES (no bloquea el rechazo RE).
12. Fábrica de IDs N5 (`hypothesis_id`, `reasoning_run_id`, …).

---

## 14. Recommendations requiring approval

Ninguna de estas queda aprobada:

| ID | Recomendación | Gate para aprobarla |
|----|---------------|---------------------|
| R-RE-01 | Factory con `clock`, `idFactory`, `modelAdapter` inyectados; sin proveedor ambiental | G2 |
| R-RE-02 | Primer IMPL in-memory, un IES OFFICIAL, sin persistencia Run, sin ALTERNATIVE | G2 |
| R-RE-03 | Adapter: request `{ ies, session, policy_version }` → response `{ draft_result }` + metadata; errores → abstención/error de runtime, nunca N1–N4 | G2 |
| R-RE-04 | INTERPRETATION como objeto de tres bloques cuando PARTIAL/mixtos | G2 |
| R-RE-05 | Strength: el modelo propone el token; el validador aplica **solo** techos e enum; default rechazar STRONG si no hay evidence (ya contractual por no emitir hipótesis) | G2 |
| R-RE-06 | `is_primary_candidate` siempre false en v1 física hasta existir criterio IES | G2 o dejar default contractual |
| R-RE-07 | Verificar `content_fingerprint` IES antes del gate | G2 (no está en `05`) |
| R-RE-08 | No integrar proveedor concreto en el contrato; un stub de adapter en tests futuros | G2 de interfaz; proveedor = implementación posterior |

---

## 15. Blockers

| ID | Blocker | Impide |
|----|---------|--------|
| B1 | Interfaz adapter LLM no congelada | IMPL que invoque modelo sin inventar contrato |
| B2 | Sobre Reasoning Result incompleto | Serializar/validar Result sin inventar schema |
| B3 | Mecanismo de `hypothesis_strength` no congelado (y prohibición de inventar fórmula) | Asignar WEAK/MODERATE/STRONG en IMPL |
| B4 | Reasoning Run readiness no registrada en `05` | Almacén/auditoría inicial sin G2 |
| B5 | Session params sin schema físico | Segunda entrada no epistemológica implementable sin inventar enum/escala |
| B6 | `evidence[]` vacío en IES físico | Hipótesis y Recommendations **en la cadena real**; no bloquea gate/abstención, pero un IMPL “completo N5” no es demostrable sin N3 o sin recortar `05` |

B6 **no** se resuelve inventando evidencias ni bajando Constitución VIII. No es G2 de `05`; es límite del Evidence Builder. No autoriza IMPL-REASONING-001 como capa de hipótesis operativa.

---

## 16. Gate assessment

| Gate | Estado en tarea | Uso en esta ejecución |
|------|-----------------|------------------------|
| G1 | AUTHORIZED | Ejecutó la auditoría |
| G2 | PENDING_IF_REQUIRED | **No usado.** Decisiones que lo requieren: identificadas, no resueltas, no escritas en `docs/director-ia/` |
| G3 | N/A | No se creó contrato |
| G4 | — | Sin push/merge |
| G5 | humano | Este reporte no abre otra tarea ni IMPL-REASONING-001 |
| G6 | — | Protocolo intacto |
| G7 | — | Sin contradicción que detenga la auditoría. Desfase documental “runtime IES pendiente” vs builder existente: anotado, no “corregido” |
| G8 | N/A | Sin calibración |

### Decisiones que requieren G2 (listado explícito; no aprobadas)

1. Forma de interfaz runtime RE (D1).
2. Schema físico de parámetros de sesión (D2).
3. Contrato de adapter LLM request/response/error (D4, D19).
4. Sobre físico de Reasoning Result (D5).
5. Estructura física de INTERPRETATION (D6).
6. Mecanismo de asignación de `hypothesis_strength` cualitativo + techos, **sin fórmula** (D8).
7. Criterio físico de `is_primary_candidate` / comparabilidad de Decision Options (D9, D13) si no se deja fail-closed en false/vacío.
8. Readiness de Reasoning Run in-memory vs persistencia + campos de integridad/replay (D17, D18).
9. (Opcional) verificación de fingerprint IES como precondición RE.

Hasta que HUMAN_APPROVER registre las que considere necesarias en `05` (tarea futura con G2), **IMPL-REASONING-001 no debe crearse**.

---

## 17. GO/NO-GO for IMPL-REASONING-001

**NO-GO.**

Condiciones que un futuro IMPL exigiría **después** de G2 humano (esta tarea no las autoriza):

- Decisiones físicas de §16 registradas en contrato, o explícitamente declaradas implementación-level por humano.
- IES de entrada = runtime OFFICIAL existente (ya físico) + gate de status.
- Fail-closed: sin evidence_id ⇒ sin hipótesis ni recommendations.
- Sin LLM productivo hasta existir adapter congelado; sin tools; sin Channel Projection; sin persistencia Run salvo decisión G2.
- G8 sigue N/A.

Un IMPL reducido “solo gate + abstención, sin LLM” **tampoco** está autorizado aquí: seguiría inventando interfaz D1 y sobre D5, y `implementation_followup_rule` prohíbe crear IMPL-REASONING-001 desde esta tarea.

---

## 18. STOP

ARCH-REASONING-PHYSICAL-DECISIONS-001 cerrado en `DONE_PENDING_REVIEW`.

No se modificó `docs/director-ia/`, ningún runtime, `server.js` ni `package.json`. No se implementó RE, N5, adapter, prompts, Run store ni Channel Projection. No se inventaron fórmulas. No se autoaprobó G2. No hay commit, push ni merge. No se crea IMPL-REASONING-001.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
