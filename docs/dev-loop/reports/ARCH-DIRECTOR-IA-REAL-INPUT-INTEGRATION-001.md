# Reporte — ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - ".env"
  - "sql/"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    03A D2 dice que el OP «proyecta» technical_state al enum §2. El runtime
    lib/director-ia-observation-pipeline.js usa envelope.status o
    envelope.technical_state como el enum mismo (ALLOWED_STATUSES) y falla
    si no es uno de esos siete valores. El mapping desde condiciones reales
    (HTTP 403, pool ausente, planta no encontrada) no está en el OP: debe
    ocurrir en el productor del envelope. No se usó G2 para reescribir 03A.
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 permanecen PENDING_IF_REQUIRED; no se usaron."
  - "Veredicto CONDITIONAL-GO: una futura IMPL de adapter ARR→03A + ciclo OP→EB→EKS puede definirse sin G2/G3 si no se tocan contratos ni chat/WhatsApp."
```

## Ejecución

- Rama: `architecture/director-ia-real-input-integration-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T22:27:00-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3: `PENDING_IF_REQUIRED`, **no usados**. G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin implementación. Sin commit, push, merge. Sin siguiente tarea.

Auditoría física. No se inventó capability. No se cableó WhatsApp.

---

## 1. Executive verdict

**CONDITIONAL-GO** para una futura implementación del **primer vertical slice ARR → MINIMAL_EXECUTION_ENVELOPE → OP → EB → EKS**.

Existe fuente/tool real en el repositorio: dominio `arr`, tool registrada `get_arr_snapshot`, dato estructurado `{ venta_ton, desc_kg }` en `loadArrProyForPlant` (`lib/director-ia-igf-arr.js`), alimentado por `dashboardArrForecast.computePronosticoProyByPlant`. **No** es SOURCE_GAP.

**No** existe productor productivo de `MINIMAL_EXECUTION_ENVELOPE`. Planner y Tool Orchestrator no ejecutan. El executor registrado `loadIgfArrAnnexForChat` devuelve **prosa para LLM** (`{ ok, text, meta }`), no envelope 03A. Chat/Twilio no son N1–N5.

El slice es viable **sin G2/G3** si y solo si:

1. un **adapter nuevo** (no OP, no chat) forma el envelope 03A desde el resultado estructurado ARR;
2. el trigger **no** es el texto de WhatsApp ni `/api/director-ia/chat`;
3. OP/EB/contratos **no** se modifican;
4. secrets no entran en Bundle/IES/RE/CP.

Condiciones que no son G2: **ADAPTER_REQUIRED**, **IMPLEMENTATION_REQUIRED**, **CONFIG_REQUIRED** (`ENABLE_DIRECTOR_IA`, `DATABASE_URL`, acceso a planta, tablas ARR).

G2 haría falta solo si se reescribiera 03A, se tratara el chat como N1–N5, o se inventara taxonomía de métricas. G3 haría falta solo si HUMAN exigiera un contrato nuevo `07-TOOL-EXECUTION` antes de IMPL; **03A D2 ya es el contrato de salida del envelope**. Esta auditoría no lo exige para definir el slice.

---

## 2. Contracts inspected

| Documento | Hallazgo para entrada real |
|-----------|----------------------------|
| Constitución | N1–N4 sin LLM; IES no recibe crudo; WhatsApp no es fuente. |
| EKE | Diagnóstico «conflicto no resuelto» ya cubierto por N4; no gobierna Tool Execution. |
| `03A` D1–D15 | OP puro; recibe envelopes formados; **no ejecuta tools**; enum AcquisitionStatus cerrado; D15 difiere Tool Execution productivo a autorización separada (**esta auditoría define esa franja; no la implementa**). |
| `02` | EB consume listas hermanas OP, no respuestas crudas. |
| `03` | EKS persiste Bundle; no produce observaciones. |
| `04`/`05`/`06` | Downstream; fuera del primer slice. |
| Fase 2 | Planner declara intent/dominios; **no gobierna** el chat; no emite envelope. |
| Fase 3 | Tool Plan declarativo; **`executor` es nombre, no se invoca**; no DB. |
| Índice | Cadena: Tool Execution Results (futuro/parcial) → 03A. Chat legado ≠ N1–N5. |
| Capacidades | ARR/IGF **PARCIAL** / on_demand; folio operativo no integrado. |

---

## 3. Existing runtime inspected

