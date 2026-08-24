# Reporte — ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M11 — DICF + acciones + comentarios cliente"
slice: "expediente comercial factual por cliente (estado observado + comentarios almacenados + acciones DICF + historial + resultado_cierre); join planta_id + cliente_key; sin causalidad inventada; sin bitácora/Plaud; sin binarios; sin CRUD"
intent_choice: "A — expediente_comercial (no reutilizar client_analysis)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"
  - "lib/director-ia-commercial-state.js, dicf.js, dicf-acciones.js, cliente-comentarios.js (lectura)"
  - "lib/comercial-entidad.js, director-ia-action-register.js, director-ia-planner.js, director-ia-tools.js, director-ia-chat.js (lectura)"
  - "server.js dashboardBlockDicfAccionesRole (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. El slice profundiza PARTIAL; no redefine COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia M11 ni 50.0%."
  - "Un IMPL futuro seguiría PARTIAL y 10.0/20 = 50.0%."
```

## Resumen ejecutivo

**READY.** Existe un path SELECT-only, in-process, autorizado y semánticamente separable para un **expediente comercial factual** de **un** cliente resuelto.

La cadena no es un join inventado. `arr.dicf_acciones.cliente_key` se construye con `buildClienteKey(planta canónica, grupo_tipo, canal, subcanal, cliente_nombre)`. El estado comercial **no guarda** `cliente_key`; el producto ya deriva esa misma clave en `injectAccionesAbiertas`. Historial y `resultado_cierre` cuelgan de la **acción** (`accion_id` / columna), no del cliente.

**No** se afirma causa. Comentario ≠ motivo. Acción ≠ solución. Cerrada ≠ exitosa. Responsable de acción ≠ responsable de la caída. Cronología ≠ causalidad.

**Intent: A — `expediente_comercial`.** No reutilizar `client_analysis` (mete bitácora; no trae commercial_state). No reutilizar el routing `commercial_state` (excluye acciones/historial).

Un IMPL futuro deja M11 en **PARTIAL** y el global en **10.0 / 20 = 50.0%** (0.0 pp).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m11-expediente-comercial-readiness-001` (≠ `main`).
- HEAD: `2ff14d7c Merge branch 'architecture/director-ia-global-next-module-prioritization-005'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005` |
| Módulo | M11 — DICF + acciones + comentarios |
| Estado actual | **PARTIAL** |
| Global | **10.0 / 20 = 50.0%** |
| Tras IMPL futuro | PARTIAL; **50.0%**; **0.0 pp** |

Hoy las capas existen **separadas**: listas `commercial_state`, `summarizeDicfContext` (~40, **sin** `cliente_key`), comentarios cola de planta (80), `acciones_abiertas` solo como conteo.

---

## Definición canónica M11

Ficha vigente: propósito = oportunidades/proyección por cliente, compromisos DICF, comentarios. Cobertura **PARCIAL**. Este slice **profundiza** PARTIAL. No attachments, no Excel DICF, no CRUD, no universo sin límite. **No** COMPLETE. Efecto porcentual **0.0 pp**.

---

## Estado comercial

| Campo | Hecho físico |
|---|---|
| Fuente | `dicf.computeDicf` sobre `arr.ventas_diarias_cliente` (+ descuentos, margen IGF). Caché `arr.dicf_cliente_mes` (DELETE+INSERT al computar). |
| Helper actual | `loadCommercialStateForChat` → `computeDicf` + `injectAccionesAbiertas` |
| Periodo | Mes de `last_date` / `periodoMes`; ventana `window_days` (default 60, override `arr.dicf_config`) |
| `planta_id` | En el payload del chat (`plantaId`), **no** en cada fila de cliente |
| `cliente_key` | **No almacenado** en el objeto cliente |
| Campos observados | `cliente`, `canal`, `subcanal`, `lastPurchaseDate`, kg/ingreso A-B, `deltaIngresoStr` |
| Campos derivados | categoría `dejaron`/`disminuyeron`/`aumentaron`/`nuevos` (`es_*`); `estado` Activo/Latente/Inactivo; `acciones_abiertas` (COUNT) |

