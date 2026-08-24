# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
slice: >
  wiring in-process en askDirectorIa para intent financial_diagnosis:
  loadIgfArrAnnexForChat (IGF+ARR ya cargados, provenance a separar) +
  loadDeltaVenta/Descuento/IngresoForChat; bloques etiquetados; sin join;
  sin causalidad; sin IES; sin Reasoning Run; sin hacer ejecutar el orchestrator
destination: "chat legado (OpenAI existente), NO Reasoning Engine oficial N5"
g2: "N/A"
g3: "N/A"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "lib/director-ia-planner.js (lectura)"
  - "lib/director-ia-tools.js / director-ia-tool-orchestrator.js (lectura)"
  - "lib/director-ia-chat.js / director-ia-context.js (lectura)"
  - "lib/director-ia-igf-arr.js (lectura)"
  - "lib/director-ia-m9-deltas.js (lectura)"
  - "lib/director-ia-capabilities.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - >
    El preferred_path de CURRENT_TASK termina en Reasoning Engine.
    El contrato 05 prohíbe que RE reciba loaders/payloads operacionales.
    Esta readiness determina READY para chat legado, no para N5.
    No se reabre 04/05. No se hace ejecutar el orchestrator (Fase 3 es
    declarativa).
next_task_proposed: "IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. No se editan contratos. El slice no es IES ni RE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia. Tras IMPL futuro: 10.5/20 = 52.5% (0.0 pp)."
  - "M7/M8 siguen PARTIAL. M9 sigue COMPLETE."
```

## Resumen ejecutivo

**READY.** El contrato vigente **ya permite** evidencia multi-fuente. El gap es **wiring de chat legado**, no un IES nuevo ni un Reasoning Engine.

El planner de `financial_diagnosis` declara `arr` + `igf` + `delta_venta` + `delta_descuento` + `delta_ingreso`. El tool plan lista cinco tools ejecutables. El orchestrator **no ejecuta** (Fase 3). El chat:

1. usa el plan solo como debug;
2. hace early-return de `delta_*` (un silo M9) cuando el wording es «cómo cambió…»;
3. si el intent es `financial_diagnosis`, cae a OpenAI en modo `igf_arr_focused` (un texto IGF/ARR) **sin** llamar a M9.

**IES actual:** permite varios hechos/evidencias de fuentes distintas en el Snapshot. **No** se proyecta IES en este slice.

**Reasoning Engine actual:** acepta multi-source **solo** dentro de un IES válido. **Prohíbe** loaders, SQL y payloads crudos. Runtime **pendiente**. Este slice **no** entrega al RE oficial.

**G2 = N/A. G3 = N/A.**

Path de IMPL (no se implementa aquí):

```text
financial_diagnosis
  → planner (ya)
  → tool plan debug (ya; orchestrator sigue sin ejecutar)
  → askDirectorIa rama in-process (como M5/M9)
      loadIgfArrAnnexForChat  → bloques igf + arr separados
      loadDeltaVentaForChat
      loadDeltaDescuentoForChat
      loadDeltaIngresoForChat
  → paquete con provenance / status por fuente
  → OpenAI chat legado (no N5)
  → respuesta
```

Un IMPL futuro **no cambia** 10.5 / 20 = **52.5%** (0.0 pp).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-financial-diagnosis-evidence-assembly-readiness-001` (≠ `main`).
- HEAD: `82c9a55c Merge branch 'architecture/director-ia-global-next-module-prioritization-008'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, matriz, contratos, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008` |
| Capacidad | transversal `financial_diagnosis` evidence assembly |
| Global ahora | **10.5 / 20 = 52.5%** |
| Tras IMPL futuro | **10.5 / 20 = 52.5%** (**0.0 pp**) |
| M7 / M8 | PARTIAL (sin cambio) |
| M9 | COMPLETE (sin cambio) |

Esta tarea **no cambia estados ni porcentaje**.

---

## Gap físico (dónde se pierde el ensamblaje)

Punto exacto: `lib/director-ia-chat.js` `askDirectorIa`.