| Componente | Export / rol físico | ¿Produce envelope 03A? |
|------------|---------------------|------------------------|
| `lib/director-ia-observation-pipeline.js` | `createObservationPipeline().process` | No. **Consume** envelopes. |
| `lib/director-ia-evidence-builder.js` | `assemble` N1–N4 | No. Consume output OP. |
| `lib/director-ia-op-eb-eks-integration.js` | `run_op_eb_eks` | No. Tests. |
| `lib/director-ia-e2e.js` | `createDirectorIaE2e().run` | No. Exige `executionEnvelope` ya formado. |
| `lib/director-ia-planner.js` | `planDirectorIaQuestion` | No. Plan. |
| `lib/director-ia-tool-orchestrator.js` | `buildDirectorIaToolPlan` | No. Plan; `can_execute` / `missing_inputs`. |
| `lib/director-ia-tools.js` | Registry; `isDirectorIaToolExecutable` | No. No importa executors. |
| `lib/director-ia-igf-arr.js` | `loadArrProyForPlant` (números); `loadIgfArrAnnexForChat` (texto) | No envelope. |
| `lib/director-ia-chat.js` | `askDirectorIa` / `handlePostChat` | No. LLM + anexos. Planner/tool plan solo debug. |
| `lib/director-ia-context.js` | `buildDirectorIaContextPayload` | JSON de chat/dashboard, no 03A. |
| `lib/director-ia-eks.js` | `createEks` / `createEksRuntime` | No. Persistencia. |
| `server.js` | EKS `start()`; `/api/director-ia/chat`; `/twilio/whatsapp` | No llama OP/EB/IES/RE/CP. |
| Twilio WhatsApp | Comando `DirectorIA` → **link dashboard** | No ciclo constitucional. |

Fixtures 03A/E2E (`acquired-ok-single.json`, `e2e/happy-path-no-evidence.json`, etc.) son el **único** productor actual de envelopes, todos sintéticos.

---

## 4. Current real-input gap

Clasificación del gap de entrada:

| Qué falta | Clase |
|-----------|--------|
| Semántica del envelope y del OP | **CONTRACTUAL_READY** (`03A` D2, enum §2) |
| OP/EB/EKS in-memory | **PHYSICALLY_READY** |
| Productor de envelope desde tool real | **ADAPTER_REQUIRED** + **IMPLEMENTATION_REQUIRED** |
| Planner/Orchestrator como emisor 03A | Ausente por diseño de Fase 2/3 (**no** SOURCE_GAP) |
| Chat/WhatsApp como N1 | **Prohibido** (invariante) |
| Credenciales/DB/flag | **CONFIG_REQUIRED** |
| Nueva fuente | **No** (ARR existe) |
| Reescritura 03A para definir el slice | **No REQUIRES_G2** |
| Nuevo contrato Tool Execution para definir el slice | **No REQUIRES_G3** (D2 basta como frontera de salida) |

---

## 5. D1–D20 findings

### D1 — Primer entrypoint real

**Authenticated dashboard / Director IA request con `planta_id`**, no el cuerpo de un mensaje WhatsApp.

Evidencia: tools ARR/AR exigen `planta_id`; `assertPlantaAccess` / `dashboardAuth` ya existen; `/api/director-ia/chat` y Twilio **no** deben ser el originador epistemológico.

Clase: **CONTRACTUAL_READY** (identidad/permisos/planta en `03A` §6) + **IMPLEMENTATION_REQUIRED** (fachada que no es `handlePostChat`).

### D2 — Owner de MINIMAL_EXECUTION_ENVELOPE

Un **adapter de Tool Execution** nuevo, exclusivo: recibe resultado técnico de un executor real y emite envelopes 03A (uno por intento tool/dominio).

No es OP (D1 `PURE_FACTORY`: recibe ya ejecutado). No es Planner. No es Tool Orchestrator. No es chat. No es CP. No es EB.

Clase: **ADAPTER_REQUIRED**.

### D3 — ¿Existe productor hoy?

**No.** Ningún Planner/Orchestrator/runtime emite el envelope contractual exacto (`trace_id`, `tool_id`, `domain`, `status`/`technical_state` ∈ enum 03A, `payload` transportable).

`createDirectorIaE2e` y OP tests **consumen** fixtures. `loadIgfArrAnnexForChat` produce `{ ok, text, meta }`.

Clase: **IMPLEMENTATION_REQUIRED** (productor) / **PHYSICALLY_READY** (consumidores).

### D4 — Triggers reales presentes

