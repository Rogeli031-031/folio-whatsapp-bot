# Reporte — AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
implementation: false
north_star_met: false
single_bottleneck: "no_daily_executive_brief"
failure_class: "MISSING_INFRASTRUCTURE"
phrasebook_proposed: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This audit does not measure modules."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-008.md"
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
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-discount.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/dashboard-auth.js"
  - "lib/seh-equipos.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. Director IA ya puede seguir un hilo **si el usuario nombra el módulo o la métrica**. En producción el ejecutivo **no** llega así.

La pregunta real más frecuente —«¿Cómo nos fue ayer?» y variantes semánticas— **no abre nada**.

Hecho físico (planner aislado, 2026-08-24):

| Pregunta | intent | conf |
|----------|--------|------|
| ¿Cómo nos fue ayer? | `unknown` | 0.35 |
| ¿Qué tal nos fue ayer? | `unknown` | 0.35 |
| Dame el resumen de ayer. | `unknown` | 0.35 |
| ¿Qué pasó ayer? | `unknown` | 0.35 |
| ¿Cómo cerramos ayer? | `unknown` | 0.35 |
| ¿Algo importante de ayer? | `unknown` | 0.35 |
| ¿Cómo estuvo la venta ayer? | `daily_sales_deviation` | 0.92 |

`askDirectorIa` L2945–2954: `unknown` sin inherit → `buildUnknownClarificationResult`. **GPT no corre.** No se carga venta. No se carga descuento/kg. El usuario debe **adivinar** qué métrica se movió.

Los packs diarios **ya existen**. Falta el brief que los inspeccione sin que el usuario nombre venta o descuento.

**Cuello único:** `no_daily_executive_brief`  
**Clase:** `MISSING_INFRASTRUCTURE`

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`.

Las frases canónicas son **intents de prueba**, no phrasebook. Ninguna está hardcoded en `lib/`.

---

## Ejecución

- Rama: `audit/director-ia-production-conversation-gap-008` (≠ `main`).
- HEAD: `5d52a868 Merge branch 'docs/director-ia-igf-reviewable-supports-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.

---

## Caso 1 — Daily executive brief

**Intent de prueba:** «¿Cómo nos fue ayer?» y hold-outs (qué tal / resumen / qué pasó / cómo cerramos / algo importante).

| Traza | Runtime |
|-------|---------|
| Planner aislado | `unknown` 0.35 `no_rule_matched` en **todas** las variantes. |
| Effective intent | `unknown`. Sin inherit en primer turno. |
| Coverage guard | No aplica (no hay dominio). |
| State / parent | Vacío. `active_date` no se crea. |
| Plant | Autorizada en el request; **no se usa**. |
| Period | Ayer CDMX es resoluble (`currentYearMonthCdmx` / loaders diarios); **no se resuelve**. |
| Entity | Ninguna. |
| Sources físicas | `arr.ventas_diarias_cliente`; `arr.descuentos_diarios_cliente` + kg; DICF/comments por `cliente_key`. Ingreso diario **no** existe. |
| Sources cargadas | **Ninguna.** |
| Evidence → GPT | No. Early return de clarificación. |
| Limitations | El usuario no nombra venta/descuento. |
| GPT | No. |
| Failure | `isDailySalesDeviationQuestion` exige `ayer` **y** `venta`/`vendi*`. `isDailyDiscountDeviationQuestion` exige `ayer` **y** `descuento`. No hay compositor de brief. |

Gate: `namesDailySalesMetric` / `namesDailyDiscountMetric` en `lib/director-ia-planner.js` L103–122.

**Answerability:** `MISSING_READ_MODEL` (no hay brief) + `ROUTING_GAP` (ayer solo no abre packs existentes).

Hold-out que **sí** funciona: «¿Cómo estuvo la venta ayer?» → pack de kg. El ejecutivo que no sabe si bajó la venta o subió el descuento **no puede empezar**.

No se debe inventar ingreso diario. Contribución ≠ causa (regla ya vigente de los packs diarios).

---

