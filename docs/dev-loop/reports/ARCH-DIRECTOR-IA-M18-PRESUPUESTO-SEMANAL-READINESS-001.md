# Reporte — ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M18 — Presupuestos semanales"
slice: "query JSON read-only del carro semanal (asignado / seleccionado / disponible / folios / urgentes)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"
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
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"
  - "server.js getPresupuestoResumen / getPresupuestoAbierto / getCurrentWeekMexico / enviarPresupuestoACheques (lectura)"
  - "lib/director-ia-capabilities.js, planner, tools, chat, m2-folio-status, m4, m6 (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se vieron tokens de dashboard WhatsApp en server.js; no se copian)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. El slice es PARTIAL previsto; no redefine COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia M18 ni 47.5%."
  - "Un IMPL futuro dejaría M18 PARTIAL y el global en 10.0/20 = 50.0%."
```

## Resumen ejecutivo

**READY.** Existe un path SELECT-only, in-process y separable de writes / cheques / WhatsApp para que Director IA consulte el **carro presupuestal semanal** de una planta y una semana determinada.

La lectura estructurada **sí puede extraerse** sin ejecutar ninguna operación posterior. `getPresupuestoResumen(client, presupuestoId)` hace solo dos SELECT y calcula:

| Campo | Origen físico |
|---|---|
| asignado | `presupuestos_semanales.monto_asignado` |
| seleccionado | `SUM(presupuesto_folios.importe)` |
| disponible | `Math.max(0, asignado - seleccionado)` (derivado; fórmula verificada en código) |
| folios | filas de `presupuesto_folios` |
| urgentes | conteo donde `prioridad` coincide `/urgente/i` |
| semana | `semana_inicio` + `semana_fin` de la fila |

**No** se usa `presupuesto_asignacion_detalle` (asignación mensual por categoría; otro dominio).

Semana: no se inventa. Identidad física = `(planta_id, semana_inicio, semana_fin)` UNIQUE. «Esta semana» = `getCurrentWeekMexico()` (regla de producto ya usada por `mi presupuesto`). Si el usuario no indica semana ni esa frase canónica: clarificar. Lookup **sin** filtrar solo `ABIERTO` (si no, un carro ya enviado a cheques desaparece).

Authz: JWT + `planta_id` + `plantas_permitidas` + fail-closed, mismo patrón que M2/M6 (`assertFolioStatusAccess`: GV 403; GG/GA/AD acotados). Cross-planta bloqueado.

Wiring hoy: intent `budget_status` y tool `get_budget_status` existen; executor `null`; `UNSUPPORTED_RULES.presupuestos` corta el chat. El IMPL debe quitar ese corte y cablear el loader.

Un IMPL futuro dejaría M18 en **PARTIAL** y el global en **10.0 / 20 = 50.0%**. COMPLETE sigue exigiendo writes / cheques / operación bot. Esta readiness: **0.0 pp**.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m18-presupuesto-semanal-readiness-001` (≠ `main`).
- HEAD: `4639ba42 Merge branch 'architecture/director-ia-global-next-module-prioritization-003'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003` (ganador M18 query) |
| Módulo | M18 — Presupuestos semanales |
| Propósito canónico | Solicitudes/asignación semanal de presupuesto (**carro**) |
| Estado actual | **NO INTEGRADA** |
| Global actual | **9.5 / 20 = 47.5%** |
| Si IMPL futuro | M18 **PARTIAL**; **10.0 / 20 = 50.0%** (+2.5) |
| COMPLETE | Sigue exigiendo writes, flujo a cheques, operación/acciones de presupuesto, WhatsApp/Twilio si forma parte del propósito canónico |

Esta tarea **no cambia** estados ni porcentaje.

---

## Definición canónica M18 / query-only = PARTIAL