**Hecho vs derivado.** La categoría es **clasificación calculada** del motor DICF, no una causa. En expediente se muestra como estado observado del periodo, no como motivo.

**Write.** `computeDicf` persiste caché. `loadCommercialStateForChat` **no** es SELECT-only. El IMPL **no** debe reutilizar ese helper tal cual. Opciones físicas: computar **sin** DELETE/INSERT, o SELECT `arr.dicf_cliente_mes` del mes (puede estar vacío → estado ausente, válido).

---

## Comentarios

| Campo | Hecho físico |
|---|---|
| Fuente | `arr.cliente_comentarios` |
| Helper | `listClienteComentarios` (por `cliente_key` o, si no hay key, nombre+canal+subcanal). `loadClienteComentariosForDirectorIa` = últimos 80 de **planta** — **no** usar en el expediente |
| Texto | `body` (alta máx. 4000) |
| Autor | `author_name` (default `''`; no inventar) |
| Timestamp | `created_at` |
| `planta_id` | NOT NULL |
| `cliente_key` | **NULLABLE** |

**Regla.** Comentario ≠ causa ≠ diagnóstico. Filas con `cliente_key` null **no** entran por join de clave. Tras resolución **única** de cliente, el fallback nombre+canal+subcanal del helper existente es lícito (no es nombre libre). Cola planta 80 queda fuera.

---

## Acciones DICF

| Campo | Hecho físico |
|---|---|
| Fuente | `arr.dicf_acciones` |
| `planta_id` | NOT NULL |
| `cliente_key` | NOT NULL; `buildClienteKey` en el INSERT |
| Acción | `descripcion`, `public_code`, `id` |
| Responsable | `responsable_usuario_id` → nombre via `usuarios` |
| Fechas | `created_at`, `fecha_compromiso`, `compromiso_deadline_at`, `cerrado_at` |
| Estatus | `estado` (`sin_compromiso` / `pendiente` / `hecho`, etc.) |
| `resultado_cierre` | columna TEXT de la **acción** |
| `acciones_abiertas` | no es columna; COUNT `cerrado_at IS NULL` y `estado <> 'hecho'` |
| Helper lista | `listAcciones(..., { cliente_key })` ya filtra por clave; LIMIT 500 (API, no chat) |

**Reglas.** Acción ≠ solución. Responsable de acción ≠ responsable del desempeño. Cerrada ≠ exitosa. `resultado_cierre` ≠ impacto causal.

`summarizeDicfContext` **omite** `cliente_key`. El expediente no puede reutilizar esa proyección.

Equiv de planta: `getPlantaIdsEquivalentes` (ya en DICF).

---

## Historial y resultado_cierre

| Campo | Hecho físico |
|---|---|
| Historial | `arr.dicf_accion_historial` (`accion_id` FK, `evento`, `detalle` JSONB, `creado_en`, `actor_usuario_id`) |
| Relación | **acción**, no cliente. Sin `cliente_key` |
| Orden físico | `ORDER BY accion_id ASC, creado_en ASC` (`loadHistorialBatch`) |
| Cierre | `arr.dicf_acciones.resultado_cierre` + evento historial `cerrada` |

Cronología = antes/después. **No** secuencia causal. SELECT-only.

---

## Join `planta_id` + `cliente_key` (fuente por fuente)