| Trigger | Presente | ¿Slice 1? |
|---------|----------|-----------|
| Usuario dashboard autenticado (`dashboardAuthMiddleware`) | Sí | **Sí** |
| POST `/api/director-ia/chat` | Sí | **No** (LLM) |
| Webhook Twilio `/twilio/whatsapp` | Sí | **No** (comando/link/narrativa) |
| Scheduler | No constitucional | No |
| Evento interno N1–N5 | No | No |

Clase: **PHYSICALLY_READY** (auth dashboard) para trigger no epistémico.

### D5 — Chat/WhatsApp boundary

Chat legado: contexto + OpenAI. Planner/tool plan **solo debug** (`directorIaDebug`). WhatsApp `DirectorIA`: link firmado al dashboard.

Relación permitida: **trigger de canal** (más adelante) y **destino CP**. Prohibido: texto de usuario → Fact/Evidence; anexo LLM → ObservationRecord.

Clase: **CONTRACTUAL_READY** (invariantes). Primer slice: chat/Twilio **intactos**.

### D6 — Dónde ocurre la ejecución real y qué output se transforma

Ejecución ARR numérica: `loadArrProyForPlant(client, year, month, plantCode)` → `{ venta_ton, desc_kg }` vía `computePronosticoProyByPlant`.

Ejecución chat: `loadIgfArrAnnexForChat` formatea esas cifras a `text`. **El adapter debe usar el resultado estructurado, no parsear `text`.**

Clase: **PHYSICALLY_READY** (dato) + **ADAPTER_REQUIRED** (envelope).

### D7 — ¿Hace falta adapter?

**Sí.** Ownership: módulo nuevo (p. ej. futuro `lib/director-ia-tool-execution-adapter.js` — nombre no normativo). Contrato mínimo de **salida** = `MINIMAL_EXECUTION_ENVELOPE` (`03A` D2). Entrada = resultado técnico + contexto de ciclo (`trace_id`, `planta_id`, permisos, periodo). Sin semántica N2–N5.

Clase: **ADAPTER_REQUIRED**. No REQUIRES_G3 para el contrato de salida.

### D8 — Provenance

Preservar, no inventar (`03A` D9; OP `sourceFrom` / `buildRecord`):

| Identidad | Origen en slice ARR | Si falta |
|-----------|---------------------|----------|
| `source.system` | `"arr"` / dominio registry | No inventar otro sistema |
| `source_instance_id` | `arr:{plant_code}:{execution_id}` | OP ya deriva fallback técnico |
| `content_author_id` | null si la fila ARR no declara autor | **permanece null**; nunca `extracted_by` |
| `extracted_by` | `get_arr_snapshot` | tool_id |
| `triggered_by` | user id dashboard / `"undeclared"` | OP default `"undeclared"` |
| `raw_payload_reference` | `raw://{trace_id}/{tool_id}/{execution_id}/{i}` | OP lo genera si falta |
| `trace_id` | D12 | Obligatorio en envelope |

Clase: **CONTRACTUAL_READY** + **PHYSICALLY_READY** (OP preserva). Adapter **no sustituye**.

### D9 — Status mapping owner

**Adapter (productor del envelope).** OP valida enum y separa ObservationRecord (`NON_TRANSPORT`). OP **no** traduce 403/500/null.

Ver matriz §8.

Clase: **ADAPTER_REQUIRED** (mapear condición real → enum) + **PHYSICALLY_READY** (OP).

### D10 — raw_payload

Envelope puede llevar `payload` (vista para `normalized_payload`) y `raw_payload_reference`. No meter connection strings, tokens, ni `OPENAI_API_KEY`. EB/IES/RE/CP no reciben el blob crudo de DB como Fact.

Clase: **CONTRACTUAL_READY** (`03A` D10). Adapter: referencia opaca, no secreto.

### D11 — Entity resolution

OP: solo `RESOLVED` copia `subject.entity_id`; `AMBIGUOUS`/`UNRESOLVED` conservan original/candidates; `ENTITY_UNRESOLVED` no inventa canónico.

Slice 1 (planta): resolución **ya existente** `planta_id` → nombre → `getPlantCodeArrFromPlantaNombre`. Adapter declara `entity_resolution.state`. No usar el texto WhatsApp como sujeto.

`resolveCommercialEntity` es para **clientes**; no es el primer slice. No emite tokens 03A `AMBIGUOUS` hoy (hit único o `null`).

Clase: **PHYSICALLY_READY** (lookup planta) + **ADAPTER_REQUIRED** (declarar estado 03A).

