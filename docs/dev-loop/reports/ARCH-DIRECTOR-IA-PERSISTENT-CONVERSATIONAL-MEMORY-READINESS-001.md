# Reporte — ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_ONLY"
determination: "READY_WITH_LIMITS"
first_slice: "pending_work_items_only"
first_slice_id: "A"
storage_owner: "chat legado operativo (schema arr), NO EKS, NO Motor N1–N5, NO IES, NO bitácora, NO comments, NO Action Register"
new_table_required: true
new_table_created_in_this_task: false
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Persistent conversational memory is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001.md"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "sql/014_director_ia_bitacora.sql"
  - "sql/015_director_ia_eks.sql"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    EKE §15: la primera versión del Motor no hará «Memoria conversacional
    persistente (solo history efímero del request)». Esta readiness no
    implementa memoria en el Motor ni sustituye el routing del chat. El
    first slice A es un store operativo del chat legado (work items), no
    un Knowledge Bundle ni un ciclo N1–N5. Si HUMAN_APPROVER lee §15 como
    veda de producto para cualquier persistencia de hilo, debe REJECTED en
    G5 y autorizar ARCH-DIRECTOR-IA-PERSISTENT-MEMORY-CONTRACT-001. No es
    contradicción que obligue STOPPED: Constitución + EKS + EKE tratan el
    chat legado como distinto de N1–N5; la continuidad efímera ya se
    aceptó bajo la misma frontera.
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

El first slice mínimo, seguro y útil es **A — `pending_work_items_only`**.

**MEMORIA** sirve para retomar trabajo (asunto, planta, entidad única, brecha pendiente).  
**EVIDENCIA FRESCA** sirve para afirmar qué es verdad hoy.  
`MEMORY != CURRENT EVIDENCE`.

No cabe en EKS, bitácora, comments, Action Register ni en el estado efímero actual. No existe tabla de chat/sesión. Si se implementa, hace falta **una tabla operativa nueva** en `arr`, propiedad del **chat legado**. Esta auditoría **no la crea**.

No se persiste history. No se persisten respuestas del assistant como hechos. No se persisten hipótesis. Al recuperar, hay que revalidar authz/planta/entidad y **requery** las fuentes. La evidencia actual gana.

G2 = **N/A**. G3 = **N/A**. Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-persistent-conversational-memory-readiness-001` (≠ `main`).
- HEAD de partida: `44ff6b1d`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En la transición `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, sin tablas, sin writes, sin tests, sin matriz, sin contratos, sin commit, sin push, sin merge.
- G2/G3 determinados: **N/A** (store operativo del chat legado; no Motor, no EKS, no contrato nuevo en `docs/director-ia/`). Detalle en § Contratos.

---

## 1. Principio auditado

| Uso | Qué puede hacer | Qué no puede hacer |
|---|---|---|
| Memoria | Recordar que había un asunto / brecha / entidad / planta | Decir el estado actual de compra, acción, responsable, IGF/ARR |
| Evidencia fresca | Afirmar qué es cierto ahora tras requery + authz | Sustituirse por un recuerdo |

Ejemplo correcto: «La última vez dejamos pendiente conocer el motivo de Arturo. Voy a revisar si ya apareció información nueva.»

Ejemplo incorrecto: «Arturo sigue sin comprar» solo porque así se recordó.

Escenario 1 (día siguiente, «¿Qué pasó con Arturo?»): recuperar el work item **y** consultar fuentes actuales. El recuerdo no responde la pregunta de negocio.

---

## 2. Storage actual — auditoría física

### 2.1 Continuidad efímera (hoy)

`lib/director-ia-conversation-state.js`: «No DB. No cross-session. No evidence cache.»

Campos: `parent_intent`, `planta_id` del request, `active_entities` 0|1, `last_evidence_bundle_type`, `pending_information_gap` derivado del pack **fresco**. OpenAI recibe bloque `HILO` (conversación ≠ evidencia). History user-only / `req.body.conversation_state` se reconstruye **por request**.

Esto cubre retomar **dentro de la sesión**. No cubre «volver mañana». El FE guarda mensajes en estado React; se pierde al recargar. No hay session id ni tabla de historial.

**Veredicto:** reutilizable como **forma** del work item (mismos campos conceptuales). No es persistencia.

### 2.2 EKS — no cabe

