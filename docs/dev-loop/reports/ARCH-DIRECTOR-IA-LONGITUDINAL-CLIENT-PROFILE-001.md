# Reporte — ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001

```yaml
task_id: "ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_source_strategy: "B_reusable_longitudinal_client_read_model"
selected_source_strategy_letter: "B"
selected_routing_strategy: "B_canonical_client_profile_parent"
selected_routing_strategy_letter: "B"
selected_intent: "client_profile"
intent_required: true
existing_client_analysis_reusable: false
existing_expediente_comercial_reusable: false
phrasebook: false
second_llm_router: false
income_semantics: "D_not_supported_first_slice"
income_physical_meaning: "C_DICF_formula_exists_but_is_not_actual"
period_semantics: "current_calendar_month_plus_2_prior_CDMX"
current_month_label: "PARTIAL_if_open"
top_client_metric: "SUM_kg_same_period_plant_channel"
identity: "cliente_key_derived_after_cliente_norm_canal_subcanal"
destination: "chat legado (planner + conversation_state + in-process loader); NO Motor N1–N5; NO IES; NO Reasoning Engine; NO persistencia; NO schema; NO SQL de producto"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp unless module matrix policy independently changes"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-action-register.js"
  - "lib/director-ia-action-person.js"
  - "lib/dicf.js"
  - "lib/dicf-acciones.js"
  - "lib/cliente-comentarios.js"
  - "lib/delta-ingreso-forecast.js"
  - "server.js (arr.action_register_items, delta_ingreso_forecast_cliente)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.**

Hay first slice seguro. No hace falta decisión humana de negocio para saber qué es el ingreso: **no es ingreso actual**. El único número persistido con ese nombre es una **fórmula DICF**. First slice **no lo emite** como ingreso.

Arquitectura de fuente **B**: un read model longitudinal reutilizable, runtime, solo lectura, keyed por `cliente_key` + periodo + planta + canal opcional. El loader alinea meses **antes** de GPT.

Routing **B**: intent padre canónico `client_profile`. Tras `active_entity` único, una pregunta de perfil/acciones **no** puede heredarse a `commercial_trend`.

Intent: **`client_profile`** (nuevo). `client_analysis` no sirve. `expediente_comercial` no se extiende. El periodo es slot, no intent.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`.

---

## Ejecución

