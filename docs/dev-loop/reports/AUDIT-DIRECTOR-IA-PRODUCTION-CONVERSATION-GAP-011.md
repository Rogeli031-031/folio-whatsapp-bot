# Reporte — AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
north_star_met: false
implementation: false
phrasebook_proposed: false
single_bottleneck: "no_unit_level_taller_mayor_read_model"
failure_class: "MISSING_INFRASTRUCTURE"
taller_mayor: "MISSING_READ_MODEL"
closed_month_igf: "TEMPORAL_SEMANTICS_GAP"
authenticated_identity: "PARTIALLY_WORKS"
seh_directory: "MISSING_PHYSICAL_DATA"
regression_trend_to_profile: "WORKS_NOW"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/taller-at-excel.js"
  - "lib/unidad-taller.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/dashboard-auth.js"
  - "lib/seh-equipos.js"
  - "lib/seh-carpetas-legales.js"
  - "server.js (folios, usuarios, roles SEH, IGF corte)"
  - "frontend-dashboard/components/CrearFolioModal.tsx"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. El chat **sí** sostiene brief diario, tendencia 30/90, perfil de cliente, apoyos reviewable e hilo de acción por persona.

Lo que rompe la conversación de producción **después** de `client_profile` es la **unidad**:

El director pregunta **qué unidades de Puebla tienen Folios de Taller Mayor este mes** y luego quiere el más alto, el concepto, el folio, el estatus, si se puede detener, el gasto acumulado y el historial.

Hecho físico:

- Los datos **ya existen**: `public.folios.unidad` + `categoria` TALLER + `subcategoria` `REPARACIÓN MAYOR` (derivado `tipo=mayor`), `importe`, `estatus`, `concepto`, `mes_cargo`, historial por `folio_id`.
- El dashboard ya clasifica Taller Mayor. Excel Taller ya expande por unidad. M5 ya lee folios TALLER **si** hay token AT-15 y `YYYY-MM`.
- Director IA **no** tiene un read model plant-wide «Taller Mayor + este mes + agrupar por unidad».
- No hay `placa` ni `económico` en el repo. La clave canónica de unidad es el token de `folios.unidad`.

