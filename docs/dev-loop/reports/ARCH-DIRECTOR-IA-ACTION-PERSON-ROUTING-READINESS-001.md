# Reporte — ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
selected_strategy: "C"
canonical_parent_intent: "action_status"
first_slice: "strengthen_existing_AR_intents_plus_physical_responsable_filter"
destination: "chat legado (planner + askDirectorIa + Action Register board/DICF existentes), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Action-person routing is not module coverage."
daily_discount: "deferred"
sql_017: "not executed; environment activation remains operational"
person_scoring: "out of scope; not this slice"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-004.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-action-register.js"
  - "lib/action-register-board.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-context.js"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    EKE §15 prohíbe «sustitución del routing actual del chat hasta que se decida
    gobernarlo explícitamente». Esta readiness no sustituye el chat por el Motor.
    Refuerza intents AR ya catalogados en el chat legado. Si HUMAN_APPROVER lee
    §15 como «no tocar el routing del chat en absoluto», REJECTED en G5. No
    obliga STOPPED: Constitución + índice tratan el chat legado como distinto
    de N1–N5.
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.** Estrategia seleccionada: **C — fortalecer intents AR existentes**.

No A (phrasebook). No B (intent nuevo `action_person_query`: redundante con `action_status`). No D (override post-planner: innecesario si el planner deja de devolver `unknown`).

La frase canónica **no llega al Action Register** porque el planner queda `unknown 0.35` y el chat clarifica **antes** de cargar el board. Los datos de acción/responsable/vencimiento **sí existen**. El fallo es routing + ausencia de filtro físico por responsable, no ausencia de tablas.

El first slice reutiliza `action_status` («Estado de acciones»), corrige la señal estructural `accion(es)` ya prevista, filtra el board por responsable registrado y hereda follow-ups con la estrategia B ya integrada. Persistent memory **no** se desactiva: un intent AR standalone gana sobre `inheritParentIntent` de resume.

---

## Ejecución

- Rama: `architecture/director-ia-action-person-routing-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `IN_PROGRESS` heredó G1. Solo se cambió `status` al cerrar.
- `max_attempts: 1`. Sin código, tests, matriz, contratos, SQL, commit, push, merge.
- Trazas estáticas: `detectDirectorIaIntent`, `resolveConversationTurn`, `classifyPersistentMemoryTurn`, `planDirectorIaQuestion`, `askDirectorIa`, board AR, DICF, inherit list.

---

## Traza exacta — «¿Qué pasó con la acción de Julio Pérez?» (frío)

Orden real en `askDirectorIa`:

1. `resolveConversationTurn` — planner aislado `unknown`; `inherit=false` (no hay parent inheritable).
2. `classifyPersistentMemoryTurn` — **`resume`**. Trigger físico: `/\bque paso con\b/` sobre texto ya normalizado. Hint: `la acción de Julio Pérez` (`extractResumeEntityHint` / `pas[oó]\s+con\s+(.+)`).
3. Retrieve de work items **solo** si hay store + `actor_id` + planta autorizada. `ENTITY_TYPE = "client"`. El hint no es un cliente. `matchesEntityHint` exige que **todos** los tokens del hint estén en `entity_display`; «la / accion / de» impiden match con un pendiente «Julio Pérez». `resumeItem` típico = `null`.
4. Planner: `unknown` 0.35, evidence `no_rule_matched`.
5. `directorIaPlan.intent === "unknown" && !continuityTurn.inherit` → `buildUnknownClarificationResult`. **OpenAI no. Board AR no. DICF no.**

Por qué el planner no dispara AR:

| Intent existente | Condición física hoy | ¿Matchea la frase? |
|---|---|---|
| `overdue_actions` | `/\bacciones?\b/` **y** `vencid\|atrasad\|overdue` | No. No hay vencimiento. Además el regex de «acciones» **no cubre el singular «acción»** (ver bug abajo). |
| `action_status` (genérico) | `/\bacciones?\b/` **y** `abiert\|pendient\|estado\|tema\|register` | No. «Julio Pérez» no aporta esos tokens. |
| `action_status` (`como_va_tema_ar`) | `como va` + tema AR | No. |
| `responsible_lookup` | `responsable` o «quién es el responsable» | No. «acción de \<persona\>» no dice «responsable». |

**Bug estructural (no phrasebook):** tras `normalizeQuestion`, «acción» → `accion`. En JavaScript `/\bacciones?\b/` es `accione` + `s` opcional → `accione` / `acciones`. **`accion` no matchea.** El catálogo ya pretendía «acciones?»; la implementación no cubre el singular.

Confirmado en runtime:

```text
«¿Qué pasó con la acción de Julio Pérez?» → unknown 0.35 / mem=resume / inherit=false
«¿Qué acciones tiene Julio Pérez?»        → unknown 0.35 / mem=none
  (aquí «acciones» SÍ pasa el primer regex; falla el segundo: no hay abiert|pendient|estado|tema|register)
