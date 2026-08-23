# Reporte — ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/CONSTITUTION.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M9-DELTAS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta auditoría: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

M9 puede llegar a **COMPLETE** en un único slice read-only.

Hoy es **INDIRECTA** porque Director IA **no llama** los endpoints/helpers `delta-*`. El planner sí detecta `delta_sales` / `delta_discount` / `delta_income`, pero las tools tienen `executor: null` y `askDirectorIa` no tiene rama in-process. Las preguntas caen al LLM: descuento a menudo al anexo IGF (`PLANT_FINANCIAL_KPI_RE` incluye `descuento`); venta/ingreso a contexto AR/DICF/commercial_state. Eso no es la fuente delta.

Las tres familias del dashboard tienen path JSON real, SELECT-only (los POST de datos **no escriben**), authz GA/GV determinable y helpers extraíbles in-process (patrón M3/M16).

COMPLETE canónico de este slice:

- consultar **Delta Venta**, **Delta Descuento** y **Delta Ingreso** de los modales de comparación de periodos;
- **no** `POST /delta-ingreso-forecast-datos` (tiene `DELETE`/`INSERT` de cache);
- **no** M19;
- **no** sustituir por IGF/ARR annex, KPIs M3 ni weekly LD.

Ganancia si el IMPL cierra COMPLETE: **+2.5 pp** (8.0/20 = 40.0% → 8.5/20 = **42.5%**).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M9-DELTAS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m9-deltas-readiness-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T12:40:00-06:00`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin cambio de matriz. Sin commit/push/merge. Sin siguiente tarea.

---

## 1. Definición canónica M9

Fuente: ficha M9 + Parte 9 de `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`.

| Campo | Valor físico |
|---|---|
| Propósito | Comparar periodos de venta, descuento e ingreso en los **modales** dashboard. |
| Estado matriz | NO INTEGRADA en endpoints `delta-*`; respuestas afines **INDIRECTAS**. |
| Scoring loop | INDIRECTA = 0.5. COMPLETE = +2.5 pp. |
| Qué consulta hoy | Nada de `delta-*`. |
| Qué no consulta | Periodos y matrices de `DeltaVentaModal`, `DeltaDescuentoModal`, `DeltaIngresoModal`. |
| COMPLETE exigido | Consultar **directamente** las tres familias, con evidencia trazable, planta autorizada, periodos definidos, sin mutar, sin confundir familias ni M19. |

**Por qué figura INDIRECTA (verificado en chat):**

1. `UNSUPPORTED_RULES` **no** incluye `delta_*` → no hay early-return `SOURCE_NOT_INTEGRATED` para estas preguntas.
2. Planner emite intent `delta_*` y Tool Plan marca tools `domain_not_integrated` / no ejecutables.
3. `askDirectorIa` solo ejecuta in-process `dashboard_kpis`, `project_status`, `duplicate_folios`.
4. El flujo LLM posterior puede cargar anexo IGF/ARR si `isPlantFinancialKpiQuestion` (el regex incluye `descuento`) o commercial_state/DICF. Eso es aproximación, no `getDelta*Clientes`.

---

## 2. Delta Venta — estado físico

| Pieza | Hallazgo |
|---|---|
| Periodos | `GET /api/dashboard/delta-venta-periodos` (`server.js` 16078). Query `planta`. JSON `{ periodos: string[] }` YYYY-MM DESC. |
| Datos | `POST /api/dashboard/delta-venta-datos` (16099). Body `{ planta, periodoA, periodoB }`. |
| Helper periodos | `getPeriodosDeltaVenta(client, plantaNombre)` (1928). |
| Helper datos | `getDeltaVentaClientes(client, plantaNombre, periodoA, periodoB)` (1955). |
| Fuente | `arr.ventas_diarias_cliente` ⋈ `public.plantas` ⋈ `arr.provincia_plants`. Unidad: **kg**. |
| Método / side effects | GET y POST: solo `SELECT` + `res.json`. **POST no muta.** POST existe por shape del body. |
| Semántica | `delta_kg = COALESCE(kg_b,0) - COALESCE(kg_a,0)`. Cliente ausente en un mes = 0 kg, no unknown. |
| Shape datos | `{ planta, periodoA, periodoB, dejaron, mas, disminuyeron }`. Cada bucket: `totalDeltaKg`, `totalDeltaKgStr` (ton, abs), `signPositive`, `clientes` (top 20% de **esta** muestra). |
| Buckets | `dejaron`: kgA>0 ∧ kgB≤0. `mas`: deltaKg>0. `disminuyeron`: kgA>0 ∧ kgB>0 ∧ deltaKg<0. |
| Authz | JWT; **GA 403**; **GV 403** (`dashboardBlockGVForbidden`). **No** chequea `plantas_permitidas` (GG puede pedir cualquier nombre). |
| Intent / tool | `delta_sales` → `get_delta_sales`; `executor: null`. |
| FE | `DeltaVentaModal.tsx` + `fetchDeltaVentaPeriodos` / `postDeltaVentaDatos`. Periodos **sin default**: el usuario elige A/B. |
| Tests | Ningún test focal de este helper. Planner: `"¿Cómo cambió la venta?"` → `delta_sales`. |

Path in-process: `planta_id` → `resolvePlantaRow.nombre` → `getPeriodosDeltaVenta` + `getDeltaVentaClientes` + mismo `build` 80/20 del handler.

---

## 3. Delta Descuento — estado físico

| Pieza | Hallazgo |
|---|---|
| Periodos | `GET /api/dashboard/delta-descuento-periodos` (16169). |
| Datos | `POST /api/dashboard/delta-descuento-datos` (16190). |
| Helpers | `getPeriodosDeltaDescuento` (2039); `getDeltaDescuentoClientes` (2066). |
| Fuente | `arr.descuentos_diarios_cliente` (monto) **y** `arr.ventas_diarias_cliente` (kg). Unidad: **$/kg** (`monto/kg`). |
| Método / side effects | GET/POST: solo SELECT. **POST no muta.** |
| División por cero | SQL: `CASE WHEN kg IS NULL OR kg = 0 THEN 0 ELSE monto/kg END`. El **origen** convierte no-calculable en **0**, no en null. |
| Shape | `{ planta, periodoA, periodoB, dejaron, mas, disminuyeron }` con `ratioA/B`, `deltaRatio`, strings `$/kg`. `totalDeltaRatio` = **promedio** del bucket (no suma). |
| Buckets (distintos a venta) | `dejaron`: ratioA<0 ∧ (kgB=0 ∨ ratioB≥0). `mas`: deltaRatio<0 (más descuento $/kg). `disminuyeron`: kgA>0 ∧ kgB>0 ∧ ambos ratios <0 ∧ deltaRatio>0. |
| Authz | Igual que venta: GA + GV 403. Sin `plantas_permitidas`. |
| Intent / tool | `delta_discount` → `get_delta_discount`; `executor: null`. |
| FE | `DeltaDescuentoModal.tsx`. |
| Colisión | `POST /weekly-discount-lectura` (16260) es **M10**, no M9. `PLANT_FINANCIAL_KPI_RE` incluye `descuento` → hoy el chat puede responder con IGF. |
| Tests | Planner: `"¿Cómo cambió el descuento?"` → `delta_discount`. |

**No mezclar** con Delta Venta: unidad distinta, buckets distintos, 80/20 sobre **esta** muestra.

---

## 4. Delta Ingreso — estado físico

Hay **tres** superficies HTTP. Solo una es la familia canónica del modal.

### 4.1 Familia canónica (modal `DeltaIngresoModal`)

| Pieza | Hallazgo |
|---|---|
| Periodos | `GET /api/dashboard/delta-ingreso-periodos` (16320). Reusa `getPeriodosDeltaVenta` (mismos meses de venta). Aplica `ALIAS_PLANTA_NOMBRE`. **No** llama `dashboardBlockGVForbidden`; GV pasa por `assertGVPlantaNombreAccess`. |
| Datos | `POST /api/dashboard/delta-ingreso-datos` (17251). Body `{ planta, periodoA, periodoB, sinRegla8020? }`. |
| Helpers | `getDeltaIngresoClientes` (2180) → `{ rows, margenA, margenB }`; `getDeltaIngresoDatosInternal` (17173) arma buckets. |
| Fórmula | `ingreso = kg * (margen_$kg - |desc_$kg|)`. `delta = ingresoB - ingresoA`. |
| Margen IGF | `getMargenKgPorPeriodo` lee `igf.versions` + `igf.compromiso_lines` (última versión del mes). Si no hay dato: **`?? 0`**. Esto es **insumo de la fórmula del dashboard**, no un sustituto IGF/ARR annex. |
| Fuente ARR | mismas ventas/descuentos que las otras familias. |
| Método / side effects | Periodos GET: SELECT. Datos POST: SELECT ARR + SELECT IGF. **No escribe.** |
| Shape | Además de `dejaron/mas/disminuyeron`: `clientesNuevos`, `crecen`, `estables`, `otrosClientes`, `margenAStr/margenBStr`, toneladas. |
| Buckets ingreso | `dejaron`: ingresoA>0 ∧ ingresoB≤0. `mas`: deltaIngreso>0 ∧ kgA>0. `disminuyeron`: ambos ingresos >0 ∧ delta<0. |
| Authz datos | GA 403; **GV 403** (`dashboardBlockGVForbidden`). Sin `plantas_permitidas`. |
| FE | `DeltaIngresoModal.tsx` → `postDeltaIngresoDatos`. |

### 4.2 Forecast (fuera del COMPLETE de este slice)

`POST /api/dashboard/delta-ingreso-forecast-datos` (16345) llama `deltaIngresoForecast.computeDeltaIngresoForecast`, que **sí tiene side effects**: `DELETE` + `INSERT` en `arr.delta_ingreso_forecast_cliente` (`lib/delta-ingreso-forecast.js` 329–360). Authz distinta: `dashboardBlockGAFinancialKpis` + GV por planta (GV **sí** entra). No es el modal de periodos A/B reales.

`GET /delta-ingreso-forecast-excel` y `POST /dicf-datos` son otras superficies (Excel / M11).

### 4.3 Intent / tool

`delta_income` → `get_delta_income`; `executor: null`; `sourceFiles` menciona `delta-ingreso-forecast.js` (desactualizado respecto al modal canónico). Planner: `"¿Cómo cambió el ingreso?"` acepta `delta_income` **o** `financial_diagnosis`. La regla `delta_income` está **antes** que `financial_diagnosis` (líneas 356 vs 363); «por qué cayó» va a diagnóstico, no a M9.

---

## 5. Frontera M9 vs M19

| | M9 Delta Ingreso | M19 Delta Ingreso AI |
|---|---|---|
| Propósito | Comparar periodos del **dashboard** | Subsistema paralelo WhatsApp/OpenAI |
| HTTP | `/api/dashboard/delta-ingreso-*` | `/api/ai/delta-ingreso/test/*` **sin** `dashboardAuthMiddleware` |
| Tablas | ARR + IGF margen (lectura) | `public.delta_ingreso_ai_*` |
| Relación | M19 **reutiliza** `getDeltaIngresoDatosInternal` para armar un brief y **enviar** WhatsApp + outbox (17280+) | No es fuente de Director IA |
| Parte 9 | Clase C: no disparar test/* ni envíos | N_A / no integrar |

Separación inequívoca: M9 llama helpers de **consulta** del dashboard. M9 no importa `delta-ingreso-ai*`, no pega a `/api/ai/*`, no escribe outbox. Compartir el helper de cálculo **no** fusiona los módulos.

---

## 6. Planner / tools / capabilities / chat

| Pieza | Estado |
|---|---|
| Intents | Existen; tests planner cubren las tres preguntas «cómo cambió…». |
| Tools | Declaradas, `readOnly: true`, `declared_not_integrated`, `executor: null`. `isDirectorIaToolExecutable` = false. |
| Tool Plan | `reason: domain_not_integrated`. Orchestrator **no ejecuta**. |
| Capabilities | `delta_venta` / `delta_descuento` / `delta_ingreso`: `coverage: none`, `canRead: false`. |
| UNSUPPORTED_RULES | **No** hay regla delta. No hay `SOURCE_NOT_INTEGRATED` específico. |
| Chat | Sin ramas `delta_*`. Tras planner cae a OpenAI + IGF/AR. |
| Cycle | `director-ia-real-cycle.js` no referencia deltas. M9 no entra al cycle. |

Wiring ya existente: intent → tool **declarada**. Falta: executor + rama in-process + `canRead`.

Loaders: **tres funciones** (una por familia) en un lib compartido, como M3 tuvo KPIs y proyectos separados. Un único dispatcher genérico está prohibido.

Planner: no hace falta rediseño; sí conviene que IMPL evite que «cómo cambió el descuento» siga yendo al anexo IGF (la rama in-process, **antes** de `isPlantFinancialKpiQuestion`, lo resuelve igual que M3).

---

## 7. Mapa authz

| Familia | GA | GV | `plantas_permitidas` en API actual |
|---|---|---|---|
| Venta periodos/datos | 403 | 403 | no |
| Descuento periodos/datos | 403 | 403 | no |
| Ingreso periodos | 403 | permitido si planta del GV | no (usa assertGV) |
| Ingreso datos (canónico) | 403 | 403 | no |
| Ingreso forecast | 403 (KPI financiero) | permitido si planta | no |

Path Director IA (igual o **más** restrictivo, permitido):

- Bloquear **GA** y **GV** en las tres familias (alineado a los POST de datos canónicos).
- Exigir `planta_id` del scope + `assertPlantaPermitida` (GG/GA/AD), patrón M3.
- Resolver nombre vía `resolvePlantaRow`; no aceptar un `planta` distinto al scope.
- No usar el agujero GG de la API dashboard (cualquier nombre).

---

## 8. Contrato de periodos

- Formato: `YYYY-MM`. A ≠ B. Inválido o iguales → no calcular (API 400; chat: no inventar).
- Lista: meses **con datos** en la fuente de esa familia (ingreso reusa meses de **venta**).
- Orden en SQL: DESC (más reciente primero).
- FE **no** elige default; el usuario pica A/B.
- Default chat (determinado aquí, no es decisión arquitectónica): si la pregunta no trae dos `YYYY-MM`, usar los **dos primeros distintos** de la lista DESC (B = más reciente, A = el siguiente). Si hay <2 periodos → empty/fail-safe, no inventar.
- Freshness: la de las tablas ARR (y, en ingreso, la última `igf.versions` del mes). No hay timestamp de «corte» en el JSON delta.

---

## 9. Contrato de datos y nulls

| Familia | Observado | Derivado | Cero / null del origen |
|---|---|---|---|
| Venta | `kg` por cliente/mes | `deltaKg`; buckets 80/20 | Ausencia → 0 kg (`COALESCE`). JSON nunca null en kg. |
| Descuento | `monto`, `kg` | `ratio = monto/kg`; `deltaRatio`; promedio de bucket | kg=0 → ratio **0** (no null, no «N/C»). |
| Ingreso | kg, monto desc, margen IGF | `ingreso`, `deltaIngreso` | margen ausente → **0**; kg=0 → desc $/kg 0. |

Reglas para IMPL (sin redefinir el origen):

- No inventar % de variación encima del JSON (`delta/base`). Si se añade %, `base=0` no es porcentaje válido.
- No presentar el top 20% como el universo.
- No afirmar causalidad, deterioro o mejora más allá del signo de la métrica de **esa** familia.
- Conservar `signPositive` del origen (en descuento, `mas` tiene `signPositive: false` porque más descuento es ratio más negativo).

---

## 10. Tabla de evidencia

| family | canonical_requirement | current_state | endpoint | helper | source | request_method | side_effects | authz | period_semantics | response_shape | existing_intent | existing_tool | executor | missing_delta | testability | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Venta | Comparar kg entre dos YYYY-MM | API sí; Director IA no | GET periodos + POST datos | `getPeriodosDeltaVenta`, `getDeltaVentaClientes` | `arr.ventas_diarias_cliente` | GET / POST | ninguno | GA/GV 403 | YYYY-MM A≠B | dejaron/mas/disminuyeron kg | `delta_sales` | `get_delta_sales` | null | extractor + chat + capability | alta | medio (planta nombre; 80/20) | `server.js` 1928, 16078 |
| Descuento | Comparar $/kg entre dos YYYY-MM | API sí; IA no | GET + POST | `getPeriodosDeltaDescuento`, `getDeltaDescuentoClientes` | descuentos + ventas | GET / POST | ninguno | GA/GV 403 | YYYY-MM A≠B | mismos buckets; unidad $/kg | `delta_discount` | `get_delta_discount` | null | igual | alta | medio (IGF «descuento»; buckets ≠ venta) | `server.js` 2039, 16169 |
| Ingreso (modal) | Comparar ingreso = kg×(margen−|desc|) | API sí; IA no | GET periodos + POST datos | `getDeltaIngresoClientes`, `getDeltaIngresoDatosInternal` | ARR + `igf.versions` | GET / POST | ninguno | datos: GA/GV 403 | YYYY-MM; periodos=venta | buckets + extras + margenStr | `delta_income` | `get_delta_income` | null | igual; no usar forecast.js | alta | medio (margen 0; M19) | `server.js` 2180, 17173, 17251 |
| Ingreso forecast | A real / B forecast | API sí; **fuera COMPLETE** | POST forecast-datos | `computeDeltaIngresoForecast` | ARR + cache | POST | **DELETE/INSERT cache** | GA KPI; GV planta | A/B forecast | otras categorías | — | — | — | no cablear | — | alto (write) | `delta-ingreso-forecast.js` 329 |
| M19 | N/A | paralelo | `/api/ai/delta-ingreso/test/*` | `delta-ingreso-ai*` | `delta_ingreso_ai_*` | GET/POST | outbox + WhatsApp | sin dashboard auth | env `PERIODO_AI_*` | status/help | — | — | — | no integrar | — | C | `server.js` 17280 |

---

## 11. Tabla de gaps

| gap_id | family | missing_capability | required_for_complete | reusable_component | proposed_physical_change | architecture_change | contract_change | authz_change | estimated_complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|---|
| G1 | las 3 | executor / loader in-process | sí | helpers `server.js` | extraer a `lib/director-ia-m9-deltas.js`; `server.js` delega | no | no | no | media | no |
| G2 | las 3 | rama chat | sí | patrón M3/M16 | `if (intent === delta_*)` antes del LLM | no | no | no | baja | no |
| G3 | las 3 | tool executable | sí | tools ya declaradas | `available_on_demand` + executor nombrado | no | no | no | baja | no |
| G4 | las 3 | capability readable | sí | capabilities existentes | `canRead: true`, coverage partial/on_demand | no | no | no | baja | no |
| G5 | las 3 | scope planta | sí | `resolvePlantaRow`, `assertPlantaPermitidaM3` | reforzar `plantas_permitidas` + GA/GV | no | no | **más restrictivo** | baja | no |
| G6 | las 3 | default periodos | sí | listas GET | dos YYYY-MM más recientes si la pregunta no los trae | no | no | no | baja | no |
| G7 | las 3 | tests | sí | patrón `test/director-ia-m3-*.test.js` | tests focales 3 familias + authz + empty + no M19 | no | no | no | media | no |
| G8 | ingreso | frontera forecast/M19 | sí | — | no llamar forecast ni `delta-ingreso-ai*` | no | no | no | baja | no |
| G9 | descuento | no caer a IGF | sí | orden de ramas chat | in-process antes de `isPlantFinancialKpiQuestion` | no | no | no | baja | no |

Ningún gap es blocker de arquitectura. Ninguno exige G2/G3.

---

## 12. Riesgos

**Semánticos**

- Mezclar venta (kg), descuento ($/kg) e ingreso (MXN).
- Tratar top 20% como total.
- Convertir el 0-por-división-del-origen en «dato real» sin decir que kg=0 → ratio 0.
- Usar IGF annex o commercial_state como si fueran el modal.
- Usar margen IGF 0 (ausente) como «margen cero observado» sin declararlo.
- Afirmar causalidad.
- Meter forecast o M19 en la respuesta de ingreso.

**Productivos**

- Bajos si solo SELECT. Altos si se cablea forecast (escritura de cache) o M19 (WhatsApp).
- Cross-planta si se reusa el POST dashboard sin `planta_id` de scope.

---

## 13. Dependencias

- ARR cargado (`ventas_diarias_cliente`, `descuentos_diarios_cliente`, `provincia_plants`).
- Para ingreso: filas IGF del mes (si faltan, margen 0 según origen).
- JWT + `planta_id` de chat.
- Sin migrations, S3, Twilio, cycle, HTTP interno.

---

## 14. Fit arquitectónico

M9 cabe en el patrón de producto ya usado (capability → planner → tool → executor in-process → evidencia). El índice marca chat/tools como soporte de producto, **no** pipeline N1–N4/IES.

| Gate | Valor |
|---|---|
| G2 | **No.** No se edita `docs/director-ia/`. |
| G3 | **No.** No hay contrato nuevo. |
| Cycle / OP / EB / EKS / IES / Reasoning | **No entra.** |
| Dispatcher genérico | **No.** |

---

## 15. Feasibility COMPLETE

**YES.**

Tras un slice IMPL, Director IA podría consultar las tres familias para planta y periodos autorizados, con fuentes reales, sin mutaciones, sin M19 y con evidencia por familia.

Criterio `completion_test` de la tarea: **YES** con evidencia física.

---

## 16. Delta físico mínimo

1. Crear `lib/director-ia-m9-deltas.js` con helpers extraídos y tres loaders (`loadDeltaVentaForChat`, `loadDeltaDescuentoForChat`, `loadDeltaIngresoForChat`) + builders de respuesta.
2. `server.js`: delegar GET/POST canónicos a esos helpers (como M3). **No** mover forecast write.
3. Authz: GA/GV deny + `plantas_permitidas` + nombre del scope.
4. Tools: executors; status `available_on_demand`.
5. Capabilities: `canRead: true` en las tres.
6. Chat: tres `if` in-process **antes** de OpenAI / IGF annex.
7. Tests focales + ajustes scripts planner/capabilities/orchestrator.
8. Semántica: tres familias distintas; no % inventado; no forecast; no M19; no KPIs M3.

**Archivos probables:** `lib/director-ia-m9-deltas.js` (nuevo), `server.js`, `lib/director-ia-chat.js`, `lib/director-ia-tools.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-planner.js` (solo si un test lo exige; no rediseño), `test/director-ia-m9-deltas.test.js` (nuevo), `scripts/test-director-ia-*.js`.

**No tocar:** matriz, contratos, `delta-ingreso-forecast.js` write path, `delta-ingreso-ai*`, cycle.

---

## 17. Tests requeridos

- Intent de las tres preguntas canónicas y no-colisión con `financial_diagnosis` / IGF / M3 KPIs / AR «taller».
- Registry: tools ejecutables; capabilities readable.
- Authz: GA 403, GV 403, cross-planta 403, happy path rol permitido.
- Happy path de cada familia: shape, unidades, buckets, 80/20, null/cero del origen.
- Empty: <2 periodos; periodos iguales; planta sin ARR.
- Ingreso: margen ausente → 0 declarado; no llama forecast ni M19.
- Chat e2e in-process (sin OpenAI) por familia.
- POST de datos: el IMPL no introduce INSERT/UPDATE/DELETE.

---

## 18. NEXT_TASK y gates

Exactamente uno, **no autorizado, no ejecutado**:

**`IMPL-DIRECTOR-IA-M9-DELTAS-001`**

| Gate | Valor | Motivo |
|---|---|---|
| G1 | requerido | Autorizar la implementación |
| G2 | N/A | Arquitectura existente |
| G3 | N/A | Sin contrato nuevo |
| G8 | N/A | Sin calibración |

---

## Acciones no realizadas

- No implementación.
- No runtime, frontend, backend, tests, SQL, matriz, contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó el NEXT_TASK.

## secrets_check

none

## git

`git diff --check`: limpio (sin output).

`git status`:

```
On branch architecture/director-ia-m9-deltas-readiness-001
Changes not staged for commit:
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md
```

Solo `CURRENT_TASK.md` y este reporte. Sin cambios de código, matriz ni contratos.

STOP.