## Caso 2 — Cliente mayor volumen, 3 meses, qué sabemos

**Intent de prueba:** perfil longitudinal del top cliente de Puebla.

| Traza | Runtime |
|-------|---------|
| Planner | Pregunta compuesta → `unknown` 0.35. «¿Quién es el cliente más grande de Puebla?» → `unknown`. «¿Cuánto nos compró en los últimos 3 meses?» → `unknown`. |
| Effective intent | Clarificación. Sin inherit. |
| Sources físicas | `arr.ventas_diarias_cliente` (agregable a mes); `arr.descuentos_diarios_cliente`; `arr.dicf_cliente_mes` (`kg_mes_real`, `ingreso_forecast` de **un** mes cacheado); comentarios/acciones por `cliente_key`. |
| Sources cargadas | Ninguna en este wording. |
| Packs existentes | `expediente_comercial`: **un** cliente **nombrado**, **una** fila DICF. `plant_diagnosis` materialidad: top-5 `kg_mes_real` del mes vigente, no serie de 3 meses. `loadTopClientesDescBrief`: top por **\|desc/kg\|**, no por volumen. M9: **planta**, 2 meses, no cliente. |
| Failure | No hay selector de top cliente por kg homogéneo + no hay read model longitudinal de 3 meses + no hay join mensual descuento/ingreso por `cliente_key` en Director IA. |

**Answerability:** `MISSING_INFRASTRUCTURE`.

Límite de verdad: descuento↑ + volumen↑ ≠ el descuento causó el volumen. Comments ≠ causa. Acciones ≠ outcome.

Si el usuario **nombra** al cliente, el expediente da «qué sabemos» del mes cacheado. Eso no es el pack pedido.

---

## Caso 3 — Unidades Puebla, Taller Mayor, este mes

**Intent de prueba:** unidades con folios Taller Mayor + detalle.

| Traza | Runtime |
|-------|---------|
| Planner | Las 4 variantes → `unknown` 0.35. |
| Por qué no M5 | `isM5TallerAtQuery` exige `taller` **y** (`AT-15` / `unidad` **singular** / token). «unidades» plural no coincide `\bunidad\b`. «carros» no. «reparación mayor» sin `taller` no. |
| Si M5 abriera | `loadTallerAtForChat` exige `YYYY-MM` en el texto. «este mes» **no** se resuelve. Sin periodo: error `missing_period`. SQL: `categoria LIKE '%TALLER%'`. **No** filtra tipo MAYOR. `expandTallerRows` clasifica MAYOR en Excel; Director IA no aplica ese filtro. |
| Sources físicas | `public.folios.unidad`, `categoria`, `subcategoria`, `importe`, `estatus`, `concepto`, `mes_cargo`, `planta_id`. Relación folio↔unidad es la columna `unidad`. |
| Sources cargadas | Ninguna. |
| Reviewability | No se invoca. |

**Answerability:** `ROUTING_GAP` + hueco de read model (Taller Mayor / «este mes» / agrupación por unidad). La relación física folio–unidad **sí** existe. No hay que inventarla.

---

## Caso 4 — «Hola» / identidad autenticada

| Traza | Runtime |
|-------|---------|
| Planner | `smalltalk` 0.95 (`smalltalk_exact`). «Buenos días» igual. |
| Effective | Early return L2872–2893. |
| GPT | No. |
| Answer | `buildConversationalAnswer`: «Hola, soy Director IA para la planta {label}.» Hardcoded. |
| Identity física | JWT puede traer `actor_nombre` (`createDashboardToken`; login L8248: `nombre \|\| nombre_persona`). `public.usuarios`: `nombre`, `nombre_persona`, `telefono`, `email`, `rol_id`. **No** hay columna de título profesional (Ing./Lic.). |
| Identity usada | `_user` del chat es ignorado (`askDirectorIa(..., _user)`). `dashboardAuth.actor_nombre` **no** entra al saludo. |

**Answerability:** `MISSING_INFRASTRUCTURE` (saludo no lee identidad). Título «Ing.» sería `MISSING_PHYSICAL_DATA` si se inventara.