Contrato `03-EXECUTIVE-KNOWLEDGE-STORE.md`: almacén **append-only** de Knowledge Bundles N1–N4 (`observations` / `facts` / `evidence` / `diagnoses` / `open_questions` del ciclo). No llama LLM. No lee fuentes operacionales para inventar conocimiento.

Físico `sql/015_director_ia_eks.sql`: `eks.trace_locks`, `eks.snapshots` (bundle JSONB). Comentario: «Cifras de negocio no viven aquí; solo Knowledge Snapshots.» «No altera tablas de producto (folios, ARR, IGF, bitácora…).»

`open_questions` del Bundle son preguntas del Evidence Builder en un ciclo N1–N4, **no** «ayer dejamos pendiente el motivo de Arturo en el chat».

Meter conversaciones, work items o HILO en EKS **viola el contrato** y el prompt de esta tarea.

**Veredicto:** no pertenece al EKS. No es proyección del EKS. No espera al runtime IES/EKS.

### 2.3 EKE

§2: `question` puede expandirse por historial **efímero** de la solicitud, sin memoria persistente.

§15: la primera versión del Motor **no** hará «Memoria conversacional persistente (solo `history` efímero del request)». Tampoco sustituye el routing del chat hasta decisión explícita.

**Veredicto:** el Motor no es el owner. Un work-item store del chat legado no es el Motor. Tensión §15 documentada (G5 humano).

### 2.4 Bitácora — no reutilizar

`arr.director_ia_bitacora` (`sql/014_director_ia_bitacora.sql`): notas de campo (Plaud, visitas, juntas). Tipos: `junta_consejo`, `visita_planta`, `comercial`, etc. Contenido libre + `resumen_ia`. Es evidencia/contexto de negocio, no hilo de chat.

Persistir «pendiente motivo Arturo» ahí lo convertiría en nota de campo / hecho aparente.

**Veredicto:** no.

### 2.5 Comments — no reutilizar

`arr.cliente_comentarios`: comentarios libres de negocio por cliente. No son memoria de Director IA. Escribir gaps ahí los haría parecer comentarios comerciales.

**Veredicto:** no.

### 2.6 Action Register — no reutilizar

`arr.action_register_*`: ítems/revisiones/notas de producto. Una acción abierta de planta ≠ «el chat dejó pendiente el motivo de Arturo». Confundirlos convierte memoria en estado institucional de acciones.

**Veredicto:** no.

### 2.7 Tablas chat / session / memoria

Búsqueda en `sql/` de `chat_`, `session_`, `conversation_`, `memoria`: **cero**. No hay historial persistido.

**Veredicto:** no existe store reutilizable de conversación.

### 2.8 Otras tablas Director IA

`arr.comercial_entidad` / alias: catálogo comercial. No es memoria.

`eks.snapshots.query_context_metadata`: metadata inmutable de Snapshot; no es Bundle y no es hilo de chat.

### 2.9 Identidad de usuario en el chat

`handlePostChat` exige `dashboardAuthMiddleware`. Usuario: `req.dashboardUser || req.user`. Authz se revalida **cada** POST. No hay permiso cacheado en conversación.

---

## 3. Comparación A / B / C / D — exactamente una ganadora

| ID | Nombre | ¿Cubre «¿Qué pasó con Arturo?» mañana? | ¿MEMORY ≠ EVIDENCE? | ¿Simple / acotado? | Riesgo |
|---|---|---|---|---|---|
| **A** | `pending_work_items_only` | Sí: recuerda asunto/brecha/entidad/planta y obliga requery | Sí, si no guarda claims | Alta | Crear de más si el auto-save no se acota |
| B | `conversation_summaries` | Parcial | **No.** Un summary persiste claims del assistant | Media | Hipótesis como hechos; stale |
| C | `full_conversation_memory` | Ruido | No | Baja | History, tokens, privacy, claims stale |
| D | `explicit_user_saved_memories_only` | Solo si el user dijo «recuérdame» | Sí | Alta | Falla el escenario 1: nadie pidió guardar |

**Seleccionado: A — `pending_work_items_only`.**

Por qué no B: resume assistant → claims persistidos. El producto prohíbe tratar respuesta previa como hecho.

Por qué no C: el prompt lo prohíbe (noise, stale, tokens, privacy).

Por qué no D sola: el objetivo de producto es volver y preguntar «¿Qué pasó con Arturo?» **sin** haber dicho «recuérdame». D es **creación secundaria** (mismo shape), no el slice.