### D12 — trace_id

**Nace en la fachada/orquestador del ciclo constitucional**, antes de ejecutar tools. Se copia a cada envelope, OP, Bundle, Snapshot, IES, RE, CP (`createDirectorIaE2e` ya propaga `envelope.trace_id`).

Chat no genera `trace_id` constitucional.

Clase: **CONTRACTUAL_READY** + **IMPLEMENTATION_REQUIRED** (asignar id opaco inyectable).

### D13 — Fail-closed desde ejecución real

Ruta física **definible** (adapter → OP → EB). Hoy solo cubierta con fixtures. Ver §8.

`absence_rules` EB vacías: `ACQUIRED_EMPTY` **no** se convierte en `ABSENCE_CONFIRMED`. Correcto.

Clase: **CONTRACTUAL_READY** (semántica) + **ADAPTER_REQUIRED** (emitir status) + **PHYSICALLY_READY** (OP/EB fail-closed).

### D14 — Composición runtime

Reutilizar **`createDirectorIaE2e` o `run_op_eb_eks`** como composición ya existente, **inyectando** envelopes del adapter. Primer slice mínimo: OP→EB→EKS (`run_op_eb_eks`). IES/RE/CP opcionales después.

Runtime **nuevo** mínimo: adapter + fachada de ciclo (asigna `trace_id`, llama executor ARR, llama OP/EB). No reimplementar OP/EB.

Clase: **PHYSICALLY_READY** (composición) + **IMPLEMENTATION_REQUIRED** (fachada + adapter).

### D15 — server.js

Debe: (1) seguir arrancando `createEksRuntime`; (2) **invocar una fachada**, no inlinear OP/EB/N5; (3) **no** usar `handlePostChat` como entrada 03A.

Hoy: EKS start + rutas legado. Cero llamadas constitucionales.

Clase: **IMPLEMENTATION_REQUIRED** (un call site futuro) sin reinterpretar chat.

### D16 — WhatsApp

Únicamente **trigger futuro + destino CP**. En slice 1: **ninguna** responsabilidad. No es fuente. El comando actual solo entrega URL.

Clase: **CONTRACTUAL_READY**. Primer IMPL: WhatsApp **intacto**.

### D17 — Persistencia / sesión

Conforme post-N4: **entrada real antes** de sesión conversacional. EKS append puede ser memoria en el primer IMPL; pg si `ENABLE_DIRECTOR_IA`+`DATABASE_URL`. No desbloquear WhoAmI/small talk.

Clase: **CONTRACTUAL_READY**.

### D18 — Security

Necesarios para ARR: `DATABASE_URL`, pool pg, `ENABLE_DIRECTOR_IA`, `dashboardAuth` / `assertPlantaAccess` / rol (GA → 403 en anexo IGF/ARR). No `OPENAI_API_KEY` para el slice 03A.

Prohibido en IES/RE/CP: connection string, tokens Twilio, claves AWS.

Clase: **CONFIG_REQUIRED**.

### D19 — Vertical slice mínimo

**Tool/fuente: `get_arr_snapshot` / dominio `arr` / `loadArrProyForPlant` → `venta_ton` de una planta y un periodo.**

No se inventa capability. El registry ya declara la tool. El dato numérico ya existe. El fixture OP ya usa `get_arr_snapshot`+`venta_t` (nombre de métrica del fixture; el adapter debe usar el **nombre de campo fuente** `venta_ton`, sin taxonomía nueva).

Fuera del slice: parsear anexo chat, IGF compromiso, clientes, N5, CP WhatsApp, Tipo E, G8.

### D20 — Readiness

**CONDITIONAL-GO.** Gates para una **futura** IMPL: **G1**. G2/G3 **no** requeridos si el alcance respeta §18. G8 N/A.

---

## 6. Productive runtime map

