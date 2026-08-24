# Reporte — AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
north_star_met: false
implementation: false
phrasebook_proposed: false
single_bottleneck: "no_reusable_longitudinal_client_read_model"
failure_class: "MISSING_INFRASTRUCTURE"
daily_brief_regression: "WORKS_NOW"
commercial_trend_regression: "WORKS_NOW"
igf_reviewable_regression: "WORKS_NOW"
action_person_regression: "WORKS_NOW"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/commercial-trend-engine.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/taller-at-excel.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/dicf.js"
  - "lib/dashboard-auth.js"
  - "lib/seh-equipos.js"
  - "server.js (usuarios, IGF corte, SEH, venta-serie)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. El chat **sí** sostiene brief diario, tendencia 30/90 CASA/COMISIONISTA, apoyos reviewable e hilo de acción por persona.

Lo que rompe la conversación de producción **después** de `commercial_trend` es el cliente:

El director ve el mover de la gráfica, dice **«Háblame del primero»**, y luego pregunta **qué sabemos de él / cuánto compró cada mes / descuento / ingreso / acciones**.

Hecho físico:

- Las fuentes de grano cliente **existen**: `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.dicf_cliente_mes`, comments y DICF por `cliente_key`, Action Register por `cliente_key`.
- No hay un read model longitudinal reusable (3 meses × kg × descuento/kg × ingreso) por `cliente_key`.
- `expediente_comercial` lee **un** `(year, month)` latest y **no expone** `desc_kg`.
- `commercial_trend` puede fijar `active_entity` del primer mover, pero el follow-up **no sale del pack de tendencia**.

**Exactamente dónde se rompe el handoff:**

```text
CASA 90d                 → commercial_trend   WORKS
¿Quién mueve la caída?   → inherit trend      WORKS (requery movers)
Háblame del primero.     → inherit + first_mover → active_entity  WORKS
¿Qué sabemos de él?      → inherit commercial_trend   BREAK
¿Tiene acciones?         → inherit commercial_trend   BREAK
```