| Fuente | `planta_id` | `cliente_key` | ¿Join lícito? |
|---|---|---|---|
| Estado comercial | payload / planta del scope | **derivada** con `buildClienteKey` (mismos inputs que el INSERT y que `injectAccionesAbiertas`) | Sí, si el cliente está unívocamente resuelto (canal/subcanal/grupo) |
| `arr.dicf_acciones` | almacenado | almacenado NOT NULL | Sí, `planta_id = ANY(equiv)` AND `cliente_key IN (keys derivadas)` |
| `arr.cliente_comentarios` | almacenado | nullable | Sí **solo** si `cliente_key` coincide; null → solo fallback del helper **después** de resolución única |
| Historial | vía acción | no | Sí, `accion_id` de acciones ya filtradas |
| `resultado_cierre` | vía acción | no | Sí, columna de esas acciones |
| `arr.comercial_entidad` | almacenado | **no existe** | No une al expediente; solo resuelve nombre/alias |
| `arr.dicf_cliente_mes` | `plant_code` (no id) | no | Lectura de estado; key se deriva igual |

`grupo_tipo` es parte de la clave. Igual que `injectAccionesAbiertas`, el IMPL prueba el set de grupos (`c.estado` y etiqueta de lista: «Dejaron de comprar», «Disminuyeron», «Aumentaron», «Nuevo»). **No** fallback a nombre libre sobre acciones. Si ninguna key pega: capa de acciones vacía (válido), no inventar match.

Cardinalidad: 1 cliente → N keys (un grupo cada una) → N acciones / N comentarios. Duplicado de nombre + distinto canal = **otro** cliente → clarificar.

---

## Resolución de cliente

`resolveCommercialEntitiesForQuestion` puede devolver **varias** entidades. `comercial_entidad` no tiene `cliente_key`. Match en commercial_state es por `cliente`+`canal`+`subcanal`.

**Algoritmo requerido (IMPL):**

1. Extraer menciones de catálogo.
2. 0 menciones: buscar en estado comercial del periodo un match único por tokens de la pregunta. 0 o >1 → **clarificar**.
3. >1 entidad → **clarificar**.
4. 1 entidad: clientes de estado comercial que coincidan con canónico/alias. >1 (p. ej. mismo nombre, otro canal) → **clarificar**.
5. 1 fila comercial: derivar keys con `buildClienteKey`.
6. 0 fila comercial: si en `dicf_acciones` de la planta hay **exactamente una** `cliente_key` para ese nombre normalizado → usarla; si no → **clarificar**. Estado = «no aparece en el estado comercial del periodo» (ausencia factual).
7. Sin cliente unívoco: **no** construir expediente.

---

## Semántica temporal

| Capa | Tiempo |
|---|---|
| Estado | Periodo DICF (`periodoMes` / `last_date` / ventana) |
| Comentarios | `created_at` |
| Acciones | `created_at`, `fecha_compromiso`, `cerrado_at` |
| Historial | `creado_en` |
| Cierre | `cerrado_at` + texto `resultado_cierre` |

Mostrar orden factual. Prohibido: «el comentario causó la caída» o «la acción corrigió el delta».

---

## Authz / scope planta

Preservar, fail-closed, intersección (si una capa exigida falla, falla el expediente):

| Capa | Regla vigente |
|---|---|
| Chat | JWT `req.dashboardAuth`; `planta_id`; `plantas_permitidas`; cross-planta 403 |
| Commercial state | GA 403 (`loadCommercialStateForChat`); GV vía `assertGVPlantaNombreAccess` |
| Acciones DICF HTTP | `dashboardBlockDicfAccionesRole` + `isDicfAccionesRole` (ZP/GG/GV/AD) + `assertPlantaAcceso` (ZP/AD globales; resto equiv) |
| Comentarios chat | misma planta del context (no hay tool de write) |

El loader nuevo **no** usa HTTP interno. Equiv de planta = la de DICF (`getPlantaIdsEquivalentes`). No ampliar GA. No “arreglar” el desajuste catálogo `acceso_acciones_dicf` (GV false) vs `isDicfAccionesRole` (GV true): usar las funciones de las fuentes leídas.

---

## Planner / tools — elección A

