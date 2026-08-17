# 05 — Reasoning Engine

## Nivel 5 — contrato de razonamiento ejecutivo subordinado al IES

**Documento:** `docs/director-ia/05-REASONING-ENGINE.md`  
**Versión:** 1.0  
**Estado:** REASONING ENGINE v1.0 APROBADO PARA CONGELAMIENTO; realización física D1–D16 registrada (`ARCH-REASONING-PHYSICAL-DECISIONS-002`)
**Tipo:** Contrato arquitectónico de Nivel 5 (sin implementación; sin Channel Projection)

### Dependencia normativa

| Documento | Rol |
|-----------|-----|
| `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` | Norma superior; Cap. III Nivel 5; Cap. V LLM Analista; VIII–IX |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | Límites del Motor; política cobertura/materiality; RE fuera del Motor |
| `docs/director-ia/02-EVIDENCE-BUILDER.md` | Lenguaje N1–N4; conflictos; tipificaciones; RE no ensambla |
| `docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md` | EKS = N1–N4; RE no escribe en EKS |
| `docs/director-ia/03A-OBSERVATION-PIPELINE.md` | AcquisitionStatus (RE no consume OP directo) |
| `docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md` | Flujos de referencia |
| `docs/director-ia/04-IES-STANDARD.md` | **IES v1.0 APROBADO PARA CONGELAMIENTO** — entrada única; §15/§18 |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | Índice de propiedad |

En conflicto, prevalece la Constitución.  
Este documento **no modifica** el esquema IES v1.0.  
**No** redefine C2–C5. **No** calibra `k`/`wi`. **No** diseña `06-CHANNEL-PROJECTION`.

### Decisiones D1–D10 (reflejo)

| ID | Decisión adoptada |
|----|-------------------|
| D1 | INTERPRETATION = lectura semántica del IES; no Nivel 6 ni Diagnosis |
| D2 | ABSTENTION con anclas derivadas de IES; no segunda cobertura |
| D3 | `HYP_STRENGTH_WEAK\|MODERATE\|STRONG`; ≠ confidence/probability/materiality/severity |
| D4 | RECOMMENDATION ≠ NEXT_VERIFICATION ≠ DECISION_OPTION |
| D5 | Reasoning Run append-only **fuera** de EKS e IES |
| D6 | RE = semántica; 06 = presentación |
| D7 | Hipótesis rivales permitidas; sin ranking ficticio |
| D8 | OFFICIAL/ALTERNATIVE sin fusión silenciosa |
| D9 | Canónico vigente `es-MX` + `statement_language`; no invariante universal |
| D10 | Gate de status conforme `04` §15/§18 |

Las decisiones semánticas D1–D10 de esta tabla **no se sustituyen**.
La realización física D1–D16 de `ARCH-REASONING-PHYSICAL-DECISIONS-002` se registra en §26; no redefinen N1–N5 ni el esquema IES v1.0.

---

# Índice

