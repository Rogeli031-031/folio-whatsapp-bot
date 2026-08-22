# Reporte — ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "sql/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "package.json"
  - "package-lock.json"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
tests_executed: []
next_task_proposed: "IMPL-DIRECTOR-IA-M16-DUPLICADOS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A. G3 = N/A. El inventario/registry/chat existentes bastan; no hace falta contrato D1–D9 ni dispatcher genérico nuevo."
  - "G8 permanece N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Ejecución

- Rama: `architecture/director-ia-m16-duplicados-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T21:16:47-06:00`.
- G2/G3: auditados como **N/A** (no preventivos). G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin smoke productivo. Sin commit, push, merge. Sin siguiente tarea.
- Tests existentes no ejecutados: la evidencia de readiness es estructural (código y contratos); no era necesario verificar runtime.

## Resumen ejecutivo

M16 puede pasar de `NOT_STARTED` a COMPLETE operativo con **exactamente un slice read-only**.

La fuente de análisis ya existe: `findDuplicatePairs` en `lib/folio-duplicados.js`, alimentada por `loadFoliosParaDuplicados` y expuesta en `GET /api/folios/duplicados/analisis`. El intent `duplicate_folios` y el tool `get_duplicate_folios` ya están declarados.

Hoy Director IA **no consulta esa fuente**. El corte físico no es “falta wiring” genérico: `detectUnsupportedDirectorIaDomain` en `lib/director-ia-chat.js` aborta la pregunta con `SOURCE_NOT_INTEGRATED` **antes** de OpenAI, contexto o tools. El planner y el orchestrator solo planifican; **no ejecutan**. El registry prohíbe executor mientras el tool siga `declared_not_integrated`.

El algoritmo es **heurístico** (mismo importe redondeado + similitud de concepto ≥ umbral). No es duplicado confirmado. Cancelar folio es escritura ALTO y queda fuera del COMPLETE de lectura.

Alternativa recomendada: **A** — loader read-only que reutiliza la misma carga/authz del endpoint y llama `findDuplicatePairs` en proceso, siguiendo el patrón de anexos existentes (`loadIgfArrAnnexForChat`). No HTTP interno. No cycle constitucional. No UI nueva. No contrato arquitectónico nuevo.

`CAN_REACH_COMPLETE_IN_ONE_READ_ONLY_SLICE = YES`

---

## 1. Definición canónica de M16