No hardcodear Zaragoza ni ningún nombre.

---

## Caso 5 — SEH / responsable / teléfono

| Traza | Runtime |
|-------|---------|
| «¿Quién es el responsable de Seguridad e Higiene en Puebla?» | `responsible_lookup` 0.88. |
| «¿Quién lleva SEH en Puebla?» / «Dame el contacto de SEH Puebla.» | `unknown` 0.35. Acrónimo SEH **no** está en `AR_TEMAS_RE`. |
| «¿Cuál es su teléfono?» | `unknown` 0.35. No hereda directorio. |
| Handler | `responsible_lookup` **no** tiene rama in-process ni tool. Cae al dump AR + GPT (`buildDirectorIaContextPayload`). |
| Qué carga | Action Register: personas con **acciones** cuyo tema matchea `seguridad`. Eso no es el organigrama SEH. |
| Teléfono / correo | `public.usuarios.telefono` / `email` existen (WhatsApp/DICF). Director IA **no** los selecciona en este path. Historial de folio tiene `actor_telefono` de eventos, no directorio. |
| Módulo SEH | `lib/seh-equipos.js`, carpetas legales, JWT `scope: "seh"`. Es **equipo/cumplimiento**, no directorio de responsable por planta. No hay tabla `seh_responsable`. |

**Answerability:** `MISSING_PHYSICAL_DATA` (no hay directorio organizacional SEH) + routing AR que puede **nombrar a quien tiene una acción de seguridad** como si fuera «el» responsable. Teléfono: dato de usuario existe; **no** está cableado; privacidad/authz no resuelta.

Hold-out «SEH» demuestra que ni el tema AR se abre sin la palabra «seguridad» + «responsable».

---

## Caso 6 — IGF mayo pasado (mes cerrado)

Hoy de auditoría: **2026-08-24**. Mayo 2026 está cerrado.

| Traza | Runtime |
|-------|---------|
| «…proyección… IGF final de Puebla de mayo pasado» | `igf_status` 0.9 (`igf_keyword`). |
| Periodo | `resolveYearMonthFromQuestion`: token `mayo` → month=5; year=2026 (fallback CDMX). «pasado» **no** se interpreta. En agosto 2026 coincide con mayo cerrado. En enero fallaría. |
| Loader | `loadIgfCommitSnapshot`: última `igf.versions` GLOBAL del mes + **una** fila `igf.compromiso_lines`. Misma semántica que el mes abierto. |
| Closed vs forecast | **No** hay flag `is_current_open_month` en `igf_status`. Overlay live **no** corre aquí. No hay almacén de «qué proyectábamos a mitad de mayo». |
| «¿Entonces cómo cerró mayo realmente?» | `unknown` 0.35 (sin palabra IGF). Si el parent fuera `igf_status` (no inheritable), **tampoco** hereda. |
| «¿Qué proyectábamos durante mayo?» | `unknown`. Reconstruir forecast histórico desde el número final está **prohibido** y el runtime no lo intenta. |

**Answerability:** `TEMPORAL_SEMANTICS_GAP` (conocido, diferido). El snapshot de mayo se sirve como si fuera el mismo objeto «proyección IGF».

---

## Caso 7 — Regresión IGF → apoyos reviewable

Conversación de prueba (wording de **producción**, no el de la IMPL):

| Turno | Planner aislado | Notas |
|-------|-----------------|-------|
| ¿Cómo proyectamos cerrar Puebla este mes? | `unknown` 0.35 | Sin token `igf`. No arranca el hop. |
| ¿Qué podemos recortar de apoyos? | `igf_reviewable_supports` 0.9 | **Funciona.** Same plant / `mes_cargo` / Folios fresco. |
| ¿Cuáles todavía podemos detener? | `igf_reviewable_supports` 0.9 | **Funciona.** |
| Si esos dejaran de entrar, ¿cómo quedaría el IGF? | `igf_status` 0.9 | `igf` keyword gana. `isIgfReviewableSupportsQuestion` no trata `quedaria`+`igf` sin recortar/apoyos/cancel. Standalone **gana** sobre inherit (`planDirectorIaQuestion` L702: inherit solo si detected=`unknown`). Carga snapshot **sin** overlay contrafactual. |