| stage | existing physical component | input | output | productive today | gap | owner | gate required |
|-------|----------------------------|-------|--------|------------------|-----|-------|---------------|
| Real Trigger | `dashboardAuthMiddleware` + `planta_id`; chat/Twilio (legado) | HTTP / WhatsApp body | request | Dashboard auth **sí**; constitucional **no** | IMPLEMENTATION_REQUIRED (fachada) | Fachada nueva; no chat | G1 futuro |
| Planner / intent | `planDirectorIaQuestion` | texto pregunta | Plan | Solo debug en chat | No obligatorio en slice 1 (ciclo ARR directo) | Fase 2 | No G2 para omitirlo en slice 1 |
| Tool Execution | `loadArrProyForPlant` / forecast ARR | client, year, month, plantCode | `{ venta_ton, desc_kg }` | **Sí** (DB ARR) | No invocado hacia 03A | Adapter llama executor | G1 |
| MINIMAL_EXECUTION_ENVELOPE producer | **Ausente** | resultado técnico | envelope 03A | **No** | ADAPTER_REQUIRED | Adapter nuevo | G1; no G3 |
| Observation Pipeline | `createObservationPipeline` | envelopes | statuses + records | Tests/fixtures | PHYSICALLY_READY | OP | No |
| Evidence Builder N2/N3/N4 | `assemble` | output OP | Bundle | Tests | PHYSICALLY_READY | EB | No |
| EKS | `validate_structure`, `append_snapshot`, `createEksRuntime` | Bundle | Snapshot | pg infra **parcial**; append constitucional **no** | CONFIG_REQUIRED + call | EKS | No G2 |
| IES | `createIesBuilder` | Snapshot+meta | IES | Tests | Fuera del slice 1 mínimo | IES | No |
| Reasoning | `createReasoningEngine` | IES | Result/Run | Fake adapter | Fuera del slice 1 | RE | No |
| Channel Projection | `createChannelProjection` | IES (+RE) | Envelope canal | Tests | Fuera del slice 1 | CP | No |
| real output destination | Dashboard JSON o log de Bundle; **no** Twilio | proyección | usuario | Link WhatsApp legado | Slice 1: Snapshot/Bundle, no WhatsApp | Fachada | No |

---

## 7. MINIMAL_EXECUTION_ENVELOPE matrix

| envelope field | contract owner | real source candidate | producer | required | current availability | mapping required | notes |
|----------------|----------------|----------------------|----------|----------|----------------------|------------------|-------|
| `trace_id` | `03A` D2/D8 | Fachada de ciclo | Fachada | Sí | No en chat | Asignar id opaco | Antes de ejecutar tool |
| `tool_id` | `03A` + registry | `get_arr_snapshot` | Adapter | Sí | Registry | Copiar id | No inventar tool |
| `domain` | `03A` + registry | `arr` | Adapter | Sí | Registry | Copiar | |
| `execution_id` | `03A` D2 | Ciclo | Adapter/fachada | Condicional | No | Generar | Correlación |
| `status` / `technical_state` | `03A` enum §2 | Condición real §8 | **Adapter** | Sí | OP exige enum | **Sí** | OP no traduce 403→enum |
| `payload` | `03A` D2/D10 | `{ venta_ton, desc_kg }` | Adapter | Condicional (OK) | `loadArrProyForPlant` | Campo→`metric_or_event`/`value`/`unit`/`period` | No parsear `text` del anexo |
| `payload_reference` / `raw_payload_reference` | `03A` D10 | Ref opaca | Adapter u OP fallback | Condicional | OP genera `raw://…` | Opcional | Sin secretos |
| `extracted_by` | `03A` D9 | tool_id | Adapter | Preservar | N/A | `get_arr_snapshot` | ≠ autor |
| `triggered_by` | `03A` D9 | dashboard user | Adapter | Preservar | Auth request | user id o undeclared | ≠ WhatsApp body |
| `source.system` | `03A` D9 | `arr` | Adapter | Preservar | Dominio | Copiar | OP fallback `domain` |
| `source_instance_id` | `03A` D9 | plant+exec | Adapter u OP | Preservar | OP fallback | Preferir explícito | |
| `content_author_id` | `03A` D9 | origen ARR | Adapter | Preservar null | Normalmente ausente | **null** | No rellenar |
| `subject` / `entity_resolution` | `03A` §4/D11 | planta | Adapter | Condicional | `getPlantCodeArrFromPlantaNombre` | Declarar RESOLVED/UNRESOLVED | |
| `extracted_at` | `03A` D13 | clock inyectable | Adapter | Preservar | No en executor | Inyectar | No semántica |
| `scope_complete` | `03A` | inputs year/month/planta | Adapter | Sí en OP record | Tool plan `missing_inputs` | false si incompleto | |
| timestamps ejecución | `03A` D2 | clock | Adapter | Condicional | | | |

---

## 8. AcquisitionStatus mapping matrix

Mapping **owner = adapter**. OP = validación + separación records.