Por qué A: guarda solo contexto de trabajo objetivo (planta, entidad única, intent, brecha del pack). No transcript. No answer. No hipótesis. La verdad de negocio se vuelve a consultar.

---

## 4. Owner, tabla, schema mínimo propuesto

### Storage owner

**Chat legado operativo**, schema `arr`. Misma clase que bitácora (tabla de producto Director IA), **distinto tipo de dato**.

No EKS. No Motor. No IES. No Reasoning Engine. No comments. No AR.

Nombre tentativo (no creado): `arr.director_ia_pending_work_items`.

### ¿Nueva tabla? **Sí** (si se implementa). Esta tarea no la crea.

Nada existente encaja sin corromper semántica (EKS=conocimiento de ciclo; bitácora=notas de campo; comments=texto de cliente; AR=acciones de planta; conversation_state=efímero).

### Campos mínimos — recorte

Candidatos de la tarea vs necesidad real:

| Campo | ¿En first slice? | Motivo |
|---|---|---|
| `id` / `memory_id` | Sí | PK para resolve / dismiss / update |
| `created_by_usuario_id` | Sí | Anti cross-user; scope de retrieval |
| `planta_id` | Sí | Scope; se revalida; no se fía del recuerdo |
| entidad única (`entity_display` + `cliente_key` nullable) | Sí | 0\|1. Sin entidad única no hay work item A |
| `parent_intent` | Sí | Guía requery (`plant_diagnosis` / `expediente_comercial`) |
| `pending_information_gap` | Sí | missing / why / hint de fuente física. **No** persona ni hechos de negocio como verdad |
| `status` | Sí | active / resolved / superseded / stale / dismissed |
| `created_at` / `updated_at` | Sí | Recencia de retrieval, no TTL |
| `last_revalidated_at` | Sí | Metadata de revalidación |
| `last_evidence_bundle_type` | Opcional | Hint de qué pack requery; no payload |
| `work_item_type` | No | Redundante: el tipo es pending gap |
| `entity_type` | No | First slice = entidad comercial única |
| `summary` | **No** | Es B |
| `source_refs` / payload evidencia | **No** | Prohibido guardar packs |
| `expires_at` | **No** | TTL arbitrario sin evidencia |
| authz / `plantas_permitidas` cacheadas | **No** | Authz no se memoriza |
| transcript / answer assistant | **No** | Prohibido |

No es un knowledge graph. No es un log de chat.

---

## 5. Creation policy

### Puede guardarse automáticamente

Solo si **todas** se cumplen, derivadas de evidencia **fresca** (no del LLM):

1. `planta_id` autorizado del request.
2. Entidad comercial **única** resuelta (`cliente_key` o display no ambiguo).
3. `parent_intent` heredable (`plant_diagnosis` o `expediente_comercial`).
4. `pending_information_gap` **objetivo** del pack (limitations / coverage_unknown / campo missing), no prosa del modelo.

No cada `plant_diagnosis`. Solo cuando hay brecha objetiva + entidad única.

Unicidad: un work item **active** por (`usuario`, `planta_id`, `cliente_key` o display normalizado, `parent_intent`). Update, no duplicar.

### Requiere petición del usuario

«Recuérdame que estábamos revisando Arturo» / «guarda esto para la próxima vez»: crea o actualiza el **mismo** shape A. No guarda el texto libre como hecho. Si falta entidad/planta/brecha, pide aclaración; no inventa.

### Nunca debe guardarse

- Toda frase del usuario.
- Toda respuesta del assistant.
- Hipótesis / inferencias del modelo.
- SOURCE_RESTRICTED como dato factual.
- Authz / rol / `plantas_permitidas` como permiso permanente.
- Comentarios como hechos externos.
- Datos transaccionales mutables (compra, acción, venta, IGF/ARR, responsable) como verdad.
- Payloads completos de evidencia.
- Decisiones humanas informales (no hay mecanismo físico de «conclusión validada» → diferir).
- Preferencias.
- History crudo.

`assistant_inferred_memory`: fuera del slice.

---

## 6. Retrieval policy

No inundar cada conversación nueva.

### Cuándo recuperar

1. Mención de entidad que coincide con un work item active del usuario+planta.
2. Frase de retoma («qué pasó con», «y lo de Arturo», «seguimos con»).
3. Misma `planta_id` + mismo `parent_intent` heredable **y** hay ≤ N items active recientes.
4. Petición explícita de retoma / «recuérdame qué teníamos».

