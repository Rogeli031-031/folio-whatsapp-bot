# Reporte — AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
implementation: false
phrasebook_proposed: false
conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"
structural_vs_domain: "REMAINING_FAILURES_PREDOMINANTLY_DOMAIN_DATA"
long_conversation: "COHERENT_WITH_RECOVERABLE_TOPIC_RETURN_LIMIT"
single_bottleneck: "no_pre_meeting_compose_orchestrator"
failure_class: "MISSING_INFRASTRUCTURE"
closed_month_igf: "TEMPORAL_SEMANTICS_GAP"
authenticated_identity: "PARTIALLY_WORKS"
seh_directory: "MISSING_PHYSICAL_DATA"
actual_client_income: "UNSUPPORTED_METRIC"
meeting_preparation: "PIECES_EXIST_ORCHESTRATOR_MISSING"
known_working_not_reelected:
  - "daily_brief"
  - "commercial_trend"
  - "client_profile"
  - "action_person"
  - "igf_reviewable"
  - "taller_mayor"
  - "topic_return"
  - "cross_metric"
  - "natural_followup"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This audit does not measure modules. Taller Mayor / conversation base do not change 52.5%."
director_ia_suite_cited: "964/964"
focal_taller_mayor_cited: "17/17"
git_diff_check: "clean"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-executive-brief.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-taller-mayor.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-capabilities.js"
  - "lib/dashboard-auth.js"
  - "lib/seh-equipos.js"
  - "server.js (IGF corte, actor_nombre)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
  - "CONVERSATION_BASE_READY_WITH_LIMITS no es PRODUCTION_READY."
```

## Resumen ejecutivo

**CONVERSATION_BASE_READY_WITH_LIMITS.**

El sustrato conversacional **ya es coherente** sobre objetos conocidos: planta, fecha diaria, canal, cliente, acción, Folio, unidad e IGF del mes abierto. La conversación larga de 13 turnos recorre brief → trend → perfil → IGF → reviewable → Taller Mayor **sin perder planta ni requery**. No se reelige ninguna capability ya demostrada.

Los fallos restantes **ya no son** (en su mayoría) pronombre que pierde entidad, inherit que traga un standalone, o falta de read model de un objeto que el dashboard ya tiene.

Lo que falta es **conocimiento de negocio y un compositor**:

| Pendiente | Clase | ¿Cuello? |
|-----------|-------|----------|
| IGF mes cerrado (actual vs forecast vs as-of) | DOMAIN / `TEMPORAL_SEMANTICS_GAP` | No: el canónico con «IGF» ya entrega número |
| Identidad autenticada | presentación; authz ya existe | No: no abre objeto ejecutivo |
| SEH | `MISSING_PHYSICAL_DATA` | No |
| Ingreso real de cliente | `UNSUPPORTED_METRIC` | No |
| Preparación de junta | piezas existen; falta orchestrator | **SÍ** |

Cuello único: `no_pre_meeting_compose_orchestrator`.  
Clase: **MISSING_INFRASTRUCTURE** (compose, no motor conversacional).

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001`.

No Plaud. No contracts. No matrix. No SQL.

---

## Ejecución