| Paso | Qué hace hoy | Efecto |
|---|---|---|
| L2503–2512 | `planDirectorIaQuestion` + `buildDirectorIaToolPlan` | Plan multi-domain **sí**. Solo `directorIaDebug`. |
| L2503–2504 (comentario) | «el resto de tools no se despacha de forma genérica» | Orchestrator no corre loaders. |
| L2619–2635 | `if (intent === "delta_sales\|discount\|income")` **return** | M9 solo; IGF/ARR fuera. Prioridad de wording «cómo cambió». |
| **No hay** `if (intent === "financial_diagnosis")` | Cae al path OpenAI | |
| L2739–2755 | `wantFinancialKpi` → `loadIgfArrAnnexForChat` + `igfArrFocused: true` | Un blob IGF/ARR. **M9 no se llama.** |
| L1952–1963 | Prompt `igf_arr_focused` | El modelo ve solo el annex. |
| L2268–2269 | `inferSourcesFromChat` | `igf.forecast`, `arr.forecast`, `igf_arr.annex`. **Sin M9.** |
| L22–26 `director-ia-context.js` | `EMPTY_SOURCES.igf/arr` always false en GET | Hallazgo distinto; no es este slice. |

`lib/director-ia-planner.js` L5: el planner **no gobierna** el routing del chat.

`docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md`: el orchestrator **declara y no ejecuta**. `can_execute_all` existe y **no se usa**.

**Cambio mínimo:** rama in-process `financial_diagnosis` en `askDirectorIa` (mismo patrón que `taller_at` / `delta_*`). **No** convertir el orchestrator en ejecutor genérico (eso reabriría Fase 3).

---

## Planner

| Campo | Hecho físico |
|---|---|
| Intent | `financial_diagnosis` (confianza 0.9 / 0.82) |
| Reglas | «por qué / porque» + caída + ingreso\|venta\|margen\|utilidad; «caída de ingreso/venta/margen»; «diagnóstico financiero»; margen+planta/comportamiento |
| Dominios | `INTENT_DOMAIN_MAP`: `["arr","igf","delta_venta","delta_descuento","delta_ingreso"]` — **todos** se listan; el plan no marca obligatoriedad por fuente |
| Evidence plan | solo `{ type:"rule", value }` de wording. **No** pide periodo/planta por fuente |
| Clarification | si `confidence < 0.55`. Estas reglas están por encima |
| Prioridad | `delta_*` (cambio/variación/delta + venta\|descuento\|ingreso) **antes** que `financial_diagnosis`. `igf_status` / `arr_status` por keyword también antes |
| Periodo/planta | el planner **no** los solicita. Los resuelve cada loader |

Las cinco fuentes son **declaradas**, no opcionales en el mapa. El runtime las trata como opcionales (solo annex).

---

## Tool orchestration

Para `financial_diagnosis` + `planta_id` + `question`:

| tool_id | domain | executor | status |
|---|---|---|---|
| `get_arr_snapshot` | arr | `loadIgfArrAnnexForChat` | `available_on_demand` |
| `get_igf_snapshot` | igf | `loadIgfArrAnnexForChat` | `available_on_demand` |
| `get_delta_sales` | delta_venta | `loadDeltaVentaForChat` | `available_on_demand` |
| `get_delta_discount` | delta_descuento | `loadDeltaDescuentoForChat` | `available_on_demand` |
| `get_delta_income` | delta_ingreso | `loadDeltaIngresoForChat` | `available_on_demand` |

`can_execute` / `can_execute_all` serían true. **Nadie los consume.**

IGF y ARR **comparten un solo executor**. Llamar las dos tools dos veces duplica trabajo y puede meter `commercial_state` (fuera del mapa del intent). IMPL: **una** llamada a `loadIgfArrAnnexForChat` y **partir** provenance igf vs arr. M9: tres loaders (o equivalente), resultados **separados**.

Dependencias entre tools: **ninguna FK**. Orden indiferente salvo authz fail-closed por fuente.

El orchestrator **no puede** «cortar tras la primera»: no ejecuta. El corte está en el chat.

---

## Chat runtime