No: dump de todos los recuerdos al abrir el chat. No: recuperar en greeting/help/thanks.

### Filtros

| Eje | Regla |
|---|---|
| Usuario | `created_by_usuario_id` = usuario actual. Otro usuario de la misma planta **no** ve el ítem. |
| Planta | `planta_id` = planta del request **y** está en `plantas_permitidas` actuales. |
| Entidad | Si el user nombra entidad: match display/key. Si no nombra: no mezclar entidades. |
| Intent | Preferir mismo `parent_intent`; no forzar otro intent. |
| Estado | Solo `active` para retoma. `stale`/`superseded` no se narran como vigentes. |
| Recencia | Orden `updated_at` DESC. |
| Máximo | **1–3**. Techo duro: **3**. |

Tras recuperar: el ítem entra al runtime como **hint de trabajo**, no como pack. Luego requery. El HILO efímero sigue existiendo en-sesión y no se sustituye por DB.

---

## 7. Revalidation — obligatoria

Al recuperar, **antes** de afirmar cualquier dato de negocio:

1. Authz de la sesión actual (middleware + loaders). Memoria no otorga acceso.
2. Planta actual = planta del request. Switch de planta → no usar el ítem (stale o no retrieve).
3. Entidad actual re-resuelta. Si deja de ser única → `stale`. Sin remap fuzzy («ese Arturo era de Querétaro» → dismiss, no reasignar).
4. Requery de fuentes del intent (pack fresco).
5. SOURCE_RESTRICTED **actual** prevalece: no revelar contenido factual previo no autorizado ahora.
6. Evidencia actual **supersedes** memoria.

Lenguaje correcto: retoma de brecha + anuncio de revisión.  
Lenguaje prohibido: reafirmar el recuerdo como estado actual.

Si la revalidación no puede completarse (authz perdida, planta mismatch, entidad ambigua, fuente restringida): marcar `stale` o no hablar del contenido. No «Arturo sigue…».

---

## 8. Staleness / resolution

No TTL de reloj. Caducidad por **resultado de revalidación o acto del usuario**.

| Estado | Cómo se llega | Qué se puede decir |
|---|---|---|
| `active` | Creación (auto-gap o «recuérdame») | Solo: había un asunto/brecha; voy a consultar |
| `resolved` | El pack fresco ya no tiene la brecha, o el user cierra el asunto | Mencionar que el pendiente se cerró **si** la evidencia actual lo muestra |
| `superseded` | La evidencia actual contradice el contexto de trabajo (p. ej. acción ya cerrada; el gap ya no aplica) | Estado actual gana; opcional: «el asunto cambió desde la última vez» |
| `stale` | No se puede revalidar: entidad no única, planta distinta, acceso perdido, SOURCE_RESTRICTED bloquea | No narrar el recuerdo como vigente; no filtrar datos no autorizados |
| `dismissed` | User corrige o pide olvidar | No recuperar. No remap |

Escenario 2 (acción abierta → cerrada): requery muestra cerrado → `superseded`; se informa el estado **actual**.  
Escenario 3 (conflicto): evidencia gana; memoria `stale` o `superseded`.  
Escenario 4 (acceso cambiado): no revelar contenido previo no autorizado; `stale`.  
Escenario 5 (corrección de user): `dismissed`. No fuzzy remap a Querétaro.

Eliminación física: fuera del first slice. Soft-state basta (`dismissed` / `stale`). No asumir persistencia infinita de `active`: si no se puede revalidar, no permanece usable.

---

## 9. Authz / privacy / provenance

- Memory does not grant access.
- No cross-user leakage (`created_by_usuario_id`).
- No cross-plant leakage (`planta_id` del request + `plantas_permitidas` actuales).
- SOURCE_RESTRICTED actual prevalece.
- Authz no se memoriza como permiso permanente. Revocación invalida recuperación factual.
- Provenance del work item: «brecha derivada de pack en `created_at`» o «pedido explícito del usuario». No provenance de negocio (eso lo da el requery).
- Constitución: el chat es interfaz, no chatbot; no alterar silenciosamente el estado institucional del conocimiento. Un work item **no** es Snapshot, hecho N2 ni acción de AR.

---

## 10. Frontera EKS / Motor / IES