Cuello único: `no_unit_level_taller_mayor_read_model`.  
Clase: **MISSING_INFRASTRUCTURE**.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001`.

---

## Ejecución

- Rama: `audit/director-ia-production-conversation-gap-011` (≠ `main`).
- HEAD: `0f4871be`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Planner verificado con `detectDirectorIaIntent` + `resolveConversationTurn` sobre canónicos, variantes y hold-outs. Tests no reejecutados.

---

## Regresiones (no reelegidas)

| Slice | Pregunta | Planner aislado | Effective con estado | GPT | Veredicto |
|-------|----------|-----------------|----------------------|-----|-----------|
| Brief | ¿Cómo nos fue ayer? | `daily_executive_brief` (no reabierto) | brief | Sí | WORKS_NOW |
| Trend | ¿Cómo vamos en CASA los últimos 3 meses? | `commercial_trend` 0.9 | trend | Sí | WORKS_NOW |
| Trend | ¿Quién mueve la caída? | `unknown` 0.35 | inherit `commercial_trend` | Sí | WORKS_NOW |
| Trend | Háblame del primero. | `unknown` 0.35 | inherit trend + `wantsFirstMover` → `active_entity` | Sí | WORKS_NOW |
| Profile | ¿Qué sabemos de él? | `unknown` 0.35 / kind `pronoun` | `profile_handoff_from_trend` → `client_profile` | Sí | WORKS_NOW |
| Profile | ¿Tiene acciones? | `unknown` 0.35 / kind `action` | handoff o inherit `client_profile` | Sí | WORKS_NOW |
| IGF reviewable | ¿Qué podemos recortar de apoyos? | `igf_reviewable_supports` (no reabierto) | reviewable | Sí | WORKS_NOW |
| AR | ¿Qué pasó con la acción de Julio Pérez? | `action_status` (no reabierto) | action-person | Sí | WORKS_NOW |

Cadena canónica `commercial_trend → client_profile` **sigue viva**. No se reabre.

Residual (no cuello): aislado, «¿Cómo compró estos meses?» cae a `commercial_trend` 0.9 (`estos meses` + `cómo` = rango). Con `parent_intent = client_profile` el inherit **gana**. Si se pregunta eso **antes** de «qué sabemos» (parent aún trend + entity), el handoff se bloquea por `!isCommercialTrendQuestion`. La secuencia autorizada incluye «qué sabemos» primero; no se reelige el perfil.

---

## Caso 1 — Taller Mayor por unidad

### Planner (aislado)

| Pregunta | Intent | Conf | M5 | Reviewable | Early return |
|----------|--------|------|----|------------|--------------|
| ¿Qué unidades de Puebla tienen apoyos/Folios de Taller Mayor este mes? | `unknown` | 0.35 | false | false | Sí: clarificación, 0 loaders, 0 GPT |
| Dame detalles. | `unknown` | 0.35 | false | false | Igual |
| ¿Qué carros de Puebla traen apoyos de Taller Mayor? | `unknown` | 0.35 | false | false | Igual |
| Enséñame las unidades con reparaciones mayores este mes. | `unknown` | 0.35 | false | false | Sin token `taller` |
| ¿Qué unidades tienen folios grandes de taller? | `unknown` | 0.35 | false | false | `\bunidades\b` ≠ `\bunidad\b` |
| ¿Qué unidades están en Taller Mayor y cuánto llevan? | `unknown` | 0.35 | false | false | Igual |
| ¿Cuál tiene el apoyo más alto? | `unknown` | 0.35 | false | false | Igual |
| ¿Qué le están haciendo? / ¿Qué folio es? / ¿En qué estatus va? | `unknown` | 0.35 | false | false | Igual |
| ¿Todavía se puede detener? | `igf_reviewable_supports` | 0.9 | false | true | **Hijack** plant-wide IGF, no la unidad |
| ¿Cuánto hemos gastado en esa unidad? | `unknown` | 0.35 | false | false | Sin token AT |
| ¿Qué otros apoyos ha tenido? / historial de reparaciones | `unknown` | 0.35 | false | false | Igual |

**Effective intent = unknown** (salvo el hijack reviewable). Coverage guard: no. Parent: ninguno. Entity unidad: no. Periodo «este mes»: no resuelto. GPT: no.

`isM5TallerAtQuery` exige `\btaller\b` **y** token `AT-15` **o** `\bunidad\b` singular. «unidades» no mata. Sin AT → false. M5 además exige `YYYY-MM` o responde `missing_period`. No filtra MAYOR.

### Fuentes físicas (existen; chat no las compone)

| Pieza | Dónde | Chat carga |
|-------|-------|------------|
| Definición Taller Mayor | UI: `SUBCATEGORIAS.TALLER = ["REPARACIÓN MAYOR", "PASIVO/RECUPERACIÓN", "PREVENTIVO"]` (`CrearFolioModal.tsx`). Runtime: `matchTallerTipoCol` = `/REPARACION/` + `/MAYOR/` → `tipo = "mayor"` (`taller-at-excel.js` L89–99). **No** es columna | M5 SELECT `subcategoria`; `projectRecord` **omite** `tipo` y `subcategoria` |
| Identidad de unidad | `public.folios.unidad` + `lib/unidad-taller.js` (AT/PT/S/C/U). WhatsApp usa la misma homologación | M5 solo si el usuario nombra el token |
| placa / económico | **No existen** en repo (js/sql/tsx) | — |
| Folio | `numero_folio`, `id` | M5 sí, si entra |
| categoria / subcategoria | `public.folios` | SQL sí; pack de chat no proyecta tipo |
| importe / estatus / concepto / mes_cargo | `public.folios` | M5 sí, si entra |
| «Este mes» | Calendario CDMX; `mes_cargo VARCHAR(7)` | M5 no resuelve «este mes»; pide `YYYY-MM` |
| Reviewability | `classifyCancellationEligibility` (`director-ia-igf-reviewable-supports.js`) | Otro intent; «detener» suelto abre pack IGF de planta |
| Historial por unidad | Otros folios con el **mismo** token `unidad`; `folio_historial` es por `folio_id`, no por unidad | No hay agrupación plant-wide |
| Excel Taller | `lib/taller-at-excel.js` `expandTallerRows` (unidad × mes, `tipo`) | Dashboard/Excel; chat M5 no agrupa ni filtra mayor |
| GASTOS | M6 categoría distinta | No es Taller |

**Answerability:** `ROUTING_GAP` + `MISSING_READ_MODEL`.  
**Clase:** **MISSING_INFRASTRUCTURE**. Folio–unidad ya está ligado por clave canónica. Falta listado «Taller Mayor + mes actual + por unidad» y follow-ups sobre esa unidad.

Truth boundary: importe alto ≠ mala decisión; estatus ≠ diagnóstico mecánico; reviewable ≠ recomendar cancelar.

---

## Caso 2 — IGF mes cerrado

### Planner

| Pregunta | Intent | Conf | GPT |
|----------|--------|------|-----|
| ¿Cuál es la proyección final del IGF de Puebla de mayo pasado? | `igf_status` 0.9 | Annex IGF | Sí (si AI on) |
| ¿Cómo proyectamos cerrar mayo? | `unknown` 0.35 | 0 | No |
| ¿Cuál fue la proyección de mayo? | `unknown` 0.35 | 0 | No |
| ¿Cómo cerró realmente mayo? | `unknown` 0.35 | 0 | No |
| ¿Qué habíamos estimado para mayo? | `unknown` 0.35 | 0 | No |
| Follow-ups (cerró / proyectábamos / qué tan cerca / vs junio) | `unknown` 0.35 | 0 | No |

El canónico **sí** entra (`\bigf\b`). Las variantes semánticas **sin** la palabra IGF no entran.

### Periodo / open vs closed

| Campo | Hecho |
|-------|--------|
| Resolver chat | `resolveYearMonthFromQuestion`: token `mayo` → month=5; «pasado» **ignorado**. Year = CDMX corriente. En 2026-08 acierta 2026-05 |
| Snapshot chat | `loadIgfCommitSnapshot`: `igf.versions` GLOBAL `ORDER BY version_number DESC LIMIT 1` + 1 fila `igf.compromiso_lines` |
| Etiqueta chat | «IGF — COMPROMISO / MARGEN (versión más reciente del mes)» / annex «IGF Forecast» |
| Corte dashboard | `isIgfMesCerradoPorCorte` / `version_as_of_corte` en `server.js` L11393–11462. **Chat no los llama** |
| Actual vs forecast | Dashboard: corte posterior al mes → venta **real**. Chat: última versión como vigente, **sin** decir «mayo está cerrado» |
| Forecast histórico | `igf.versions.created_at` permite as-of. Existe **si** se guardaron versiones intra-mes. Chat no lista forecast-as-of. **No** reconstruye forecast desde el actual final (correcto: no lo hace; tampoco lo expone) |

**Answerability:** `TEMPORAL_SEMANTICS_GAP` (canónico) + `ROUTING_GAP` (variantes sin «IGF»).  
**Clase:** **MISSING_INFRASTRUCTURE** (corte no cableado). El número puede salir; la semántica es la de forecast vigente.

No es el cuello: el director **ya obtiene un número** si dice IGF. La unidad de Taller **no obtiene nada**.

---

## Caso 3 — Identidad / «Hola»

| Campo | Hecho |
|-------|--------|
| Planner | `smalltalk` 0.95 («Hola», «Buenos días», «Qué tal») |
| Effective | Early return **antes** del planner de negocio (`askDirectorIa` L2901–2922) |
| GPT | **No** |
| Respuesta | Plantilla: «Hola, soy Director IA para la planta {plant}…» (`buildConversationalAnswer` L2259) |
| JWT habitual | `actor_id`, `role`, `plantas_permitidas`. `actor_nombre` solo si `scope=seh` o `includeActorProfile` (`server.js` L8248–8250). Login/WhatsApp dashboard **no** lo setea |
| `public.usuarios` | `id`, `nombre`, `nombre_persona`, `telefono`, `email`, `rol_id`, `planta_id`. **Sin** título Ing./Lic./Dr. |
| Chat | `_user` entra a `askDirectorIa` y solo alimenta scope de memoria. **No** SELECT de usuario. **No** saludo |

Nombre autenticado **existe** en DB (`actor_id` → `usuarios`). El chat lo tira. Inventar «Ing.» sería OVERPROGRAMMING.

¿Desbloquea algo más que saludo? Rol/planta **ya** gobiernan authz. No hay directorio, preferencias ni respuestas role-aware de negocio. Personalizar el hola **no** abre Taller, IGF cerrado ni SEH.

**Answerability:** `PARTIALLY_WORKS`.  
**Clase:** **MISSING_INFRASTRUCTURE** de presentación. Valor ejecutivo bajo. No se elige (fácil ≠ impacto).

---

## Caso 4 — SEH

| Pregunta | Planner | Effective |
|----------|---------|-----------|
| ¿Quién es el responsable de Seguridad e Higiene en Puebla? | `responsible_lookup` 0.88 | **No hay** handler in-process. Path GPT genérico + board AR. `\bseguridad\b` es **tema AR**, no cargo org |
| ¿Quién lleva SEH en Puebla? | `unknown` 0.35 | Clarifica |
| ¿Quién es el encargado de Seguridad e Higiene? | `unknown` 0.35 | Sin token `responsable` |
| Dame el contacto de SEH Puebla. | `unknown` 0.35 | Acrónimo no rutea |
| ¿Cuál es su teléfono? / ¿Y su correo? | `unknown` 0.35 | — |

| Fuente | Qué es | ¿Directorio de persona? |
|--------|--------|-------------------------|
| `seh_equipos` / `seh-equipos.js` | Equipos/componentes por planta | **No** |
| `seh_carpetas_legales` | Documentos/estatus/vencimiento | **No** |
| `seh_ultima_edicion` | Último editor del tablero | **No** (no es responsable vigente) |
| Rol `SEH` en `public.roles` | Clave de login nivel 6 | Usuario-con-rol, **no** «responsable SEH de Puebla» |
| `public.usuarios` | tel/email/planta | PII de login. **Sin** área/departamento/cargo SEH. Chat no SELECT directorio |

Distinción obligatoria:

- **MISSING_PHYSICAL_DATA:** no hay organigrama «responsable SEH + vigencia + planta».
- **MISSING_INFRASTRUCTURE:** PII de usuarios no está cableada; **no** usarla como directorio.

**Answerability:** `MISSING_PHYSICAL_DATA`.  
**Clase:** **MISSING_DATA**. No se elige: no hay fuente que un ARCH pueda encender.

---

## Caso 5 — Regresión trend → profile

```text
¿Cómo vamos en CASA los últimos 3 meses?  → commercial_trend     WORKS
¿Quién mueve la caída?                    → inherit trend        WORKS
Háblame del primero.                      → inherit + first_mover + cliente_key  WORKS
¿Qué sabemos de él?                       → forceIntent client_profile + requery  WORKS
¿Cómo compró estos meses?                 → inherit client_profile (si parent ya es profile)  WORKS
¿Tiene acciones?                          → inherit / handoff client_profile  WORKS
```

No regresión física del handoff canónico. Residual documentado arriba. **No se reelige.**

---

## Phrasebook

Las preguntas son **tests semánticos**. No hay frases «Taller Mayor / SEH / Ing. / mayo pasado» como switch de producto en `lib/`. Hold-outs («carros», «reparaciones mayores», «quién lleva SEH», «cómo cerró mayo») también fallan. El ARCH no debe phrasebook-ear «Taller Mayor este mes».

---

## Competencia de cuellos

| Caso | Frecuencia | Valor ejecutivo | Transversalidad | Data readiness | Conversación natural | Selección |
|------|------------|-----------------|-----------------|----------------|----------------------|-----------|
| 1 Taller Mayor por unidad | Media (operación de planta, no solo cierre) | Alta operativa: gasto, folio, detener | Alta: la **unidad** pasa a ser objeto conversable | Alta en folios; falta compose | Alta: 7 follow-ups naturales | **GANADOR** |
| 2 IGF mes cerrado | Media (cierre) | Alta financiera | Media: un intent ya existe | Alta en `igf.versions` + corte dashboard | Media: el canónico ya da número | No |
| 3 Hola | Alta | Baja | Baja | Nombre sí; título no | Cosmética | No |
| 4 SEH | Baja | Media | Baja | **No hay directorio** | — | No |
| 5 Regresión | — | — | — | — | — | WORKS_NOW |

No se eligió IGF cerrado: el director **ya obtiene un snapshot** si dice IGF; falta etiqueta open/closed. Se eligió Taller Mayor porque **la conversación no puede empezar** y el dato folio–unidad **ya está**.

---

## Cuello único

**Nombre:** `no_unit_level_taller_mayor_read_model`  
**Clase:** `MISSING_INFRASTRUCTURE`  
**Caso:** production_case_1_taller_mayor_units

### Qué rompe

Toda la conversación de unidades Taller Mayor: listado del mes, unidad con mayor importe, concepto, folio, estatus, ¿se puede detener?, gasto acumulado, otros apoyos, historial. También el hijack de «¿Todavía se puede detener?» hacia IGF reviewable de planta.

### Dónde está físicamente

- Tablas: `public.folios` (`unidad`, `categoria`, `subcategoria`, `importe`, `estatus`, `concepto`/`descripcion`, `mes_cargo`, `detalle_lineas`); `public.folio_historial` por `folio_id`.
- Definición: `CrearFolioModal.tsx` `REPARACIÓN MAYOR`; `matchTallerTipoCol` en `lib/taller-at-excel.js`.
- Identidad: `lib/unidad-taller.js`. No placa. No económico.
- Slice existente insuficiente: `lib/director-ia-m5-taller-at.js` (exige unidad + `YYYY-MM`; no filtra mayor; no agrupa plant-wide).
- Reviewability reusable: `classifyCancellationEligibility` en `lib/director-ia-igf-reviewable-supports.js` (no conectada a unidad).
- Planner: `isM5TallerAtQuery` (`lib/director-ia-capabilities.js` L537–543). Canónico → `unknown`.

### Evidencia

Planner 0.35 / `no_rule_matched` en el canónico y variantes. M5 false. «detener» → `igf_reviewable_supports` 0.9. SQL M5 ya trae `unidad`+`subcategoria`; el pack las tira. Excel ya calcula `tipo=mayor`.

### Qué desbloquea

Hablar de **unidades** con Folios Taller Mayor del mes (misma planta), ranking por importe, detalle de folio, estatus, reviewability reutilizada, gasto/historial por el mismo token de unidad, sin phrasebook y sin diagnóstico mecánico.

### Qué NO soluciona

IGF open vs closed / forecast histórico as-of; saludo con nombre/título; directorio SEH; causalidad; placa/económico (no existen); ingreso mensual actual de cliente.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001`

STOP.