| Rama | Cuándo | Fuentes al modelo |
|---|---|---|
| Early-return `delta_*` | wording comparación de periodos | solo M9 de esa familia |
| `igf_arr_focused` | `isPlantFinancialKpiQuestion` en el path OpenAI | solo annex IGF/ARR |
| Annex colateral | `shouldAttachIgfArrAnnex` si **no** focused | annex + AR/DICF; aún **sin M9** |
| `financial_diagnosis` | no tiene rama | las de arriba |

`IGF_ARR_ANNEX_SYSTEM_ADDENDUM` pide no inventar cifras y **permite** «Bitácora/DICF … si aportan causa operativa». El slice **debe anular esa frase** para este intent (causalidad prohibida).

---

## Evidencia IGF

| Campo | Hecho |
|---|---|
| Fuente | `igf.versions` (GLOBAL, última `version_number` del mes) + `igf.compromiso_lines` (`loadIgfCommitSnapshot`); composición `extractIgfComposition` |
| Planta | `planta_id` → `public.plantas` → match `empresa` (`findIgfRowForPlant`) |
| Periodo | `resolveYearMonthFromQuestion` (YYYY-MM en texto o mes CDMX). Mes previo = calendario −1 (puede no existir versión) |
| Versión | `version_id` / `version_number` en texto y `meta` |
| Snapshot | **una** fila. Null se omite (`omitted_null_keys`). Null ≠ 0 |
| Composition | allowlist; `*_kg` = $/kg; no recálculo; no overlay |
| Authz | **GA 403** «GA no tiene acceso a KPIs financieros.» GV: `assertGVPlantaNombreAccess` |
| Provenance hoy | mezclada en un string `ANEXO — IGF / ARR`. `meta.composition` sí está separado |
| Riesgo a no copiar | `ventaArr`/`descArr` fallback IGF↔ARR e «ingreso aprox.» **fusionan** fuentes. El slice **no** debe emitir ese híbrido como un hecho |

---

## Evidencia ARR

| Campo | Hecho |
|---|---|
| Fuente | `computePronosticoProyByPlant` → `{ proy_venta_ton, proy_desc_kg }` mes consultado y mes calendario previo. Opcional top desc (`computeClientesDescuentoMes`) |
| Planta | `plant_code` ARR vía `getPlantCodeArrFromPlantaNombre` |
| Periodo | **el mismo** `year/month` que IGF en el annex |
| Shape | venta ton + desc $/kg; null si no finito |
| Authz | **la misma función** que IGF (un 403 aborta el annex entero) |
| Provenance hoy | mismo blob. `fmtNum(null)` imprime «—» (display, no status) |

ARR del annex **no** es M9 (M9 compara clientes/periodos reales de tablas diarias).

---

## Evidencia M9

| Familia | Loader | Semántica |
|---|---|---|
| Venta | `loadDeltaVentaForChat` | kg, dos YYYY-MM; 80/20 de la muestra |
| Descuento | `loadDeltaDescuentoForChat` | $/kg; kg=0 → ratio 0 **en la fuente** |
| Ingreso | `loadDeltaIngresoForChat` | kg × (margen − \|desc\|); margen IGF es **insumo de fórmula**, no annex |

| Campo | Hecho |
|---|---|
| Periodo | `periodoA` / `periodoB`. Si la pregunta trae dos YYYY-MM, esos. Si no: **últimos dos meses con datos** (`default_latest_two`). **No** usa el mes IGF |
| Planta | `planta_id` → fila `public.plantas` |
| Authz | `assertM9DeltasAccess`: **GA 403**; **GV 403** (siempre); GG/AD: `plantas_permitidas` |
| Payload | `ok`, `semantic_class`, `periodoA/B`, `period_source`, `planta_*`, `datos`, `source_coercion`, `not` |
| Ausencia cliente en un mes | COALESCE **0 kg** (coerción de fuente). ≠ planta sin periodos (`DATA_NOT_FOUND`) |
| HTTP / writes | no |

---

## Alineación temporal

| Objeto | Periodo |
|---|---|
| IGF | un YYYY-MM (pregunta o CDMX) + versión de ese mes |
| ARR annex | el **mismo** YYYY-MM (+ mes calendario previo para Δ de proyección) |
| M9 | **par** A/B; default ≠ mes IGF |