| contract status | real execution condition | mapping owner | raw evidence required | business meaning prohibited | current readiness |
|-----------------|--------------------------|---------------|----------------------|-----------------------------|-------------------|
| `ACQUIRED_OK` | `venta_ton` (o `desc_kg` si ese fuera el slice) numérico finito | Adapter | Payload estructurado, no anexo texto | No afirmar cobertura total del dominio ARR (`03B`) | ADAPTER_REQUIRED; dato PHYSICALLY_READY |
| `ACQUIRED_EMPTY` | Query OK, `venta_ton == null` y sin fila usable | Adapter | Status técnico | ≠ «no hubo ventas»; ≠ `ABSENCE_CONFIRMED` | ADAPTER_REQUIRED; EB PHYSICALLY_READY (absence_rules vacías) |
| `TOOL_ERROR` | Excepción pg, pool, 500 de `loadArrProyForPlant` | Adapter | `error.code` técnico | ≠ vacío de negocio | ADAPTER_REQUIRED |
| `SOURCE_RESTRICTED` | 403 GA / `assertPlantaAccess` / `assertGVPlantaNombreAccess` | Adapter | Status 403 | ≠ «dato no existe» | PHYSICALLY_READY (checks) + ADAPTER_REQUIRED (enum) |
| `SOURCE_NOT_INTEGRATED` | Tool `declared_not_integrated` o executor null; **no** aplica a ARR available_on_demand | Orchestrator/adapter | Registry status | No ejecutar DB | PHYSICALLY_READY (registry) |
| `ENTITY_UNRESOLVED` | `planta_id` inválido, planta no encontrada, `plantCode` null | Adapter | original_value + state UNRESOLVED | No inventar `entity_id` | PHYSICALLY_READY (lookup) + ADAPTER_REQUIRED |
| `QUERY_SCOPE_INCOMPLETE` | Falta `planta_id` / year / month; `missing_inputs` del Tool Plan | Adapter (puede usar Tool Plan) | `scope_complete: false` | No rellenar alcance | PHYSICALLY_READY (`requiredInputs`) + ADAPTER_REQUIRED |

---

## 9. Existing source/tool candidates

| existing source/tool | current runtime | real data | auth required | can emit envelope today | adapter needed | risk | recommended for first vertical slice |
|---------------------|-----------------|-----------|---------------|-------------------------|----------------|------|--------------------------------------|
| `get_arr_snapshot` / `loadArrProyForPlant` | `lib/director-ia-igf-arr.js` + `dashboard-arr-forecast.js` | **Sí** `{ venta_ton, desc_kg }` | dashboard + planta; GA restringido en anexo | **No** | **Sí** (no usar `text` del anexo) | On_demand; no UI ARR completa | **Sí** |
| `get_igf_snapshot` / `loadIgfCommitSnapshot` | mismo módulo | Sí, fila compromiso | igual | No | Sí | Versión GLOBAL; matching planta | No (segundo) |
| `get_action_register_context` | `buildDirectorIaContextPayload` | Sí, board/resúmenes | planta | No | Alto: payload de chat, no métrica única | Inventar qué fila es Fact | **No** |
| `get_dicf_context` | `summarizeDicfContext` | Parcial | planta | No | Alto | Resumen ~40 | No |
| `get_bitacora_context` | `loadBitacoraForChat` | Sesiones | planta | No | Alto | Texto de bitácora ≠ N1 automático | No |
| `get_commercial_state` | `loadCommercialStateForChat` | Totales DICF | planta + pregunta | No | Medio | On_demand; GA | No |
| `resolve_entidades_comerciales` | `comercial-entidad.js` | Catálogo alias | planta + question | No | Resolución, no métrica | No es snapshot KPI | No (apoyo D11 futuro) |
| `get_folio_status` y resto `declared_not_integrated` | `executor: null` | Operativo en `server.js`, no en Director IA | — | No | SOURCE_NOT_INTEGRATED | Inventar integración | **No** |
| Texto WhatsApp / pregunta chat | Twilio / `askDirectorIa` | Mensaje usuario | actor teléfono | No | **Prohibido** | Epistémico ilegal | **No** |

Ninguna tool emite envelope hoy. ARR estructurado es la única candidata **apta** para slice 1 sin nueva capability.

---

## 10. Provenance and traceability

Cadena exigida: fachada (`trace_id`) → envelope (identidades D8) → OP (`source`, `extracted_by`, `triggered_by`, `raw_payload_reference`, `lineage` en EB) → Bundle → Snapshot → IES.