1. [Identidad del Reasoning Engine](#1-identidad-del-reasoning-engine)  
2. [Frontera de entrada](#2-frontera-de-entrada)  
3. [Salida semántica — Reasoning Result](#3-salida-semántica--reasoning-result)  
4. [Hypothesis](#4-hypothesis)  
5. [Hypothesis strength](#5-hypothesis-strength)  
6. [Hipótesis rivales](#6-hipótesis-rivales)  
7. [Abstention](#7-abstention)  
8. [NO_CONOZCO](#8-no_conozco)  
9. [Conocimiento parcial](#9-conocimiento-parcial)  
10. [Conflictos](#10-conflictos)  
11. [Causalidad](#11-causalidad)  
12. [Recommendation](#12-recommendation)  
13. [Next verification](#13-next-verification)  
14. [Decision option](#14-decision-option)  
15. [Clarification request](#15-clarification-request)  
16. [Materiality](#16-materiality)  
17. [OFFICIAL vs ALTERNATIVE](#17-official-vs-alternative)  
18. [Reasoning Run](#18-reasoning-run)  
19. [Independencia de proveedor](#19-independencia-de-proveedor)  
20. [RE vs Channel Projection](#20-re-vs-channel-projection)  
21. [Casos de referencia](#21-casos-de-referencia)  
22. [Invariantes](#22-invariantes)  
23. [Criterios de aceptación](#23-criterios-de-aceptación)  
24. [Riesgos pendientes](#24-riesgos-pendientes)  
25. [Control documental](#25-control-documental)
26. [Realización física v1 (D1–D16)](#26-realización-física-v1-d1d16)

---

# 1. Identidad del Reasoning Engine

## Qué es

El **Reasoning Engine (RE)** es la capa **Nivel 5 — Hipótesis** del pipeline Director IA.  
Es la **única** capa donde puede operar un **LLM analítico** para interpretación causal o probabilística, **subordinada** a un IES emitido e inmutable (Constitución III, V, IX; Motor; `04` §18).

Produce **inferencia semántica trazable** (hipótesis, reservas, recomendaciones condicionadas, verificaciones epistémicas, abstenciones) sin alterar la verdad determinista N1–N4 ni el IES.

## Qué no es

| El RE no es | Porque |
|-------------|--------|
| Fuente de verdad empresarial | La verdad vive en Snapshot → IES |
| Evidence Builder / Motor | No ensambla N1–N4 |
| Contenedor de hechos | Hipótesis ≠ hecho |
| Ejecutor de tools / SQL / APIs | Frontera `04` §18 |
| Channel Projection | No formatea canales |
| EKS | No persiste Bundles/Snapshots |
| “Nivel 6” | Constitución fija cinco niveles |

## Declaraciones explícitas

1. **RE no es fuente de verdad.**  
2. **RE no modifica IES, Snapshot ni Bundle.**  
3. **RE no crea N1–N4.**  
4. **RE no ejecuta tools.**  
5. **RE no consulta bases operacionales** ni loaders, raw payloads, secretos o tokens de sesión.  
6. **RE no crea** cobertura, `confidence`, `severity` ni `materiality` nuevas.  
7. **RE no reinterpreta** `ABSENCE_CONFIRMED` ni convierte `DATA_NOT_FOUND`, `SOURCE_*`, `TOOL_ERROR`, `ENTITY_UNRESOLVED` o `QUERY_SCOPE_INCOMPLETE` en conocimiento empresarial.

## Entrada / salida

| Dirección | Contenido |
|-----------|-----------|
| **Entrada de conocimiento** | Un IES válido (ver §2) |
| **Entrada de sesión** | `analysis_mode`, `canonical_reasoning_language`, `channel_hint`, `maximum_semantic_depth` (no alteran el IES) |
| **Salida** | Reasoning Result (§3) materializable en Reasoning Run (§18) |
| **Consumidor de presentación** | Futuro `06-CHANNEL-PROJECTION` |

### Realización física de interfaz (no es runtime)

Token: **REASONING_ENGINE_FACTORY_V1** (§26 D1).
Interfaz futura mínima: `createReasoningEngine({ modelAdapter, clock, idFactory, policy })` y `reason(ies, session)`.
El IES es la única entrada de conocimiento. `session` contiene únicamente parámetros no epistemológicos permitidos por este documento.
Esta subsección **no** implementa runtime.

## Relaciones

```
IES (determinista, inmutable para el LLM)
        ↓ solo lectura
Reasoning Engine (N5 / LLM analítico opcional)
        ↓ Reasoning Result + Reasoning Run (auditoría de inferencia)
Channel Projection (06 — presentación; fuera de este documento)
```

**Independencia de proveedor LLM:** el contrato es tecnológicamente invariante (Constitución). El proveedor/modelo se registra solo en el Reasoning Run como auditoría.

---

# 2. Frontera de entrada

## Entrada única de conocimiento

Un **IES** proyectado conforme a `04-IES-STANDARD.md` v1.0.

## Estados de ciclo de vida del IES (`04` §15)

| Estado | ¿Existe en 04? | Consumo por RE |
|--------|----------------|----------------|
| `BUILDING` | Sí | **No consumible** (04: “no consumible por RE”) |
| `VALIDATED` | Sí | **Sí** (`04` §18) |
| `PARTIAL` | Sí | **Sí** |
| `CONFLICTED` | Sí | **Sí** |
| `NO_KNOWLEDGE` | Sí | **Sí** (sin hipótesis sustantiva del alcance) |
| `EXPIRED` | Sí | **No** para nuevo razonamiento de situación vigente |
| `SUPERSEDED` | Sí (ciclo de vida IES ≠ `conflicts[].resolution_status`) | **No** para nuevo razonamiento vigente |
| `INVALID` | Sí | **No** |

## Parámetros de sesión (no alteran el IES)

| Parámetro | Uso |
|-----------|-----|
| `analysis_mode` | Modo de análisis (p. ej. diagnóstico, verificación, comparación) |
| `canonical_reasoning_language` | Idioma de statements semánticos del RE |
| `channel_hint` | Metadato opaco de canal destino; **no** autoriza reglas de formato |
| `maximum_semantic_depth` | Límite de profundidad de inferencia (no inventa datos) |

**Valor institucional vigente** de `canonical_reasoning_language`: **`es-MX`**.  
No es invariante universal: puede cambiarse por política institucional sin redefinir este contrato.

### Realización física de sesión (§26 D1)

Campos de `session`: `analysis_mode`, `canonical_reasoning_language`, `channel_hint`, `maximum_semantic_depth`.
Default institucional de `canonical_reasoning_language`: `es-MX`.
`session` no modifica el IES; no transporta hechos empresariales; no transporta fuentes/tools.

## Prohibido en entrada

SQL; PostgreSQL directo; tools; loaders; raw payloads; APIs operacionales; ObservationRecords fuera del IES; secretos; JWT; tokens de sesión; Knowledge Bundle/Snapshot como bypass del IES.

## Prohibido reinterpretar adquisición / ausencia

El RE **consume** tipificaciones ya proyectadas en el IES (`source_health`, `absence_state`, limitaciones). **No** las recalcula ni las colapsa:

| Estado / tipificación (IES) | El RE no puede concluir |
|-----------------------------|-------------------------|
| `ABSENCE_CONFIRMED` | Reabrir, degradar o negar la ausencia ya afirmada por EB |
| `DATA_NOT_FOUND` | “No existe el fenómeno” / cero / `ABSENCE_CONFIRMED` |
| `SOURCE_NOT_INTEGRATED` | Inexistencia empresarial |
| `SOURCE_RESTRICTED` | Inexistencia empresarial |
| `TOOL_ERROR` | Vacío de negocio o ausencia |
| `ENTITY_UNRESOLVED` | Hecho sobre entidad inferida / responsable canónico inventado |
| `QUERY_SCOPE_INCOMPLETE` | Conclusión que requiere el alcance faltante |

---

# 3. Salida semántica — Reasoning Result

Objeto conceptual de salida de un ciclo de razonamiento:

| Campo | Descripción |
|-------|-------------|
| `interpretation` | Lectura semántica fiel del IES (§3.1) |
| `hypotheses[]` | Hipótesis N5 (§4–§6) |
| `recommendations[]` | Acciones de negocio condicionadas (§12) |
| `next_verifications[]` | Acciones epistémicas (§13) |
| `decision_options[]` | Alternativas estructuradas (§14) |
| `abstentions[]` | Abstenciones ancladas (§7) |
| `clarification_requests[]` | Pedidos de aclaración (§15) |
| `reasoning_limits` | Límites declarados del razonamiento |
| `references` | IDs del IES citados |

### Realización física — STRUCTURED_REASONING_RESULT_V1 (§26 D3)

La salida del RE es un objeto estructurado conforme a este documento, validable antes de exposición o materialización como Reasoning Run.
Los arrays `hypotheses`, `recommendations`, `next_verifications`, `decision_options`, `abstentions` y `clarification_requests` están **siempre presentes** aunque vacíos.
`references` solo contiene IDs existentes del IES.
Ningún objeto de salida crea N1–N4 ni modifica IES.
Sin campos `probability` / `confidence` / `materiality` N5 inventados.

### Realización física — DETERMINISTIC_POST_VALIDATION_REQUIRED (§26 D5)

Toda salida candidata del modelo debe pasar validación determinística antes de ser aceptada como Reasoning Result. Lista de validaciones y comportamiento `REJECT_OR_ABSTAIN`: §26 D5.
Una salida candidata inválida no se corrige inventando soporte.

## 3.1 INTERPRETATION

| Es | No es |
|----|--------|
| Lectura explicativa de lo **ya** presente en el IES | Nivel epistemológico 6 |
| Separación visible de hecho/evidencia/diagnóstico/conflicto/límite | Diagnosis N4 |
| Parte de la salida RE (y del Run como nota) | Persistencia que cree conocimiento nuevo |
| Sin causalidad nueva | Hipótesis (si introduce causa probable → va a `hypotheses[]`) |

**Prohibido en interpretation:** agregar hechos, elevar materiality, resolver conflictos, rellenar `NO_CONOZCO`.

### Separación obligatoria en toda salida (conocimiento parcial)

Cuando aplique `PARTIAL` o cobertura mixta, la interpretation (y el Result) debe estructurar:

1. **LO QUE SÉ** — proyección fiel del IES  
2. **LO QUE PUEDO INFERIR** — hipótesis N5 con soporte  
3. **LO QUE NO PUEDO CONCLUIR** — limitaciones/OQ/dominios faltantes — **sin relleno LLM**

### Realización física — THREE_PART_INTERPRETATION_V1 (§26 D4)

INTERPRETATION se representa de manera estructurada, no como bloque narrativo sin frontera.

| Campo | Significado |
|-------|-------------|
| `what_is_known` | Referencias fieles a facts/evidence/diagnoses/conflicts del IES |
| `what_can_be_inferred` | Referencias a `hypotheses[]` emitidas por el mismo Result |
| `what_cannot_be_concluded` | Limitaciones, abstenciones y open questions ancladas al IES |

Texto semántico permitido solo como explicación N5 claramente separada. No agrega hechos; no eleva materiality; no resuelve conflictos; no rellena `NO_KNOWLEDGE`.

---

# 4. Hypothesis

## Contrato conceptual

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `hypothesis_id` | Sí | Identificador de la hipótesis (salida N5) |
| `ies_id` | Sí | IES de ancla |
| `ies_version` | Sí | Versión del IES |
| `statement` | Sí | Afirmación etiquetada como hipótesis |
| `statement_language` | Sí | Idioma del statement (p. ej. `es-MX`) |
| `supporting_fact_ids` | Sí (si se emite hipótesis) | ⊆ `facts[]` del IES ancla |
| `supporting_evidence_ids` | Sí (si se emite hipótesis) | ⊆ `evidence[]` — Constitución VIII: toda hipótesis declara evidencias |
| `supporting_diagnosis_ids` | No | ⊆ `diagnoses[]` |
| `conflict_ids` | No | Conflictos relacionados |
| `conflicting_evidence_ids` | No | Evidencias en tensión |
| `open_question_ids` | No | Huecos que debilitan |
| `limitations` | Sí | Reservas explícitas |
| `validity_scope` | Sí | Planta/periodo/entidad/modelo del claim |
| `hypothesis_strength` | Sí | §5 |
| `rival_group_id` | Condicional | §6 |
| `is_primary_candidate` | Condicional | §6; default false si no hay base de orden |

## Reglas

1. Toda hipótesis declara soporte en IDs del IES (Constitución VIII): **al menos un** `supporting_evidence_id` existente y hechos de soporte.  
2. **Ninguna hipótesis entra** al IES, Bundle o Snapshot.  
3. Hipótesis ≠ hecho ≠ evidencia ≠ diagnóstico.  
4. Sin referencias IES → hipótesis inválida (no emitir; abstener).  
5. “Tensión material del claim” (§5) **≠** `materiality` / `MAT_*`.

---

# 5. Hypothesis strength

## Tokens

| Token | Significado |
|-------|-------------|
| `HYP_STRENGTH_WEAK` | Inferencia frágil o muy condicionada |
| `HYP_STRENGTH_MODERATE` | Soporte útil con reservas materiales |
| `HYP_STRENGTH_STRONG` | Soporte sólido en el alcance del claim, sin tensión material adversa |

## Separación obligatoria

```
hypothesis_strength ≠ confidence (N2)
hypothesis_strength ≠ probability / %
hypothesis_strength ≠ materiality (MAT_*)
hypothesis_strength ≠ severity
```

Sin porcentajes. Sin `k`/`wi`.

## Criterios cualitativos

| Nivel | Criterios |
|-------|-----------|
| **STRONG** | Hechos **y** evidencias de soporte en IES para el claim; sin conflicto que **tensione el claim**; sin OQ con `blocks_hypothesis=true` sobre el claim; dominio del claim no en `NO_CONOZCO` |
| **MODERATE** | Soporte parcial útil; reservas por cobertura parcial u OQ no bloqueante; sin contradicción frontal del claim |
| **WEAK** | Soporte mínimo; o tensión/parcialidad que impide contundencia |

## Techos (por claim, no globales)

| Condición | Efecto |
|-----------|--------|
| Conflicto `OPEN` / `UNDER_REVIEW` que **tensiona el claim** (contradicción o incompatibilidad del claim con facts/evidence en tensión; **≠** `MAT_*`) | Máximo `WEAK` (o abstención si bloquea conclusión) |
| Conflicto **no relacionado** con el claim | **No** aplica techo global automático |
| `open_questions[].blocks_hypothesis=true` sobre el claim | **Abstención o bloqueo** del claim (no STRONG) |
| `SOURCE_*` / `TOOL_ERROR` en el **dominio causal necesario** del claim | No `STRONG`; posible abstención |
| `MATERIALITY_NOT_ASSESSED` | **No** reduce strength por sí; **prohíbe** lenguaje de materialidad |

### Realización física — MODEL_PROPOSES_VALIDATOR_BOUNDS_V1 (§26 D6)

El modelo puede proponer `WEAK`/`MODERATE`/`STRONG`, pero el runtime determinístico solo valida límites y puede degradar o rechazar cuando condiciones contractuales objetivas impiden el nivel propuesto.
No existe score numérico ni fórmula probability/confidence/materiality.

Hard bounds físicos:

- sin `supporting_evidence_ids` → no hypothesis
- sin `supporting_fact_ids` → no hypothesis
- conflicto adverso material al claim impide `STRONG`
- limitación bloqueante impide `STRONG`
- scope incompleto relevante impide `STRONG`
- `NO_KNOWLEDGE` → no hypothesis
- strength nunca se transforma en porcentaje
- strength nunca deriva de confidence/materiality/severity

Estos hard bounds **no derogan** los techos de esta sección. El techo «máximo `WEAK` (o abstención)» por conflicto que tensiona el claim permanece.
`strength` no ordena automáticamente hypotheses rivales. `is_primary_candidate=false` por defecto sin base contractual de orden.

---

# 6. Hipótesis rivales

1. Se permiten **múltiples** hipótesis.  
2. Si compiten sobre el mismo fenómeno/alcance → mismo `rival_group_id`.  
3. Cada una declara soporte a favor y en contra (IDs IES).  
4. **Incompatibles:** no pueden ser verdaderas a la vez bajo el mismo `validity_scope`.  
5. **Complementarias:** pueden coexistir sin exclusión (p. ej. factores concurrentes) — no forzar rivalidad falsa.  
6. `is_primary_candidate=true` **solo** si el IES permite ordenar (p. ej. asimetría clara de soporte **y** `interpretation_constraint` / ausencia de contradicción frontal).  
7. Sin base suficiente → **todas rivales sin ranking**; ninguna primaria.  
8. Prohibido: porcentajes ficticios; ganador arbitrario del LLM; fusionar rivales en un hecho.

### Realización física — RIVAL_GROUP_WITHOUT_AUTORANK_V1 (§26 D7)

Hipótesis rivales pueden compartir `rival_group_id`. El runtime no crea ranking automático ni selecciona primary candidate sin base explícita.

---

# 7. Abstention

## Contrato conceptual

| Campo | Descripción |
|-------|-------------|
| `abstention_id` | Identificador |
| `ies_id` | Ancla |
| `scope` | Alcance de lo no concluido |
| `primary_anchor_type` | `coverage_token` \| `execution_status` \| `conflict_id` \| `open_question_id` \| `limitation_id` \| `entity_resolution` |
| `primary_anchor_ref` | Valor/ID existente en el IES |
| `secondary_anchors` | Lista opcional del mismo universo |
| `abstention_kind` | Etiqueta RE **derivada** (abajo) |
| `message_semantic` | Declaración controlada |

## Principio

ABSTENTION **explica por qué** el RE no concluye.  
**No** crea un nuevo sistema de cobertura ni nueva verdad.

## Catálogo derivado `abstention_kind` (no verdad aguas arriba)

| Kind | Ancla típica en IES |
|------|---------------------|
| `NO_KNOWLEDGE` | `COV_NO_KNOWLEDGE` / `status=NO_KNOWLEDGE` |
| `INSUFFICIENT_EVIDENCE` | Bancos insuficientes para el claim |
| `BLOCKING_OPEN_QUESTION` | `open_question` con `blocks_hypothesis=true` |
| `UNRESOLVED_ENTITY` | Entidad `AMBIGUOUS` / `UNRESOLVED` / `ENTITY_UNRESOLVED` |
| `INCOMPLETE_SCOPE` | `QUERY_SCOPE_INCOMPLETE` / scope incompleto |
| `RESTRICTED_SOURCE` | `SOURCE_RESTRICTED` |
| `CRITICAL_TOOL_FAILURE` | `TOOL_ERROR` en dominio necesario |
| `BLOCKING_CONFLICT` | Conflicto que impide la conclusión pedida |

### Realización física — DETERMINISTIC_ABSTENTION_GATE_V1 (§26 D8)

Antes de invocar modelo y después de validar su resultado existe gate determinístico de abstención. Condiciones, rechazo de lifecycle y estados consumibles: §26 D8.
ABSTENTION no crea segunda cobertura.

---

# 8. NO_CONOZCO

Si el IES está en `NO_KNOWLEDGE` / `COV_NO_KNOWLEDGE` para el **alcance necesario**:

1. No hipótesis sustantiva sobre ese alcance.  
2. No conocimiento general del modelo.  
3. No entrenamiento previo como fuente empresarial.  
4. No recomendaciones que dependan del dato faltante.  
5. Emitir **ABSTENTION** (`NO_KNOWLEDGE`).  
6. Identificar limitación / fuente faltante (del IES).  
7. Permitir **NEXT_VERIFICATION** o **CLARIFICATION_REQUEST** si pueden desbloquear conocimiento (integrar fuente, pedir input de alcance) — no inventar el dato.

---

# 9. Conocimiento parcial

Bajo `PARTIAL` / `COV_PARTIAL_KNOWLEDGE`:

| Bloque | Contenido permitido |
|--------|---------------------|
| LO QUE SÉ | Facts/evidence/diagnoses/conflicts/limitations del IES |
| LO QUE PUEDO INFERIR | Hipótesis con soporte y strength acotada |
| LO QUE NO PUEDO CONCLUIR | Dominios faltantes, OQ, `SOURCE_*`, vacíos — **sin relleno LLM** |

`CONOZCO_PARCIALMENTE` **no** autoriza completar vacíos (`04` §18).

---

# 10. Conflictos

## Comportamiento por tipo (`CONF_TYPE_*` del IES)

| Tipo | Comportamiento RE |
|------|-------------------|
| A datos | Exponer incompatibilidad; no promediar; no elegir fuente ganadora |
| B temporal | Respetar periodos/vigencia del IES |
| C interpretación | Usar `interpretation_constraint` si existe; no conciliar en silencio |
| D cobertura | No fingir cobertura completa |
| **E gobernanza** | Siempre visible; no minimizar; no acusar mala fe; no resolver; **NEXT_VERIFICATION** institucional cuando aplique (Constitución V Tipo E) |

## Campos que el RE jamás cambia

`resolution_status`, `severity`, `weight_assessment`, `interpretation_constraint`, tipos de conflicto.

Puede **leer** `weight_assessment` / `interpretation_constraint` como guía de lectura (“mejor soportado según el IES”), sin resolver el conflicto.

Techo de strength: solo si el conflicto **tensiona el claim** (§5).

---

# 11. Causalidad

| Capa | Contenido |
|------|-----------|
| **N3 (IES)** | Correlación; contribución cuantificada; regla causal **aprobada** (si existe en gobernanza) |
| **N5 (RE)** | Hipótesis causal subordinada |

**Permitido** sin causalidad demostrada: “la evidencia sugiere”; “una explicación probable”; “es consistente con”.  
**Prohibido** sin causalidad demostrada: “la causa es”; “está demostrado”; “definitivamente”.

Una causa probable **nunca** se convierte en hecho N2, evidencia N3 ni diagnóstico N4.

---

# 12. Recommendation

**RECOMMENDATION** = acción de **negocio/operación** sustentada y condicionada (Constitución V.14).

| Campo | Descripción |
|-------|-------------|
| `recommendation_id` | ID |
| `statement` | Acción propuesta |
| `condition` | Condición de validez (“si se confirma X…”) |
| `supporting_diagnosis_ids` | Anclas (al menos un diagnosis **o** evidence obligatorio) |
| `supporting_evidence_ids` | Anclas |
| `related_conflict_ids` | Si aplica |
| `limitations` | Reservas |

**Prohibido:** recomendaciones genéricas sin ancla IES (“dar seguimiento”, “mejorar comunicación” sin objeto).  
Emitir `recommendations[]` exige **≥1** `supporting_diagnosis_id` o `supporting_evidence_id` existente en el IES.

### Realización física — SUPPORTED_CONDITIONAL_RECOMMENDATION_V1 (§26 D9)

Recommendation es acción de negocio condicionada, nunca hecho ni mandato automático. Debe citar soporte IES y las hipótesis/diagnósticos que la motivan cuando existan.

Campos mínimos físicos: `recommendation_id`, `statement`, `statement_language`, `supporting_fact_ids`, `supporting_evidence_ids`, `supporting_hypothesis_ids`, `conditions`, `limitations`, `ies_id`, `ies_version`.

Fail-closed: sin evidence suficiente → no recommendation sustantiva; `NO_KNOWLEDGE` → no recommendation sustantiva.
Esto **no** autoriza fabricar evidencia. Los campos conceptuales de esta sección no se derogan.

---

# 13. Next verification

**NEXT_VERIFICATION** = acción para **mejorar el estado del conocimiento** (objeto independiente ≠ Recommendation).

Puede buscar: cerrar `open_question`; contrastar fuentes; resolver entidad; verificar responsable; revisar Tipo E; completar scope.

| Campo conceptual | Uso |
|------------------|-----|
| `next_verification_id` | ID |
| `statement` | Qué verificar |
| `purpose` | Hueco epistémico que cierra |
| `related_open_question_ids` / `conflict_ids` / `limitation_ids` | Anclas IES |
| `limitations` | Reservas |

Ejemplo: “Validar con gerente el responsable del folio” → NEXT_VERIFICATION.  
“Reducir descuento del cliente” → RECOMMENDATION (solo con ancla).

### Realización física — EPISTEMIC_ACTION_ONLY_V1 (§26 D10)

Next Verification describe qué información debe verificarse después. RE no ejecuta la acción ni invoca tools.

Campos mínimos físicos: `verification_id`, `question_or_check`, `reason`, `required_data`, `expected_source_if_known`, `related_ies_ids`, `related_open_question_ids`, `priority`.
No sustituyen los campos conceptuales de esta sección.

---

# 14. Decision option

**DECISION_OPTION** = alternativa ejecutiva estructurada. El RE **no elige** automáticamente.

| Campo | Descripción |
|-------|-------------|
| `option_id` | ID |
| `description` | Descripción |
| `supporting_fact_ids` / `supporting_evidence_ids` | Anclas |
| `prerequisites` | Condiciones previas |
| `expected_tradeoffs` | Trade-offs explícitos (sin inventar cifras ausentes del IES) |
| `limitations` | Límites |

**No crear** options si el IES no permite comparar alternativas con base factual.

### Realización física — NON_EXECUTED_DECISION_OPTION_V1 (§26 D11)

Decision Option es alternativa estructurada para decisión humana. Nunca indica que la decisión ya fue tomada.

Campos mínimos físicos: `decision_option_id`, `statement`, `conditions`, `expected_tradeoffs`, `supporting_references`, `limitations`, `execution_status`.
`execution_status` = `NOT_EXECUTED`.

---

# 15. Clarification request

Pedir aclaración al usuario cuando el IES tipifica:

- `QUERY_SCOPE_INCOMPLETE`;  
- `ENTITY_UNRESOLVED` / entidad ambigua;  
- pregunta ambigua de entrada;  
- `open_question` resoluble con input del usuario.

**Prohibido:** usar aclaración para ocultar Tipo E; delegar al usuario datos que el sistema debería tener integrados (`SOURCE_NOT_INTEGRATED` → NEXT_VERIFICATION de integración, no “pregúntele al usuario el estatus inventado”).

### Realización física — IES_ANCHORED_CLARIFICATION_V1 (§26 D12)

Clarification Request solo pide resolver ambigüedad/alcance que el IES declara. No inventa entidad ni hechos.

Campos mínimos físicos: `clarification_id`, `question`, `reason`, `related_open_question_ids`, `related_limitation_ids`, `related_unresolved_entities`.

---

# 16. Materiality

El RE **solo consume** valores proyectados en el IES:

`MAT_LOW` \| `MAT_MEDIUM` \| `MAT_HIGH` \| `MAT_CRITICAL` \| `MATERIALITY_NOT_ASSESSED`

**Prohibido:** crear, elevar, reducir o reinterpretar materiality.  
Confidence / severity / priority **no** autorizan `MAT_*`.

Si `MATERIALITY_NOT_ASSESSED`: puede interpretar hechos; **no** describir el asunto como bajo/medio/alto/crítico **vía materiality**.

---

# 17. OFFICIAL vs ALTERNATIVE

1. Razonar siempre anclado a un `ies_id` (+ `ies_type`, `ies_version`).  
2. Si existen OFFICIAL y ALTERNATIVE: razonar **separadamente** o comparar **explícitamente**.  
3. **No** fusionar silenciosamente.  
4. **No** crear un tercer IES.  
5. **No** presentar síntesis como nueva verdad institucional.  
6. Toda afirmación comparativa identifica de qué IES proviene.  
7. Conservar `alternative_context` / provenance; no alterar autoría histórica del Snapshot.

---

# 18. Reasoning Run

## Naturaleza

**Reasoning Run** = auditoría append-only de **inferencia N5**.  
**No** es conocimiento empresarial N1–N4.  
**No** vive en EKS ni en IES.

## Campos conceptuales

| Campo | Descripción |
|-------|-------------|
| `reasoning_run_id` | ID del run |
| `ies_id` / `ies_version` / `ies_type` | Ancla IES |
| `generated_at` | Timestamp |
| `model_reference` | Identificador de modelo (auditoría) |
| `model_provider_reference` | Proveedor (auditoría; no dependencia normativa) |
| `reasoning_policy_version` | Versión de este contrato / política |
| `canonical_reasoning_language` | Idioma semántico usado |
| `hypotheses` / `recommendations` / `next_verifications` / `decision_options` / `abstentions` / `clarification_requests` | Salidas |
| `interpretation` | Nota de lectura (opcional) |
| `references` / `limitations` | Trazas |

## Reglas

1. Append-only.  
2. Nunca entra automáticamente a N1–N4.  
3. Nunca se usa como hecho por un ciclo futuro de ensamblaje.  
4. Nunca modifica Snapshot/IES.  
5. Puede conservarse para auditoría y derechos de trazabilidad.  
6. La futura memoria conversacional **no** puede tratar Reasoning Run como verdad institucional **sin** un contrato explícito distinto (fuera de v1.0 de este documento).

**Propietario documental del contrato:** este `05`.  
**Propietario de runtime/almacén físico:** pendiente de implementación (fuera de EKS e IES; no se crea un segundo Knowledge Store). Hasta existir runtime, el Run es solo contrato.

### Realización física — IN_MEMORY_REASONING_RUN_FIRST (§26 D13)

IMPL-REASONING-001 puede producir Reasoning Run in-memory como artefacto de auditoría de la inferencia, **sin persistencia durable**. Persistencia durable requiere tarea separada.

Campos mínimos físicos: `run_id`, `ies_id`, `ies_version`, `started_at`, `completed_at`, `status`, `session`, `provider_metadata`, `reasoning_result`, `validation_result`, `audit`.

Constraints: append-only conceptual; no escribe EKS; no escribe IES; provider/model metadata es auditoría, no epistemología.

### Realización física — AUDITABLE_NOT_BITWISE_REPLAY_V1 (§26 D14)

El runtime registra suficiente metadata para auditar qué IES, sesión, adapter/proveedor y resultado participaron. **No** promete que una segunda llamada LLM produzca bytes idénticos.

Auditoría requerida: `ies_id`/`ies_version`; `session`; provider/model metadata; output schema version; timestamps; validation outcome; references utilizadas.

---

# 19. Independencia de proveedor

El contrato **no depende** de OpenAI, GPT, Anthropic, Gemini ni modelo concreto.  
`model_reference` / `model_provider_reference` son solo auditoría del Run.

### Realización física — PROVIDER_NEUTRAL_MODEL_ADAPTER_V1 (§26 D2)

El runtime RE depende de un `modelAdapter` inyectado y neutral respecto del proveedor. El contrato semántico RE no menciona OpenAI, Anthropic u otro proveedor concreto.

Operación: `infer(request)`.
Input: `reasoning_context` derivado exclusivamente del IES; `session`; `output_schema_version`.
Output: `candidate_reasoning_result`; `provider_metadata` (`provider`, `model`, `model_version` si está disponible, `request_id` si está disponible).
Constraints: sin tool calls; sin DB; sin fuentes operacionales; sin mutación IES; la respuesta del modelo es candidata, nunca verdad automáticamente; errores/timeout producen abstention/error controlado, no hechos.

### Realización física — PROVIDER_FAILURE_FAIL_CLOSED_V1 (§26 D15)

Timeout/error/malformed output del provider produce Reasoning Result o Run controlado con abstention/error metadata, sin hipótesis ni recommendations inventadas.

### Realización física — ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1 (§26 D16)

IMPL-REASONING-001 inicial debe funcionar completamente con adapter fake inyectado en tests y ser capaz de ejecutar gates/validación/abstención. No requiere proveedor real productivo. Sin networking; sin API keys. Integration real con proveedor = tarea posterior. Esta sección **no** crea runtime.

---

# 20. RE vs Channel Projection

| Reasoning Engine (este doc) | Channel Projection (`06`, futuro) |
|-----------------------------|-----------------------------------|
| Conclusión semántica | Idioma final de canal |
| Interpretation | Tono, longitud |
| Hypotheses + strength + rivales | Voz / SSML |
| Recommendations / Next verifications / Options | WhatsApp formatting |
| Abstentions / Clarifications | Dashboard UI / emojis / markdown |
| References a IDs IES | Presentación ejecutiva |

Constitución V.15 define **orden semántico** de respuesta, no diseño visual ni reglas de canal.  
`channel_hint` no autoriza emitir reglas de presentación desde el RE.

---

# 21. Casos de referencia

> Ilustrativos. No son datos de producción. No modifican el IES.

### Caso 1 — ¿Por qué cayó Puebla?

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `PARTIAL`; facts/evidence ARR/IGF; diagnosis riesgo; OQ deltas; a menudo `MATERIALITY_NOT_ASSESSED` |
| Gate | Consumible |
| Interpretation | LO QUE SÉ = desviaciones; LO QUE NO = descomposición delta |
| Hypotheses | Causas probables débiles/moderadas con soporte; rivales posibles |
| Abstention | Sobre causas no soportadas / deltas no integrados |
| Recommendation | Solo si ancla IES lo permite |
| Next verification | Cerrar OQ de descomposición |
| Referencias | fact/evidence/diagnosis/oq ids |

### Caso 2 — Folio 421 + `SOURCE_NOT_INTEGRATED`

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `NO_KNOWLEDGE`; bancos vacíos; limitation fuente |
| Gate | Consumible |
| Interpretation | Declaración controlada de desconocimiento |
| Hypotheses | **Ninguna** sustantiva de etapa |
| Abstention | `NO_KNOWLEDGE` |
| Recommendation | No dependiente del estatus faltante |
| Next verification | Integrar/habilitar fuente de folio status |
| Clarification | Solo si falta input de alcance (no inventar etapa) |

### Caso 3 — Cliente X con conflicto

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `CONFLICTED`; Tipo A/C; facts en tensión |
| Gate | Consumible |
| Interpretation | Primacía del conflicto |
| Hypotheses | Rivales o WEAK; no ganador arbitrario |
| Abstention | Si se exige conclusión única incompatible |
| Next verification | Contrastar fuentes / evidencia de cierre |
| Recommendation | Evitar acciones que asuman un lado no resuelto |

### Caso 4 — Responsable + `ENTITY_UNRESOLVED`

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | Parcial; entidad no resuelta |
| Gate | Consumible |
| Hypotheses | No asignar responsable canónico |
| Abstention | `UNRESOLVED_ENTITY` |
| Next verification / Clarification | Resolver entidad o verificación institucional si Tipo E |

### Caso 5 — ¿Qué debería hacer?

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `VALIDATED` o `PARTIAL` con diagnosis |
| Gate | Consumible |
| Hypotheses | Opcionales si hay causa abierta |
| Recommendation | Condicionada a diagnosis/evidence |
| Next verification | Si faltan datos para actuar |
| Decision options | Solo si el IES permite comparar |

### Caso 6 — ALTERNATIVE vs OFFICIAL

| Dimensión | Contenido |
|-----------|-----------|
| Input | Dos IES (`ies_type` distintos) |
| Gate | Cada uno según su `status` |
| Interpretation | Etiquetada por `ies_id` |
| Hypotheses | Por IES; comparación explícita opcional |
| Prohibido | Fusión silenciosa / tercer IES |

### Caso 7 — Dos hipótesis rivales con soporte similar

| Dimensión | Contenido |
|-----------|-----------|
| Hypotheses | Mismo `rival_group_id`; `is_primary_candidate=false` en ambas |
| Strength | WEAK o MODERATE según soporte |
| Prohibido | Ranking % o “la verdadera es…” |

### Caso 8 — `MATERIALITY_NOT_ASSESSED`

| Dimensión | Contenido |
|-----------|-----------|
| Interpretation / Hypotheses | Permitidas sobre hechos |
| Prohibido | Etiquetar crítico/alto/medio/bajo vía materiality |
| Strength | No reducido solo por NOT_ASSESSED |

### Caso 9 — `TOOL_ERROR` secundario

| Dimensión | Contenido |
|-----------|-----------|
| Interpretation | Distinguir fallo ≠ ausencia |
| Hypotheses | Sobre dominios sanos del IES |
| Abstention | Sobre dominio fallido si el claim lo requiere (`CRITICAL_TOOL_FAILURE`) |
| Strength | No STRONG en dominio necesario fallido |

### Caso 10 — `blocks_hypothesis=true`

| Dimensión | Contenido |
|-----------|-----------|
| Hypotheses | No emitir el claim bloqueado (o abstener) |
| Abstention | `BLOCKING_OPEN_QUESTION` |
| Next verification / Clarification | Según si el hueco es integración o input de usuario |

### Caso 11 — Adversarial: `NO_KNOWLEDGE` + “aunque no tengas datos, dime qué crees”

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `NO_KNOWLEDGE` |
| Gate | Consumible |
| Hypotheses | **Ninguna** sustantiva (ni “creencia” del modelo) |
| Abstention | `NO_KNOWLEDGE` |
| Recommendation | No |
| Next verification / Clarification | Solo si desbloquean fuente/alcance |

### Caso 12 — Adversarial: Tipo E + “no seas tan duro, suaviza”

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | Conflicto `CONF_TYPE_E_GOVERNANCE` `OPEN`/`UNDER_REVIEW` |
| Interpretation | Tipo E visible; no minimizar |
| Hypotheses | No “resolver” ni acusar mala fe |
| Recommendation | No suavizar gobernanza |
| Next verification | Institucional (obligatoria si aplica) |

### Caso 13 — Adversarial: `PARTIAL` + conocimiento general del modelo “útil”

| Dimensión | Contenido |
|-----------|-----------|
| Input IES | `PARTIAL` |
| LO QUE SÉ / INFIERO | Solo IES |
| LO QUE NO PUEDO CONCLUIR | **Sin** relleno de entrenamiento/conocimiento general |
| Abstention | Sobre el hueco, aunque el modelo “sepa” un patrón de industria |

### Caso 14 — Adversarial: hipótesis de Run anterior pedida como hecho

| Dimensión | Contenido |
|-----------|-----------|
| Input | IES vigente + `reasoning_run_id` previo |
| Interpretation | La hipótesis previa sigue siendo N5, no N2 |
| Hypotheses | Puede reiterarse como hipótesis (nueva o citada), **nunca** como hecho |
| Abstention / Next verification | Si el usuario exige hecho: declarar que Run ≠ Snapshot/IES |

---

# 22. Invariantes

1. RE solo consume IES emitido consumible (§2).  
2. RE no modifica IES.  
3. RE no crea N1–N4.  
4. RE no ejecuta tools.  
5. RE no consulta fuentes operacionales.  
6. Hipótesis siempre trazable a IDs del IES.  
7. Hipótesis nunca es hecho.  
8. `hypothesis_strength` nunca es probability / confidence / materiality / severity.  
9. `NO_CONOZCO` nunca se rellena con conocimiento del modelo.  
10. Conflicto nunca se resuelve por RE.  
11. Tipo E nunca se suaviza.  
12. Materiality nunca se reinterpreta.  
13. Recommendation requiere ancla IES.  
14. Next Verification ≠ Recommendation.  
15. Reasoning Run ≠ Knowledge Store (EKS).  
16. Reasoning Run no realimenta hechos automáticamente.  
17. OFFICIAL y ALTERNATIVE no se fusionan silenciosamente.  
18. RE produce semántica; 06 presentación.  
19. Sin dependencia normativa de proveedor LLM.  
20. No existe Nivel 6; INTERPRETATION no es Diagnosis.  
21. Techo de strength por conflicto solo si tensiona el claim (**≠** `MAT_*`).  
22. `blocks_hypothesis=true` bloquea el claim.  
23. RE no crea cobertura, `confidence` ni `severity`.  
24. RE no reinterpreta `ABSENCE_CONFIRMED` ni colapsa estados de adquisición.  
25. Reasoning Run no es memoria institucional ni hecho de un ciclo futuro.
26. Toda salida candidata del modelo pasa validación determinística (`DETERMINISTIC_POST_VALIDATION_REQUIRED`).
27. Sin `supporting_evidence_ids` existentes no hay hipótesis sustantiva ni recommendation sustantiva; no se fabrica evidencia.
28. Fallo de proveedor es fail-closed (`PROVIDER_FAILURE_FAIL_CLOSED_V1`).
29. `hypothesis_strength` no auto-ordena rivales (`RIVAL_GROUP_WITHOUT_AUTORANK_V1`).

---

# 23. Criterios de aceptación

Checklist verificable antes de implementación productiva del RE:

| # | Criterio | Prueba conceptual |
|---|----------|-------------------|
| 1 | Gate `BUILDING`/`INVALID` rechazado | Intento de razonar → error de contrato |
| 2 | Gate `EXPIRED`/`SUPERSEDED` no razona situación vigente | Idem |
| 3 | `NO_KNOWLEDGE` → abstención; 0 hipótesis sustantivas | Caso 2 |
| 4 | `PARTIAL` → tres bloques; sin relleno del tercero | Caso 1 |
| 5 | `CONFLICTED` → conflicto visible; sin ganador arbitrario | Caso 3 |
| 6 | Rivales sin ranking si soporte similar | Caso 7 |
| 7 | Tipo E → visible + NEXT_VERIFICATION institucional | Cap. V |
| 8 | `MATERIALITY_NOT_ASSESSED` → sin lenguaje MAT | Caso 8 |
| 9 | ALTERNATIVE vs OFFICIAL sin fusión | Caso 6 |
| 10 | Toda hipótesis cita evidence/fact ids | Trazabilidad |
| 11 | Recommendation sin ancla → rechazada | §12 |
| 12 | Next Verification ≠ Recommendation | Casos 2/5 |
| 13 | Run no escribe EKS/IES | §18 |
| 14 | Sin tools/SQL desde RE | §2 |
| 15 | Proveedor solo en auditoría del Run | §19 |
| 16 | `channel_hint` no produce reglas WhatsApp/SSML | §20 |
| 17 | Conflicto no relacionado no techa todos los claims | §5 |
| 18 | `blocks_hypothesis` bloquea claim | Caso 10 |
| 19 | Prompt “dime qué crees” bajo `NO_KNOWLEDGE` → abstención | Caso 11 |
| 20 | Prompt “suaviza” con Tipo E → no suavizar | Caso 12 |
| 21 | Conocimiento general no rellena PARTIAL | Caso 13 |
| 22 | Hipótesis de Run previo ≠ hecho | Caso 14 |

---

# 24. Riesgos pendientes

1. Implementación de almacén durable del Reasoning Run (fuera de EKS) — persistencia física pendiente; in-memory first registrado en §26 D13.
2. Contrato futuro de memoria conversacional vs Run (no tratar Run como verdad).
3. Runtime de Channel Projection (`06`) — fuera de este documento.
4. Persistencia IES y runtime RE: la proyección IES `OFFICIAL` in-memory existe fuera de este documento; este `05` **no** implementa RE.
5. Calibración futura de umbrales de “tensión material” del claim vs conflicto — cualitativa en v1.0; sin %. Los hard bounds §26 D6 no son fórmula ni G8.
6. NC menor de etiqueta EKS “IES (futuro)”: higiene documental (no contrato).
7. Evidence Builder vigente puede emitir `evidence[]` vacío; RE fail-closed (cero hipótesis/recommendations sustantivas) hasta existir evidencias autorizadas. No se fabrica evidencia.
8. Integración con proveedor LLM real — tarea posterior (§26 D16).

---

# 25. Control documental

| Campo | Valor |
|-------|--------|
| Documento | `05-REASONING-ENGINE.md` |
| Versión | 1.0 |
| Estado | **REASONING ENGINE v1.0 APROBADO PARA CONGELAMIENTO**; realización física D1–D16 registrada (`ARCH-REASONING-PHYSICAL-DECISIONS-002`) |
| Dependencias | Constitución; EKE; IES v1.0 congelado; EB; EKS (límites) |
| Entrada | IES emitido |
| Salida | Reasoning Result + Reasoning Run |
| Hipótesis en IES | Prohibidas |
| Runtime | **PENDIENTE** (interfaz física registrada en §26; esta sección no implementa) |
| Channel Projection | Fuera de alcance (`06`) |
| Commit | No realizado |

### Resultado de auditoría contractual

**REASONING ENGINE v1.0 APROBADO PARA CONGELAMIENTO**
**Realización física D1–D16:** registrada.
(**Runtime:** PENDIENTE. Esta sección no autoriza IMPL-REASONING-001 por sí sola.)

---

# 26. Realización física v1 (D1–D16)

Esta sección **no** redefine N1–N5 ni la Constitución. No cambia el esquema IES v1.0. No crea Nivel 6. No convierte hipótesis en hechos. No permite tools, DB ni fuentes operacionales. No crea `materiality` / `confidence` / `probability` nuevas. No cambia taxonomía de conflictos ni coverage. No diseña Channel Projection. No autoriza un proveedor concreto como norma. No calibra G8. No implementa runtime. No autoriza IMPL-REASONING-001 por sí sola.

Registra las decisiones físicas aprobadas por HUMAN_APPROVER (tarea `ARCH-REASONING-PHYSICAL-DECISIONS-002`, G1+G2). Evidencia: `ARCH-REASONING-PHYSICAL-DECISIONS-001`.

Los identificadores D1–D16 de **esta sección** son los de `CURRENT_TASK` / `ARCH-REASONING-PHYSICAL-DECISIONS-002`. **No** sustituyen las decisiones semánticas D1–D10 de la cabecera de este documento.

Tokens: `REASONING_ENGINE_FACTORY_V1`, `PROVIDER_NEUTRAL_MODEL_ADAPTER_V1`, `STRUCTURED_REASONING_RESULT_V1`, `THREE_PART_INTERPRETATION_V1`, `DETERMINISTIC_POST_VALIDATION_REQUIRED`, `REJECT_OR_ABSTAIN`, `MODEL_PROPOSES_VALIDATOR_BOUNDS_V1`, `RIVAL_GROUP_WITHOUT_AUTORANK_V1`, `DETERMINISTIC_ABSTENTION_GATE_V1`, `SUPPORTED_CONDITIONAL_RECOMMENDATION_V1`, `EPISTEMIC_ACTION_ONLY_V1`, `NON_EXECUTED_DECISION_OPTION_V1`, `IES_ANCHORED_CLARIFICATION_V1`, `IN_MEMORY_REASONING_RUN_FIRST`, `AUDITABLE_NOT_BITWISE_REPLAY_V1`, `PROVIDER_FAILURE_FAIL_CLOSED_V1`, `ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1`. **Prohibido** sustituirlos en implementación.

| ID | Decisión aprobada | Significado contractual |
|----|-------------------|-------------------------|
| D1 | **REASONING_ENGINE_FACTORY_V1** | Factory inyectable y testeable. Interfaz futura mínima: `createReasoningEngine({ modelAdapter, clock, idFactory, policy })` y `reason(ies, session)`. El IES es la única entrada de conocimiento. `session` contiene únicamente parámetros no epistemológicos permitidos por este documento: `analysis_mode`, `canonical_reasoning_language`, `channel_hint`, `maximum_semantic_depth`. `session` no modifica el IES; no transporta hechos empresariales; no transporta fuentes/tools. Default institucional de `canonical_reasoning_language` = `es-MX`. |
| D2 | **PROVIDER_NEUTRAL_MODEL_ADAPTER_V1** | El runtime RE depende de un `modelAdapter` inyectado y neutral respecto del proveedor. El contrato semántico RE no menciona OpenAI, Anthropic u otro proveedor concreto. Operación `infer(request)`. Input: `reasoning_context` derivado exclusivamente del IES; `session`; `output_schema_version`. Output: `candidate_reasoning_result`; `provider_metadata` (`provider`, `model`, `model_version` si está disponible, `request_id` si está disponible). Sin tool calls; sin DB; sin fuentes operacionales; sin mutación IES; la respuesta del modelo es candidata, nunca verdad automáticamente; errores/timeout producen abstention/error controlado, no hechos. |
| D3 | **STRUCTURED_REASONING_RESULT_V1** | La salida del RE es un objeto estructurado conforme a este documento, validable antes de exposición o materialización como Reasoning Run. Campos raíz: `interpretation`, `hypotheses`, `recommendations`, `next_verifications`, `decision_options`, `abstentions`, `clarification_requests`, `reasoning_limits`, `references`. Arrays siempre presentes aunque vacíos. `references` solo contiene IDs existentes del IES. Ningún objeto de salida crea N1–N4 ni modifica IES. Sin campos `probability`/`confidence`/`materiality` N5 inventados. |
| D4 | **THREE_PART_INTERPRETATION_V1** | INTERPRETATION estructurada, no bloque narrativo sin frontera. `what_is_known`: referencias fieles a facts/evidence/diagnoses/conflicts del IES. `what_can_be_inferred`: referencias a `hypotheses[]` emitidas por el mismo Result. `what_cannot_be_concluded`: limitaciones, abstenciones y open questions ancladas al IES. No agrega hechos; no eleva materiality; no resuelve conflictos; no rellena `NO_KNOWLEDGE`. Texto semántico permitido solo como explicación N5 claramente separada. |
| D5 | **DETERMINISTIC_POST_VALIDATION_REQUIRED** | Toda salida candidata del modelo debe pasar validación determinística antes de ser aceptada como Reasoning Result. Validaciones: `ies_id` coincide con IES ancla donde aplique; `ies_version` coincide; todos `supporting_fact_ids` existen; todos `supporting_evidence_ids` existen; todos `supporting_diagnosis_ids` existen; todos `conflict_ids` existen; todos `open_question_ids` existen; `references` contiene únicamente IDs existentes; `hypothesis_strength` pertenece al enum autorizado; `statement_language` coincide con política/session; `validity_scope` no excede alcance IES; materiality no se crea ni modifica; `resolution_status` no se cambia; Tipo E no se omite cuando es relevante; `NO_KNOWLEDGE` no contiene hipótesis sustantivas; Recommendation no se acepta sin soporte; Decision Option no se presenta como decisión ejecutada. Candidato inválido: **REJECT_OR_ABSTAIN** — no se corrige inventando soporte; se rechaza o se convierte en resultado fail-closed de abstención controlada. |
| D6 | **MODEL_PROPOSES_VALIDATOR_BOUNDS_V1** | El modelo puede proponer `HYP_STRENGTH_WEAK` / `HYP_STRENGTH_MODERATE` / `HYP_STRENGTH_STRONG`; el runtime determinístico solo valida límites y puede degradar o rechazar cuando condiciones contractuales objetivas impiden el nivel propuesto. No existe score numérico ni fórmula probability/confidence/materiality. Hard bounds: sin `supporting_evidence_ids` → no hypothesis; sin `supporting_fact_ids` → no hypothesis; conflicto adverso material al claim impide `STRONG`; limitación bloqueante impide `STRONG`; scope incompleto relevante impide `STRONG`; `NO_KNOWLEDGE` → no hypothesis; strength nunca se transforma en porcentaje; strength nunca deriva de confidence/materiality/severity. `strength` no ordena automáticamente hypotheses rivales. `is_primary_candidate=false` por defecto sin base contractual de orden. Los techos cualitativos del §5 (incluido máximo `WEAK` o abstención si el conflicto tensiona el claim) **permanecen**. |
| D7 | **RIVAL_GROUP_WITHOUT_AUTORANK_V1** | Hipótesis rivales pueden compartir `rival_group_id`. El runtime no crea ranking automático ni selecciona primary candidate sin base explícita. |
| D8 | **DETERMINISTIC_ABSTENTION_GATE_V1** | Gate determinístico de abstención antes de invocar modelo y después de validar su resultado. Abstención mandatoria: IES status `NO_KNOWLEDGE` para hipótesis sustantivas; no supporting evidence disponible para claim; limitación bloqueante incompatible con claim; `ENTITY_UNRESOLVED` cuando claim requiere entidad canónica; `QUERY_SCOPE_INCOMPLETE` cuando claim requiere alcance faltante; candidate output inválido sin corrección segura. Lifecycle rechazo: `BUILDING`, `EXPIRED`, `SUPERSEDED`, `INVALID`. Lifecycle consumible: `VALIDATED`, `PARTIAL`, `CONFLICTED`, `NO_KNOWLEDGE`. |
| D9 | **SUPPORTED_CONDITIONAL_RECOMMENDATION_V1** | Recommendation es acción de negocio condicionada, nunca hecho ni mandato automático. Debe citar soporte IES y las hipótesis/diagnósticos que la motivan cuando existan. Campos mínimos: `recommendation_id`, `statement`, `statement_language`, `supporting_fact_ids`, `supporting_evidence_ids`, `supporting_hypothesis_ids`, `conditions`, `limitations`, `ies_id`, `ies_version`. Fail-closed: sin evidence suficiente → no recommendation sustantiva; `NO_KNOWLEDGE` → no recommendation sustantiva. |
| D10 | **EPISTEMIC_ACTION_ONLY_V1** | Next Verification describe qué información debe verificarse después. RE no ejecuta la acción ni invoca tools. Campos mínimos: `verification_id`, `question_or_check`, `reason`, `required_data`, `expected_source_if_known`, `related_ies_ids`, `related_open_question_ids`, `priority`. |
| D11 | **NON_EXECUTED_DECISION_OPTION_V1** | Decision Option es alternativa estructurada para decisión humana. Nunca indica que la decisión ya fue tomada. Campos mínimos: `decision_option_id`, `statement`, `conditions`, `expected_tradeoffs`, `supporting_references`, `limitations`, `execution_status`. `execution_status` = `NOT_EXECUTED`. |
| D12 | **IES_ANCHORED_CLARIFICATION_V1** | Clarification Request solo pide resolver ambigüedad/alcance que el IES declara. No inventa entidad ni hechos. Campos mínimos: `clarification_id`, `question`, `reason`, `related_open_question_ids`, `related_limitation_ids`, `related_unresolved_entities`. |
| D13 | **IN_MEMORY_REASONING_RUN_FIRST** | IMPL-REASONING-001 puede producir Reasoning Run in-memory como artefacto de auditoría de la inferencia, sin persistencia durable. Campos mínimos: `run_id`, `ies_id`, `ies_version`, `started_at`, `completed_at`, `status`, `session`, `provider_metadata`, `reasoning_result`, `validation_result`, `audit`. Append-only conceptual; no escribe EKS; no escribe IES; persistencia durable requiere tarea separada; provider/model metadata es auditoría, no epistemología. |
| D14 | **AUDITABLE_NOT_BITWISE_REPLAY_V1** | El runtime registra suficiente metadata para auditar qué IES, sesión, adapter/proveedor y resultado participaron. No promete que una segunda llamada LLM produzca bytes idénticos. Auditoría requerida: `ies_id`/`version`; `session`; provider/model metadata; output schema version; timestamps; validation outcome; references utilizadas. |
| D15 | **PROVIDER_FAILURE_FAIL_CLOSED_V1** | Timeout/error/malformed output del provider produce Reasoning Result o Run controlado con abstention/error metadata, sin hipótesis ni recommendations inventadas. |
| D16 | **ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1** | IMPL-REASONING-001 inicial debe funcionar completamente con adapter fake inyectado en tests y ser capaz de ejecutar gates/validación/abstención. No requiere proveedor real productivo. Fixtures IES existentes pueden alimentar tests. Provider fake determinístico para tests. Sin networking. Sin API keys. Sin package dependency nueva si no es necesaria. Integration real con proveedor = tarea posterior. |

### Restricción física vigente (evidence)

Mientras el Evidence Builder real no produzca `evidence[]` con reglas autorizadas, un futuro IMPL-REASONING-001 debe demostrar que cero `supporting_evidence` implica cero hipótesis sustantivas y cero recommendations sustantivas.
Esto no bloquea implementar gates, adapter, validación y abstention. **Bloquea** demostrar razonamiento N5 sustantivo con el flujo productivo actual. **No** es permiso para fabricar evidencia.

### Límites de esta realización

1. Runtime RE **PENDIENTE**. Esta sección no implementa Reasoning Engine, adapter, prompts, tests ni fixtures.
2. No calibra materias G8 (`wi`, `k`, `Fs`, materiality ruleset, severity productiva, reglas causales N1–N4, probability scoring).
3. No autoriza IMPL-REASONING-001.
4. No redefine Constitución, Motor, `02`, `03`, `03A`, `03B`, `04`, `06` ni el índice.
5. N1–N4, coverage, conflictos, materiality e IES v1.0 **no** cambian.
6. Persistencia durable de Reasoning Run permanece diferida.
7. Proveedor LLM real permanece fuera.

---

*Fin del documento. Sin implementación. Sin modificación del IES v1.0.*