Con el wording **documentado** de la IMPL («cerrar el **IGF**…», «si **canceláramos** los reviewable») el path sigue verde. Con wording de producción, el primer y el último turno **no** son el slice C.

**Answerability:** `PARTIALLY_WORKS`. No se re-selecciona como cuello único: el read model existe; el fallo es wording/standalone. Queda registrado.

Preservado cuando el usuario nombra IGF/apoyos/cancel: daily sales, daily discount, cross-metric, topic return, action-person, persistent memory, M9.

---

## Fixes previos (no reabiertos)

| Fix | Estado en esta batería |
|-----|------------------------|
| Daily sales / discount | Vivos **solo** si el turno nombra la métrica + `ayer`. |
| Cross-metric / inherit B | No se ejercitan: el caso 1 nunca crea `active_date`. |
| Topic return / action-person / memory | Fuera de estos 7 casos; no se eligen. |
| IGF reviewable supports | Slice C presente; wording de producción del hop 1 y 4 flojo (arriba). |

---

## Scoring (solo para elegir el cuello)

| Caso | Frecuencia | Valor ejecutivo | Unlock transversal | Datos listos | Clase |
|------|------------|-----------------|--------------------|--------------|-------|
| 1 Brief ayer | Muy alta | Muy alto | Abre la mañana sin nombrar métrica | **Sí** (2 packs diarios) | MISSING_INFRASTRUCTURE |
| 2 Cliente 3 meses | Alta | Muy alto | Perfil de cliente | Parcial (mensual existe; no el pack) | MISSING_INFRASTRUCTURE |
| 3 Taller Mayor | Media | Medio | Unidades + folios | Sí (columna `unidad`) | ROUTING_GAP |
| 4 Hola | Alta | Bajo | Saludo | Nombre en JWT; título no | MISSING_INFRASTRUCTURE |
| 5 SEH | Media | Medio | Directorio | No hay org chart | MISSING_DATA |
| 6 IGF cerrado | Media | Alto | Semántica temporal | Snapshot sí; forecast histórico no | TEMPORAL_SEMANTICS_GAP |
| 7 Reviewable | Media | Alto | Ya construido | Sí | PARTIALLY_WORKS |

El caso 2 es el segundo. Exige más infraestructura nueva. El caso 1 **compone evidencia que ya está**.

---

## Cuello único

**Nombre:** `no_daily_executive_brief`  
**Clase:** `MISSING_INFRASTRUCTURE`

**Qué rompe:** caso 1 y cualquier hold-out de «ayer» sin venta/descuento. Impide la conversación matutina real. El usuario que no sabe qué se movió recibe clarificación, no un brief.

**Dónde está físicamente:**

- No existe intent/loader/composer `daily_executive_brief` (o equivalente).
- Gate L103–122 de `lib/director-ia-planner.js`: `ayer` solo no basta.
- Early return L2945–2954 de `lib/director-ia-chat.js`.
- Packs ya implementados y **no invocados:** `loadDailySalesDeviationForChat`, `loadDailyDiscountDeviationForChat`.

**Qué desbloquea:** inspeccionar en runtime las métricas diarias **físicamente disponibles**, resolver ayer CDMX, planta del request, mostrar direcciones/desviaciones/contribuciones/gaps, y dejar que GPT sintetice. Sin phrasebook. Sin afirmar problema. Sin inventar ingreso diario.

**Qué NO resuelve:** cliente longitudinal 3 meses; Taller Mayor; saludo con nombre; directorio SEH; IGF de mes cerrado; wording del hop reviewable.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001`

Readiness del brief diario: qué métricas entrar, cómo componer packs existentes, qué queda diferido (ingreso diario), y que las frases de prueba no se programen.

STOP.