Cuello único: `no_reusable_longitudinal_client_read_model`.  
Clase: **MISSING_INFRASTRUCTURE**.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`.

---

## Ejecución

- Rama: `audit/director-ia-production-conversation-gap-010` (≠ `main`).
- HEAD: `e5c63578`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Planner verificado con `detectDirectorIaIntent` sobre preguntas canónicas, variantes y hold-outs. Tests no reejecutados.

---

## Regresiones (no reelegidas)

| Slice | Pregunta | Planner aislado | Effective con estado | GPT | Veredicto |
|-------|----------|-----------------|----------------------|-----|-----------|
| Brief | ¿Cómo nos fue ayer? | `daily_executive_brief` 0.9 | brief | Sí | WORKS_NOW |
| Brief | ¿Qué te llama la atención? | `unknown` 0.35 | inherit brief | Sí | WORKS_NOW |
| Brief | ¿Y la venta? / ¿Y el descuento? | `unknown` 0.35 | cross-metric B | Sí | WORKS_NOW |
| Trend | ¿Cómo vamos en CASA los últimos 3 meses? | `commercial_trend` 0.9 | trend | Sí | WORKS_NOW |
| IGF | ¿Qué podemos recortar de apoyos? | `igf_reviewable_supports` 0.9 | reviewable | Sí | WORKS_NOW |
| AR | ¿Qué pasó con la acción de Julio Pérez? | `action_status` 0.86 | action-person | Sí | WORKS_NOW |

Sin evidencia de regresión. No se reabren.

---

## Caso 1 — Perfil longitudinal de cliente

### Planner (aislado)

| Pregunta | Intent | Conf | Early return |
|----------|--------|------|--------------|
| ¿Qué cliente de Puebla es el de mayor volumen, … últimos 3 meses, descuento/kg, ingreso…? | `unknown` | 0.35 | Sí: clarificación, 0 loaders, 0 GPT |
| Háblame de nuestro cliente más grande de Puebla. | `unknown` | 0.35 | Igual |
| ¿Cómo se ha comportado el principal cliente estos 3 meses? | `unknown` | 0.35 | Igual (`estos 3 meses` ≠ token de rango 90d) |
| ¿Qué tendencia trae nuestro mayor cliente? | `unknown` | 0.35 | Igual (sin canal/rango de gráfica) |
| ¿Qué tanto le hemos descontado últimamente? | `unknown` | 0.35 | `descuento` **bloquea** `commercial_trend` |
| ¿En qué mes compró más? / ¿más descuento? / ¿Coincidió? | `unknown` | 0.35 | Igual |
| ¿Qué comentarios tenemos? | `unknown` | 0.35 | No hay `cliente` + `comentarios` juntos |
| ¿Tiene acciones pendientes? | `unknown` | 0.35 | Sin nombre propio no entra a `action_status` |

**Effective intent = unknown.** Coverage guard: no. Parent: ninguno. Entity: no. Period 3M: no resuelto. GPT: no.

`isExpedienteComercialQuestion` exige wording de expediente / «qué sabemos comercialmente». No cubre «mayor volumen» ni «últimos 3 meses».

### Fuentes físicas (existen; chat no las compone)

| Pieza | Dónde | Chat carga |
|-------|-------|------------|
| `cliente_key` | `buildClienteKey` (`lib/dicf-acciones.js`); M11 y movers de trend | Sí en dossier / keys derivadas de mover; **no** para ranking 3M |
| Ventas mensuales | `arr.ventas_diarias_cliente` (sumar por mes); `arr.dicf_cliente_mes.kg_mes_real` **un** mes por fila | Dossier: **solo latest** year/month (`loadCommercialDossierForChat` L274–292) |
| Descuento/kg mensual | `arr.descuentos_diarios_cliente` + kg; `desc_kg_hist` en `dicf_cliente_mes` | Dossier `mapState` **omite** descuento/kg (L524–540) |
| Ingreso mensual | Derivado en `dicf.computeDicf`: `kg * (margen_IGF − \|desc_kg\|)` → `ingreso_forecast` / `ingreso_anterior` | Forecast de **una** fila, no ingreso real cerrado de 3 meses |
| Comments | `arr.cliente_comentarios` por `cliente_key` | Dossier sí; trend **no** |
| DICF | `arr.dicf_acciones` por `cliente_key` | Dossier sí |
| Action Register | board / `cliente_key` | Dossier / `action_status` con persona; no desde trend |
| Ranking «mayor volumen» | No hay `ORDER BY SUM(kg)` plant-wide 90d en chat | Nada |

**Period alignment:** no hay ventana 3 meses cliente. `commercial_trend` 90d es **planta/canal**, no cliente.  
**null ≠ 0:** dossier preserva nulls en `kg_mes_real`; no hay composición 3M que pueda violarlo.  
**Joins por nombre:** paths lícitos usan `cliente_key`. No copiar el join del wrapper HTTP de comments.

**Answerability:** `MISSING_READ_MODEL`.  
**Clase:** **MISSING_INFRASTRUCTURE**. Ingredientes físicos listos; falta el modelo composed. Ingreso cerrado independiente de la fórmula DICF **no** está almacenado — el ARCH debe decidir si reutiliza esa fórmula con provenance o declara limitation.

---

## Caso 6 — Handoff commercial_trend → cliente (dónde se rompe)

| Turno | Planner aislado | Effective | Entity | Pack | GPT | Fallo |
|-------|-----------------|-----------|--------|------|-----|-------|
| ¿Cómo vamos en CASA los últimos 3 meses? | `commercial_trend` 0.9 | trend | — | motor compartido CASA 90d | Sí | — |
| ¿Quién está moviendo la caída? | `unknown` 0.35 | inherit trend (`isolatedUnknownEarly` + parent trend) | — | requery movers | Sí | Contributor ≠ causa (prompt). No perfil |
| Háblame del primero. | `unknown` 0.35 | inherit trend; `wantsFirstMover` (`director-ia-commercial-trend.js` L214–216; chat L3372–3381) | `first_mover` + `cliente_key` derivado | mismo pack | Sí | Handoff **sí** ocurre |
| ¿Qué sabemos de él? | `unknown` 0.35 | inherit trend (`kind=pronoun`; `trendFollowUp` L590) | conserva mover | **otra vez trend** | Sí | **BREAK:** no expediente, no 3M, no comments |
| ¿Tiene alguna acción pendiente? | `unknown` 0.35 | inherit trend (`kind=action` está en `isDailyFollowUpKind`) | conserva mover | **otra vez trend** | Sí | **BREAK:** no AR / no DICF acciones |

`commercial_trend` es inheritable (`INHERITABLE_INTENTS` L16). `trendFollowUp` trata **cualquier** `unknown` o kind `pronoun`/`action` como follow-up de tendencia. Aunque el planner aislado algún día detectara `action_status`, el inherit de trend **lo traga**.

`isCommercialIdentityQuestion` («qué sabemos de») solo alimenta el path `dicf_focused` genérico. El handler in-process de `commercial_trend` **gana antes** y no llama a `loadCommercialDossierForChat`.

No es regresión de `commercial_trend`. El slice B cumplió su frontera: handoff canónico **sin** perfil 3M. El cuello es la pieza que ese slice diferió.

**Answerability:** `PARTIALLY_WORKS` hasta el primero; `MISSING_READ_MODEL` + inherit que no deja el pack desde «qué sabemos».

---

## Caso 2 — Taller Mayor por unidad

| Campo | Hecho |
|-------|--------|
| Planner canónico | `unknown` 0.35. Variantes («carros», «reparaciones fuertes», «unidades … Taller Mayor») igual |
| `isM5TallerAtQuery` | Exige `\btaller\b` **y** token `AT-15` **o** `\bunidad\b` singular. «unidades» **no** mata. Sin AT → false |
| Taller Mayor | Derivado: `/REPARACION/` + `/MAYOR/` en `subcategoria` (`taller-at-excel.js` L89–99). **No** es columna |
| SQL M5 | `categoria LIKE '%TALLER%'`. No filtra MAYOR. `projectRecord` omite `tipo` y `subcategoria` (L139–152) |
| «Este mes» | M5 exige `YYYY-MM`; sin periodo → `missing_period` |
| Reviewability | Otro intent; no conectado |
| Folios físicos | `public.folios.unidad`, `importe`, `estatus`, `concepto`, `mes_cargo`, historial **existen** |
| Reviewable | No se dispara (`apoyos` sin verbo recortar/detener) |

**Answerability:** `ROUTING_GAP` + `MISSING_READ_MODEL`.  
**Clase:** **MISSING_INFRASTRUCTURE**. Dato folio–unidad ya existe. Chat no agrupa «Taller Mayor + este mes + por unidad».

---

## Caso 3 — Hola / identidad autenticada

| Campo | Hecho |
|-------|--------|
| Planner | `smalltalk` 0.95 |
| Effective | Early return **antes** del planner de negocio (`askDirectorIa` L2895–2910) |
| GPT | **No** |
| Respuesta | Plantilla: «Hola, soy Director IA para la planta {plant}…» (`buildConversationalAnswer` L2253) |
| JWT | `actor_id`, `role`, `plantas_permitidas`. `actor_nombre` solo se setea en algunos tokens (p. ej. WhatsApp/SEH `server.js` ~L8249), no en el saludo |
| `public.usuarios` | `id`, `nombre`, `nombre_persona`, `telefono`, `email`, `rol_id`. **Sin** título Ing./Lic./Dr. |
| Chat | No SELECT de usuario. `_user` no alimenta el saludo |

«Ing. Zaragoza» **inventaría** el título. Identidad útil (nombre autenticado) existe en DB; el chat la tira. Eso **no** desbloquea conversación persona-aware de negocio: no hay directorio, no hay SEH, no hay preferencias.

**Answerability:** `PARTIALLY_WORKS` (saluda, no personaliza).  
**Clase:** **MISSING_INFRASTRUCTURE** de presentación. Riesgo **OVERPROGRAMMING** si se fabrica título. Valor ejecutivo bajo.

---

## Caso 4 — Directorio SEH

| Campo | Hecho |
|-------|--------|
| «¿Quién es el responsable de Seguridad e Higiene en Puebla?» | `responsible_lookup` 0.88 |
| Handler in-process | **No existe** (`responsible_lookup` ausente en `director-ia-chat.js`) |
| Effective | Path GPT genérico + board AR. `\bseguridad\b` es **tema AR**, no cargo org |
| «¿Quién lleva SEH en Puebla?» | `unknown` 0.35 (acrónimo no rutea) |
| Teléfono / correo | `unknown` 0.35 |
| Tablas SEH | `seh_equipos`, `seh_carpetas_legales`, `seh_ultima_edicion` — equipos/docs/último editor. **No** responsable+tel+email por planta |
| `public.usuarios` | Tel/email/planta **sí**. **Sin** área/departamento/cargo SEH. Chat no los SELECT para directorio |

Dato de **organigrama SEH no existe**. Teléfono de usuarios existe como PII de login, no como directorio funcional. Distinción obligatoria: **MISSING_DATA** (cargo SEH) vs **MISSING_INFRASTRUCTURE** (PII no cableada; no usarla como directorio).

**Answerability:** `MISSING_PHYSICAL_DATA`.  
**Clase:** **MISSING_DATA**. No se elige: no hay fuente que un ARCH pueda encender.

---

## Caso 5 — IGF mayo cerrado

| Campo | Hecho |
|-------|--------|
| Planner | `igf_status` 0.9 (`\bigf\b`) |
| Periodo | `resolveYearMonthFromQuestion` parsea «mayo», **ignora «pasado»** (L160–181) → mayo del año CDMX corriente |
| Versión | `ORDER BY version_number DESC LIMIT 1` (`loadIgfCommitSnapshot`) |
| Corte dashboard | `isIgfMesCerradoPorCorte` / `version_as_of_corte` en `server.js` (~L11393+). **Chat no los llama** |
| Snapshots | `igf.versions.created_at` persiste versiones intra-mes. Chat no lista forecast-as-of |
| Actual vs forecast | Chat sirve la última versión como vigente. No dice «mayo está cerrado». No reconstruye historia; **tampoco** la expone |

Hoy es 2026-08-24: «mayo pasado» = 2026-05. El resolver puede acertar el mes **por el nombre**, y aún así etiquetar mal (forecast vs cerrado).

**Answerability:** `TEMPORAL_SEMANTICS_GAP`.  
**Clase:** **MISSING_INFRASTRUCTURE** (corte no cableado). Datos históricos listos. No es el cuello: el director puede obtener un número; el cliente longitudinal **no obtiene nada**.

---

## Phrasebook

Las preguntas son **tests semánticos**. No hay frases «mayor volumen / Taller Mayor / SEH / Ing.» como switch de producto. Hold-outs de cliente («Háblame de nuestro cliente más grande», «estos 3 meses») también caen a `unknown`. El ARCH no debe phrasebook-ear «qué sabemos de él».

---

## Competencia de cuellos

| Caso | Frecuencia | Valor ejecutivo | Transversalidad | Data readiness | Conversación natural | Selección |
|------|------------|-----------------|-----------------|----------------|----------------------|-----------|
| 1+6 Longitudinal + handoff | Alta (siguiente turno tras la gráfica) | Alta: volumen / desc / ingreso / acciones | Alta: todo cliente | Alta en tablas; falta compose | Alta: es el hilo humano | **GANADOR** |
| 2 Taller Mayor | Media-baja | Operativa | Baja | Alta en folios | Media | No |
| 3 Hola | Alta | Baja | Baja | Nombre sí; título no | Cosmética | No (fácil ≠ impacto) |
| 4 SEH | Baja | Media | Baja | **No hay directorio** | — | No |
| 5 IGF cerrado | Media | Alta en cierre | Media | Alta en `igf.versions` | Media (ya hay número) | No |
| Regresiones | — | — | — | — | — | WORKS_NOW |

No se eligió Taller Mayor por data readiness. Se eligió el cliente porque **la gráfica ya entrega el mover** y el chat no puede hablar de esa persona.

---

## Cuello único

**Nombre:** `no_reusable_longitudinal_client_read_model`  
**Clase:** `MISSING_INFRASTRUCTURE`

### Qué casos rompe

Caso 1 entero (mayor volumen, 3 meses, descuento/kg, ingreso, comentarios, coincidencia mes). Caso 6 desde «¿Qué sabemos de él?» inclusive. No rompe brief, trend de planta/canal, reviewable ni Julio Pérez standalone.

### Dónde está físicamente

- Tablas: `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.dicf_cliente_mes` (`kg_mes_real`, `desc_kg_hist`, `ingreso_forecast`, year/month), `arr.cliente_comentarios`, `arr.dicf_acciones`.
- Identidad: `buildClienteKey`; movers de `lib/director-ia-commercial-trend.js` `attachMoverKeys`.
- Dossier 1-mes: `lib/director-ia-m11-commercial-dossier.js` (`mapState` sin desc/kg; latest only).
- Inherit que no deja el pack: `lib/director-ia-conversation-state.js` L587–591 (`trendFollowUp`).
- Chat: canónico → `unknown` → clarificación. Handoff → GPT con pack de tendencia.

### Qué evidencia lo demuestra

Planner 0.35 / `no_rule_matched` en el canónico. Dossier SELECT `year, month` latest only. `mapState` sin descuento. `trendFollowUp` fuerza requery de `commercial_trend` ante pronoun/action. Cero loader 3M por `cliente_key` en `lib/`.

### Qué desbloquea

Hablar del cliente seleccionado (top volumen o mover de gráfica) con serie mensual defendible, descuento/kg alineado, ingreso con provenance, comments/DICF/AR por `cliente_key`, y follow-ups «en qué mes / coincidió / qué sabemos / tiene acciones» sin phrasebook y sin causalidad.

### Qué NO soluciona

Taller Mayor por unidad; saludo con título; directorio SEH; semántica IGF de mes cerrado; causalidad descuento↔volumen; comments de gráfica por `cliente_nombre`.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`

Debe diseñar el read model longitudinal por `cliente_key` (selección top / handoff desde `commercial_trend`), composición 30/90 o 3 meses calendario **explícita**, ingreso con provenance, comments/DICF/AR canónicos, y cómo el inherit deja el pack de tendencia ante identidad/acciones — sin phrasebook, sin join por nombre, sin causalidad.

STOP.