OP ya preserva `content_author_id` null (`sourceFrom`). Adapter ARR: no rellenar autor con el tool.

`raw_payload_reference` no sustituye payload; EB no debe embeber el row pg completo como statement.

---

## 11. Entity-resolution boundary

| Capa | Responsabilidad |
|------|-----------------|
| Dashboard / fachada | `planta_id` autenticado |
| Lookup existente | nombre planta, `getPlantCodeArrFromPlantaNombre` |
| Adapter | `entity_resolution` + `subject` 03A; UNRESOLVED si lookup falla |
| OP | D11: no canónico si no RESOLVED; no ObservationRecord de entidad inventada |
| EB | Excluye UNRESOLVED/AMBIGUOUS de N3 comparable (`isExcludedEntity`) |

No resolver cliente comercial en slice 1. `resolveCommercialEntity` no habla 03A.

---

## 12. Chat/WhatsApp boundary

| Permitido en arquitectura | Prohibido |
|---------------------------|-----------|
| Más adelante: disparar fachada constitucional **después** de auth, sin usar el texto como Fact | `body` Twilio → N1 |
| CP `WHATSAPP` como presentación de IES | Anexo `text` LLM → ObservationRecord |
| Comando actual: link dashboard | Tratar `askDirectorIa` como Tool Execution |

Slice 1: **cero** cambios a `lib/director-ia-chat.js` y `/twilio/whatsapp`.

---

## 13. Server/runtime composition boundary

`server.js` hoy: `createEksRuntime({ env, operationalPool }).start()`; rutas Director IA legado; Twilio.

Futuro IMPL (no esta tarea): endpoint **distinto** de `POST /api/director-ia/chat` que llame la fachada (trigger + `planta_id` + periodo). Composición interna: adapter → `createObservationPipeline` → `assemble` → `eks.append_snapshot`.

No duplicar semántica OP/EB dentro de `server.js`.

`createDirectorIaE2e` puede reutilizarse si se le pasa `executionEnvelope` ya adaptado; el modelAdapter N5 no es necesario para slice EKS-only.

---

## 14. Security/config boundary

| Recurso | ¿Slice 1? | Cruza IES/RE/CP? |
|---------|-----------|------------------|
| `DATABASE_URL` / pool | Sí | **No** |
| `ENABLE_DIRECTOR_IA` | Sí | No |
| `dashboardAuth` / planta | Sí | Solo ids de sujeto, no cookies |
| `OPENAI_API_KEY` | **No** | N/A |
| Twilio SID/token | **No** | N/A |
| AWS S3 | No | N/A |

GA sin KPI financiero: `SOURCE_RESTRICTED`, no Fact vacío.

---

## 15. Minimum real vertical slice

**Nombre de alcance (único):** ARR `venta_ton` de una planta/periodo vía `get_arr_snapshot` → envelope 03A → OP → EB → EKS.

Pasos físicos (futuro IMPL):

1. Trigger autenticado con `planta_id`, year, month (no WhatsApp).
2. Fachada asigna `trace_id` / `execution_id`.
3. Resolver planta → `plant_code`; si falla, un envelope `ENTITY_UNRESOLVED` y STOP de negocio.
4. `loadArrProyForPlant` (no `loadIgfArrAnnexForChat`).
5. Adapter: `ACQUIRED_OK` + payload `{ metric_or_event: "venta_ton", value, unit: "t", period }` **o** `ACQUIRED_EMPTY` / `TOOL_ERROR` según §8.
6. `op.process([envelope])` → `eb.assemble` → `eks.validate_structure` + `append_snapshot`.
7. Verificar: `content_author_id` null no rellenado; `producer=evidence_builder`; no `ABSENCE_CONFIRMED` desde empty; secrets ausentes.

Demostrable con DB real. No requiere N3/N4 (una sola observación no contradice). N3/N4 siguen listos si un segundo envelope comparable llega después.

---

## 16. G2/G3 dependency map

### Gate matrix

