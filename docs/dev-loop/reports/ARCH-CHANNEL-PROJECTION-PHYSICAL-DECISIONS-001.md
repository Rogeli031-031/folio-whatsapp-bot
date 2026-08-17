# Reporte — ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001

```yaml
task_id: "ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001.md"
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
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
runtimes_inspected:
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "test/director-ia-ies-builder.test.js"
  - "test/director-ia-reasoning-engine.test.js"
  - "fixtures/director-ia/ies/"
  - "fixtures/director-ia/reasoning/"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-CHANNEL-PROJECTION-001. Las decisiones físicas pendientes requieren G2 humano; esta tarea no las resolvió."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2: PENDING_IF_REQUIRED. Varias decisiones físicas identificadas abajo requerirían modificar 06 u otro contrato; no se autoaprobaron."
  - "G3 permanece N/A. 06 ya existe (propuesto, no congelado)."
  - "G8 permanece N/A."
  - "Veredicto: NO-GO para IMPL-CHANNEL-PROJECTION-001."
```

## Ejecución

- Rama: `architecture/channel-projection-physical-decisions-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T12:45:23-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `PENDING_IF_REQUIRED`. **No usado.** Toda decisión que exigiría editar `06` u otro contrato se identificó y **no** se resolvió.
- G3: `N/A`. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime 06. Sin renderers. Sin templates. Sin LLM de redacción. Sin tests/fixtures de Channel Projection. Sin commit, push, merge. Sin IMPL-CHANNEL-PROJECTION-001.

Numeración: **D1–D20** de este reporte son las `audit_questions` de `CURRENT_TASK.md`. No se confunden con **D1–D3** semánticos de `06` (forma ≠ verdad; canales como políticas sobre Projection Model; L0–L3 ≠ N1–N5).

Ninguna RECOMMENDATION queda aprobada por aparecer aquí. No se inventaron límites de caracteres, SSML, widgets, plantillas WhatsApp, priorización numérica ni elección LLM-vs-template.

---

## 1. Executive result

La frontera **IES / Reasoning Result → Projection Model → canal** es auditable:

- Entrada de conocimiento = IES emitido (`VALIDATED`/`PARTIAL`/`CONFLICTED`/`NO_KNOWLEDGE`).
- Entrada semántica = Reasoning Result **opcional**; ausencia legítima de N5 **no se rellena**.
- 06 transforma formato, densidad, secuencia, tono e interactividad. **No** crea semántica ni altera verdad.
- `IRRENUNCIABLE` (Tipo E, `NO_KNOWLEDGE`, limitaciones materiales, contradicciones críticas, lista `04` §17) nunca se omite ni se difiere.

`06` v1.0 está **propuesto, no congelado**. El Projection Model es **conceptual**; el esquema serializado está pendiente (`06` §7, §16). No hay interfaz de factory, enum físico de `semantic_type`, algoritmo de `priority`, ni políticas de canal implementables (longitud, fragmentación, SSML, cards) sin inventar norma.

Runtimes actuales: IES Builder OFFICIAL in-memory y RE provider-neutral existen. Channel Projection **no**. `evidence[]`/`diagnoses[]` productivos siguen vacíos: 06 debe proyectar esa ausencia (limitaciones, cobertura, abstenciones RE) **sin fabricar N3/N4/N5**.

**Veredicto: NO-GO para IMPL-CHANNEL-PROJECTION-001.** La auditoría se completa sin modificar contratos. Las decisiones que exigirían G2 se listan; no se autoaprueban.

---

## 2. Contracts/runtime inspected

| Superficie | Uso |
|------------|-----|
| Constitución VI.4, IX, X | Consistencia multiinterfaz; IES independiente del canal; capa Interfaces |
| EKE | 06 solo consume; no suaviza `NO_CONOZCO`; no reinterpreta materiality |
| `04` §15/§17 | IES presentable; invariantes de canal; lista nunca omitible |
| `05` §20 / D6 | RE = semántica; 06 = presentación; `channel_hint` no autoriza reglas RE |
| `06` v1.0 propuesto | Contrato auditado |
| Índice | 06 no congelado; runtime pendiente |
| IES Builder + fixtures | Objetos IES reales de entrada |
| RE + fixtures | Reasoning Result / Run / abstención fail-closed |

Chat legado y Fases 1–3 **no** son Channel Projection constitucional.

---

## 3. Current physical reality

```
IES Builder OFFICIAL in-memory
        ↓ IES (status, coverage, facts, evidence[], diagnoses[], conflicts, limitations, OQ)
Reasoning Engine N5 (adapter fake; Run in-memory)
        ↓ Reasoning Result opcional (arrays siempre presentes; hyp/rec a menudo [])