| Superficie | Qué hace hoy |
|---|---|
| Intent `commercial_state` | Listas; **excluye** acciones/historial/cierre |
| Intent `client_analysis` | dicf + comentarios + **bitácora** + entidades + arr; **sin** commercial_state |
| Routing chat | `wantCommercialState` gana y silencia `dicf_focused` |
| `get_commercial_state` | `loadCommercialStateForChat` (write de caché) |
| `get_dicf_context` | `summarizeDicfContext` always-on, sin `cliente_key` |
| `get_cliente_comentarios` | cola planta 80 |
| `resolve_entidades_comerciales` | menciones; 0..N |

**A — intent `expediente_comercial` + tool `get_commercial_dossier` + executor `loadCommercialDossierForChat`.**

No B: `client_analysis` arrastraría bitácora/Plaud (frontera prohibida) y no ensambla estado comercial.

Conservar routing actual de listas y de `dicf_focused`. El intent nuevo solo si hay cliente resoluble + wording de expediente/seguimiento/«qué pasó con {cliente}», no si es lista «quiénes dejaron».

---

## Política de contexto (números justificados)

No se inventan cupos. Se recortan los techos **ya** usados en producto/chat:

| Capa | Límite expediente | Justificación |
|---|---|---|
| Clientes | **1** | `COMMERCIAL_STATE_CLIENT_LIMIT` = 20 es de **lista**; expediente ≠ lista |
| Comentarios | **8**; **500** chars; truncation explícito | Helper per-cliente default 50 / alta 4000 / cola planta 80 son demasiado para un prompt conjunto; mismo recorte que notas M12 |
| Acciones | **8**; `created_at DESC` | Plant-wide 40; API 500. Un cliente no debe volcar el tablero |
| Historial | **8** eventos / acción; `creado_en ASC` | `loadHistorialBatch` hoy no recorta; el ciclo típico es pocos eventos |
| Estado | **1** fila / periodo | Una clasificación observada |

Orden de capas: estado → comentarios (`created_at DESC`) → acciones (`created_at DESC`) → historial (`creado_en ASC`). 0 comentarios / 0 acciones / 0 historial / sin estado = expediente válido (capa vacía explícita). Overflow: no cargar más clientes ni más meses.

---

## Fronteras semánticas

| Prohibido | Permitido |
|---|---|
| estado comercial = causa | categoría/periodo observados |
| comentario = motivo probado | texto, autor almacenado, fecha |
| acción = solución | descripción, estado, fechas, responsable de **esa** acción |
| `resultado_cierre` = éxito | texto almacenado de cierre |
| responsable de acción = dueño de la caída | nombre del campo `responsable` de la acción |
| cronología = causalidad | antes/después |
| bitácora / Plaud / notas AR / M2 / folio comments / attachments | fuera |
| join por nombre libre | solo tras resolución única, con helper existente |

---

## Tabla de evidencia

| component | source | helper | join_key | select_only | fields | time_semantics | authz | plant_scope | context_limit | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Estado | `computeDicf` / `dicf_cliente_mes` | no reusar loader con persist | key **derivada** | sí si se evita persist | cliente, canal, subcanal, categoría, periodo, deltas | periodo mes / last_date | GA 403; GV planta | `planta_id` payload | 1 fila | motor sí; helper no tal cual | medio (derivado ≠ causa; write caché) | `dicf.js` L143+; commercial-state L234 |
| Comentarios | `arr.cliente_comentarios` | `listClienteComentarios` | `planta_id`+key (null no junta) | sí | body, author_name, created_at | created_at DESC | planta chat | `planta_id` | 8 / 500 | sí (no cola 80) | medio (null key) | `cliente-comentarios.js` L12, L76 |
| Acciones | `arr.dicf_acciones` | `listAcciones` / SELECT nuevo | `planta_id` equiv + key almacenada | sí | descripcion, estado, responsable, fechas, resultado_cierre | created_at | `assertPlantaAcceso` | equiv DICF | 8 | sí; no `summarizeDicfContext` | medio (grupo en la key) | `dicf-acciones.js` L70, L163, L391 |
| Historial | `arr.dicf_accion_historial` | `loadHistorialBatch` | `accion_id` | sí | evento, detalle, creado_en, actor | creado_en ASC | vía acción | vía acción | 8 / acción | sí | bajo | L528 |
| Cierre | columna `resultado_cierre` | misma acción | n/a | sí | texto | cerrado_at | vía acción | vía acción | 1 / acción | sí | medio (≠ éxito) | L202, L606 |
| Resolución | `arr.comercial_entidad` | `resolveCommercialEntitiesForQuestion` | **sin** key | sí | nombre_canonico, alias | n/a | planta | `planta_id` | 1 entidad | sí | alto si N>1 | `comercial-entidad.js` L854 |