Fuente: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` §M16 (no modificada).

| Campo | Valor físico |
|---|---|
| ID | M16 |
| Módulo | Análisis duplicados |
| Propósito empresarial | Detectar parejas de folios similares y **opcionalmente** cancelar. |
| Cobertura actual | **NO INTEGRADA** |
| Información que sí consulta | Ninguna |
| Información que no consulta | `/api/folios/duplicados/check`, `/analisis` |
| Archivos citados | `lib/folio-duplicados.js` |
| Endpoints citados | `/api/folios/duplicados/*` |
| Tablas | `public.folios` |
| Funciones reutilizables | `findDuplicatePairs`, `findSimilarTo` |
| Lectura posible | DETECTAR RIESGOS / CONSULTAR |
| Escritura posible | CANCELAR folio desde UI análisis — **ALTO** |
| Permisos | Auth + bloqueo GV folios |
| Riesgo | MEDIO (lectura); ALTO (cancelar) |
| Dependencias | Folios |
| Observaciones | Independiente de duplicados Excel Taller (M5) y COMPARAR (M4) |

Parte 1 de la misma matriz: **COMPLETA** = «Director IA consulta directamente la fuente y puede responder de forma consistente dentro del alcance de esa fuente.»

Pregunta de negocio (Parte 9, fila 14): «¿Existen posibles folios duplicados?» — fuente `findDuplicatePairs` / `/api/folios/duplicados/analisis`. El propio enunciado usa **posibles**.

### Qué tendría que existir físicamente para M16 COMPLETE

1. Director IA consulta la fuente de análisis (`public.folios` vía loader existente + `findDuplicatePairs`).
2. Responde de forma consistente con evidencia estructurada de **posibles** pares.
3. Respeta auth/authz/scope de esa fuente (JWT, GV, planta permitida, límites).
4. Maneja empty/error/datos insuficientes sin inventar certeza.
5. Tests focales/integración que cubran el wiring y la ausencia de mutaciones.

**No** se exige cancelar, editar, fusionar ni persistir resolución. «Opcionalmente cancelar» es capacidad de escritura separada (ALTO), no requisito de COMPLETE de CONSULTAR/DETECTAR RIESGOS.

Esta ARCH no modifica la matriz. Un sync documental de cobertura COMPLETA, si procede, sería una tarea DOCS posterior; no es este NEXT_TASK.

---

## 2. `findDuplicatePairs`

| Aspecto | Evidencia |
|---|---|
| Archivo | `lib/folio-duplicados.js` |
| Export | `module.exports.findDuplicatePairs` (líneas 173–240, 248) |
| Firma | `findDuplicatePairs(rows, opts = {})` |
| Parámetros | `rows`: array de folios ya cargados. `opts.umbral` (default `0.72`), `opts.maxPairs` (default `200`), `opts.maxGroupSize` (default `80`) |
| Fuente de datos | **Ninguna propia.** No hace SQL. Opera sobre `rows` que le pasen. |
| Tablas/servicios | Ninguno en el helper. La carga está en `server.js` → `loadFoliosParaDuplicados`. |
| Header del archivo | «posibles folios duplicados»; «Sin IA». |

### Criterio exacto de detección

Un par entra en `pairs` si y solo si:

1. Ambos importes, redondeados a 2 decimales (`roundImporte`), son **iguales** y **no** `null`/`0`.
2. `conceptoSimilarity(concepto_a, concepto_b) >= umbral`.

Concepto: `descripcion || concepto` (`folioTextoConcepto`). En la carga SQL del endpoint el concepto ya viene como `COALESCE(f.descripcion, f.concepto)`.

### Normalizaciones y score

- Acentos NFD; minúsculas; no alfanumérico → espacio.
- Tokens: longitud > 1, sin stopwords.
- Score: `max(Jaccard tokens, Dice bigramas * 0.55 + Jaccard * 0.45)`, redondeado a 3 decimales.
- Fallback si no hay tokens: igualdad / includes / Dice sobre caracteres.

### Filtros, límites, orden, NULL

- Omite importe `null` o `0`.
- Grupos de mismo importe con 1 fila: no generan pares.
- Grupo > `maxGroupSize`: recorta a los más recientes por `creado_en`; marca `truncated: true`.
- Al alcanzar `maxPairs`: ordena por score desc y retorna `truncated: true`.
- Orden final: score desc, luego importe desc.
- `estatus`/`mes_cargo`/`creado_en` ausentes → `null` en el output; no bloquean el match.

### Output real

```text
{ pairs, scanned, groups_importe, truncated? }
```

Cada par: `{ score, importe, a, b }` con `id`, `numero_folio`/`folio_codigo`, `concepto`, `estatus`, `mes_cargo`, `creado_en`.

Errores posibles del helper: no lanza por filas malformadas típicas; `Number(n)` no finito → importe omitido. Errores de I/O no aplican (sin I/O).

### Semántica: qué significa «duplicado» aquí

**Clasificación: D — combinación de criterios, con el brazo de concepto en C (similitud heurística).**

- El match de importe es determinístico **sobre el número redondeado**, no sobre identidad de negocio.
- El match de concepto es **score heurístico**, no igualdad canónica ni confirmación humana.
- **No es A** (duplicado confirmado).
- No se convierte B/C en A: un score ≥ 0.72 no es certeza de fraude ni de duplicado real.

También exporta `findSimilarTo` (check preventivo al crear). **No** es el motor de M16 análisis de pares. `POST /api/folios/duplicados/check` usa `findSimilarTo`, no `findDuplicatePairs`.

---

## 3. Endpoint existente `GET /api/folios/duplicados/analisis`

| Aspecto | Evidencia |
|---|---|
| Handler | `server.js` ~11195–11236 |
| Middleware | `dashboardAuthMiddleware` + `dashboardBlockGVFoliosMiddleware` |
| Auth | JWT dashboard (`req.dashboardAuth`) |
| Authz extra | `assertPlantaPermitidaDashboard` (~11144–11152): GG/GA/AD con `plantas_permitidas` no vacías deben incluir `planta_id` |
| Roles | GV: 403 «Tu rol (GV) no tiene acceso al dashboard de folios.» (`dashboardBlockGVFoliosMiddleware` ~11432). Cancelar (otro endpoint) no aplica. |
| Query params | `planta_id` **obligatorio**; `umbral` (clamp implícito: si no está en 0.4–0.99 → 0.72); `desde`/`hasta` YYYY-MM-DD; si `desde` inválido: atajo `meses` (default **6**, max 36) |
| Planta | Obligatoria. 404 si no existe en `public.plantas`. Expande IDs equivalentes vía `getPlantaIdsEquivalentesForPendientes` (~3008) |
| Usuario | No filtra por usuario creador. Scope = planta (+ equivalentes) |
| Rango temporal | `creado_en` desde/hasta. Default últimos 6 meses si no hay `desde` válido |
| Estado del folio | Excluye `CANCELADO`. **No** excluye PAGADO/CERRADO/otros |
| Validaciones | `planta_id` numérico; fechas regex; umbral finito en rango |
| HTTP | 400 planta faltante; 403 sin permiso / GV; 404 planta inexistente; 200 `{ ok, planta_id, planta_nombre, desde, hasta, umbral, scanned, pairs_count, truncated, pairs }`; 500 catch |
| Empty | `ok: true`, `pairs: []`, `pairs_count: 0` — no es error |
| Relación con helper | **Llama directamente** `folioDuplicados.findDuplicatePairs(rows, { umbral, maxPairs: 200 })` |

El endpoint **no duplica** el algoritmo. Añade: auth/authz, carga SQL (`LIMIT 1500`, no-CANCELADO, equivalentes, fechas), metadata (`planta_nombre`, `desde`/`hasta`, `scanned`, `pairs_count`, `truncated`).

`loadFoliosParaDuplicados` (~11118–11141) **no está exportado**; es función local de `server.js`.

El executor Director IA **no** debe llamar este HTTP. El chat ya tiene `req.dashboardAuth` y `planta_id`.

Frontend dashboard: `frontend-dashboard/lib/api.ts` `fetchAnalisisDuplicados`; UI `AnalisisDuplicadosModal.tsx` (incluye cancelar — **fuera de M16 lectura**).

---

## 4. Intent `duplicate_folios`

| Aspecto | Evidencia |
|---|---|
| Archivo | `lib/director-ia-planner.js` |
| Registro | `INTENT_LABELS.duplicate_folios = "Folios duplicados"`; dominios `["duplicados", "folios"]` |
| Función | `planDirectorIaQuestion` → `makeIntent("duplicate_folios", [{ value: "folios_duplicados" }], 0.9)` ~261–266 |
| Activación | `duplicad` **y** (`folio` \| `existen` \| `hay` \| `analiz` \| `posible`) sobre pregunta normalizada (sin acentos) |
| Prioridad | Tras proyectos; antes de gastos. No hay override posterior específico |
| Routing posterior | **Ninguno en chat.** Header del planner: «No gobierna el routing del chat (solo planifica).» Chat llama planner + `buildDirectorIaToolPlan` **solo en debug** (`lib/director-ia-chat.js` ~2447–2455) |
| Qué ocurre hoy | El usuario **nunca llega** al planner en el camino caliente: `detectUnsupportedDirectorIaDomain` corta antes (~2440–2445) |
| Tests | `scripts/test-director-ia-planner.js`: `"¿Hay folios duplicados?"` → `duplicate_folios`. No hay test en `test/` para este intent |

Ejemplo real soportado por el código (no inventado): `"¿Hay folios duplicados?"`.

La misma regex vive en `UNSUPPORTED_RULES` id `duplicados` (`lib/director-ia-capabilities.js` ~495–498) y en el script `scripts/test-director-ia-capabilities.js` (`expectBlocked("¿Existen folios duplicados?", "duplicados")`).

---

## 5. Tool `get_duplicate_folios`

| Aspecto | Evidencia |
|---|---|
| Archivo | `lib/director-ia-tools.js` ~336–346 |
| Registro | `TOOLS[]`; mapa `DOMAIN_TO_TOOLS.duplicados = ["get_duplicate_folios"]` |
| Schema | Declarativo Fase 3. `requiredInputs: ["planta_id"]` (input conocido del registry) |
| Descripción/label | `"Duplicados de folios"` |
| Argumentos | Solo `planta_id` requerido. Sin `desde`/`hasta`/`umbral` en el contrato del tool |
| Output esperado | **No hay contrato de output** en el registry (el registry no define shapes de respuesta) |
| Permisos | Ninguno en el tool. Authz vive en el endpoint / deberá vivir en el loader |
| Dispatcher | `lib/director-ia-tool-orchestrator.js`: «No ejecuta tools. No consulta DB. No llama OpenAI.» |
| Estado | `status: declared_not_integrated`, `accessMode: not_integrated`, `readOnly: true`, **`executor: null`** |
| Capability hermana | `lib/director-ia-capabilities.js` ~317–326: `coverage: none`, `canRead: false`, `canWrite: false` |

`isDirectorIaToolExecutable` exige `readOnly` + executor no vacío + status `available` \| `available_on_demand`.

El registry **prohíbe** executor si status es `declared_not_integrated` (`executor_unexpected_for_not_integrated`).

Por eso hoy no hay ejecución real: no es un cable suelto. Hay **tres cortes físicos encadenados**:

1. **Corte de usuario (el que se siente):** `detectUnsupportedDirectorIaDomain` → `buildUnsupportedDomainChatResult` y `return`. No OpenAI, no contexto, no tools. Este early-return **no consulta `canRead`**: basta que la regla `duplicados` esté en `UNSUPPORTED_RULES`.
2. **Corte de registry:** `executor: null` + `declared_not_integrated` → `can_execute = false`. Poner un executor sin cambiar el status rompería `validateDirectorIaToolRegistry`.
3. **Corte de runtime:** aunque el plan marcará el tool, el orchestrator no invoca funciones y el chat no despacha el plan.

El nombre `executor` en tools ya integrados es una **etiqueta** (`"loadIgfArrAnnexForChat"`, `"buildDirectorIaContextPayload"`), no un puntero que el orchestrator resuelva.

---

## 6. Infraestructura Director IA y mapa físico

Inventario relevante (solo lectura):

| Pieza | Estado físico respecto a M16 |
|---|---|
| Tool registry | Tool declarado; no ejecutable |
| Dispatcher/orchestrator | Planifica; no ejecuta |
| Executors | String names en tools disponibles; invocación real es código de `askDirectorIa` (anexos/loaders) |
| Intent routing | Planner no rutea chat |
| Contexto | `buildDirectorIaContextPayload` no carga duplicados |
| Planta | `askDirectorIa` exige `planta_id` > 0; chat HTTP exige `planta_id` |
| Usuario | `req.dashboardAuth` / `req.dashboardUser` presentes en chat (`POST /api/director-ia/chat` + `dashboardAuthMiddleware`). Chat **no** aplica `dashboardBlockGVFoliosMiddleware` |
| Auth/authz | JWT en chat. Scope de folios **no** reaplicado hoy (el dominio se rechaza antes) |
| trace_id | Cycle constitucional (ARR→…); no aplica a este tool |
| Errores / abstenciones | `SOURCE_NOT_INTEGRATED` / `capability_limitation` |
| Evidencia / presentación | Superficie chat existente (`answer`, `sources`, `context_meta`) |

### Mapa end-to-end actual

```text
pregunta ("¿Hay folios duplicados?")
  → POST /api/director-ia/chat (dashboardAuthMiddleware, planta_id + question)
  → askDirectorIa
  → detectUnsupportedDirectorIaDomain  ← CORTE ACTUAL (regla duplicados)
  → buildUnsupportedDomainChatResult
       answer: "Duplicados de folios todavía no está integrado…"
       veracity: SOURCE_NOT_INTEGRATED
       openai_called: false
  → [planner / tool plan NO se ejecutan en este camino]
  → [get_duplicate_folios NUNCA se invoca]
  → [findDuplicatePairs / GET /analisis NUNCA se llaman desde Director IA]
```

Camino que existiría si no cortara (hoy solo debug):

```text
planDirectorIaQuestion → intent duplicate_folios
  → buildDirectorIaToolPlan → get_duplicate_folios
       status declared_not_integrated, executable=false
  → [GAP: no hay invocación de executor]
  → fuente findDuplicatePairs nunca alcanzada
```

---

## 7. Alternativas de implementación (no implementadas)

### Alternativa A — executor/loader in-process → `findDuplicatePairs`

```text
pregunta
  → (quitar corte UNSUPPORTED_RULES / marcar capability legible)
  → intent duplicate_folios (plan; opcional para el branch de chat)
  → get_duplicate_folios available_on_demand + executor nombrado
  → loader read-only (patrón loadIgfArrAnnexForChat)
       → GV + assertPlantaPermitidaDashboard
       → loadFoliosParaDuplicados (extraer/reutilizar; no copiar el matching)
       → findDuplicatePairs(rows, { umbral, maxPairs })
  → evidencia estructurada
  → respuesta (preferible determinística; ver §10)
```

| Criterio | Evaluación |
|---|---|
| Duplicación | Cero del algoritmo si se reutiliza el helper. Riesgo solo si se reescribe el SQL en vez de extraer `loadFoliosParaDuplicados` |
| Acoplamiento | Al lib + loader; no al HTTP |
| Auth/authz | Debe **reaplicar** explícitamente los asserts del endpoint; el helper solo no los tiene |
| Reutilización | Misma semántica que el dashboard |
| Testabilidad | Alta: unit del helper + loader con pool/auth fake |
| Errores | Mismos modos 400/403/404/500 traducidos a resultado de chat |
| Riesgo | Medio-bajo si authz se copia del endpoint; alto si se omite |
| Trazabilidad | `context_meta` + `sources` + filtros aplicados |
| HTTP interno | No |
| Consistencia | Igual que IGF/AR/bitácora: label de executor + llamada real en `askDirectorIa` |

### Alternativa B — executor → `GET /api/folios/duplicados/analisis`

```text
… → executor → HTTP GET /analisis (cookie/JWT interno) → evidencia → respuesta
```

| Criterio | Evaluación |
|---|---|
| Duplicación | Reutiliza handler, pero introduce cliente HTTP interno |
| Acoplamiento | A servidor, puerto, cookies, CSRF, loopback |
| Auth/authz | Solo si se reenvía el JWT del usuario; frágil |
| Reutilización | Del shape HTTP, no de una API de lib |
| Testabilidad | Peor (servidor vivo o mock HTTP) |
| Riesgo | Más superficie; timeouts; no es el patrón de tools existentes |
| HTTP interno | Sí — innecesario |

### Alternativa C (mencionada; no superior)

Crear un **dispatcher genérico** que resuelva `tool.executor` a funciones. Sería arquitectura nueva → **G2 REQUIRED**. No se recomienda. No hace falta para M16.

### Alternativa elegida

**A.** Un loader read-only que reutiliza carga + authz del endpoint y llama `findDuplicatePairs` en proceso. No modificar el algoritmo. No HTTP interno. No dispatcher genérico.

Presentación recomendada: respuesta **determinística** con evidencia (como el early-return de capability, pero con fuente disponible), para no dejar que el LLM convierta heurística en certeza. Adjuntar anexo a OpenAI es posible pero añade riesgo semántico; no es necesario para COMPLETE.

---

## 8. Read-only

**Sí: M16 puede llegar a COMPLETE sin ninguna mutación.**

La definición canónica de COMPLETE (Parte 1) es consultar la fuente y responder. DETECTAR RIESGOS/CONSULTAR es lectura. CANCELAR es opcional, ALTO, y vive en `POST /api/folios/:id/cancelar` + `AnalisisDuplicadosModal`.

Queda **fuera** del eventual IMPL:

- cancelar folio
- editar folio
- cambiar estado
- fusionar folios
- marcar resolución
- borrar
- escribir resultados
- persistir decisiones humanas

La definición canónica **no** exige mutación para COMPLETE de análisis. No hay hallazgo material que fuerce escritura.

---

## 9. Auth / authz / scope

### Scope real de los duplicados (endpoint de análisis)

| Criterio | ¿Limita? |
|---|---|
| Planta | Sí (`planta_id` + IDs equivalentes) |
| Usuario (creador) | No |
| Rol | GV bloqueado en rutas `/api/folios`. GG/GA/AD con lista no vacía: solo plantas permitidas |
| Permisos granulares | No hay permiso específico «ver duplicados»; usa auth dashboard + bloqueo GV |
| Rango temporal | Sí (`creado_en`; default 6 meses) |
| Estado | Excluye CANCELADO; incluye el resto |
| Organización | No hay org_id; el aislamiento es planta |
| Volumen | `LIMIT 1500` filas; `maxPairs` 200 |

`findDuplicatePairs` **por sí solo** no impone planta, rol, fechas ni límite SQL. Confía en `rows`.

### Respuestas explícitas

1. **¿Puede un usuario consultar duplicados de otra planta?**  
   GG/GA/AD con `plantas_permitidas.length > 0`: **no** (403).  
   GV: **no** (403 global a folios).  
   Otros roles (p. ej. ZP) **o** GG/GA/AD **sin** lista: el endpoint **no** aplica esa lista. No se inventa aislamiento adicional. El chat hoy tampoco aplica el bloqueo GV (el dominio se rechaza antes).

2. **¿El endpoint impone restricciones que el helper no impone?**  
   **Sí:** JWT, GV, `assertPlantaPermitidaDashboard`, existencia de planta, rango de fechas, exclusión CANCELADO, IDs equivalentes, `LIMIT 1500`, clamp de umbral.

3. **¿El contexto Director IA ya tiene lo necesario para mantener esas restricciones?**  
   **Sí, como inputs:** `planta_id` y `req.dashboardAuth` (mismo patrón que AR/IGF).  
   **No** trae filas de folios ni aplica hoy el bloqueo GV del endpoint de folios.

4. **¿Un executor directo podría saltarse authz existente?**  
   **Sí**, si consulta `public.folios` o pasa `rows` a `findDuplicatePairs` sin `assertPlantaPermitidaDashboard`, sin bloqueo GV y sin el loader acotado. Eso es un riesgo de IMPL, no un bypass propuesto.

5. **¿Hace falta capa intermedia para preservar scope?**  
   **Sí.** Reutilizar `loadFoliosParaDuplicados` + los mismos asserts. Preferible extraer el loader de `server.js` a un módulo compartido. No HTTP. No bypass.

**No hay blocker de autorización que impida un IMPL seguro**, siempre que el IMPL reutilice esos asserts. Si el IMPL omitiera authz, sería defecto de implementación, no motivo para G2.

---

## 10. Semántica segura

Director IA **podrá afirmar**:

- que existen N **pares que cumplen los criterios de posible duplicidad** (mismo importe redondeado + similitud de concepto ≥ umbral);
- los IDs / números de folio, importe, conceptos comparados, score, umbral, planta, rango `desde`/`hasta`, `scanned`, `truncated`.

Director IA **no podrá afirmar**:

- «hay N duplicados confirmados»;
- «hay fraude»;
- que dos folios son el mismo documento o el mismo gasto real;
- que deben cancelarse.

Score, similitud o heurística **no** se convierten en certeza.

### Campos que constituyen evidencia

De cada par: `a.id`, `b.id`, `numero_folio`/`folio_codigo`, `importe`, `concepto` (campo comparado), `score`, `estatus`, `mes_cargo`, `creado_en`.  
De la corrida: `planta_id`, `planta_nombre` (si se resuelve), `desde`, `hasta`, `umbral`, `scanned`, `pairs_count`, `truncated`, `maxPairs`, criterio textual («mismo importe redondeado a 2 decimales + similitud de concepto ≥ umbral»).

No hay proveedor/cliente en el output del helper. No inventarlos.

### Lenguaje permitido (ejemplos)

Permitido: «Encontré 3 pares que cumplen los criterios de **posible** duplicidad (mismo importe y concepto similar ≥ 0.72).»

Prohibido: «Hay 3 fraudes / duplicados confirmados.»

### Empty / error / insuficiencia / abstención / límites

| Caso | Comportamiento |
|---|---|
| Empty (`pairs.length === 0`) | «No encontré pares que cumplan los criterios de posible duplicidad en el alcance (planta, fechas, umbral, límite de filas).» **No** «no hay duplicados». |
| Error de carga/DB | Error estructurado; no inventar pares |
| `planta_id` ausente/inválido | 400 / datos insuficientes |
| 403 GV / planta no permitida | Abstenerse; no filtrar en silencio otra planta |
| 404 planta | Error de scope |
| `truncated === true` | Declarar que el resultado está recortado (grupo enorme o `maxPairs`) |
| `LIMIT 1500` | Declarar que solo se escanearon las filas cargadas (más recientes) |
| Inferencia | No recomendar cancelación. No comparar con Excel Taller ni M4 |

---

## 11. Output del tool

No existe contrato arquitectónico de output para `get_duplicate_folios`. El shape del endpoint de análisis **ya basta** como evidencia. No se redefine un contrato en `docs/director-ia/`. **G3 = N/A.**

Output mínimo recomendado para el IMPL (runtime, no contrato G3):

- `pairs` (ids, folios, importe, concepto, score, estatus, fechas)
- `pairs_count`
- `criterio` (texto estable: importe + similitud ≥ umbral)
- `umbral`, `scanned`, `truncated`, `max_pairs`
- `scope`: `planta_id`, equivalentes si aplica, `desde`, `hasta`
- `semantic_class`: `possible_duplicate_heuristic` (o equivalente que impida certeza)
- error estructurado cuando falle authz/carga

Opcional útil: `planta_nombre`. No hace falta campo de “confirmado”.

---

## 12. Cycle vs tool

**Decisión: A) tool conversacional read-only.**

Evidencia:

- M16 canónico = análisis de **folios** del dashboard (`public.folios` + `findDuplicatePairs`).
- El cycle constitucional es ARR → OP → EB → EKS → IES → RE → CP (`venta_ton` / N1–N5). `lib/director-ia-real-cycle.js` no menciona duplicados.
- Meter M16 al pipeline constitucional solo para marcarlo COMPLETE violaría la Constitución y esta tarea.
- La pregunta de negocio se satisface con `get_duplicate_folios` como tool/anexo de chat read-only.

El cycle permanece intacto.

---

## 13. Frontend

**No hace falta frontend nuevo** para COMPLETE de Director IA.

La superficie chat (`POST /api/director-ia/chat` + panel existente) puede devolver `answer` + evidencia. `AnalisisDuplicadosModal` ya cubre el dashboard y además ofrece cancelar, que está fuera de este slice.

No se implementa UI en esta ARCH ni se exige en el IMPL.

---

## 14. Backend

| Pieza | ¿Hace falta? |
|---|---|
| Endpoint nuevo | **No** |
| Service/helper de matching nuevo | **No** — no duplicar `findDuplicatePairs` |
| Modificar `findDuplicatePairs` | **No** |
| Modificar el endpoint `/analisis` | **No** (salvo extraer el loader compartido) |
| Executor/loader nuevo | **Sí** — función read-only mínima (patrón anexo), nombrada en el registry |
| Extraer `loadFoliosParaDuplicados` | **Recomendado** para no copiar SQL; no es arquitectura nueva |
| Adapter HTTP | **No** |

Preferencia cumplida: reutilizar lógica existente y añadir el mínimo wiring.

---

## 15. Tests

### Existentes (no modificados; no ejecutados)

| Área | Qué hay |
|---|---|
| `findDuplicatePairs` | **Ningún** test en `test/` |
| Endpoint `/analisis` | **Ningún** test en `test/` |
| `duplicate_folios` | `scripts/test-director-ia-planner.js` (1 caso) |
| `get_duplicate_folios` | `scripts/test-director-ia-tool-orchestrator.js` afirma `declared_not_integrated` |
| Capabilities | `scripts/test-director-ia-capabilities.js` afirma blocked `duplicados` |
| Dispatcher | Orchestrator no ejecuta |
| Director IA suite | `test/director-ia-*.test.js` — no cubre este dominio |

### Batería mínima del eventual IMPL (no se escribe ahora)

- Happy path: pares heurísticos con score/importe/IDs.
- Empty: `pairs: []` sin afirmar «no hay duplicados».
- Error de carga.
- Auth/authz: GV 403; GG/GA/AD fuera de `plantas_permitidas` 403.
- Scope/planta: no cruzar planta; equivalentes si el loader los usa.
- Argumentos inválidos: `planta_id` ausente.
- Evidencia estructurada + `truncated` / límites.
- Semántica posible vs confirmada (lenguaje / `semantic_class`).
- Wiring: pregunta de duplicados **ya no** early-return `SOURCE_NOT_INTEGRATED`; llega a la fuente.
- Registry: tool `available_on_demand` + executor; capability `canRead`.
- Ausencia de mutaciones: no llama `POST .../cancelar` ni UPDATE/DELETE.
- Actualizar scripts que hoy **exigen** `not_integrated` / blocked (dejarían de ser verdaderos).

---

## 16. Definición binaria de COMPLETE

**M16 = COMPLETE IFF** todas las siguientes son verdaderas:

1. `get_duplicate_folios` tiene ejecución real read-only (capability legible + tool `available`/`available_on_demand` + executor nombrado + rama en `askDirectorIa` que invoca el loader).
2. Consulta fuente real: `public.folios` vía `loadFoliosParaDuplicados` (o extracción equivalente) + `findDuplicatePairs`.
3. Respeta JWT / bloqueo GV / `assertPlantaPermitidaDashboard` / límites del análisis.
4. Devuelve evidencia estructurada (pares, IDs, importe, concepto, score, umbral, scope, `truncated`).
5. Maneja empty / error / datos insuficientes / abstención 403.
6. No convierte heurística en certeza (lenguaje de **posible** duplicidad).
7. Es accesible desde Director IA: la pregunta canónica deja de cortar en `detectUnsupportedDirectorIaDomain`.
8. Tests focales/integración verdes de la batería §15.
9. No necesita mutaciones para cumplir la definición canónica de CONSULTAR/DETECTAR RIESGOS.

Un endpoint existente **solo** no basta (hoy ya existe y la cobertura es NO INTEGRADA).

Cancelar **no** es necesario según la definición canónica de COMPLETE de lectura. El sync de la matriz a COMPLETA es documental y queda fuera de este IMPL.

---

## 17. Gates

Decididos solo con evidencia:

| Gate | Decisión | Motivo |
|---|---|---|
| G2 | **N/A** | El IMPL cabe en arquitectura existente: catálogo de capabilities, registry Fase 3, anexos de chat. No se crea dispatcher genérico ni se redefine el cycle. |
| G3 | **N/A** | El tool y sus `requiredInputs: ["planta_id"]` ya existen. El shape de evidencia reutiliza el del endpoint. No hace falta crear/modificar contrato en `docs/director-ia/`. |
| G8 | **N/A** | Nada contradice materialmente esta tarea. |

No se activan por precaución genérica.

---

## 18. Viabilidad de un solo slice

**CAN_REACH_COMPLETE_IN_ONE_READ_ONLY_SLICE = YES**

Delta mínimo exacto del IMPL (no ejecutado aquí):

1. Quitar el corte: regla `duplicados` en `UNSUPPORTED_RULES` y/o tratar el dominio como legible (`canRead`, coverage adecuada). Sin esto, el early-return sigue ganando aunque exista executor.
2. Tool: `available_on_demand` + `executor` string (p. ej. nombre del loader). Capability alineada.
3. Loader read-only: GV + `assertPlantaPermitidaDashboard` + `loadFoliosParaDuplicados` extraído/reutilizado + `findDuplicatePairs`. Defaults del endpoint (umbral 0.72, 6 meses, maxPairs 200).
4. Rama en `askDirectorIa` que presente evidencia (determinística recomendada).
5. Tests §15. Actualizar scripts que afirman `not_integrated`.
6. Fuera: cancelar, HTTP interno, cycle, UI, matriz, contratos.

No se rebaja a PARTIAL: un slice cubre la definición canónica de consulta consistente de la fuente de análisis.

---

## 19. NEXT_TASK

Exactamente uno, **no autorizado, no ejecutado**:

**IMPL-DIRECTOR-IA-M16-DUPLICADOS-001**

Gates requeridos para ese NEXT_TASK:

- G1: humano (esta ARCH no lo autoriza)
- G2: N/A
- G3: N/A
- G8: N/A

No se propone ARCH previa: el gap está determinado y no hay decisión arquitectónica/contractual pendiente.

---

## 20. Riesgos

- Saltar authz al llamar el helper con SQL crudo.
- Dejar `UNSUPPORTED_RULES.duplicados` y solo cambiar el registry: el usuario seguiría viendo «no integrado».
- Dejar que OpenAI reformule «posible» como «confirmado».
- Confundir `findSimilarTo` / `POST /check` con el análisis de pares.
- Confundir duplicados Excel Taller (M5) o COMPARAR (M4) con M16.
- Tratar `LIMIT 1500` / `truncated` como universo completo.
- Roles sin `plantas_permitidas`: el backend actual no aísla; no fingir que sí.
- Chat sin `dashboardBlockGVFoliosMiddleware`: el loader **debe** bloquear GV al tocar folios.
- Extraer `loadFoliosParaDuplicados` de `server.js` mal y divergir del endpoint.
- Actualizar mal los scripts que hoy exigen `not_integrated`.

---

## 21. Acciones explícitamente no realizadas

- No implementación de loader, executor, capability, tool, chat, frontend ni backend.
- No cambio de capability matrix ni de `docs/director-ia/`.
- No contratos nuevos ni editados.
- No SQL / migration.
- No cancelación ni mutación de folios.
- No tests escritos ni ejecutados.
- No commit, push, merge.
- No autorización ni ejecución del NEXT_TASK.
- No se reutilizaron timestamps de tareas anteriores.
- G1 conservado: `HUMAN_APPROVER` / `2026-08-21T21:16:47-06:00`.