**No alinear en silencio.** No reescribir M9 al mes IGF. No reescribir IGF al par M9.

Regla de IMPL:

- `alignment.comparable` si el YYYY-MM IGF ∈ `{M9.periodoA, M9.periodoB}` **y** ARR.month = IGF.month.
- Si no: `alignment.status = mismatch`; se **responde limitado** con periodos **etiquetados**; el modelo no debe tratarlos como el mismo corte.
- Si el usuario da dos YYYY-MM iguales / inválidos: M9 ya clarifica (`SOURCE_ERROR` 400). No inventar el par.
- Mes previo IGF sin versión: IGF del mes pedido puede estar OK y el Δ de margen annex incompleto; no rellenar con M9.

---

## Authz — intersección

| Rol | IGF/ARR | M9 | Ensamblaje |
|---|---|---|---|
| GA | 403 | 403 | **abortar** (todas las fuentes financieras restringidas) |
| GV | posible OK (planta GV) | **403** | **limitar**: igf/arr si OK; m9 = `SOURCE_RESTRICTED`. No relajar M9 |
| GG/AD | planta permitida + GV helper si aplica | `plantas_permitidas` | intersección de planta del request; **nunca** otra planta para «completar» |
| Cross-planta | 403 | 403 | fail-closed |

Alcance más restrictivo = **planta del request** ∩ reglas de **cada** fuente. Una fuente 403 **no** aborta las otras salvo GA (ambas caen). No usar IGF para suplir M9 ni al revés.

---

## Provenance (shape de runtime, no contrato 04)

Reutilizar payloads existentes; no inventar IES.

```text
plant: { planta_id, planta_nombre }
requested_period: { igf_arr_yyyy_mm, m9_periodo_a, m9_periodo_b, alignment }
sources.igf:    { status, source, period, plant, version_id?, payload, absence_or_error }
sources.arr:    { status, source, period, plant, payload, absence_or_error }
sources.m9:     { venta, descuento, ingreso } cada uno igual
limitations:    [no_causalidad, no_fusion, mismatch?]
```

Status por fuente: `SOURCE_AVAILABLE` | `SOURCE_PARTIAL` | `DATA_NOT_FOUND` | `SOURCE_RESTRICTED` | `SOURCE_ERROR`.

**No** un objeto «ingreso único». **No** el híbrido annex `ingreso aprox`. **No** `commercial_state` como cuarta fuente de este intent.

---

## Ausencia / error

| Señal | Cuándo | ≠ |
|---|---|---|
| null omitido (IGF composition) | columna ausente/vacía/no finita | 0 |
| «—» en texto annex | `fmtNum(null)` | status |
| `DATA_NOT_FOUND` | sin versión IGF; sin fila planta; M9 sin dos periodos | «no hay ingreso en la empresa» |
| `ABSENCE_CONFIRMED` | **no aplica** (Evidence Builder; chat legado no lo emite) | no inventar |
| `SOURCE_RESTRICTED` | GA/GV/planta | dato faltante |
| `SOURCE_ERROR` | pool, 500, periodo inválido | ausencia |
| 0 kg M9 | coerción cliente ausente en un mes | null IGF |

Una fuente no sustituye a otra.

---

## Failure matrix

| Caso | ¿Responde? | Modo | Provenance |
|---|---|---|---|
| 3 fuentes OK + alignment comparable | sí | diagnóstico limitado a hechos etiquetados | igf+arr+m9 AVAILABLE |
| IGF missing (sin versión/fila), ARR y M9 OK | sí **limitar** | no afirmar composición | igf DATA_NOT_FOUND; resto OK |
| ARR missing (proy null), IGF y M9 OK | sí **limitar** | no rellenar con IGF venta/desc | arr DATA_NOT_FOUND o PARTIAL |
| M9 error 500 | sí **limitar** | no usar annex Δ como M9 | m9 SOURCE_ERROR |
| M9 insufficient_periods | sí **limitar** o clarificar si el usuario no dio par y no hay dos meses | | m9 DATA_NOT_FOUND |
| GA unauthorized | **abortar** 403 | no OpenAI | las tres RESTRICTED |
| GV: IGF OK, M9 403 | sí **limitar** | | m9 RESTRICTED |
| period mismatch | sí **limitar** | explicitar cortes | alignment.mismatch |
| todas sin datos | sí **limitar** | «no hay evidencia en estas fuentes para planta/periodo» | las tres NOT_FOUND; no causa |
| nulls en composición | sí | omitir claves; no imprimir 0 | igf PARTIAL |