- Rama: `audit/director-ia-production-conversation-gap-012` (≠ `main`).
- HEAD de partida: `e67b7c94 Merge branch 'docs/director-ia-taller-mayor-unidad-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, Plaud, commit, push, merge.
- Método: reconstrucción estática de `detectDirectorIaIntent` + `resolveConversationTurn` + `planDirectorIaQuestion` + ramas in-process de `askDirectorIa`. Tests **citados, no reejecutados**.

---

## Rating de madurez conversacional

| Dimensión | Veredicto | Evidencia |
|-----------|-----------|-----------|
| Semantic routing | Listo con límites | Variantes de los slices ya integrados entran por tokens, no por frase canónica. Hold-outs de junta / mayo-sin-IGF / «quién soy» no tienen intent. |
| Continuity 8–12 turnos | Listo con límites | 12/13 turnos de la prueba larga conservan planta y cargan pack fresco. 1 turno (`Volvamos a Puebla.`) clarifica y **no rompe** el siguiente standalone. |
| Cross-domain handoff | Listo con límites | trend → perfil (`profile_handoff_from_trend`); perfil → IGF standalone; IGF → reviewable standalone; reviewable → `taller_mayor` standalone. |
| Truthfulness | Parcial | Packs declaran unsupported / reviewable ≠ cancelar. IGF cerrado **no** etiqueta actual vs forecast. |
| Requery | Listo | Ningún loader reusa el pack anterior como hecho. |
| Graceful unknown | Parcial | Huecos de pack se declaran. «Quién soy» / junta aislada caen a clarificación de intent, no a «no hay directorio / no hay compositor». |

**No es `PRODUCTION_READY`:** routing no equivale a producción. Faltan semántica temporal IGF, datos (SEH, ingreso), compositor de junta, authz/despliegue y cobertura de módulos (52.5%).

**Tampoco es `PARTIALLY_READY`:** el motor ya sostiene hilo multi-dominio. Seguir inventando plumbing conversacional no es el cuello.

---

## Regresiones (no reelegidas)

Sin evidencia de regresión física. No se reabren.

| Slice | Pregunta | Planner aislado | Effective | GPT | Veredicto |
|-------|----------|-----------------|-----------|-----|-----------|
| Brief | ¿Cómo nos fue ayer? | `daily_executive_brief` 0.9 | brief | Sí | WORKS_NOW |
| Brief | ¿Qué te llama la atención? | `unknown` 0.35 / kind `attention` | inherit brief | Sí | WORKS_NOW |
| Trend | ¿Cómo vamos en CASA en los últimos 3 meses? | `commercial_trend` 0.9 | trend standalone | Sí | WORKS_NOW |
| Trend | ¿Y COMISIONISTAS? | `unknown` / `channel_switch` | inherit trend | Sí | WORKS_NOW |
| Trend | ¿Quién mueve la caída? | `unknown` | inherit trend | Sí | WORKS_NOW |
| Trend | Háblame del primero. | `unknown` | inherit + `wantsFirstMover` | Sí | WORKS_NOW |
| Profile | ¿Qué sabemos de él? | `unknown` / `pronoun` | `forceIntent client_profile` | Sí | WORKS_NOW |
| Profile | ¿Tiene acciones? | `unknown` / `action` | inherit / force profile | Sí | WORKS_NOW |
| Reviewable | ¿Qué apoyos todavía puedo revisar? | `igf_reviewable_supports` 0.9 | reviewable standalone | Sí | WORKS_NOW |
| Taller Mayor | ¿Qué unidades tienen Taller Mayor? | `taller_mayor` 0.88 | taller standalone | Sí | WORKS_NOW |
| Topic return | volvamos / retomemos a un `previous_frame` nombrable | inherit + restore | — | — | WORKS_NOW (objeto parked) |
| Cross-metric | ¿Y la venta? / ¿Y el descuento? (no en esta cadena) | — | — | — | WORKS_NOW (no reelida) |
| Action-person | ¿Qué pasó con la acción de Julio Pérez? (no en esta cadena) | — | — | — | WORKS_NOW (no reelida) |

---

## Conversación larga (13 turnos)

Planta de request = Puebla (`planta_id` del body). No hay switch de planta. Requery = pack fresco en cada loader. GPT = una llamada por turno de negocio si `AI_ENABLED`.

| # | Pregunta | Planner aislado | Kind | Effective | Plant | Date/range | Entity | previous_frame | Requery | Evidence | GPT | Limitations |
|---|---------|-----------------|------|-----------|-------|------------|--------|----------------|---------|----------|-----|-------------|
| 1 | ¿Cómo nos fue ayer? | `daily_executive_brief` 0.9 | other | **brief** standalone | request | ayer CDMX | — | null | sí | venta + desc/kg | sí | no causalidad; no ingreso diario |
| 2 | ¿Qué te llama la atención? | `unknown` 0.35 | attention | inherit **brief** | same | same date | — | null | sí | mismos bloques frescos | sí | GPT sintetiza; no umbral |
| 3 | ¿Cómo vamos en CASA en los últimos 3 meses? | `commercial_trend` 0.9 | other | **trend** standalone | same | 90d / CASA | — | **brief** | sí | serie + OLS + movers | sí | mover ≠ causa; sin comments |
| 4 | ¿Y COMISIONISTAS? | `unknown` | channel_switch | inherit **trend** | same | 90d / COM | — | brief | sí | motor fresco, canal destino | sí | no reusa SUM del turno 3 |
| 5 | ¿Quién mueve la caída? | `unknown` | other | inherit **trend** | same | same | — | brief | sí | top movers | sí | contribución ≠ causa |
| 6 | Háblame del primero. | `unknown` | other | inherit **trend** + first mover | same | same | **cliente_key** | brief | sí | same pack + entity | sí | no silent pick si empate |
| 7 | ¿Qué sabemos de él? | `unknown` | pronoun | **client_profile** handoff | same | 3M calendario | same client | **trend** | sí | kg + desc/kg + comments/DICF | sí | ingreso = UNSUPPORTED |
| 8 | ¿Tiene acciones? | `unknown` | action | inherit **profile** | same | 3M | same client | trend | sí | acciones DICF keyed | sí | AR board no tiene `cliente_key` |
| 9 | Volvamos a Puebla. | `unknown` | topic_return | **CLARIFY** out_of_slice | same | — | se conserva | se conserva | no | 0 loaders | no | ver abajo |
| 10 | ¿Cómo proyectamos cerrar el IGF? | `igf_status` 0.9 | other | **igf_status** standalone | same | YYYY-MM CDMX (abierto) | — | FE puede conservar profile | sí | annex última versión | sí | **no** open/closed; **no** as-of; path genérico **no escribe** `conversation_state` |
| 11 | ¿Qué apoyos todavía puedo revisar? | `igf_reviewable_supports` 0.9 | other | **reviewable** standalone | same | `mes_cargo` actual | — | captura profile/IGF | sí | Folios + eligibility | sí | reviewable ≠ cancelar |
| 12 | ¿Qué unidades tienen Taller Mayor? | `taller_mayor` 0.88 | other | **taller_mayor** standalone | same | mes CDMX / `mes_cargo` | lista; sin silent Folio | reviewable parked | sí | unidades agrupadas | sí | no económico/placa |
| 13 | Háblame de la más costosa. | `unknown` 0.35 | other | inherit **taller_mayor** | same | same period | ver residual | reviewable | sí | lista fresca ordenada por SUM | sí | view `list` (no `rank_highest`) |

### Turno 9 — el único roce estructural

`Volvamos a Puebla.` es `topic_return` con cue `{ kind: "name", name: "Puebla" }`.

`frameMatchesReturnCue` compara el nombre contra `active_entities.display`, **no** contra la planta del request. El frame actual es `client_profile` (cliente). El `previous_frame` es `commercial_trend` (cliente o vacío). Ninguno se llama «Puebla».

Como el parent es inheritable y no hay match:

- `restore_previous` = false
- `stay_on_current` = false
- `out_of_slice_clarify` = true
- respuesta plantilla: cambio de tema fuera del hilo
- estado **se preserva** (`preserveFramesOnClarify`)

No es regresión de topic return. Topic return **sí** restaura un objeto parked (venta, descuento, expediente, «lo anterior», nombre de cliente). **No** interpreta el nombre de la planta como «salir al nivel planta».

El turno 10 (`igf_status` standalone, conf ≥ 0.55) **recupera**. El sustrato no se cae.

Clase: límite residual de **STRUCTURAL CONVERSATION**. No es el cuello: no impide IGF / reviewable / Taller.

### Residual Taller — «la más costosa»

`namesHighestAmount` exige token de monto (`importe` / `monto` / `apoyo` / `suma`) **y** ranking. «costosa» no califica → `resolveView` = `list` si aún no hay `active_unit`.

El inherit **sí** ocurre (`isolatedUnknown` + parent `taller_mayor`). El pack va **ordenado por `SUM(importe)`**. GPT puede hablar de la unidad tope desde evidencia. No hay silent Folio.

No se reelige Taller Mayor. Residual de wording, no read model ausente.

---

## Caso A — IGF mes cerrado

### Planner

| Pregunta | Intent | GPT |
|----------|--------|-----|
| ¿Cómo proyectamos cerrar el IGF? | `igf_status` 0.9 | Sí (annex) |
| ¿Cómo cerró mayo? | `unknown` 0.35 | No |
| ¿Cuál era la proyección de mayo? | `unknown` 0.35 | No |
| ¿Cómo cerró mayo realmente? | `unknown` 0.35 | No |
| ¿Cómo cerró el IGF de mayo? | `igf_status` 0.9 | Sí, **misma** semántica de forecast vigente |

Sin la palabra IGF, no entra. No es phrasebook de producto; es señal de dominio (`/\bigf\b/`).

### Temporal / actual / forecast

| Campo | Hecho |
|-------|--------|
| Resolver | `resolveYearMonthFromQuestion`: token `mayo` → month=5; «pasado» / «realmente» **ignorados**. Year = CDMX corriente. En 2026-08 acierta 2026-05 |
| Snapshot chat | `loadIgfCommitSnapshot`: `igf.versions` GLOBAL `ORDER BY version_number DESC LIMIT 1` |
| Etiqueta | «IGF — COMPROMISO / MARGEN (**versión más reciente del mes**)» |
| Corte dashboard | `isIgfMesCerradoPorCorte` / `version_as_of_corte` en `server.js`. **Chat no los llama** |
| Actual | Dashboard: corte posterior al mes → venta real. Chat: última versión como vigente. **No dice «mayo está cerrado»** |
| Forecast histórico as-of | `created_at` permitiría as-of **si** hubo versiones intra-mes. Chat no lista forecast-as-of. Correcto: no reconstruye forecast desde el actual. Tampoco lo expone |

Distinción pedida:

- **actual** — no está cableado en chat para mes cerrado.
- **forecast** — sí: última versión del mes pedido.
- **historical forecast availability** — dato posiblemente existente; **no** expuesto.
- **temporal semantics** — el número puede ser correcto y la etiqueta falsa (forecast leído como cierre).

**Answerability:** `TEMPORAL_SEMANTICS_GAP` (canónico con IGF) + routing gap (variantes sin IGF).  
**Clase:** DOMAIN / localized infrastructure. **No** STRUCTURAL CONVERSATION.

No se elige: el director **ya obtiene un snapshot** si nombra IGF. Falta verdad open/closed, no un objeto conversable nuevo.

---

## Caso B — Identidad autenticada

| Pregunta | Planner | Effective |
|----------|---------|-----------|
| Hola | `smalltalk` 0.95; early return **antes** del planner de negocio | Plantilla. **Sin GPT** |
| ¿Quién soy? | `unknown` 0.35 | Clarifica intent (o hereda el parent si hay hilo) |
| ¿Qué planta tengo autorizada? | `unknown` 0.35 | Igual |

| Campo | Hecho |
|-------|--------|
| JWT habitual | `actor_id`, `role`, `plantas_permitidas`. Authz **ya** filtra planta |
| `actor_nombre` | Solo `scope=seh` o `includeActorProfile` (`server.js` ~8248). Login dashboard **no** lo setea |
| `public.usuarios` | `nombre` / `nombre_persona`. **Sin** título Ing./Lic. |
| Chat | `_user` entra a `askDirectorIa` y solo alimenta scope de memoria persistente. **No** SELECT de usuario. **No** responde «quién soy» |

«Hola» usa la planta del request, no el nombre del actor.

¿Desbloquea algo estructural? Rol/planta **ya** gobiernan loaders (GA/GV abort). Un saludo con nombre **no** abre junta, IGF cerrado ni directorio. Inventar «Ing.» sería OVERPROGRAMMING.

**Answerability:** `PARTIALLY_WORKS`.  
**Clase:** presentación. Valor ejecutivo bajo. No se elige.

---

## Caso C — SEH

| Pregunta | Planner |
|----------|---------|
| ¿Quién lleva SEH en Puebla? | `unknown` 0.35 |
| ¿Cuál es su teléfono? | `unknown` 0.35 |
| ¿Quién es el responsable de Seguridad e Higiene en Puebla? | `responsible_lookup` 0.88 → handler AR, **no** cargo org |

| Fuente | ¿Directorio de persona? |
|--------|-------------------------|
| `seh-equipos.js` | Equipos/componentes. **No** |
| carpetas legales SEH | Documentos/vencimiento. **No** |
| Rol `SEH` | Clave de login. **No** «responsable SEH de Puebla» |
| `public.usuarios` | PII de login. **Sin** área/cargo SEH |

**Answerability:** `MISSING_PHYSICAL_DATA`.  
**Clase:** DOMAIN/DATA. **No** es problema del motor conversacional. No se elige. Un ARCH no puede encender un organigrama que no existe.

---

## Caso D — Ingreso real de cliente

`client_profile` ya marca:

- `income_actual: null`
- `income_status: "UNSUPPORTED_METRIC"`
- prompt: no usar fórmula DICF como actual; no poner 0

Fuentes comerciales (`arr.ventas_diarias_cliente`, DICF) tienen kg y descuento. El ingreso «real reconocido» **no** está almacenado. `ingreso_forecast` de DICF = fórmula, no actual.

**Answerability:** `UNSUPPORTED_METRIC`. Confirmado.  
**Clase:** DOMAIN/DATA. No se elige.

---

## Caso E — Preparación de junta (sin Plaud)

### ¿Las piezas existen?

| Pieza | ¿Existe? | Intent / loader |
|-------|----------|-----------------|
| Brief diario | Sí | `daily_executive_brief` |
| Tendencia | Sí | `commercial_trend` |
| Perfil cliente | Sí | `client_profile` |
| IGF proyección mes abierto | Sí | `igf_status` / annex |
| Apoyos reviewable | Sí | `igf_reviewable_supports` |
| Acciones | Sí | `action_status` / profile DICF |
| Taller Mayor | Sí | `taller_mayor` |
| Information gaps | Sí | `pending_information_gap` / limitations por pack |
| IGF mes **cerrado** actual | No (caso A) | — |
| Plaud / transcripción de junta | Fuera de alcance | — |

### ¿El compositor existe?

No. No hay intent, loader ni rama in-process de pre-meeting.

| Pregunta | Planner aislado | Si hay parent inheritable |
|----------|-----------------|---------------------------|
| ¿Qué debo llevar preparado para la junta de cierre? | `unknown` 0.35 → clarifica | **Hereda el parent** (brief, profile o Taller) y **no** compone los demás |
| ¿Qué preguntas probablemente nos harán? | `unknown` 0.35 | Igual |
| ¿Qué huecos de explicación tenemos? | `unknown` (no ancla `gap_what`) | Inherit de **un** pack; no junta multi-fuente |

`cierre` + `junta` **no** disparan reviewable (hace falta apoyo/folio/detener). Tampoco `plant_diagnosis` ni bitácora (exige la palabra `bitacora`).

### Determinación

Las capabilities actuales **sí** permiten componer un brief pre-junta **si** un orchestrator las llama en un turno: same plant, packs frescos, provenance/gaps **separados**, GPT sintetiza, limitations honestas (IGF cerrado = gap; ingreso = unsupported; SEH = missing data; Plaud = no ingerido).

Falta **solo** ese orchestrator / read model de compose. No falta otro objeto folio/unidad/cliente. No falta otro inherit.

Pedir la junta **aislada** hoy = clarificación. Pedirla **dentro** de un hilo = un solo dominio. Eso es el cuello de producción **después** de que la base conversacional ya sostiene cada pieza.

---

## STRUCTURAL CONVERSATION vs DOMAIN/DATA

| Fallo | Clase | ¿Predomina? |
|-------|-------|-------------|
| Pronombre / first mover / inherit / requery / Taller / reviewable | STRUCTURAL — **ya resuelto** | No |
| `Volvamos a Puebla` (nombre de planta ≠ topic) | STRUCTURAL residual | No (recupera en el siguiente standalone) |
| «más costosa» → view `list` | wording local | No |
| IGF cerrado actual vs forecast | DOMAIN / temporal | Sí, localizado |
| SEH directorio | DOMAIN / missing data | Sí, pero excluido |
| Ingreso real cliente | DOMAIN / unsupported | Sí, pero excluido |
| Junta de cierre | DOMAIN compose / missing orchestrator | **Sí — único cuello** |
| Identidad «quién soy» | presentación | No |

Estimación: los fallos que **bloquean una conversación de producción nueva** son de **dato o de capability de negocio**. El motor ya no es el cuello.

---

## Phrasebook

Las preguntas son **tests semánticos**. No se propone frase «junta de cierre» / «mayo pasado» / «Ing.» como switch de producto. El ARCH de junta debe detectar **preparación ejecutiva multi-fuente** (panorama para reunión / qué llevar / huecos transversales), no copiar las tres canónicas.

---

## Competencia de cuellos

| Caso | Frecuencia | Valor | Transversalidad | Data ready | Conversación | Selección |
|------|------------|-------|-----------------|------------|--------------|-----------|
| IGF mes cerrado | Media (cierre) | Alta financiera | Baja: un intent ya existe | Alta en versions + corte dashboard | Canónico ya da número | No |
| Identidad | Alta | Baja | Baja | Nombre en DB; título no | Cosmética | No |
| SEH | Baja | Media | Baja | **No hay directorio** | — | Excluido |
| Ingreso cliente | Media | Media | Baja | **No hay actual** | Profile ya declara unsupported | Excluido |
| Junta / pre-meeting | Alta en ciclo de cierre | Alta ejecutiva | Alta: **compone** 7 slices ya vivos | Alta en piezas; falta compose | Aislada = unknown | **GANADOR** |
| Topic return «Puebla» | Baja | Baja | Residual | — | Recupera | No |

No se eligió IGF cerrado: es semántica localizada, no un objeto que la conversación no puede empezar.  
No se eligió identidad: no abre junta ni cierre.  
No se inventa otro inherit/pronombre.

---

## Cuello único

**Nombre:** `no_pre_meeting_compose_orchestrator`  
**Clase:** `MISSING_INFRASTRUCTURE`  
**Caso:** `production_case_5_real_meeting_preparation`

### Qué rompe

«¿Qué debo llevar a la junta de cierre?» no arranca. No hay pack que junte brief, trend, cliente activo, IGF abierto, reviewable, acciones, Taller Mayor y huecos. El inherit de un parent **sustituye** la junta por un solo dominio.

### Dónde está físicamente

Piezas: `lib/director-ia-daily-executive-brief.js`, `director-ia-commercial-trend.js`, `director-ia-client-profile.js`, `director-ia-igf-arr.js`, `director-ia-igf-reviewable-supports.js`, `director-ia-action-person.js`, `director-ia-taller-mayor.js`, `derivePendingInformationGap`.  
Planner: `detectDirectorIaIntent` → `unknown` 0.35.  
Chat: sin rama in-process.  
Plaud: no ingerir.

### Qué desbloquea

Un read model de preparación de junta **read-only** que requerya packs existentes, same plant, provenance/gaps separados, GPT sintetiza, declara IGF cerrado / ingreso / SEH / Plaud como limitations.

### Qué NO soluciona

Cierre IGF actual vs forecast as-of; directorio SEH; ingreso real; saludo con nombre; Plaud; mutaciones; 52.5%; M5 COMPLETE.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001`

Alcance esperado (propuesta; no autorizada): source **B** compose de loaders ya integrados; routing **B** parent canónico nuevo; **sin** Plaud; **sin** inventar actual de mes cerrado; **sin** phrasebook.

STOP.