Channel Projection
        ↓ PENDING
```

### IES físico (consumible por 06)

Campos anclables: `ies_id`, `ies_version`, `ies_type`, `status`, `knowledge_coverage.*`, `facts[]`, `evidence[]`, `diagnoses[]`, `conflicts[]` (`CONF_TYPE_*`, `resolution_status`), `limitations[]`, `open_questions[]`, `source_health[]`, `executive_summary_facts[]`, `blocking_limitations`.

No presentables según `06` §2: `BUILDING`, `INVALID`. `EXPIRED`/`SUPERSEDED`: no como situación vigente; si hay historial, exponer el status **tal cual**.

### Reasoning Result físico

`interpretation` tripartita; `hypotheses[]`, `recommendations[]`, `next_verifications[]`, `decision_options[]` (`NOT_EXECUTED`), `abstentions[]`, `clarification_requests[]`, `reasoning_limits`, `references`. Run: `run_id`, `status` ∈ {`ACCEPTED`,`REJECT`,`ABSTAIN`,`TIMEOUT`,`ERROR`,`MALFORMED`}.

Fail-closed vigente: sin `evidence[]` → 0 hipótesis y 0 recommendations. Eso es **ausencia legítima de N5 sustantivo**, no un hueco a rellenar por 06.

### 06 físico

Ningún `lib/director-ia-channel-projection.js`. Projection Model no serializado. Índice: contrato propuesto.

---

## 4. D1–D20 findings

### D1 — Interfaz runtime mínima

| | |
|--|--|
| **Classification** | PHYSICAL_UNKNOWN + RECOMMENDATION |
| **Contractual** | Entradas: IES + Result opcional + canal + `projection_depth`. Sin estado epistemológico. No muta IES/Result. |
| **Unknown** | Factory vs función; clock/idFactory; sync; forma de `project(...)`. |
| **Recommendation (no aprobada)** | Analogía IES/RE: factory inyectable, p. ej. `project({ ies, reasoningResult, channel, projection_depth })`. |
| **Requires G2** | YES para congelar la interfaz en `06`. |

### D2 — Projection Model schema

| | |
|--|--|
| **Classification** | CONTRACTUAL (campos conceptuales) + PHYSICAL_UNKNOWN (serialización) |
| **Definido** | `content_class`, `semantic_type`, `priority`, `disclosure`, `source_reference`, `ies_id`, `reasoning_run_id` condicional (`06` §7). |
| **Pendiente explícito** | Esquema de runtime (`06` §16.2). Arrays, IDs de ítems, versión de modelo, obligatoriedad de listas vacías. |
| **Requires G2** | YES para serializar el modelo en `06`. |

### D3 — Asignación de content_class

| | |
|--|--|
| **Classification** | CONTRACTUAL (casos nombrados) + PHYSICAL_UNKNOWN (resto) |
| **IRRENUNCIABLE nombrado** | Tipo E; `NO_CONOZCO`/`COV_NO_KNOWLEDGE`; limitaciones materiales; contradicciones críticas; omisión que cambie interpretación ejecutiva. |
| **OBLIGATORIO_RESUMIBLE nombrado** | Conclusión esencial; diagnóstico N4; evidencia principal; hipótesis N5 si existe. |
| **DIFERIBLE nombrado** | Evidencia ampliada; hechos N2; referencias; linaje. |
| **ESPECIFICO_DE_CANAL** | Formato/densidad/secuencia/tono/interactividad — no es objeto IES. |
| **Hueco** | «Limitaciones materiales» / «contradicciones críticas» / «conclusión esencial» / «evidencia principal» no son tokens de runtime. `04` §17 lista nunca omitible solapa pero no es tabla 1:1 de clases. |
| **Requires G2** | YES para tabla determinística objeto→clase. |

### D4 — semantic_type mapping

| | |
|--|--|
| **Classification** | CONTRACTUAL (principio) + PHYSICAL_UNKNOWN (enum) |
| **Principio** | Tipo **ya** presente en IES o Result. No inventa nivel epistemológico. Ejemplos: hecho, evidencia, diagnóstico, hipótesis, recomendación, limitación, conflicto, cobertura, abstención. |
| **Físico IES/RE** | `fact_id`, `evidence_id`, `diagnosis_id`, `conflict_id`, `limitation_id`, `open_question_id`, coverage, `hypothesis_id`, `recommendation_id`, `verification_id`, `decision_option_id`, `abstention_id`, `clarification_id`, bloques de interpretation. |
| **Unknown** | Tokens canónicos (`FACT` vs `hecho`); mapping de `next_verifications` / `decision_options` / `clarification_requests` / `source_health` / `executive_summary_facts`. |
| **Requires G2** | YES para catálogo de `semantic_type`. |

### D5 — priority

| | |
|--|--|
| **Classification** | CONTRACTUAL (qué no es) + PHYSICAL_UNKNOWN (cómo se asigna) + BLOCKER si se inventa ranking |
| **Es** | Orden de exposición **dentro** de la clase. |
| **No es** | `materiality`, `severity`, `confidence`, `hypothesis_strength`. No recálculo `MAT_*`. |
| **Prohibido en auditoría e IMPL** | Inventar score, priorización por materiality o ranking semántico nuevo. |
| **Requires G2** | YES para regla de orden (p. ej. orden de bancos IES / orden contractual `04` §17) **sin** fórmula de importancia. |

### D6 — projection_depth L0–L3

| | |
|--|--|
| **Classification** | CONTRACTUAL (capas conceptuales) + PHYSICAL_UNKNOWN (corte campo a campo) |
| **L0** | Irrenunciables + conclusión esencial. |
| **L1** | L0 + N4 + evidencia principal + N5 si existe + reservas. |
| **L2** | L1 + evidencia ampliada + conflictos detallados + limitaciones + soporte. |
| **L3** | L2 + hechos N2 + referencias + linaje autorizado; **no** reconstruir N1 desde EKS. |
| **Reglas** | Profundizar agrega, no sustituye; IRRENUNCIABLE atraviesa L0–L3; N5 ausente no se rellena. |
| **Requires G2** | YES para tabla objeto×capa si se quiere implementación directa. |

### D7 — IRRENUNCIABLE gate

| | |
|--|--|
| **Classification** | CONTRACTUAL (qué nunca omitir) + PHYSICAL_UNKNOWN (validador) |
| **Nunca omitible** | `06` §4.1 + `04` §17: `COV_NO_KNOWLEDGE`; Tipo E OPEN/UNDER_REVIEW; diagnóstico principal si existe; `COV_PARTIAL_KNOWLEDGE` crítica; limitaciones bloqueantes. |
| **Físico** | IES ya expone `status`, `coverage_token`, `conflicts[]`, `limitations[]`, `blocking_limitations`, `diagnoses[]` (a menudo `[]`). |
| **Unknown** | Checklist de IDs vs texto de canal; qué cuenta como «diagnóstico principal» si hay 0 o N diagnoses. |
| **Requires G2** | YES para el procedimiento de equivalencia crítica (ligado a D18). |

### D8 — Reasoning Result opcional / abstención RE

| | |
|--|--|
| **Classification** | CONTRACTUAL |
| **Sin Result** | Proyectar solo IES. Cero hipótesis/recommendations/abstenciones N5. No rellenar. |
| **Result con ABSTAIN / hyp=[] / rec=[]** | Proyectar abstenciones y next_verifications/clarifications **si existen en el Result**. No inventar hipótesis. No tratar Run como hecho (`05` caso 14). |
| **Result REJECT / TIMEOUT / ERROR / MALFORMED** | No hay N5 sustantivo que proyectar. 06 no «arregla» al proveedor. Puede declarar limitación de presentación (fallo seguro) **sin** crear semántica. |
| **`reasoning_run_id`** | Obligatorio en Projection Model **solo** si se consume un Result/Run (`06` §7). |
| **Requires G2** | NO para la regla de no-relleno. YES si se quiere tokenizar «limitación de presentación por fallo RE» como `semantic_type` nuevo (no hacerlo sin G2). |

### D9 — Chat

| | |
|--|--|
| **Classification** | CONTRACTUAL (densidad general + `04` §17) + PHYSICAL_UNKNOWN |
| **04 §17** | Puede resumir ejecutivo + diagnóstico + límites; lista obligatoria. |
| **06 §6** | Interactivo / equilibrado / explicación. |
| **Unknown** | Longitud, estructura de turnos, tono concreto, continuidad, «dime más». **No** se fijan caracteres. |
| **Requires G2** | YES para política Chat implementable. |

### D10 — Voz

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN |
| **04 §17** | Ultra-corto + límites bloqueantes; lista obligatoria. |
| **06** | Secuencial / baja densidad. SSML = implementación pendiente (`06` §16.3); **no inventado aquí**. |
| **Unknown** | Secuencia verbal, marcadores, contenido no representable → fallo seguro. |
| **Requires G2** | YES. No SSML en esta tarea. |

### D11 — WhatsApp

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN |
| **04 §17** | Corto + cobertura + pregunta abierta crítica; lista obligatoria. |
| **06** | Rápido / baja densidad / alerta, acción, consulta. Plantillas = pendientes; **no inventadas**. |
| **Unknown** | Fragmentación, acciones, detalle diferido. Acción de canal ≠ ejecutar Recommendation. |
| **Requires G2** | YES. |

### D12 — Dashboard

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN |
| **04 §17** | Bancos + salud de fuentes + conflictos; lista obligatoria. |
| **06** | Alta densidad / visual / drill-down. Widgets pendientes; **no inventados**. |
| **Requires G2** | YES. |

### D13 — Reporte

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN |
| **04 §17** | IES casi completo estructurado; lista obligatoria. |
| **06** | Persistente / documental / auditable. |
| **Unknown** | Forma de archivo, retención (out of scope). Equivalencia crítica vs otros canales. |
| **Requires G2** | YES para forma persistente. |

### D14 — Presentación

| | |
|--|--|
| **Classification** | CONTRACTUAL + PHYSICAL_UNKNOWN |
| **04 §17** | Ejecutivo + diagnóstico + Tipo E; lista obligatoria. |
| **06** | Guiada / conducción de decisión **sin** crear semántica ni marcar Decision Option como ejecutada. |
| **Requires G2** | YES. |

### D15 — Frontera de generación de texto

| | |
|--|--|
| **Classification** | PHYSICAL_UNKNOWN + BLOCKER si se elige por conveniencia |
| **Contrato** | No autoriza LLM de redacción ni templates productivos. Test de Pureza es criterio conceptual, no runtime (`06` §13). |
| **Esta auditoría** | **No elige** template vs LLM. |
| **Requires G2** | YES antes de cualquier renderer de prosa. |

### D16 — Tono conversacional vs autoridad

| | |
|--|--|
| **Classification** | CONTRACTUAL |
| **Puede** | Tono `ESPECIFICO_DE_CANAL` (cortesía, naturalidad) **sin** añadir/quitar/alterar significado. |
| **No puede** | Empatía que suavice `NO_KNOWLEDGE` o Tipo E; convertir hipótesis en hecho; ocultar limitaciones; rellenar N5; transformar recommendation en acción ejecutada. |
| **Test** | Pureza: al quitar tono/formato no queda afirmación sin `source_reference`. |
| **Requires G2** | NO para la prohibición. YES para guía de tono por canal si se quiere congelar. |

### D17 — Progressive disclosure

| | |
|--|--|
| **Classification** | CONTRACTUAL (regla) + PHYSICAL_UNKNOWN (mecanismo por canal) |
| **Regla** | `DEFERRED` solo `DIFERIBLE_BAJO_DEMANDA`. Prohibido para `IRRENUNCIABLE`. Verdad crítica no se esconde. |
| **Canales no interactivos** (Reporte, Presentación, Voz lineal) | Diferir exige anexo/apéndice/capa siguiente **accesible**, no omisión. Si no hay mecanismo proporcional: fallo seguro (declarar limitación), no omitir. |
| **Requires G2** | YES para mecanismo por superficie. No se inventan widgets ni «dime más» productivos. |

### D18 — Validación de equivalencia crítica

| | |
|--|--|
| **Classification** | CONTRACTUAL (criterio) + PHYSICAL_UNKNOWN (algoritmo) |
| **Criterio** | Mismo conjunto crítico entre canales; Test de Pureza; lista `04` §17 presente. |
| **Unknown** | Comparación de IDs vs texto renderizado; umbral de «comprimir sin cambiar interpretación». |
| **Requires G2** | YES. Sin fórmula de materiality. |

### D19 — Representación neutral vs render

| | |
|--|--|
| **Classification** | PHYSICAL_UNKNOWN |
| **Contrato** | Projection Model es el artefacto intermedio conceptual **antes** de la política de canal (`06` §5/§7). Eso **sugiere** un paso neutral, pero no congela un tipo `ChannelNeutralDocument`. |
| **Requires G2** | YES para autorizar (o rechazar) un artefacto serializado intermedio de runtime v1. Esta auditoría no lo elige. |

### D20 — GO/NO-GO

| | |
|--|--|
| **Classification** | BLOCKER para IMPL-CHANNEL-PROJECTION-001 |
| **GO/NO-GO** | **NO-GO** |
| **Por qué** | `06` no congelado; Projection Model no serializado; asignación de clase/`priority`/`semantic_type` incompleta; políticas de canal y renderer (template vs LLM) no autorizadas. Un IMPL inventaría arquitectura. |

---

## 5. Projection Model readiness

| source object | semantic_type | default content_class | L0 | L1 | L2 | L3 | must preserve | may summarize | may defer | physical readiness | classification |
|---------------|---------------|----------------------|----|----|----|----|---------------|---------------|-----------|--------------------|----------------|
| `ies.status` / `coverage_token` `COV_NO_KNOWLEDGE` | cobertura | IRRENUNCIABLE | keep | keep | keep | keep | YES | NO (no suavizar) | NO | READY (campo IES) | CONTRACTUAL |
| `COV_PARTIAL_KNOWLEDGE` | cobertura | IRRENUNCIABLE u OBLIGATORIO_RESUMIBLE (`04` §17) | keep | keep | keep | keep | YES | LIMITED | NO | READY | CONTRACTUAL |
| `COV_FULL_KNOWLEDGE` | cobertura | OBLIGATORIO_RESUMIBLE | ? | keep | keep | keep | YES como contexto | YES | NO en L0 si no es crítico | READY | PHYSICAL_UNKNOWN (L0) |
| Conflicto `CONF_TYPE_E_GOVERNANCE` OPEN/UNDER_REVIEW | conflicto | IRRENUNCIABLE | keep | keep | keep | keep | YES | NO ocultar | NO | READY | CONTRACTUAL |
| Conflicto A–D OPEN | conflicto | IRRENUNCIABLE si «contradicción crítica»; else OBLIGATORIO_RESUMIBLE | ? | keep | keep | keep | YES visibilidad | LIMITED | NO si crítico | PARTIAL | PHYSICAL_UNKNOWN (umbral «crítica») |
| `limitations[]` / `blocking_limitations` | limitación | IRRENUNCIABLE (materiales/bloqueantes) | keep | keep | keep | keep | YES | NO omitir | NO | READY | CONTRACTUAL |
| `diagnoses[]` (si existen) | diagnóstico | OBLIGATORIO_RESUMIBLE | no (salvo que sea «conclusión») | keep | keep | keep | YES si existe | YES | NO | EMPTY en EB actual | CONTRACTUAL |
| `evidence[]` principal | evidencia | OBLIGATORIO_RESUMIBLE | no | keep | keep | keep | YES si existe | YES | NO principal | EMPTY en EB actual | CONTRACTUAL |
| `evidence[]` ampliada | evidencia | DIFERIBLE_BAJO_DEMANDA | defer | defer | keep | keep | accesible | YES | YES | EMPTY | CONTRACTUAL |
| `facts[]` | hecho | DIFERIBLE_BAJO_DEMANDA | defer | defer | ? | keep | no como IRRENUNCIABLE salvo que sostenga contradicción | YES | YES | READY | CONTRACTUAL |
| `open_questions[]` | (entrada IES; no N5) | OBLIGATORIO_RESUMIBLE si crítica (`04` WhatsApp) | ? | keep | keep | keep | pregunta crítica | YES | NO si crítica | READY | PHYSICAL_UNKNOWN (cuándo es crítica) |
| `source_health[]` | (adquisición proyectada) | OBLIGATORIO Dashboard `04` §17 | ? | ? | keep | keep | no colapsar SOURCE_*/TOOL_ERROR/DATA_NOT_FOUND | YES | LIMITED | READY | CONTRACTUAL + PHYSICAL_UNKNOWN (clase) |
| `executive_summary_facts[]` | (proyección IES) | ? «conclusión esencial» | ? | keep | keep | keep | no inventar SUM_* | YES | NO si es Tipo E en summary | READY fail-closed | PHYSICAL_UNKNOWN |
| `hypotheses[]` RE | hipótesis | OBLIGATORIO_RESUMIBLE **si existen** | no rellenar | keep | keep | keep | no relabel N2 | YES + strength visible como dato N5 | NO si existen | EMPTY fail-closed actual | CONTRACTUAL |
| `recommendations[]` RE | recomendación | OBLIGATORIO_RESUMIBLE si existen | no | keep | keep | keep | no ejecutar | YES + condition | NO | EMPTY fail-closed actual | CONTRACTUAL |
| `abstentions[]` RE | abstención | OBLIGATORIO_RESUMIBLE (o IRRENUNCIABLE si ancla NO_KNOWLEDGE) | keep si NO_KNOWLEDGE | keep | keep | keep | YES | NO suavizar | NO | READY | CONTRACTUAL |
| `next_verifications[]` | tipo ya en Result | DIFERIBLE u OBLIGATORIO | no ejecutar | ? | keep | keep | no es tool | YES | YES salvo crítica | READY | PHYSICAL_UNKNOWN (clase) |
| `decision_options[]` | tipo ya en Result | DIFERIBLE | no | ? | keep | keep | `NOT_EXECUTED` | YES | YES | READY | PHYSICAL_UNKNOWN |
| `clarification_requests[]` | tipo ya en Result | OBLIGATORIO en Chat/WhatsApp si ancla IES | ? | keep | keep | keep | no inventar entidad | YES | NO si desbloquea alcance | READY | PHYSICAL_UNKNOWN |
| `interpretation` RE | lectura N5 | OBLIGATORIO_RESUMIBLE si hay Result | no como hecho | keep | keep | keep | tres bloques distinguibles | YES | no rellenar tercero | READY | CONTRACTUAL |
| `reasoning_limits` / `references` | límites / refs | límites: IRRENUNCIABLE si bloqueantes; refs: DIFERIBLE | límites keep | keep | keep | refs L3 | YES límites | refs YES | refs YES | READY | CONTRACTUAL |
| ESPECIFICO_DE_CANAL (tono/formato) | no es objeto fuente | ESPECIFICO_DE_CANAL | n/a | n/a | n/a | n/a | no semántica | n/a | n/a | UNKNOWN | CONTRACTUAL |

`priority` y `disclosure`: campos contractuales **sin** regla de asignación física (D5/D17). `physical readiness` del **schema** = UNKNOWN (D2).

---

## 6. Projection depth matrix

| Capa | Debe sobrevivir | Puede comprimirse | Puede diferirse | Prohibido |
|------|-----------------|-------------------|-----------------|-----------|
| L0_FLASH | Todo IRRENUNCIABLE; conclusión esencial si existe **en la entrada** | OBLIGATORIO_RESUMIBLE solo si aún aparece | Solo DIFERIBLE | Omitir Tipo E / NO_KNOWLEDGE / limitaciones bloqueantes; rellenar N5 |
| L1_EXECUTIVE | L0 + N4 + evidencia principal + N5 legítimo + reservas | OBLIGATORIO_RESUMIBLE | DIFERIBLE | Sustituir L0 |
| L2_SUPPORT | L1 + conflictos detallados + limitaciones + evidencia ampliada | sí | linaje/hechos | Ocultar crítico en drill-down |
| L3_AUDIT | L2 + facts + references + linaje **autorizado en IES/Result** | sí | nada crítico | Consultar EKS/OP para reconstruir N1 |

Corte exacto campo×capa: PHYSICAL_UNKNOWN (D6).

---

## 7. Channel policy matrix

| channel | density | sequence | tone | progressive disclosure mechanism | mandatory critical content | unsupported content behavior | physical readiness | classification |
|---------|---------|----------|------|----------------------------------|----------------------------|------------------------------|--------------------|----------------|
| CHAT | equilibrada (`06` §6) | adaptación permitida; no colapsar tipos epistemológicos | ESPECIFICO_DE_CANAL; no autoridad | «dime más» conceptual; no esconder IRRENUNCIABLE | `04` §17 lista + Tipo E + NO_KNOWLEDGE | fallo seguro: declarar limitación | UNKNOWN | CONTRACTUAL + PHYSICAL_UNKNOWN |
| VOICE | baja / ultra-corta (`04` §17) | secuencial | no suavizar | anexo verbal / «más detalle» posterior; no deferir crítico | límites bloqueantes + lista | no improvisar SSML; declarar no representable | UNKNOWN | idem |
| WHATSAPP | baja / corta | alerta → cobertura → pregunta crítica | no mandato | detalle diferido accesible; no templates inventados | cobertura + pregunta abierta crítica + lista | no ejecutar recommendation | UNKNOWN | idem |
| DASHBOARD | alta / visual | drill-down | n/a narrativo | cards/capas; widgets no inventados | bancos + source_health + conflictos + lista | no omitir Tipo E en UI | UNKNOWN | idem |
| REPORT | alta / persistente | documental | n/a | anexo, no omisión | IES casi completo + lista | auditable; mismo ies_id | UNKNOWN | idem |
| PRESENTATION | media-alta / guiada | conducción **sin** semántica nueva | no diplomacia que oculte Tipo E | anexos; no deferir Tipo E | ejecutivo + diagnóstico + Tipo E + lista | Decision Option no ejecutada | UNKNOWN | idem |

No se fijaron caracteres, SSML, widgets ni plantillas.

---

## 8. IRRENUNCIABLE validation

Mecanismo **requerido** (contractual; no implementado):

1. Entrada IES presentable; si no, fallo seguro, no improvisar.
2. Conjunto crítico C = unión de: coverage NO_KNOWLEDGE si aplica; cada `conflict_id` Tipo E OPEN/UNDER_REVIEW; cada `limitation_id` en `blocking_limitations`; `COV_PARTIAL_KNOWLEDGE` si aplica; diagnóstico principal **si** `diagnoses[]` no vacío; contradicciones OPEN que el contrato trate como críticas (umbral PHYSICAL_UNKNOWN).
3. En **cada** canal y **cada** L0–L3, todo elemento de C tiene `disclosure=IMMEDIATE` y `content_class=IRRENUNCIABLE`.
4. Prohibido `DEFERRED` sobre C.
5. Texto/tono no puede negar, minimizar ni relabelar C.
6. Equivalencia: C(Chat)=C(Voz)=… (misma referencia `ies_id` + IDs).
7. Diagnósticos/evidencias/hipótesis **vacíos** no se inventan para «cumplir» L1.

Validador determinístico de IDs: PHYSICAL_UNKNOWN hasta D3/D18 G2. Datos fuente para C **existen** en IES Builder.

---

## 9. Optional Reasoning behavior

| Situación física | Comportamiento 06 |
|------------------|-------------------|
| No se pasa Reasoning Result | Solo IES. `reasoning_run_id` ausente. Cero N5. |
| Result con `hypotheses=[]`, `recommendations=[]`, abstentions presentes | Proyectar abstenciones (y NV/clarification válidos). No rellenar hipótesis. |
| Run `ABSTAIN` (NO_KNOWLEDGE o evidence vacío) | Alinear con IRRENUNCIABLE de cobertura/limitación IES; no contradecir abstención |
| Run `REJECT` / `TIMEOUT` / `ERROR` / `MALFORMED` | No proyectar N5 sustantivo. No usar error de proveedor como hecho. Fallo seguro de presentación **sin** semántica nueva (token extra = G2). |
| Result con hipótesis sintéticas de validador | Solo si el Result se pasa; 06 no llama al RE. |
| Hipótesis de Run previo | Sigue N5; 06 no la presenta como N2 (`05` caso 14). |

---

## 10. Tone / conversational style boundary

| Permitido (ESPECIFICO_DE_CANAL) | Prohibido (autoridad epistemológica) |
|--------------------------------|--------------------------------------|
| Cortesía, naturalidad, densidad, orden de frases | Afirmar hecho no anclado a IES/Result |
| «No tengo ese dato integrado» si el IES dice `NO_KNOWLEDGE` | «Tranquilo, no es grave» sobre Tipo E o `MATERIALITY_NOT_ASSESSED` usado como MAT |
| Comprimir OBLIGATORIO_RESUMIBLE | Omitir reserva/condición que cambie interpretación |
| Distinguir hipótesis con marcador de canal | Relabel hipótesis → hecho |
| | Ejecutar o dar por tomada una Decision Option |
| | Small talk / WhoAmI / memoria conversacional (fuera de `06` y de esta tarea) |

Test de Pureza (`06` §13): criterio de validez; runtime del test pendiente.

---

## 11. Progressive disclosure readiness

| Canal | ¿Interactivo? | Mecanismo contractual | Readiness |
|-------|---------------|----------------------|-----------|
| Chat | sí | diferir DIFERIBLE; nunca IRRENUNCIABLE | UNKNOWN (no hay «dime más» normativo) |
| WhatsApp | limitado | detalle diferido; pregunta crítica inmediata | UNKNOWN |
| Dashboard | sí | drill-down | UNKNOWN (no widgets) |
| Voz | débil | no esconder en silencio; declarar si no cabe | UNKNOWN |
| Reporte | no | anexo, no omisión | UNKNOWN |
| Presentación | débil | anexo / capa siguiente | UNKNOWN |

Regla lista: `disclosure=DEFERRED` ⇔ clase DIFERIBLE. Readiness de implementación: NO.

---

## 12. Deterministic equivalence validation

Comparación requerida (conceptual):

1. Mismo `ies_id` (y `ies_version`) en seis superficies.
2. Conjunto de `source_reference` IRRENUNCIABLE idéntico.
3. Lista `04` §17 presente en cada canal.
4. Si hubo Result, `reasoning_run_id` consistente; N5 no aparece donde el Result no lo trae.
5. Pureza: afirmaciones residuales ⊆ IES ∪ Result.
6. `TOOL_ERROR` / `DATA_NOT_FOUND` / `SOURCE_*` no colapsados.
7. OFFICIAL/ALTERNATIVE no fusionados (hoy solo OFFICIAL).

Algoritmo de comparación texto↔IDs: PHYSICAL_UNKNOWN. No se usa materiality para «qué es crítico».

---

## 13. Physical unknowns

1. Interfaz runtime 06 (D1).
2. Esquema serializado del Projection Model (D2).
3. Tabla determinística objeto → `content_class` (D3).
4. Catálogo `semantic_type` (D4).
5. Regla de `priority` sin ranking epistemológico (D5).
6. Corte L0–L3 campo a campo (D6).
7. Procedimiento validador IRRENUNCIABLE / equivalencia (D7, D18).
8. Políticas físicas Chat/Voz/WhatsApp/Dashboard/Reporte/Presentación (D9–D14).
9. Template vs LLM subordinado (D15) — **no elegido**.
10. Artefacto neutral de canal (D19) — **no elegido**.
11. Congelamiento de `06` (hoy PROPUESTO).
12. Qué es «conclusión esencial» / «evidencia principal» / «diagnóstico principal» cuando bancos están vacíos.

---

## 14. Recommendations requiring approval

Ninguna aprobada:

| ID | Recomendación | Gate |
|----|---------------|------|
| R-06-01 | Congelar `06` v1.0 antes de IMPL | humano (no es esta tarea) |
| R-06-02 | Factory `project({ ies, reasoningResult, channel, projection_depth })` | G2 |
| R-06-03 | Serializar Projection Model como lista de ítems con los 7 campos §7 | G2 |
| R-06-04 | Tabla objeto→clase para tokens IES/RE existentes | G2 |
| R-06-05 | `priority` = orden estable de aparición en IES/Result, no score | G2 |
| R-06-06 | v1 solo Projection Model + validador IRRENUNCIABLE, sin renderer de canal | G2 |
| R-06-07 | No LLM de redacción en v1 | G2 (D15) |
| R-06-08 | Representación intermedia serializada antes de render | G2 (D19) |

---

## 15. Blockers

| ID | Blocker | Impide |
|----|---------|--------|
| B1 | `06` no congelado | IMPL productivo contra contrato aún propuesto |
| B2 | Projection Model no serializado | Emitir artefacto intermedio sin inventar schema |
| B3 | Asignación `content_class` / `priority` / `semantic_type` incompleta | Clasificar sin interpretación libre |
| B4 | Políticas de canal y renderer no autorizados | Render Chat/Voz/WhatsApp/etc. sin inventar templates/límites/LLM |
| B5 | Equivalencia crítica sin algoritmo | Tests de no-omisión más allá de IDs sueltos |

`evidence[]`/`diagnoses[]` vacíos **no** bloquean un proyector fail-closed; **sí** impiden demostrar L1 «con evidencia/diagnóstico principal» sobre flujo productivo. No autoriza fabricar N3/N4.

---

## 16. Gate assessment

| Gate | Estado en tarea | Uso |
|------|-----------------|-----|
| G1 | AUTHORIZED | Ejecutó la auditoría |
| G2 | PENDING_IF_REQUIRED | **No usado.** Decisiones que lo requieren: identificadas, no escritas en `docs/director-ia/` |
| G3 | N/A | `06` ya existe |
| G8 | N/A | Sin calibración |

### Decisiones que requerirían G2 (explícitas; no aprobadas)

1. Congelar o enmendar `06` (estado actual: propuesto).
2. Interfaz física de runtime (D1).
3. Esquema serializado del Projection Model (D2).
4. Tabla objeto → `content_class` (D3).
5. Catálogo `semantic_type` (D4).
6. Regla de `priority` no epistemológica (D5).
7. Tabla objeto × L0–L3 (D6).
8. Validador IRRENUNCIABLE / equivalencia (D7, D18).
9. Políticas por superficie D9–D14 (sin caracteres/SSML/widgets inventados en esta auditoría).
10. Autorización o prohibición de LLM de redacción vs template (D15).
11. Artefacto de canal neutral v1 (D19).
12. (Índice: `06` §16.4 ya dice que actualizar el índice exige G2; **fuera** y no se tocó.)

Hasta que HUMAN_APPROVER registre lo necesario, **IMPL-CHANNEL-PROJECTION-001 no debe crearse**.

---

## 17. GO/NO-GO for IMPL-CHANNEL-PROJECTION-001

**NO-GO.**

Un futuro IMPL exigiría **después** de G2 (esta tarea no lo autoriza):

- `06` congelado o decisiones físicas registradas en `06`.
- Entrada = IES Builder existente + Result opcional del RE existente.
- Fail-closed: sin Result o Result en abstención → cero N5 inventado; IRRENUNCIABLE IES siempre visible.
- Sin renderer LLM, templates productivos, SSML, widgets, networking ni memoria conversacional salvo decisión humana posterior.
- G8 sigue N/A.

`implementation_followup_rule`: IMPL-CHANNEL-PROJECTION-001 **no** se crea desde aquí.

---

## 18. STOP

ARCH-CHANNEL-PROJECTION-PHYSICAL-DECISIONS-001 cerrado en `DONE_PENDING_REVIEW`.

No se modificó `docs/director-ia/`, ningún runtime, `server.js` ni `package.json`. No se implementó Channel Projection. No se inventaron límites, templates, ranking ni LLM-vs-template. No se autoaprobó G2. Sin commit, push, merge ni IMPL-CHANNEL-PROJECTION-001.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