| Pregunta | Determinación |
|---|---|
| ¿Pertenece al EKS? | **No.** EKS = Knowledge Snapshots N1–N4. Work items no son Bundle. |
| ¿Proyección del EKS? | **No.** |
| ¿Esperar IES / Reasoning Engine? | **No.** 04/05 no gobiernan el inbox de pendientes del chat legado. |
| ¿Store operativo separado? | **Sí:** tabla `arr` del chat legado. |
| ¿Meter conversaciones al EKS por comodidad? | **Prohibido.** |

`open_questions` del EKS ≠ `pending_information_gap` del chat.

---

## 11. Contratos — G2 / G3

| Pregunta | Determinación |
|---|---|
| ¿Cambia N1–N5 / EKS / IES / 05? | No |
| ¿Crea contrato en `docs/director-ia/`? | No (out of scope de esta tarea y no necesario para A) |
| ¿Nueva tabla de producto? | Sí, en un IMPL futuro; misma clase que `sql/014` (operativa), no `sql/015` (EKS) |
| G2 | **N/A** |
| G3 | **N/A** |

La continuidad efímera ya se aceptó como runtime del chat legado (G2/G3 N/A). Persistencia de **work items** (no transcripts, no claims) es la extensión operativa de esa frontera, no un Memory Store constitucional.

Tensión: EKE §15 nombra «memoria conversacional persistente» como no-Motor. Si HUMAN exige un contrato de Memory Store antes de cualquier tabla, G5 = REJECTED y NEXT = `ARCH-DIRECTOR-IA-PERSISTENT-MEMORY-CONTRACT-001`. Esta auditoría no reinterpreta §15 como veda del chat legado.

No STOPPED: la decisión de ownership **sí** se pudo determinar con contratos vigentes (EKS no; chat legado sí; tabla nueva operativa).

---

## 12. Límites (READY_WITH_LIMITS)

- Sin conclusiones validadas (no hay mecanismo físico para marcarlas).
- Sin decisiones humanas informales persistidas.
- Sin summaries automáticos (B).
- Sin transcript (C).
- Auto-create solo con brecha objetiva + entidad única + planta + intent heredable.
- Scope usuario + planta. Máx. 3 en retrieval.
- Continuidad efímera intacta (in-session). Persistencia ≠ sustituir HILO.
- Chat standalone / Motor / EKS / IES / matriz / 52.5% intactos.
- Esta tarea no diseña SQL ni índices; el IMPL debe proponer el DDL mínimo y tests.

Diferido: validated conclusions; explicit decision records; Memory Store constitucional; persistir work items en Motor; cross-user plant inbox; TTL; graph; preferencias.

---

## 13. Tests a diseñar (si HUMAN autoriza IMPL)

- Persist pending work item (auto-gap + unique entity).
- No persist sin brecha objetiva / sin entidad única / sin planta.
- Resume next session: «¿Qué pasó con Arturo?» recupera ítem y **no** afirma hechos.
- Requery current evidence antes de responder.
- Memory != evidence.
- Current data supersedes memory (acción cerrada → superseded).
- Stale: entidad ya no única; planta mismatch; acceso perdido.
- Resolved: gap cerrado por pack fresco.
- Dismissed: «ese Arturo era de Querétaro» / «olvida eso»; sin fuzzy remap.
- Plant switch no reutiliza ítem de otra planta.
- Cross-plant blocked.
- Cross-user blocked.
- Role/access changed: no revela contenido previo no autorizado.
- SOURCE_RESTRICTED actual prevalece.
- No raw history persistence.
- No assistant claim persistido como hecho.
- No full evidence payload storage.
- Retrieval bounded (≤3).
- Ephemeral `conversation_state` preserved in-session.
- Standalone chat / Motor / EKS writes = cero.
- 52.5% intacto (0.0 pp).

---

## 14. Porcentaje

Antes: **10.5 / 20 = 52.5%**.  
Después de esta readiness: **10.5 / 20 = 52.5%**.  
Efecto esperado de un IMPL: **0.0 pp**.  
Memoria persistente no es cobertura de módulo M0–M20.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una:

`IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001`

Alcance tentativo (para el humano; no ejecutar): tabla operativa `arr` de pending work items (slice A); creation/retrieval/revalidation/staleness según este reporte; cero writes a EKS/Motor; cero history; tests de la lista; 52.5% intacto.

Alternativa si G5 REJECTED por lectura de EKE §15 como veda: `ARCH-DIRECTOR-IA-PERSISTENT-MEMORY-CONTRACT-001`.

STOP.