| gap/decision | blocks implementation | requires G2 | requires G3 | requires credentials/config | requires new source/tool | owner | recommended action |
|--------------|----------------------|-------------|-------------|----------------------------|--------------------------|-------|-------------------|
| Productor envelope 03A ausente | Sí (hasta IMPL adapter) | No | No | No | No | Adapter nuevo | IMPLEMENTATION_REQUIRED |
| Mapping status real → enum | Sí (hasta adapter) | No | No | No | No | Adapter | ADAPTER_REQUIRED |
| `DATABASE_URL` / `ENABLE_DIRECTOR_IA` / acceso planta | Sí en entorno real | No | No | **Sí** | No | Ops / server | CONFIG_REQUIRED |
| Trigger dashboard vs WhatsApp | No si se elige dashboard | **Sí** si WhatsApp=N1 | No | Auth dashboard | No | Fachada | No usar WhatsApp en slice 1 |
| Editar 03A / índice | No para IMPL adapter | **Sí** | No | No | No | Contratos | No tocar en IMPL |
| Contrato `07-TOOL-EXECUTION` | No | No | **Sí** solo si HUMAN lo exige | No | No | Arquitectura | Opcional; D2 basta |
| Nueva capability/tool registry | No | Posible | Posible | — | **Sí** | Tools | **No**; usar ARR |
| G8 / causal / B–E | No | — | — | — | No | — | Fuera de alcance |

| gap/decision | ¿G2? | ¿G3? | Notas |
|--------------|------|------|-------|
| Definir slice ARR→03A | No | No | Contratos suficientes |
| Implementar adapter + fachada sin tocar `docs/director-ia/` | No | No | IMPLEMENTATION_REQUIRED |
| Cambiar 03A D15 / índice «runtime pendiente» | **Sí** | No | Documental; no bloquea IMPL si no se edita contrato |
| Tratar chat/WhatsApp como N1 | **Sí** (y sería rechazo) | — | Fuera de alcance |
| Documento `07-TOOL-EXECUTION.md` | No | **Sí** si HUMAN lo exige | Opcional; D2 ya es frontera |
| Taxonomía nueva de métricas | **Sí** | Posible | Evitable: usar `venta_ton` fuente |
| G8 | — | — | N/A |

---

## 17. Blockers

**Ningún BLOCKER de definición del slice.** No hay SOURCE_GAP.

Pseudo-bloqueos que **no** aplican si se respeta el alcance:

- Ausencia de productor 03A → se resuelve con adapter (IMPL), no con G3.
- Anexo chat en prosa → no usarlo.
- Índice «futuro» → no impide módulo nuevo que **emite** D2.

BLOCKER verdadero aparecería si HUMAN exigiera WhatsApp-as-source o parsear LLM como N1: entonces **NO-GO** / STOP, no «arreglarlo».

---

## 18. Recommended implementation scope

**Exactamente uno:**

`IMPL-DIRECTOR-IA-ARR-ENVELOPE-ADAPTER-001` (nombre propuesto, **no creado**, no autorizado):

Implementar únicamente: (a) adapter `loadArrProyForPlant` → `MINIMAL_EXECUTION_ENVELOPE`; (b) fachada de ciclo con `trace_id`; (c) OP→EB→EKS para **una** planta/periodo `venta_ton`; (d) tests con envelope real-shaped **sin** secretos.

**Modificar (futuro, no ahora):** nuevo(s) archivo(s) adapter/fachada; tests/fixtures de envelope ARR; como máximo un call site en `server.js` **distinto** de chat/Twilio.

**Intactos:** `docs/director-ia/`; OP mapping; EB N2–N4; IES/RE/CP; `lib/director-ia-chat.js`; Twilio; Tool Orchestrator (sigue sin ejecutar); registry (sin nueva tool); G8; clasificador B–E.

---

## 19. GO / CONDITIONAL-GO / NO-GO

**CONDITIONAL-GO**

| Campo | Valor |
|-------|--------|
| Veredicto | CONDITIONAL-GO |
| Fuente/tool del primer slice | `get_arr_snapshot` / `arr` / `loadArrProyForPlant` (`venta_ton`) |
| Scope IMPL recomendado | ARR envelope adapter + ciclo OP→EB→EKS (uno) |
| Gates para esa IMPL | **G1**. G2/G3 no si no se editan contratos ni chat. G8 N/A |
| Condiciones | Adapter ≠ anexo chat; trigger ≠ WhatsApp; secrets fuera de IES/RE/CP; OP/EB intactos |
| Componentes a modificar (futuro) | Adapter nuevo; fachada; tests; opcional endpoint no-chat |
| Componentes intactos | Contratos; OP; EB; chat; Twilio; IES/RE/CP; orchestrator declarativo |

No es GO incondicional: falta runtime productor y config. No es NO-GO: la fuente real existe.

---

## 20. STOP

Auditoría completa D1–D20. Sin implementación. Sin G2/G3. Sin commit, push, merge ni siguiente tarea.

STOP.