«¿Quién es el responsable de Oficinas?»    → responsible_lookup 0.88
«¿Qué acciones están vencidas?»            → overdue_actions 0.93
«¿Cómo va mantenimiento?»                  → action_status 0.86
«¿Qué pasó con Arturo?»                    → unknown + mem=resume hint=Arturo  (memoria correcta; no hay señal de acción)
```

Si `resumeItem` **sí** coincidiera (p. ej. pendiente de cliente cuyo display absorbe el hint), `planOptions.inheritParentIntent` heredaría `plant_diagnosis` / `expediente_comercial` **solo porque detected es unknown**. Eso desviaría a pack de planta, no a lookup de la acción. Precedencia pedida: intent AR explícito debe ganar. Hoy no hay intent AR, así que el desvío es posible.

---

## Trazas obligatorias (frío, sin parent)

| Turno | planner | mem | inherit | dest. actual |
|---|---|---|---|---|
| ¿Qué pasó con la acción de Julio Pérez? | unknown 0.35 | resume | no | clarificación; AR no carga |
| ¿Qué acciones tiene Julio Pérez? | unknown 0.35 | none | no | clarificación; AR no carga |
| ¿Tiene alguna vencida? | unknown 0.35 | none | no | clarificación |
| ¿Por qué no la cerró? | unknown 0.35 | none | no | clarificación |
| ¿Qué falta saber? | unknown 0.35 (kind `gap_what`) | none | no | clarificación |
| ¿Qué necesitas de Julio? | unknown 0.35 | none | no | clarificación |

Follow-ups canónicos con parent **`action_status`** hoy: **tampoco heredan**. `INHERITABLE_INTENTS` = `plant_diagnosis`, `expediente_comercial`, `daily_sales_deviation`. `sanitizeEchoedState` anula `parent_intent` si no está en esa lista. `¿Está vencida?` / `¿Por qué no la cerró?` / `¿Lo sabemos?` / `¿Qué falta?` / `¿Qué necesitas de Julio?` con parent `action_status` → `inherit=false`.

Con parent `plant_diagnosis` (estrategia B): **sí heredan**. GPT ve como mucho **5** vencidas y **5** responsables (`AR_OVERDUE_LIMIT` / `AR_RESPONSABLES_LIMIT` en diagnóstico de planta; `includeDicf: false`). Julio puede no aparecer. No hay lookup de su acción. No es el producto pedido.

---

## Datos físicos que sí existen

### Action Register (board) — `arr.action_register_items`

`buildActionRegisterBoardPayload` lee: `id`, `tema`, `title`, `responsable` (texto), `responsable_usuario_id`, `due_date`, `closed`, `attachments_count`. JOIN a `public.usuarios` para el label. Roles vía `loadUsuarioRolesByIds`.

Derivables **sin inventar**: abierta/cerrada (`closed`); vencida (`!closed` ∧ `due_date` válida \< hoy CDMX, `isItemOverdue` / `isValidOverdueItem`); `dias_vencido`; `created_at` cuando el ítem lo trae.

**No existen en el ítem AR:** `resultado_cierre`, historial de eventos del ítem, motivo de no-cierre, «culpa», desempeño.

`summarizeTopOverdueActions` / `summarizeActionRegisterResponsables` / `summarizeTemaDetails` recortan top-N (10 / 10 / 5×10). Un dump no filtrado **puede omitir a Julio**.

Notas de revisión: otra fuente (`arr.action_register_revision_notes`), por **revisión**, no atribuibles al ítem. No son el motivo de que Julio no cerrara.

### DICF — `arr.dicf_acciones`

`summarizeDicfContext` (dump legado, `includeDicf: true`): `public_code`, `estado`, `fecha_compromiso`, `resultado_cierre`, `cerrado_at`, `responsable` (JOIN usuarios), `historial` (`loadHistorialBatch`). Límite ~40, no filtrado por persona.

Plant diagnosis **no** carga DICF en el bloque AR (`includeDicf: false`).

Julio responsable **registrado** de una acción ≠ responsable del problema ≠ culpable ≠ causa del vencimiento. Hecho permitido: «asignada a Julio Pérez». Hecho prohibido sin evidencia: «no la cerró por falta de seguimiento».

---

## Loaders / routing AR en chat

- `action_status` / `overdue_actions` / `responsible_lookup` **no** tienen rama in-process en `askDirectorIa`.
- `lib/director-ia-tools.js` no registra esos intents; el dominio `action_register` usa `get_action_register_context` → dump `buildDirectorIaContextPayload`.
- Si el planner **detectara** `action_status`, el chat caería al dump legado (summary, temas, top overdue, top responsables, tema_details, dicf_details). Sigue **sin** filtro por persona.
- `unknown` **no** cae al dump (correcto desde continuidad B).

Precedencia memoria vs AR hoy:

```text
classify resume  →  (retrieve opcional)  →  planner
inheritParentIntent desde resumeItem SOLO si detected.intent === "unknown"
```

No hace falta apagar memoria. Hace falta que el planner deje de ser `unknown` cuando hay semántica AR.

«¿Qué pasó con Arturo?» no contiene `accion(es)` → resume de cliente permanece válido.

---

## Comparación A / B / C / D

| | Descripción | Veredicto |
|---|---|---|
| **A** phrasebook | Hardcodear «qué pasó con la acción de», Julio, verbos, nombres | **Rechazar.** Viola anti-phrasebook. No generaliza. Hold-outs morirían o se meterían a producción. |
| **B** intent nuevo | `action_person_query` / `action_person_status` | **Rechazar.** El catálogo ya tiene `action_status` = «Estado de acciones (Action Register)». Taxonomía redundante. |
| **C** fortalecer intents AR existentes | Corregir `accion(es)`, no exigir `abiert|…` para status, filtrar board por responsable físico, heredar `action_status` | **Seleccionado.** Reuse semántico correcto. |
| **D** override post-planner | Si unknown + persona resoluble + semántica de acción → forzar AR | **No.** El planner **debe** emitir `action_status`; D duplica la puerta y deja el catálogo mintiendo. La precedencia memoria ya está resuelta si C hace standalone ≥ 0.55 (`inheritParentIntent` no aplica). |

Selección: **exactamente C**.

---

## First slice implementable (C) — no ejecutado

Destino: chat legado. Determinista: routing, identidad de responsable/acción, status, vencimiento, authz, provenance, ausencia. GPT: narrativa, qué sabemos/no, qué falta, qué pedir al responsable. Sin evaluador de personas.

### 1. Planner (sin DB, sin nombres)

- Sustituir `/\bacciones?\b/` por `/\baccion(es)?\b/` en `overdue_actions`, token-unidad y `action_status` genérico. Eso cubre `accion` y `acciones` tras normalizar. No es una lista de frases.
- `action_status` genérico: `accion(es)` basta. Quitar la conjunción obligatoria `abiert|pendient|estado|tema|register` (esa conjunción es la que mata «¿Qué acciones tiene …?»).
- Precedencia interna **sin cambiar el orden del catálogo**: `overdue_actions` (accion + vencid) sigue antes; `responsible_lookup` (quién/responsable) sigue antes; `como_va_tema_ar` sigue para temas AR.
- Prohibido: literal «qué pasó con la acción de», «Julio», listas de verbos, score de palabras.

Con eso, en frío:

- «¿Qué pasó con la acción de Julio Pérez?» → `action_status` (hay `accion`).
- «¿Qué acciones tiene Julio Pérez?» → `action_status`.
- «¿Hay actualización de la acción de Julio?» → `action_status` (hold-out con la misma señal estructural).
- «¿Qué pasó con Arturo?» → sigue `unknown` + resume. Memoria intacta.

### 2. Precedencia memoria (sin apagarla)

- Si `detectDirectorIaIntent` es AR standalone (`action_status` / `overdue_actions` / `responsible_lookup`, conf ≥ 0.55), **no** aplicar `resumeItem.parent_intent`. Ya es el comportamiento de `planDirectorIaQuestion` cuando detected ≠ `unknown`. IMPL debe **no** introducir un camino que herede memoria sobre un intent AR.
- Retrieve resume puede seguir corriendo; no es evidencia. No desactivar `classifyPersistentMemoryTurn`.
- Conversación 3: pendiente de Julio (cliente) + «¿Qué pasó con la acción de Julio?» → AR gana.

### 3. Resolución física de responsable (chat/loader, no planner)

Planner no consulta DB. El filtro es **después**, sobre el board ya autorizado de **esta** planta.

Algoritmo (no fuzzy):

1. Cargar board con el mismo authz actual (`assertPlantaAccess`, fail-closed, sin cross-plant). No ampliar roles.
2. Índice de responsables: `responsable_usuario_id` + `normalizePersonNameKey(responsable)` (ya existe).
3. Match **whole-token** del nombre registrado contra la pregunta normalizada. Preferir clave completa («julio perez») sobre pila suelta («julio») si ambas existen.
4. Resultados:
   - **0** personas AR: ausencia explícita en esta planta; no dump fingiendo top overdue.
   - **>1** personas distintas: clarificar (homónimos / parcial). No elegir.
   - **1** persona, **1** acción: evidenciar esa.
   - **1** persona, **N** acciones: **listar** id/título/tema/status/due/vencida; no elegir en silencio.

No usar `resolveCommercialEntitiesForQuestionFromPool` (eso es clientes). Persona solo por vínculo físico AR/DICF.

### 4. Identidad de acción y evidencia

Por cada ítem AR emparejado, entregar a GPT:

- acción: `id`, `title`, `tema`
- status: `closed` / abierta
- responsable: label + `responsable_usuario_id` si hay
- fecha: `created_at` si existe
- vencimiento: `due_date`, vencida sí/no derivado, `dias_vencido` si válido
- limitations / provenance
- **no** motivo de retraso

DICF del **mismo** `responsable_usuario_id` (o misma clave de nombre): anexo separado con `public_code`, `estado`, `fecha_compromiso`, `resultado_cierre`, `historial` **si existen**. Provenance distinta (`arr.dicf_acciones` ≠ `arr.action_register_items`). Si no hay fila DICF: limitation «no hay resultado_cierre ni historial de eventos en el ítem del Action Register».

Revision notes: no adjuntarlas como explicación de no-cierre.

### 5. Parent canónico y follow-ups

**Parent canónico: `action_status`.**

Sostiene: acción de Julio → ¿vencida? → ¿por qué no cerró? → ¿qué falta? → ¿qué necesitas de Julio?

Añadir **solo** `action_status` a `INHERITABLE_INTENTS`. Reusar estrategia B: unknown + estado válido → inherit → requery → GPT. No phrasebook de follow-ups.

`sanitizeActiveEntities` hoy solo conserva `kind=client`. El first slice **debe** ecoar el responsable resuelto (`usuario_id` + display, kind distinto de cliente) para que el requery no vuelva al dump de planta. Sin eso, la herencia recargaría top-N y Julio volvería a desaparecer.

No meter `overdue_actions` ni `responsible_lookup` a la lista inheritable en este slice.

### 6. Information gap («¿Por qué no la cerró?»)

Determinista: status/vencimiento/asignación. GPT, con limitations, puede decir que no hay explicación registrada y que hace falta actualización (bloqueo, resultado parcial, nueva fecha). No programar la frase final. No inventar. Julio se nombra solo como responsable registrado.

### 7. Authz

Igual que AR actual. Routing nuevo no amplía authz. Cross-plant blocked. Fail-closed.

---

## Hold-outs (solo tests; no producción)

Diseñados para no copiarse al planner:

| Frase | First slice C (standalone) | Tras parent `action_status` |
|---|---|---|
| ¿Qué ocurrió con la tarea que tiene Julio Pérez? | Fuera: no hay `accion(es)`. «tarea» no es sinónimo de producción. | Hereda B; GPT ve las acciones ya filtradas. |
| ¿Cómo va lo que trae Julio? | Fuera. | Hereda B. |
| ¿Julio tiene algo vencido? | Fuera: `vencid` sin `accion(es)` no dispara `overdue_actions`. | Hereda; vencimiento está en evidencia. |
| ¿Qué pendiente tiene Julio? | Fuera. No confundir con work-item memory. | Hereda. |
| ¿Hay actualización de la acción de Julio? | **Dentro:** señal `accion`. | n/a (standalone). |

Generalización exigida: estructura `accion(es)` + resolución física, no la frase canónica.

---

## Conversaciones de producto (criterio IMPL)

1. Canónica: acción de Julio → vencida → por qué no cerró → lo sabemos → qué falta → qué necesitas de Julio. Runtime: acción, status, responsable, fecha, vencimiento, historial/resultado si existe, limitations, provenance. GPT formula qué sabemos / no / falta.
2. Varias acciones del mismo responsable: listar/acotar/clarificar; no elegir una.
3. Pending memory sobre Julio + pregunta con `accion`: AR gana; memoria no se apaga.
4. Hold-outs no están en lógica de producción.

---

## Límites (READY_WITH_LIMITS)

- Standalone sin `accion(es)` (tarea / lo que trae / algo vencido / pendiente) queda fuera del first slice.
- Ítem AR no tiene `resultado_cierre` ni historial; eso es DICF u otro path. Ausencia = limitation, no invención.
- Dump top-N deja de ser la evidencia de «la acción de X»; el filtro por persona es obligatorio cuando hay match.
- No scoring de personas. No daily discount/kg. No SQL 017. No topic stack. No Motor/IES/N5.

---

## G2 / G3

Expectativa de tarea: **runtime-only**.

- **G2 = N/A.** No se edita `docs/director-ia/`. No se sustituye el chat por el Motor (EKE §15). Se refuerza routing legado ya catalogado (`action_status` ya existe).
- **G3 = N/A.** No hay contrato nuevo. 04 IES y 05 RE no aplican a este path.
- **G8 = N/A.** 52.5% / 0.0 pp.

Si el humano interpreta EKE §15 como prohibición absoluta de tocar routing del chat: rechazar en G5, no STOPPED de esta auditoría.

---

## Porcentaje

```text
antes  10.5 / 20 = 52.5%
después 10.5 / 20 = 52.5%
gain   0.0 pp
```

---

## NEXT_TASK (no autorizada, no ejecutada)

`IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001`

STOP.