- Rama: `architecture/director-ia-longitudinal-client-profile-001` (≠ `main`).
- HEAD al arrancar: `3c06c5de Merge branch 'audit/director-ia-production-conversation-gap-010'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, persistencia, commit, push, merge.

---

## Cuello físico (handoff)

Secuencia auditada:

```text
CASA 90d
→ quién mueve
→ háblame del primero     → active_entity + cliente_key OK
→ ¿Qué sabemos de él?
→ ¿Tiene acciones?
```

Los dos últimos **reheredan `commercial_trend`**.

Causa en `lib/director-ia-conversation-state.js` ~L587–591:

- `trendFollowUp = parent trend AND (isDailyFollowUpKind(kind) OR isolatedUnknownEarly)`
- `isDailyFollowUpKind` incluye `pronoun` y `action`
- `classifyFollowUpKind` marca «qué sabemos de él» como `pronoun` y «tiene acciones» como `action`

El handler in-process de tendencia gana antes de M11. `isCommercialIdentityQuestion` no desvía el inherit. `expediente_comercial` solo se abre desde `plant_diagnosis` / `expediente_comercial` (`director-ia-chat.js` ~L2944).

El planner aislado del canónico «mayor volumen / 3 meses / descuento / ingreso» cae a `unknown`. `isCommercialTrendQuestion` bloquea si hay token `descuento`.

No es falta de tablas. Es falta de **padre semántico + read model alineado por mes**.

---

## Identidad

Canónico: `buildClienteKey(plantaId, grupoTipo, canal, subcanal, clienteNombre)` en `lib/dicf-acciones.js` L70–79.

**Prohibido** para evidencia: join por `cliente_nombre`, fuzzy display-name, inferir identidad desde texto de comentarios, merge silencioso.

### Grano físico de ventas y descuento

`arr.ventas_diarias_cliente` y `arr.descuentos_diarios_cliente` **no** tienen `cliente_key`.

Grano: `plant_code` + `fecha` + `cliente_norm` + `canal` + `subcanal`.

### Implicación

1. Agregar kg y monto por `(cliente_norm, canal, subcanal)` en la planta y el periodo.
2. **Después** adjuntar `cliente_key` / `cliente_keys` con el patrón ya usado por trend / daily / M11: `deriveClienteKeys` recorre los grupos DICF (`Dejaron` / `Disminuyeron` / `Aumentaron` / `Nuevo`) y consulta comments/acciones con `ANY(keys)`.
3. El grupo DICF **cambia de mes**. La misma persona física puede tener keys distintas. Por eso el perfil guarda `cliente_keys[]`, no una sola key como identidad exclusiva de volumen.
4. Si un nombre visible mapea a más de una entidad `(canal, subcanal)` —o a keys que no son solo variantes de grupo—: **clarificar**. No elegir en silencio.

`lib/cliente-comentarios.js` tiene fallback por nombre. **First slice no lo usa.**

---

## Fuentes — auditoría por dominio

### 1) kg por mes

| Pieza | Hecho físico |
|-------|----------------|
| Tabla | `arr.ventas_diarias_cliente` (`fecha`, `plant_code`, `cliente_norm`, `canal`, `subcanal`, `kg`) |
| `cliente_key` | No existe en la fila. Se deriva después. |
| Mes | Calendario: `fecha` ∈ `[YYYY-MM-01, último día del mes]` |
| Agregación | `SUM(kg)` por mes, misma planta, mismo canal si se hereda |
| Helper existente | `fetchKgMontoPorClienteMesCalendario` (`lib/dicf.js` L799–893) |

Ese helper **no** es el read model. Agrupa **solo** por `cliente_norm` (colapsa canal) y pega canal desde `arr.cliente_categoria_mes`. Usado por dashboard ARR, no por Director IA. **No copiarlo** si el hilo viene de CASA/COMISIONISTA.

Mes actual abierto: el `SUM(kg)` hasta la última `fecha` observada se etiqueta **parcial**. Ausencia de filas del cliente en un mes donde la planta sí tiene ventas = **0 observado**, no missing. Planta sin filas de ventas en ese mes = **missing/source gap**, no cero.

### 2) descuento/kg por mes

| Pieza | Hecho físico |
|-------|----------------|
| Tabla monto | `arr.descuentos_diarios_cliente` (`monto`, mismo grano diario) |
| Denominador | `SUM(kg)` del **mismo** mes / planta / `(cliente_norm, canal, subcanal)` |
| Fórmula canónica | `SUM(monto) / SUM(kg)` |
| Prohibido | `AVG` de ratios diarios o mensuales |
| M9 | `getDeltaDescuentoClientes` compara **dos** YYYY-MM a grano cliente, planta. **No** es perfil 3M. Reusar la **fórmula**, no el pack M9 |

Si hay kg y no hay filas de descuento en un mes donde la fuente de descuento de la planta respondió: monto observado 0 → ratio 0, con provenance. Si la fuente de descuento no está disponible: `discount_per_kg = null`, no 0.

### 3) ingreso por mes — determinación A/B/C/D

Pregunta: ¿qué significa físicamente «ingreso por mes» a nivel cliente?

| Candidato | ¿Existe? | Qué es |
|-----------|----------|--------|
| **A actual** | **No** | No hay ingreso contable cerrado por cliente-mes. No hay factura/reconocimiento persistido en ARR/DICF. |
| **B ARR/forecast cache** | Parcial, inútil | `arr.delta_ingreso_forecast_cliente` (`ingreso_a` / `ingreso_b`) es cache `DELETE+INSERT` de un cómputo de par de meses. Cero uso en `director-ia*.js`. Fuera de M9 COMPLETE. No es historia estable de 3 meses. |
| **C fórmula DICF** | Sí, un mes cacheado | `ingreso_forecast = kg_mes_forecast * (margen_IGF − \|desc_kg_hist\|)` en `lib/dicf.js` ~L387–468, persistido en `arr.dicf_cliente_mes`. `ingreso_anterior` se calcula y **no se persiste**. Usa kg **forecast**, no kg real. Margen de planta-mes; fallback 1 si falta. |
| **D no soportado** | First slice | No hay número defendible que se pueda llamar «ingreso que generó» |

**Selección first slice: D.**

El significado físico del número existente es **C**. No es A. **No se etiqueta como actual.** First slice **no lo emite**. El perfil sigue con kg + descuento/kg + limitation explícita: «ingreso mensual cliente no está disponible como actual; el único derivado es fórmula DICF (kg forecast × (margen − \|desc\|)) y queda fuera de este slice».

Esto **no** es STOPPED: la semántica ya está determinada. Diferir el número es la decisión de arquitectura, no una pregunta de negocio abierta.

M11 `mapState` expone `ingreso_forecast` de **un** latest month y omite `desc_kg`. No sirve como serie 3M.

### 4) comments

| Pieza | Hecho físico |
|-------|----------------|
| Tabla | `arr.cliente_comentarios` |
| Join | `planta_id` + `cliente_key = ANY(keys)` + `is_active` + key no vacía |
| Helper | M11 `queryCommentsByKeys` L297–311 (`author_name`, `created_at`, `body`) |
| Recency | `ORDER BY created_at DESC` |
| Fallback nombre | Existe en API. **Prohibido** aquí |

Comment ≠ cause.

### 5) DICF

| Pieza | Hecho físico |
|-------|----------------|
| Acciones | `arr.dicf_acciones` por `planta_id` + `cliente_key` |
| Helper | M11 `queryActionsByKeys` L314–328: estado, responsable, compromiso, `resultado_cierre`, `cerrado_at` |
| Historial | `arr.dicf_accion_historial` (ya en M11) |
| Estado comercial | `arr.dicf_cliente_mes` es snapshot latest-month (`kg_mes_real`, `kg_mes_forecast`, `ingreso_forecast`). Útil como contexto DICF del mes vigente, **no** como serie 3M de kg/descuento |

Action ≠ outcome. `resultado_cierre` / historial se reportan si existen; no se afirma recuperación.

### 6) Action Register

AUDIT-010 dijo «AR por `cliente_key`». **Corrección de esta auditoría:**

`arr.action_register_items` (`server.js` ~L7799): `planta_id`, `tema`, `title`, `responsable`, `due_date`, `closed`. **Sin `cliente_key`. Sin `cliente_nombre`.**

`lib/director-ia-action-person.js`: 0 matches de `cliente_key`. Path por persona.

El board (`action-register-board.js`) muestra `cliente_nombre` de **`arr.dicf_acciones`**, no de items AR.

**First slice:** «¿Tiene acciones?» / «¿Qué pasó con esas acciones?» = **DICF por `cliente_key`**. AR board = limitation: no hay linkage canónico a cliente. No join por nombre. `action_status` / action-person se preservan para Julio Pérez y no se reusan como pack de cliente.

---

## Periodo — «últimos 3 meses»

Convenciones existentes:

| Objeto | Semántica |
|--------|-----------|
| `commercial_trend` | **90 días trailing** anclados a `MAX(fecha)` de ventas. «Últimos 3 meses» en trend = 90d, **no** calendario (`director-ia-commercial-trend.js` L186–187, L274) |
| ARR mensual / `fetchKgMonto…` / `dicf_cliente_mes` / M9 | Mes calendario `year` + `month` |
| `plant_diagnosis` | Mes DICF vigente + mes previo |

**Selección para el perfil (grano mensual):**

```text
Ancla: fecha de hoy en America/Mexico_City.
M0  = mes calendario actual
M-1 = mes calendario anterior
M-2 = mes anterior a M-1
Default = [M-2, M-1, M0]
```

- M0 se etiqueta **PARTIAL** si hoy no es el último día calendario de M0, **o** si `MAX(fecha)` de ventas de esa planta/canal en M0 < último día de M0.
- M-1 y M-2 son completos **solo** si la fuente de la planta cubre el mes. No se comparan con M0 como equivalentes sin la etiqueta.
- Meses explícitos («mayo, junio y julio») **sustituyen** el default. Siguen siendo calendario.
- «Últimos 90 días» **no** se traduce a 3 meses calendario. Es otro objeto (`commercial_trend`). First slice no confla. Si el usuario pide 90d **dentro** del padre perfil: information_gap de grano, no reusar la serie OLS.

La respuesta debe declarar los YYYY-MM y cuáles son parciales.

---

## Top client

Mayor volumen = `SUM(kg)` en **el mismo** default de 3 meses calendario, **misma** planta, **mismo** canal si el hilo lo hereda (CASA/COMISIONISTA).

Filtro de canal: el de trend (`LIKE '%comisionista%'`), no el helper del dashboard que colapsa canal.

Identidad: tras el rank, adjuntar `cliente_keys` con `deriveClienteKeys`. Empate de `SUM(kg)`: clarificar. No silent pick.

No hay query plant-wide 3M en el chat hoy. El loader del read model la crea.

---

## Source strategy A/B/C/D — exactamente una

| | Viable | Por qué |
|---|--------|---------|
| **A** loaders aislados | No | Ningún loader produce 3 filas mensuales alineadas (kg, desc/kg, comments, DICF). Orchestrar M11 + trend + M9 + comments manda grano distinto a GPT. |
| **B** read model reusable | **Sí** | Un compose runtime keyed por keys + periodo + planta + canal. Alinea meses en código. Read-only. Preferido por la tarea. |
| **C** persisted profile | No | Out of scope. No es físicamente necesario: las diarias ya se agregan. Evitar persistencia. |
| **D** GPT raw | No | Prohibido. GPT no adivina el join ni alinea meses. |

**Seleccionado: B.**

Forma del pack (runtime owns, GPT no):

```text
identity: cliente_key / cliente_keys[], display_name, plant, canal?
period: [YYYY-MM, …] + partial/completed
rows[]: month, kg | null, discount_per_kg | null, income: omitted
direction: first-vs-last / MoM sobre buckets mensuales (NO OLS de commercial_trend)
context: comments[], dicf_actions[] + historial, ar: unsupported
limitations[] + provenance
```

---

## Routing A/B/C/D — exactamente una

| | Viable | Por qué |
|---|--------|---------|
| **A** inherit commercial_trend | No | Es el status quo. Swallow de pronoun/action/unknown. |
| **B** padre `client_profile` | **Sí** | Un padre semántico. Slots: keys, planta, meses, canal. Requery. No phrasebook. |
| **C** phrasebook | No | Prohibido. No lista de frases canónicas. |
| **D** segundo LLM router | No | Prohibido. |

**Seleccionado: B.**

Mecanismo (no phrasebook):

- Tras `active_entity` canónico único + pregunta de perfil / métrica mensual / comments / acciones de **ese** cliente → `parent_intent = client_profile`, no `trendFollowUp`.
- `classifyFollowUpKind` ya etiqueta clases (`pronoun`, `action`). Eso es clasificador de follow-up existente, **no** un diccionario de producto. IMPL usa clase + entidad activa + dominio, no agrega frases exactas.
- Pregunta directa «mayor volumen» / «cómo se ha comportado 3 meses» → `client_profile` (top o named), no `unknown`.
- `action_status` standalone (persona) **sigue ganando**.
- Topic return y persistent memory se preservan.

Patrón cercano ya existente: forceIntent post-planner del brief diario cross-metric.

---

## Intent

| Candidato | ¿Sirve? |
|-----------|---------|
| `client_analysis` | **No.** Está en el planner (comentarios, bitácora, «análisis/DICF»). **No hay handler in-process** en `director-ia-chat.js`. Cae a dump genérico (`dicf`, comments, bitácora, entidades, arr) sin alineación mensual. También captura comentarios de folio. Extenderlo mezcla bitácora + dump + 3M. |
| `expediente_comercial` | **No extender.** M11 = 1 mes latest, factual, detector «expediente». No tiene desc/kg 3M. Sobrecargarlo rompe COMPLETE de M11. |
| `longitudinal_client_profile` | Innecesario. El periodo es **slot**. |
| **`client_profile`** | **Sí.** Un padre de cliente. Nuevo intent. |

Periodo ≠ intent. Descuento/kg ≠ intent. Acciones del cliente ≠ intent nuevo: van en el pack del padre.

---

## Handoff commercial_trend → perfil

```text
preserve: planta, active_entity.cliente_key / cliente_keys, canal heredado
discard:  points[], OLS slope, movers[], 90d series como evidencia de cliente
requery:  obligatorio — pack fresco del read model
parent:   client_profile
period:   default calendario 3M (no copiar 90d)
```

«Háblame del primero» puede seguir resolviendo el mover (eso ya funciona). El turno siguiente de perfil **no** reusa esa evidencia de tendencia.

---

## Follow-ups (padre `client_profile`)

Deben conservar keys + planta + meses y requery el dominio pedido:

| Pregunta | Dominio |
|----------|---------|
| ¿En qué mes compró más? | `rows[].kg` |
| ¿En qué mes tuvo más descuento? | `rows[].discount_per_kg` |
| ¿Ese mes compró más? | misma fila kg vs otras; coincidencia temporal ≠ causa |
| ¿Cuánto ingreso? | limitation D; no inventar |
| ¿Qué comentarios? | comments por key |
| ¿Tiene acciones? | DICF por key |
| ¿Qué pasó con esas acciones? | historial / `resultado_cierre` si existe |

---

## Causalidad y partial data

Seguro: «descuento subió y volumen también»; «coinciden en el mes»; «hay comentario de competencia».

Inseguro: descuento causó volumen; comentario = causa; acción = recuperación.

| Caso | Comportamiento |
|------|----------------|
| Ingreso no defendible | Perfil útil con kg/descuento + limitation |
| Comments ausentes | Campo vacío + limitation; no «no hay nada» como hecho de negocio |
| Acciones DICF ausentes | `without_action` solo si las keys son válidas y el query respondió |
| Un mes missing | null, no 0, si la fuente de planta falta |
| 0 observado | Solo si la fuente del mes respondió y el cliente no tiene filas |
| AR board | unsupported, no 0 acciones de tablero |

Authz: misma planta, `plantas_permitidas`, fail-closed, no cross-plant.

---

## Runtime vs GPT

Runtime owns: identidad, periodo, alineación mensual, `SUM(kg)`, `SUM(monto)/SUM(kg)`, semántica de ingreso (omitido), retrieval comments/DICF, authz, provenance, ausencia.

GPT owns: síntesis ejecutiva, qué destaca, wording de correlación **con caveats**, qué investigar, follow-up.

No IES. No N5. No causalidad.

---

## G2 / G3

Constitución VI.4 / IX: Interfaces (chat) no alteran el IES. El índice marca IES y Reasoning Engine con runtime pendiente.

Este slice es **chat legado + read model**. No entra al pipeline constitucional N1–N5. No redefine EKE / `04` / `05`. No persiste perfil. No schema.

Mismo patrón que `ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`:

- **G2: N/A**
- **G3: N/A**

---

## First slice (para el IMPL propuesto; no ejecutado)

1. Read model B: 3 meses calendario (M-2, M-1, M0 parcial) × kg × `SUM(monto)/SUM(kg)` + comments + DICF/historial.
2. Ingreso: omitido (D) + limitation.
3. AR board: unsupported + limitation.
4. Intent + handler `client_profile`. Top client por `SUM(kg)`.
5. Routing B: romper swallow de trend sobre pronoun/action/unknown de perfil.
6. Handoff: conservar keys/planta/canal; requery; no reusar evidencia de trend.
7. Tests: identidad, ambigüedad, periodo/parcial, math, null≠0, handoff, follow-ups, regresiones (trend, daily brief, action-person, topic return, persistent memory, suite Director IA).

Fuera de first slice: Taller Mayor, SEH, saludo, IGF mes cerrado, schema, SQL de producto, persisted profile, emitir fórmula C como ingreso, OLS diario, phrasebook.

Preservar: `commercial_trend`, daily brief, action-person, topic return, persistent memory.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** El IMPL no cambia la matriz salvo política humana independiente.

---

## Límites (READY_WITH_LIMITS, no BLOCKED)

- Identidad de volumen no vive en `cliente_key`; se deriva. Suficiente: el mismo patrón ya opera en trend/M11.
- Ingreso D diferido. Semántica C determinada y no etiquetada como actual.
- AR items sin linkage de cliente.
- `fetchKgMontoPorClienteMesCalendario` no se reusa tal cual (colapsa canal).
- «Últimos 3 meses» significa cosas distintas en trend (90d) y en perfil (calendario). El IMPL debe declararlo.

No BLOCKED: el path canónico existe.
No STOPPED: ingreso no exige decisión humana; ya está determinado.

---

## NEXT_TASK

Propuesta exacta, **no autorizada, no ejecutada**:

`IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001`

STOP.