---

## Tabla de gaps

| gap_id | missing_capability | required_for_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G-KEY-DERIVE | estado no trae `cliente_key` | sí | `buildClienteKey` + grupos de `injectAccionesAbiertas` | derivar keys en el loader | no | no | no | baja | no |
| G-SUMMARIZER-KEY | `summarizeDicfContext` omite key | sí | SELECT `dicf_acciones` | no reusar esa proyección | no | no | no | baja | no |
| G-CACHE-WRITE | `computeDicf` escribe caché | sí (SELECT-only) | motor / `dicf_cliente_mes` | persist off o SELECT caché | no | no | no | media | no |
| G-RESOLVE | 0..N entidades; sin key | sí | `resolveCommercialEntitiesForQuestion` | clarificar si ≠1 | no | no | no | media | no |
| G-COMMENTS-NULL | comentarios sin key | sí (capa comentarios) | fallback helper post-resolución | no nombre libre | no | no | no | baja | no |
| G-INTENT | no hay expediente | sí | planner/tools/chat | intent+tool+loader nuevos | no | no | no | media | no |
| G-SILOS | routing separa listas vs DICF | sí | conservar ambos | no reusar `client_analysis` | no | no | no | baja | no |
| G-ATTACH | attachments DICF | no | — | fuera | — | — | — | — | no |

Ningún gap bloquea READY.

---

## Hipótesis de implementación

```text
expediente_comercial
  → get_commercial_dossier
  → loadCommercialDossierForChat
       → JWT; planta; fail-closed (intersección GA/DICF/planta)
       → resolver 1 cliente (si no: clarificar)
       → estado (sin persist de computeDicf)
       → buildClienteKey (set de grupos)
       → SELECT comentarios (key; fallback helper solo post-resolución)
       → SELECT acciones (equiv + keys) + loadHistorialBatch
       → recorte 1 / 8 / 8 / 8 / 500
       → evidencia por capa; openai_called false
  → respuesta factual
```

In-process. SELECT-only. Sin HTTP interno. Sin writes. Sin contrato nuevo.

---

## Tests a diseñar (si se autoriza IMPL)

Expediente por `cliente_key`; resolución por nombre; ambiguo → clarificar; estado; comentarios; acciones; abiertas; historial; `resultado_cierre`; 0 comentarios/acciones/historial; cliente sin estado; nulls; orden temporal; no causalidad; no motivo; no responsable de caída; planta ok/403; `plantas_permitidas`; cross-planta; GA/GV; intent/tool/executor; wiring; no fallback incorrecto; no HTTP interno; no writes; no bitácora/Plaud/notas AR; no `computeDicf` persist.

---

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A (profundiza PARTIAL) |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

---

## Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro (si se autoriza) |
|---|---|---|
| M11 | PARTIAL | **PARTIAL** |
| Global | **50.0%** | **50.0%** (0.0 pp) |

---

## Riesgos

- Inventar causa o éxito.
- Reusar `loadCommercialStateForChat` (write) o cola 80 de comentarios.
- Join por nombre o por `grupo_tipo` incompleto.
- Construir expediente con 2+ matches.
- Meter bitácora vía `client_analysis`.
- Atribuir nota AR o history M2.
- Aflojar GA.
- Attachments.

---

## NEXT_TASK

`IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001` (propuesta; no autoriza G1 ni encadena).

---

## Acciones no realizadas

- No código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 50.0%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m11-expediente-comercial-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