No abortar el diagnóstico entero porque falle **una** fuente no-authz.

---

## Semántica de reasoning (chat legado)

**Permitido:** señalar coincidencias; señalar tensiones; comparar hechos **con cortes alineados**; decir qué bloque soporta cada observación.

**Prohibido:** correlación → causalidad; «IGF causó ARR»; «el delta prueba la causa»; una fuente sustituye otra; hipótesis N5.

Hipótesis: `05` solo con IDs de un IES. Este slice **no** tiene IES. **No** se habilitan hipótesis etiquetadas. El addendum actual de «causa operativa» **no** se reutiliza en este intent.

---

## Contract check

| Pregunta | Determinación |
|---|---|
| ¿IES actual lo permite? | **Sí, en esquema:** bancos multi-fuente, salud por fuente, `PARTIAL`. **No hay runtime IES.** El slice no proyecta IES. |
| ¿RE actual lo permite? | **Multi-source dentro del IES: sí. Loaders como entrada: no** (`04` §18; `05` §1). Runtime RE pendiente. |
| ¿G2? | **N/A** — no se edita `docs/director-ia/` |
| ¿G3? | **N/A** — no se crea contrato |
| ¿Basta wiring? | **Sí** — rama `askDirectorIa`, loaders ya SELECT-only |

El preferred_path «→ Reasoning Engine» **no es el destino del IMPL**. Tratar el chat como N5 violaría `AGENTS.md`. Eso **no** obliga STOPPED: el gap 008 era chat legado.

Hacer que el **orchestrator ejecute** contradiría Fase 3 («sin ejecutar»). IMPL **no** lo haga.

---

## Hipótesis de implementación (no código)

1. Tras el tool plan, si `intent === "financial_diagnosis"`: no early-return `delta_*`; no `igf_arr_focused` exclusivo.
2. Authz: no relajar; GA aborta; resto per-source.
3. Una llamada annex + tres M9; partir igf/arr; no `ingreso aprox` fusionado; no DICF lists.
4. `alignment` explícito; mismatch no se corrige.
5. Prompt: tres bloques + limitations; sin causa.
6. `inferSourcesFromChat`: incluir las tres procedencias reales, no inferir por wording.
7. In-process, read-only, sin HTTP interno, sin writes.

---

## Tests a diseñar si IMPL se autoriza

- `financial_diagnosis` carga IGF+ARR+M9 en una corrida
- no early-return a una sola fuente
- provenance separada
- misma planta; cross-planta 403
- periodos alineados vs mismatch
- IGF ausente / ARR ausente / M9 ausente / tool error
- null ≠ 0; ausencia ≠ cero; partial success
- sin causalidad; composición IGF intacta; M9 sigue siendo deltas; ARR ≠ M9
- authz restrictiva (GA aborta; GV limita M9)
- sin HTTP interno; sin writes; contratos no modificados

---

## Gates / porcentaje / riesgos

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

Porcentaje: **52.5%** ahora y tras IMPL (0.0 pp).

Riesgos: fusionar ingreso; alinear meses en silencio; despachar todos los intents; llamar RE/IES; ejecutar el orchestrator; reusar el addendum de «causa operativa»; tratar 0 kg M9 como null IGF.

Dependencias: planner `financial_diagnosis`, `loadIgfArrAnnexForChat`, `loadDelta*ForChat`, authz IGF y M9. Sin S3/Excel/Twilio.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001`

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No se reabrió IES ni Reasoning Engine.
- No commit / push / merge.
- No se cambió 52.5%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-financial-diagnosis-evidence-assembly-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