Ficha vigente (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`):

- Director IA **no consulta** ninguna tabla `presupuesto_*`.
- Pregunta #17: «¿Cómo va el presupuesto semanal?» → No / NO INTEGRADA.
- Escritura: modificar presupuesto / enviar a cheques — ALTO.
- Dependencias inventariadas: Folios, WhatsApp (canal; **fuera** de este slice).

El slice de query **no** cubre el propósito canónico completo. Queda **PARTIAL**. No reinterpretar COMPLETE.

Fuera de este slice (siguen NO INTEGRADAS aunque el IMPL funcione):

- Asignar / reemplazar `monto_asignado`
- Ligar / quitar folios (`linkFoliosToPresupuesto`, DELETE `presupuesto_folios`)
- `enviarPresupuestoACheques` y transiciones `EN_PROCESO_CHEQUE` / `SOLICITANDO_PAGO`
- Solicitudes mensuales (`presupuesto_solicitudes` PRE-YYYYMM)
- Archivos S3 de solicitudes
- WhatsApp / Twilio
- `presupuesto_asignacion_detalle` / catálogo / línea detalle

---

## Fuentes físicas

### Carro semanal (IN — este slice)

`public.presupuestos_semanales` (DDL `server.js` ~2509):

| Columna | Uso |
|---|---|
| `id` | id del presupuesto / carro |
| `planta_id` | scope planta |
| `semana_inicio` / `semana_fin` | identidad de semana (`DATE`) |
| `monto_asignado` | **asignado** |
| `estatus` | `ABIERTO` / `EN_PROCESO_CHEQUE` / `CERRADO` / `CANCELADO` |
| `creado_por` / `creado_en` | auditoría |
| `enviado_cheques_por` / `enviado_cheques_en` | **no afirmar «cheque emitido»**; solo hechos de envío si se listan como metadata |
| `nota` | texto opcional |
| UNIQUE | `(planta_id, semana_inicio, semana_fin)` — **una fila por planta+semana** |

`public.presupuesto_folios` (DDL ~2525):

| Columna | Uso |
|---|---|
| `presupuesto_id` | FK al carro |
| `folio_id` | folio ligado |
| `numero_folio` | código |
| `importe` | importe **seleccionado** (copia al ligar) |
| `prioridad` | texto; **urgente** si contiene `URGENTE` |
| `ligado_por` / `ligado_en` | auditoría / orden FIFO |

`public.folios.presupuesto_id`: columna auxiliar del write. **No** es necesaria para el resumen (el join vive en `presupuesto_folios`).

### Fuera del carro (OUT)

| Tabla | Dominio real | ¿Slice? |
|---|---|---|
| `presupuesto_asignacion_detalle` | `periodo` YYYY-MM + `monto_aprobado` por categoría/subcategoría | **No.** «Disponible» de solicitudes ≠ carro. Duplicaría M4/M6 si se usa como semanal. |
| `presupuesto_catalogo` | catálogo planta/categoría | No |
| `presupuesto_linea_detalle` | líneas bajo subcategoría | No |
| `presupuesto_solicitudes` / `_counters` / `_archivos` / `_historial` | solicitudes PRE-YYYYMM (GA pide, GG aprueba) | No. Writes + WhatsApp. |
| `getPresupuestoEjercidoPorCategoria` | suma histórica de `presupuesto_folios` **todas** las semanas | No (no es el carro de una semana) |

---

## getPresupuestoResumen

Ubicación: `server.js` ~2953. **No** exportado. **No** hay lib Director IA.

```text
SELECT presupuestos_semanales WHERE id = $1
SELECT presupuesto_folios WHERE presupuesto_id = $1
  ORDER BY urgente primero, luego ligado_en ASC
asignado     = Number(monto_asignado) || 0
seleccionado = SUM(importe de la lista)
disponible   = Math.max(0, asignado - seleccionado)
urgentes     = count(prioridad matches /urgente/i)
```

| Pregunta | Respuesta |
|---|---|
| ¿SELECT-only? | **Sí.** Ningún INSERT/UPDATE/DELETE. |
| ¿Side effects? | Ninguno. |
| ¿Authz interna? | No. Recibe `presupuestoId`; el caller debe haber autorizado planta. |
| ¿HTTP interno? | No. |
| ¿Twilio? | No. |
| ¿Reutilizable? | **Sí**, extraído a lib (mismo patrón M4/M6). No invocar `server.js` por HTTP. |
| ¿Shape incompleto? | El SELECT trae `folio_id`; el `map` de `lista` lo **omite**. El loader debe exponer `folio_id`. |

`getPresupuestoAbierto` (~2936): SELECT de la fila `ABIERTO` por planta+semana. Si faltan fechas, **rellena** con `getCurrentWeekMexico()`. Es el lookup del bot para **operar** el carro abierto. **No** es el lookup único de Director IA: ocultaría `EN_PROCESO_CHEQUE` / `CERRADO`.

---

## Semántica de semana

No existe columna «semana activa» ni `year/week` ISO. Identidad = fechas.

| Concepto | Hecho físico |
|---|---|
| Identificador | `presupuestos_semanales.id` + par `(semana_inicio, semana_fin)` |
| Inicio / fin | `DATE`; producto trata lunes→domingo |
| Semana actual (producto) | `getCurrentWeekMexico()` (~2746): día calendario UTC → lunes; domingo = lunes+6. Comentario dice «zona México»; el código usa **UTC**, no `America/Mexico_City`. El IMPL **reutiliza** la función; no «corrige» TZ. |
| Default bot lectura | `mi presupuesto` → semana actual + solo `ABIERTO` |
| Default si fechas vacías | solo dentro de `getPresupuestoAbierto` |
| Si no hay fila | `null`; el bot **no crea** al consultar |

### Resolución para Director IA (sin inventar)

1. Fechas explícitas (`YYYY-MM-DD` lunes, o par inicio/fin) → lookup exacto.
2. Frase canónica «esta semana» / «semana actual» / pregunta #17 «presupuesto semanal» **sin otra fecha** → `getCurrentWeekMexico()` (regla de producto de `mi presupuesto`, no invención).
3. Cualquier otra formulación ambigua («presupuesto de marzo», varias semanas) → **clarificar**. No default silencioso.
4. Sin fila → `DATA_NOT_FOUND`. No INSERT.
5. Lookup: `WHERE planta_id = $1 AND semana_inicio = $2 AND semana_fin = $3` **sin** `estatus = ABIERTO`. Reportar `estatus`.
6. UNIQUE garantiza a lo sumo una fila por planta+semana.

---

## Semántica presupuestal

| Término | Definición física | No es |
|---|---|---|
| **asignado** | `monto_asignado` (observado) | aprobado IGF; `monto_aprobado` mensual |
| **seleccionado** | suma de `presupuesto_folios.importe` | pagado; cheque emitido |
| **disponible** | `max(0, asignado - seleccionado)` | saldo de solicitudes; cumplimiento IGF; faltante/desviación |
| **folios** | filas ligadas al `id` | todos los folios de la planta |
| **urgente** | `prioridad` ~ `/urgente/i` (copiada al ligar) | inferencia por monto, edad o estatus |
| **estatus carro** | `ABIERTO` / `EN_PROCESO_CHEQUE` / `CERRADO` / `CANCELADO` | «ya pagado» |

`enviado_cheques_en` es un timestamp de **envío del paquete**, no emisión de cheque (M2). El slice puede reportar `estatus`; **no** afirmar pagado / cheque emitido / aprobado / causa.

---

## Folios del carro

Soportado por `presupuesto_folios`: `folio_id`, `numero_folio`, `importe`, `prioridad` (urgente), `ligado_por`, `ligado_en`.

No hace falta join a `folios` para el resumen. Estatus del folio **no** está en `presupuesto_folios`; no afirmar etapa M2 desde este slice salvo que un IMPL futuro haga join explícito (fuera del mínimo).

0 folios / 0 asignado / `importe` null: el helper ya trata `Number(...) || 0`. Determinístico.

---

## Authz / scope planta

| Superficie | Hecho |
|---|---|
| Chat Director IA | JWT dashboard (`req.dashboardAuth`) |
| Ficha M18 | «Roles GG / avance etapa» (operación write del bot) |
| Lectura WhatsApp `mi presupuesto` | actores con planta (GG/GA); CDMX/ZP eligen planta |
| Patrón ya integrado | `assertFolioStatusAccess` (M2/M4/M6): GV 403; GG/GA/AD + `plantas_permitidas`; planta obligatoria |

**Prescribible sin contrato nuevo:**

- JWT obligatorio
- `planta_id` obligatorio (sin fallback a 6 plantas)
- `plantas_permitidas` fail-closed
- cross-planta bloqueado
- GV 403 (igual que folios)
- GA: permitido **solo** si la planta está en `plantas_permitidas` (igual M6). No ampliar a catálogo global.
- CDMX/ZP/AD: solo plantas autorizadas en el token
- No `priv_clave` de chat
- No roles inventados «solo GG puede leer»

---

## Planner / tools / chat

| Pieza | Estado |
|---|---|
| Intent `budget_status` | Existe (`planner.js` ~255). Regex: `presupuesto semanal` o `presupuesto` + `semana\|semanal\|carro\|carrito`. |
| Capability `presupuestos` | `coverage: none`, `canRead: false` |
| Tool `get_budget_status` | `declared_not_integrated`, `executor: null`, `requiredInputs: ["planta_id"]` |
| `UNSUPPORTED_RULES.presupuestos` | **Corta el chat** antes del planner (`askDirectorIa` ~2481) |
| Rama chat `budget_status` | **No existe** (a diferencia de M3/M4/M6) |
| Inputs registry | No hay `semana`; M4/M6 parsean periodo desde `question`. Mismo patrón. |

El IMPL debe: (1) dejar de detectar `presupuestos` como no integrado para este wording; (2) rama `budget_status` → loader; (3) tool `available_on_demand` + executor nombrado; (4) capability `canRead: true` / coverage partial **solo en la tarea de sync documental posterior**, no en este readiness.

Preguntas que siguen bloqueadas: cheques, pólizas, PDF/S3, Taller AT, COMPARAR/Excel, enviar a cheques, asignar presupuesto.

---

## Boundary cheques

`enviarPresupuestoACheques` (~3112): UPDATE carro → `EN_PROCESO_CHEQUE`; UPDATE folios → `SOLICITANDO_PAGO`. Solo CDMX en WhatsApp.

**No es necesaria** para producir el resumen. `getPresupuestoResumen` no la llama.

Tablas de cheque / `numero_cheque` = M2, fuera.

---

## Boundary WhatsApp / Twilio

`mi presupuesto`, `asignar presupuesto`, `enviar a cheques`, `carrito`, notificaciones `sendWhatsApp` a GG/GA: **canal**. El SELECT no depende de Twilio. El slice no envía nada.

`mi_semana` del dashboard de folios (M3 filters) **no** es el carro M18.

---

## Boundary writes (separables)

| Función | Mutación | ¿Hace falta para leer? |
|---|---|---|
| `createOrUpdatePresupuesto` | INSERT/UPDATE `monto_asignado` | No |
| `linkFoliosToPresupuesto` | INSERT `presupuesto_folios` + UPDATE folio `SELECCIONADO_SEMANA` | No |
| quitar carrito | DELETE `presupuesto_folios` + UPDATE folio | No |
| `enviarPresupuestoACheques` | UPDATE estatus + folios | No |
| aprobar/rechazar PRE-* | UPDATE `presupuesto_solicitudes` + WhatsApp | No |
| `getPresupuestoSeleccionadoConLock` | `FOR UPDATE` | No (lock de write) |

La lectura está en funciones distintas. Separable.

---

## Tabla de evidencia

| surface | helper_or_route | physical_source | query_type | select_only | side_effects | week_semantics | budget_semantics | authz | plant_scope | safe_fields | external_dependency | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Resumen carro | `getPresupuestoResumen` | `presupuestos_semanales` + `presupuesto_folios` | SELECT + suma | **sí** | ninguno | fechas de la fila | asignado/seleccionado/disponible | ninguna (caller) | `planta_id` en fila | sí, si no se afirma cheque/pagado | no | **sí** | shape omite `folio_id` | `server.js` 2953–2987 |
| Lookup abierto | `getPresupuestoAbierto` | `presupuestos_semanales` | SELECT | sí | default semana si faltan fechas | solo `ABIERTO` | id/monto | ninguna | planta+semana | parcial | no | **no como lookup único** | oculta no-ABIERTO | 2936–2950 |
| Semana actual | `getCurrentWeekMexico` | calendario UTC | n/a | n/a | no | lunes–domingo | n/a | n/a | n/a | sí si se declara la regla | no | **sí** (no reescribir TZ) | comentario ≠ TZ real | 2746–2756 |
| Asignación mensual | `queryPresupuestoDetallePorPlanta` / seeds | `presupuesto_asignacion_detalle` | SELECT | sí | no | `YYYY-MM` | `monto_aprobado` | n/a | planta+periodo | no para M18 carro | no | **no este slice** | colisión M4/M6 | 1670+ / 2551 |
| Ejercido por categoría | `getPresupuestoEjercidoPorCategoria` | todas las semanas | SELECT agregada | sí | no | sin semana | no es carro | n/a | plantas | no | no | **no** | mezcla semanas | 2991–3005 |
| Ligar folios | `linkFoliosToPresupuesto` | `presupuesto_folios` + `folios` | INSERT/UPDATE | **no** | sí | n/a | write | bot | planta | n/a | no | no | C | 3068 |
| Enviar cheques | `enviarPresupuestoACheques` | carro + folios | UPDATE | **no** | sí | n/a | write | CDMX | planta | n/a | no | no | C | 3112 |
| `mi presupuesto` | WhatsApp | helpers de lectura | SELECT vía helpers | sí (esa rama) | `sendWhatsApp` en otras ramas | semana actual + ABIERTO | muestra el resumen | actor/planta | 1 planta | canal | **Twilio** | no (canal) | no copiar canal | 19027–19057 |
| Capability/tool | planner + tools + UNSUPPORTED | n/a | n/a | n/a | corta chat | n/a | n/a | JWT chat | `planta_id` | n/a | no | wiring a completar | SOURCE_NOT_INTEGRATED | capabilities 221; tools 255; chat 2481 |

---

## Tabla de gaps

| gap_id | missing_capability | required_for_query_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Loader Director IA | sí | `getPresupuestoResumen` | Extraer SELECT a `lib/director-ia-m18-presupuesto-semanal.js` (`loadPresupuestoSemanalForChat`) | no | no | no | media | no |
| G2 | Lookup sin filtro ABIERTO | sí | SELECT por planta+fechas | No reutilizar `getPresupuestoAbierto` como único lookup | no | no | no | baja | no |
| G3 | Resolver semana | sí | `getCurrentWeekMexico` + parse `question` | Fechas explícitas / «esta semana» / clarificar | no | no | no | media | no |
| G4 | Authz wrapper | sí | `assertFolioStatusAccess` + `requirePlantaId` | Mismo fail-closed M2/M6 | no | no | no (reusa) | baja | no |
| G5 | Wiring chat | sí | intent `budget_status` | Rama in-process; quitar `UNSUPPORTED_RULES.presupuestos` para este wording | no | no | no | media | no |
| G6 | Tool executor | sí | `get_budget_status` | `executor: loadPresupuestoSemanalForChat`; status on-demand | no | no | no | baja | no |
| G7 | `folio_id` en shape | sí (contrato de evidencia) | columna ya en SELECT | Incluir en el map | no | no | no | baja | no |
| G8 | Sync matriz | no (otra tarea) | ficha M18 | NO INTEGRADA → PARTIAL en DOCS posterior | no | no en IMPL | no | baja | no |
| G9 | Cheques/WhatsApp/writes | no | n/a | Quedan fuera | no | no | no | n/a | no |

Ningún gap bloquea READY.

---

## Hipótesis de implementación (no implementada)

```text
pregunta presupuesto semanal / carro
  → UNSUPPORTED_RULES.presupuestos ya no corta este wording
  → intent budget_status
  → tool get_budget_status + executor loadPresupuestoSemanalForChat
       → JWT; planta_id; assertFolioStatusAccess; plantas_permitidas; no WhatsApp
       → semana: explícita | getCurrentWeekMexico si «esta semana»/pregunta #17 | si no, clarificar
       → SELECT presupuestos_semanales (planta + fechas, sin forzar ABIERTO)
       → si no hay fila: DATA_NOT_FOUND (no INSERT)
       → getPresupuestoResumen(id)  // SELECT-only
       → evidencia: id, planta, semana_inicio/fin, estatus, asignado, seleccionado,
            disponible, numFolios, urgentes, folios[{folio_id, numero_folio, importe, prioridad}]
       → no envío a cheques; no UPDATE; no presupuesto_asignacion_detalle
  → openai_called false
```

In-process. Sin HTTP interno. Sin Twilio. Sin contrato nuevo.

### Campos permitidos vs prohibidos

**Si la fuente lo soporta:** `presupuesto_semana_id`, `planta_id`, `semana_inicio`, `semana_fin`, `estatus`, `asignado`, `seleccionado`, `disponible`, `numFolios`, `urgentes`, `folios[]` (`folio_id`, `numero_folio`, `importe`, `prioridad`), `source`.

**Prohibido afirmar:** pagado, cheque emitido, aprobado (IGF/solicitud), faltante presupuestal, desviación, causa, urgente inferido, semana inventada, «disponible» de `presupuesto_asignacion_detalle`.

---

## Tests a diseñar (si se autoriza IMPL)

- planta autorizada / no autorizada / `plantas_permitidas` / cross-planta / GA / GV 403
- semana explícita / «esta semana» / ausente→clarificar / inválida
- asignado / seleccionado / disponible (`max(0, a-s)`) / 0 folios / 0 asignado / null importe
- folios + `folio_id` + importe + urgentes por `prioridad` (no por monto)
- carro `ABIERTO` y `EN_PROCESO_CHEQUE` (ambos visibles; no solo ABIERTO)
- sin fila → not found (no INSERT)
- intent `budget_status` + tool/executor + chat wiring
- no llama `enviarPresupuestoACheques` / `linkFoliosToPresupuesto` / `sendWhatsApp`
- no HTTP interno; no `presupuesto_asignacion_detalle`
- M18 sigue PARTIAL (no COMPLETE)

---

## Gates

| Gate | Esta tarea | IMPL futuro |
|---|---|---|
| G1 | Autorizado (esta readiness) | Requiere G1 **nuevo** |
| G2 | N/A | N/A (no cambia arquitectura; extrae SELECT existente) |
| G3 | N/A | N/A (no contrato nuevo; COMPLETE no se redefine) |
| G8 | N/A | N/A |

---

## Estado / porcentaje

| | Esta readiness | Tras IMPL futuro (si se autoriza y funciona) |
|---|---|---|
| M18 | NO INTEGRADA | **PARTIAL** |
| Global | **9.5 / 20 = 47.5%** | **10.0 / 20 = 50.0%** |

COMPLETE de M18 **fuera**. Esta tarea: **0.0 pp**.

---

## Riesgos (para el IMPL)

- Usar `getPresupuestoAbierto` y declarar «no hay presupuesto» cuando el carro ya fue a cheques.
- Default silencioso de semana en preguntas ambiguas.
- «Corregir» TZ de `getCurrentWeekMexico`.
- Meter `presupuesto_asignacion_detalle` como si fuera el carro.
- Afirmar pagado / cheque / aprobado / desviación.
- Inferir urgente por monto o estatus.
- Copiar writes, `FOR UPDATE`, o `sendWhatsApp`.
- HTTP interno a `server.js`.
- Marcar COMPLETE.
- Ampliar GA/GV más allá de `assertFolioStatusAccess`.

### Dependencias

Tablas `presupuestos_semanales` + `presupuesto_folios`. Helpers a extraer de `server.js`. Pool + JWT ya usados por Director IA. Sin S3, sin Twilio, sin cheques.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001`

El gap está verificado: SELECT-only separable, semana resoluble sin inventar, fórmulas físicas, authz reutilizable, writes/cheques/WhatsApp fuera.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 47.5% ni el estado de M18.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none (tokens de dashboard en ramas WhatsApp de `server.js`; no se copian)

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m18-presupuesto-semanal-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
