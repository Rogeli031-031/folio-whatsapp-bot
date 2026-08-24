# Reporte — ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M7 — IGF Forecast"
slice: "composición snapshot de igf.compromiso_lines ya cargada por loadIgfCommitSnapshot; una versión/un mes/una planta; sin deltas temporales nuevos; sin causalidad; sin overlay de folios; sin PATCH"
intent_choice: "reutilizar igf_status + get_igf_snapshot; financial_diagnosis puede adjuntar el bloque pero no se reescribe como causa"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "igf-handler.js"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"
  - "lib/director-ia-igf-arr.js (lectura)"
  - "lib/dashboard-arr-forecast.js IGF_*_COLS (lectura)"
  - "igf-handler.js ORDER_DELTAS / VARIABLES_CARGO_PLANTA (lectura)"
  - "server.js recalcularUtilYResultado + overlay GET forecast (lectura)"
  - "lib/director-ia-planner.js, director-ia-tools.js, director-ia-context.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "006 sugería Δ mes previo de líneas IGF. Esta tarea prohíbe deltas temporales nuevos. El slice es snapshot único."
next_task_proposed: "IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. El slice profundiza PARTIAL; no redefine COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia M7 ni 50.0%."
  - "Un IMPL futuro seguiría PARTIAL y 10.0/20 = 50.0%."
```

## Resumen ejecutivo

**READY.** Director IA ya carga `igf.compromiso_lines` con `SELECT *` (`loadIgfCommitSnapshot`) y tira casi todas las columnas. El annex solo imprime venta, margen, com/desc, HG e ingreso aprox.

Hay un path read-only, in-process y semánticamente seguro para exponer la **composición observada** de **una** fila (una planta, una versión, un mes).

**COMPOSICIÓN ≠ CAUSALIDAD.**  
Permitido: «esta línea entra al cálculo con +/−», «estas líneas componen el resultado», «dentro de la misma unidad, estas tienen mayor magnitud».  
Prohibido: «esta línea causó la caída», «este es el problema principal», «este responsable provocó el resultado».

**Snapshot ≠ tendencia.** No se crean deltas temporales de líneas IGF. M9 sigue siendo el dominio de deltas de periodos reales.

`ORDER_DELTAS` es **orden de presentación** de la UI «Cómo cambió», no la semántica de cálculo. La fórmula física es `recalcularUtilYResultado`. El snapshot **no** ejecuta esa función ni el overlay de folios/presupuesto del GET dashboard.

Un IMPL futuro deja M7 en **PARTIAL** y el global en **10.0 / 20 = 50.0%** (0.0 pp).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m7-igf-composition-readiness-001` (≠ `main`).
- HEAD: `a93ef13f Merge branch 'architecture/director-ia-global-next-module-prioritization-006'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006` |
| Módulo | M7 — IGF Forecast |
| Estado actual | **PARTIAL** |
| Global | **10.0 / 20 = 50.0%** |
| Tras IMPL futuro | **PARTIAL**; **50.0%**; **0.0 pp** |

Ficha canónica: chat on-demand vía `loadIgfCommitSnapshot` / `loadIgfArrAnnexForChat`; `sources.igf` siempre false en GET context. COMPLETE de M7 (UI, PATCH HG, meta Excel, versiones) **sigue fuera**.

---

## Definición canónica M7

Propósito: forecast financiero por planta/empresa, compromiso, HG, pronóstico.  
Director IA hoy: annex recortado (4 campos + margen vs mes previo ya existente + ARR).  
Este slice: **profundiza PARTIAL**. No suma 0.5. No marca COMPLETE.

---

## Shape físico de `compromiso_lines`

DDL CREATE **no** está en `sql/` (solo `sql/012_igf_meta_global.sql` declara independencia). El shape verificable es el de **código**:

`loadIgfCommitSnapshot` (`lib/director-ia-igf-arr.js` L194–223):

```text
igf.versions WHERE plant_code='GLOBAL' AND year/month
  ORDER BY version_number DESC LIMIT 1
SELECT * FROM igf.compromiso_lines WHERE version_id = $1
→ obj.empresa + cada columna ≠ {empresa, version_id, id} como Number|null
→ findIgfRowForPlant(rows, plantCode, plantaNombre)  // 1 fila
```

No hay arrays/objetos de líneas. Es **una fila plana** por empresa. No crece como lista N; el recorte es por columnas, no por filas de detalle.

### Keys

| Key | Uso |
|---|---|
| `version_id` | versión GLOBAL del mes |
| `empresa` | identidad de fila; matching de planta |
| `id` | PK; el snapshot lo **omite** del objeto numérico |

Matching de planta: `findIgfRowForPlant` (igualdad / includes; excluye fila `Totales`). Ambigüedad de nombre: score; no hay clarificación dedicada hoy. El IMPL **preserva** ese matcher; no inventa otra clave.

### Labels y unidades (headers de producto)

`IGF_FORECAST_COLS` / `IGF_FORECAST_HEADERS` y `IGF_COMPROMISO_RAW_COLS` / `IGF_COMPROMISO_HEADER_ROW7` (`lib/dashboard-arr-forecast.js`):

| line_key | label físico | unit |
|---|---|---|
| `venta_ton` | Venta | ton |
| `margen_kg` | Margen | $/kg |
| `com_desc_kg` | Com. y Desc. | $/kg |
| `presupuesto_kg` | Presupuesto | $/kg |
| `folios_aprob_zp_kg` | Folios Aprob. ZP | $/kg |
| `folios_carro_kg` | Folios carro | $/kg |
| `gasto_kg` | Gasto (raw / agregado UI) | $/kg |
| `impuesto_kg` | Impuesto | $/kg |
| `hg_pct` | HG % | % |
| `hg_kg` | HG | $/kg |
| `bancos_planta_kg` | Bancos Planta | $/kg |
| `provision_planta_kg` | Provisión Planta | $/kg |
| `util_oper_kg` | Util. Operación | $/kg |
| `util_oper_importe` | Util. Operación | MXN |
| `gtos_apoyos_corp_kg` | Gtos/Apoyos Corp | $/kg |
| `bancos_corp_kg` | Bancos Corp. | $/kg |
| `otros_programas_kg` | Otros Programas | $/kg |
| `inversiones_kg` | Inversiones | $/kg |
| `resultado_final_kg` | Resultado | $/kg |
| `resultado_final_importe` | Resultado | MXN |
| `deposito_cierre_kg` | (overlay GET; puede faltar) | $/kg |

El sufijo `_kg` significa **$/kg**, no kilogramos. `VARIABLES_CARGO_PLANTA` etiqueta `unit: "kg"` — **no usar** esa etiqueta en Director IA.

### Valores / nulls / tipos

`toNum`: `null` / `""` → `null`; no finito → `null`. **Null ≠ 0** en exposición.  
`recalcularUtilYResultado` usa `n()` (`null` → `0`) **solo** si se recalcula. El snapshot **no** recalcula. El IMPL no debe imprimir null como cero.

### Observado vs derivado

| Clase | Campos | Dónde |
|---|---|---|
| Observado persistido | Todas las columnas presentes en el `SELECT *` | snapshot |
| Derivado en annex hoy | ingreso aprox. `(margen+desc−HG)×ton×1000` (mezcla ARR/IGF) | **fuera** del bloque de composición |
| Derivado en GET dashboard | `presupuesto_kg`, `folios_*_kg`, `deposito_cierre_kg`, `gasto_kg`, `util_oper_*`, `resultado_*` overlay + `recalcularUtilYResultado` | **no** corre en Director IA |
| Derivado de producto (fórmula) | `util_oper_kg/importe`, `resultado_final_kg/importe` **si** se invocara `recalcularUtilYResultado` | no invocar en este slice |

El slice expone **observado persistido**. No overlay de `public.folios` / presupuesto. No PATCH.

### Raw vs forecast

- Raw upload (`IGF_COMPROMISO_RAW_COLS`): tiene `gasto_kg`; **no** trío presupuesto/folios.
- Forecast cols: tienen el trío; `gasto_kg` en GET se **recompone** como suma (depósito ya negativo).
- `recalcularUtilYResultado` **no usa** `gasto_kg`. Usa el trío + `deposito_cierre_kg`.

Regla: emitir solo keys **presentes** en el row. No tratar `gasto_kg` y el trío como la misma magnitud. No sumarlos.

### Duplicados

Una fila por `empresa` en la versión. `findIgfRowForPlant` elige una. Sin lista de líneas hijas.

---

## ORDER_DELTAS

Comentario físico (`igf-handler.js` L1060): «Orden exacto de deltas para "Cómo cambió"».

**Determinación: solo presentación de la UI de comparación.** No es el orden ni el conjunto de la fórmula.

Pruebas:

- Incluye keys que **no** son columnas (`venta`, `margen`, `total_cargo`, `total_corp`).
- Mezcla unidades (ton, $/kg, MXN).
- Colapsa presupuesto/folios/depósito en `gasto_kg`.
- Omite `hg_pct`, importes, `deposito_cierre_kg`, el trío forecast.

**No** usar `ORDER_DELTAS` como orden de composición en Director IA.  
**No** llamar `obtenerDeltasVariablesCargoPlanta` / `obtenerDeltasVariablesCorporativo` (son deltas entre versiones/meses = tendencia; este slice lo prohíbe).

Orden del slice: orden de **rol de fórmula** entre keys presentes (abajo), no el de la UI.

---

## `recalcularUtilYResultado` — fórmulas reales (sin reinterpretar)

`server.js` L12268–12301. `n(v) = Number(v) || 0` si no finito.

```text
ventaKg = venta_ton * 1000

util_oper_kg =
    margen_kg
  + com_desc_kg
  + deposito_cierre_kg
  − presupuesto_kg
  − folios_aprob_zp_kg
  − folios_carro_kg
  − impuesto_kg
  − hg_kg
  − bancos_planta_kg
  − provision_planta_kg

util_oper_importe = ventaKg > 0 ? util_oper_kg * ventaKg : 0

resultado_final_kg =
    util_oper_kg
  − gtos_apoyos_corp_kg
  − bancos_corp_kg
  − otros_programas_kg
  − inversiones_kg

resultado_final_importe = ventaKg > 0 ? resultado_final_kg * ventaKg : 0
```

Redondeo: la función no redondea `util_oper_kg`. El overlay GET redondea $/kg de folios/presupuesto a 2 decimales **antes**. El snapshot no aplica ese redondeo.

### Qué suma / qué resta (rol de fórmula)

| Rol | Keys | Unidad del término |
|---|---|---|
| Suma | `margen_kg`, `com_desc_kg`, `deposito_cierre_kg` | $/kg |
| Resta (cargo planta) | `presupuesto_kg`, `folios_aprob_zp_kg`, `folios_carro_kg`, `impuesto_kg`, `hg_kg`, `bancos_planta_kg`, `provision_planta_kg` | $/kg |
| Subtotal | `util_oper_kg` (almacenado u obtenido por la fórmula **si** se corriera) | $/kg |
| Resta (corp) | `gtos_apoyos_corp_kg`, `bancos_corp_kg`, `otros_programas_kg`, `inversiones_kg` | $/kg |
| Total | `resultado_final_kg` | $/kg |
| Conversión | `venta_ton` → `ventaKg` solo para importes | ton → kg |

`hg_pct` no entra. `gasto_kg` no entra. Importes no entran a la suma $/kg.

### Signos

- La fórmula **resta** `hg_kg` tal cual. Si el persistido es positivo, restar cobra; si es negativo, restar un negativo **suma**.
- GET forecast **invierte** `hg_kg > 0` a negativo antes de recalcular (`server.js` L11705–11707). El snapshot **no** hace eso.
- `deposito_cierre_kg` en overlay se guarda **negativo** y luego se **suma**.
- `inversiones_kg` se guarda positivo y se **resta**. Comentario: en pantalla suelen verse negativas.

**IMPL:** emitir el **signo almacenado**. No invertir. No afirmar que el stored `util_oper_kg` = recomposición si no se verificó. Si se comprueba desigualdad: declarar ambas; no elegir.

### Qué total puede recomponerse

Matemáticamente, `util_oper_kg` y `resultado_final_kg` **si** todos los operandos presentes se tratan como la fórmula.  
Este slice **no** debe sustituir el stored por el recomputado. Recomposición = evidencia opcional de consistencia, no KPI publicado.

---

## Unidades — no mezclar

| Familia | Campos | ¿Se pueden rankear juntos? |
|---|---|---|
| ton | `venta_ton` | solo esa |
| $/kg | márgenes, cargos, util/resultado `_kg` | sí, entre sí |
| % | `hg_pct` | no |
| MXN | `*_importe` | sí, entre sí; **no** vs $/kg |

No sumar unidades distintas. No comparar pesos (MXN) con $/kg. No inventar %. No convertir ton↔$/kg salvo la fórmula de importe ya citada, y solo si se documenta como conversión de producto, no como línea de composición.

---

## Composición vs causalidad

| Permitido | Prohibido |
|---|---|
| «Esta línea entra al cálculo con + / −.» | «Esta línea causó la caída.» |
| «Estas líneas componen el resultado.» | «Este es el problema principal.» |
| «Dentro de $/kg, estas tienen mayor magnitud.» | «El responsable provocó el resultado.» |
| | Magnitud ≠ importancia operacional |
| | Signo matemático ≠ juicio empresarial |
| | Línea ≠ responsable |

El addendum actual del annex («Bitácora/DICF solo como complemento si aportan causa operativa») **no** autoriza a este slice a afirmar causa. El bloque de composición no debe usar esa frase.

---

## Frontera M9

| Superficie | Dueño |
|---|---|
| Δ venta / desc / ingreso de periodos reales ARR | **M9** (COMPLETE) |
| Margen mes vs mes previo ya impreso en annex | comportamiento **existente**; no es este slice |
| Δ de líneas IGF entre meses/versiones | **fuera** (ORDER_DELTAS / handler; no crear) |
| Composición de **un** snapshot | **este slice** |

`financial_diagnosis` hoy enruta a `arr` + `igf` + tools M9. El IMPL no debe convertir «por qué cayó el ingreso» en delta de líneas IGF.

---

## Annex / context actual

GET context: `sources.igf: false`. Sin summarizer IGF always-on.

Annex (`loadIgfArrAnnexForChat`) imprime:

- COMPARACION MARGEN $/kg curr vs prev (ya existe; no es composición de líneas)
- ARR venta/desc curr vs prev
- IGF: versión, `venta_ton`, `margen_kg` (o `getMargenKgPorPeriodo`), `com_desc_kg`, `hg_kg`, ingreso aprox.
- Omite: impuesto, bancos, provisión, presupuesto, folios, corp, inversiones, util/resultado, `hg_pct`, importes, `gasto_kg`

**Bloque mínimo:** tras el bloque IGF de 4 campos, un bloque `COMPOSICIÓN IGF (snapshot, no tendencia)` con las líneas presentes, unidad, signo almacenado, rol de fórmula si aplica, `source=igf.compromiso_lines`. Sin top clientes. Sin commercial_state. Sin recomputar ingreso aprox. dentro del bloque.

Provenance: cada línea lleva `line_key`, `unit`, `source`.

---

## Planner / tools

| Pieza | Hecho |
|---|---|
| Intent `igf_status` | `/\bigf\b/` y no `delta` → dominio `igf` |
| Intent `financial_diagnosis` | caída/diagnóstico/margen planta → arr+igf+M9 |
| Tool `get_igf_snapshot` | executor `loadIgfArrAnnexForChat`; on-demand; read-only |
| Chat | `shouldAttachIgfArrAnnex` + `loadIgfArrAnnexForChat` in-process |

**Reutilizar** `igf_status` → `get_igf_snapshot` → snapshot → `extractIgfComposition` (helper nuevo en el mismo módulo IGF; no contrato).  
No intent nuevo obligatorio. No stub nuevo.  
Preservar: M9 (`delta_*`), M6 (gastos/inversiones), listas commercial_state.

Preguntas nuevas: «de qué se compone la utilidad/resultado IGF», «qué líneas entran al compromiso».  
No: «cómo cambió la venta/descuento/ingreso» (M9).

---

## Authz

Preservar annex vigente:

- JWT / `dashboardAuth`
- `planta_id` obligatorio
- **GA 403** («GA no tiene acceso a KPIs financieros.»)
- GV: `assertGVPlantaNombreAccess`
- Matching de fila por planta del request (no cross-planta de otras empresas del `SELECT *` en la respuesta)
- Fail-closed sin auth / sin planta
- Authz **antes** de exponer líneas

No relajar. No `acceso_igf_forecast_kpis` nuevo. No HTTP a `/api/dashboard/igf-*`.

---

## Política de contexto

| Regla | Valor |
|---|---|
| Filas | 1 (planta resuelta) |
| Versión | 1 (última del mes) |
| Máximo líneas emitidas | **16** claves $/kg + 1 venta + 1 `hg_pct` + 2 importes (omitir ausentes/null) |
| Orden | rol de fórmula entre presentes; resto alfabético por `line_key` |
| Null | omitir; no cero |
| Precisión | 2 decimales $/kg y %; 1 decimal ton; 0 decimales MXN (mismo criterio `fmtNum`/`fmtMoney` del annex) |
| Ranking de magnitud | solo intra-unidad |
| Recorte | si hubiera columnas extra desconocidas: no emitirlas (allowlist = keys de las tablas COLS + `deposito_cierre_kg`) |

No es una estructura ilimitada: es un row de columnas fijas.

---

## Path hipotético (no implementado)

```text
igf_status / financial_diagnosis
  → get_igf_snapshot
  → loadIgfArrAnnexForChat / loadIgfCommitSnapshot
  → assert authz (ya)
  → extractIgfComposition(row observado)
  → bloque acotado + evidencia
  → respuesta
```

In-process. SELECT-only. Sin HTTP interno. Sin writes. Sin contrato nuevo. Sin duplicar M9.

---

## Evidence table

| line_or_surface | physical_source | shape | unit | sign | formula_role | order | observed_or_derived | safe_for_reasoning | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| `venta_ton` | `compromiso_lines` | scalar | ton | stored | conversión a importe | 0 | observed | sí | no rankear vs $/kg | SELECT * + header |
| `margen_kg` | idem | scalar | $/kg | stored | + | 1 | observed | sí | no sustituir por `getMargenKgPorPeriodo` en el bloque | snapshot / header |
| `com_desc_kg` | idem | scalar | $/kg | stored | + | 2 | observed | sí | ≠ ARR desc | snapshot |
| `deposito_cierre_kg` | persistido u overlay GET | scalar | $/kg | stored (overlay: negativo) | + | 3 | observed if present | sí si presente | puede faltar | overlay L11735; fórmula L12289 |
| `presupuesto_kg` | persistido u overlay | scalar | $/kg | stored | − | 4 | observed if present | sí si presente | no join M18 | fórmula |
| `folios_aprob_zp_kg` | idem | scalar | $/kg | stored | − | 5 | observed if present | sí si presente | no FK M6 | fórmula |
| `folios_carro_kg` | idem | scalar | $/kg | stored | − | 6 | observed if present | sí si presente | no FK M18 | fórmula |
| `impuesto_kg` | persistido | scalar | $/kg | stored | − | 7 | observed | sí | | fórmula |
| `hg_kg` | persistido | scalar | $/kg | **stored; no invertir** | − | 8 | observed | sí | signo vs GET | L11705 vs snapshot |
| `hg_pct` | persistido | scalar | % | stored | none | n/a | observed | sí aislado | no inventar % | COLS |
| `bancos_planta_kg` | persistido | scalar | $/kg | stored | − | 9 | observed | sí | | fórmula |
| `provision_planta_kg` | persistido | scalar | $/kg | stored | − | 10 | observed | sí | | fórmula |
| `gasto_kg` | raw o agregado GET | scalar | $/kg | stored | **none** | after | observed if present | sí como observado | ≠ trío; no entra a fórmula | RAW_COLS vs L11746 |
| `util_oper_kg` | persistido | scalar | $/kg | stored | subtotal stored | 11 | observed | sí como stored | ≠ recomputado | snapshot no llama fórmula |
| `gtos_apoyos_corp_kg` … `inversiones_kg` | persistido | scalar | $/kg | stored | − de util | 12–15 | observed | sí | inversiones + en store | L12265–12299 |
| `resultado_final_kg` | persistido | scalar | $/kg | stored | total stored | 16 | observed | sí como stored | | snapshot |
| `*_importe` | persistido | scalar | MXN | stored | conversión stored | aparte | observed | sí intra-MXN | no vs $/kg | COLS |
| `ORDER_DELTAS` | `igf-handler.js` | lista UI | mix | n/a | **no cálculo** | UI | n/a | no como orden del slice | tendencia | L1060 |
| Overlay GET folios | `server.js` | $/kg live | $/kg | recalculado | input a fórmula UI | n/a | derived live | **no** en este slice | write-adjacent / M6 | L11717–11751 |
| Ingreso aprox annex | annex | MXN | MXN | n/a | no fórmula util | n/a | derived mix | no en bloque composición | mezcla ARR | L432 |

---

## Gap table

| gap_id | missing_capability | required_for_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | líneas no impresas | sí | `loadIgfCommitSnapshot` row | `extractIgfComposition` + bloque annex | no | no | no | baja | no |
| G2 | labels/units/roles | sí | `IGF_*_HEADERS` + fórmula | allowlist + metadata | no | no | no | baja | no |
| G3 | semántica anti-causa | sí | copy del bloque | invariantes en respuesta | no | no | no | baja | no |
| G4 | no deltas IGF | sí | — | no segundo snapshot; no handler deltas | no | no | no | nula | no |
| G5 | `hg_kg` signo | no (emitir stored) | — | no invertir | no | no | no | nula | no |
| G6 | raw vs forecast | sí | keys presentes | no inventar trío/`gasto_kg` | no | no | no | baja | no |
| G7 | overlay folios | no (fuera) | — | no llamar GET recalculo | no | no | no | nula | no |

Ningún gap bloquea READY.

---

## Hipótesis de implementación (no ejecutada)

1. Helper `extractIgfComposition(row, { year, month, planta_id, version_id })` en `lib/director-ia-igf-arr.js`.
2. Allowlist de keys; omitir null/ausentes.
3. Cada ítem: `line_key`, `line_label`, `value`, `unit`, `sign_as_stored`, `formula_role` (`add`/`subtract`/`none`/`stored_subtotal`/`stored_total`), `order`, `source`.
4. Insertar bloque en `loadIgfArrAnnexForChat` cuando `wantIgf` y hay `row`.
5. Authz sin cambio.
6. Tests listados abajo.

G2: N/A. G3: N/A.

---

## Tests a diseñar (si IMPL)

- Snapshot con row / sin versión / sin fila de planta
- Líneas null omitidas; no cero
- Orden por rol de fórmula
- Signos almacenados (incl. `hg_kg` positivo)
- Unidades; no rankear/sumar familias distintas
- `gasto_kg` no se suma al trío
- No recomponer como KPI publicado
- No texto de causa / responsable / problema / prioridad
- No segundo mes / no `ORDER_DELTAS` / no handler deltas
- `igf_status` preservado; M6 y M9 preservados
- Authz GA/GV/cross-planta; sin HTTP interno; sin writes

---

## Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro |
|---|---|---|
| M7 | PARTIAL | **PARTIAL** |
| Global | **10.0 / 20 = 50.0%** | **50.0%** (0.0 pp) |

---

## Riesgos

- Traducir magnitud a «problema».
- Invertir `hg_kg` «para cuadrar» con el GET.
- Overlay de folios y venderlo como snapshot.
- Crear Δ mensual de líneas (006 lo sugirió; **esta** tarea lo prohíbe).
- Usar `ORDER_DELTAS` o `unit: "kg"` del handler.
- Sustituir `margen_kg` de la fila por `getMargenKgPorPeriodo` dentro del bloque.
- Unir `folios_*_kg` a M6/M18.

---

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

## Acciones no realizadas

- No código, runtime, tests, matriz, contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó `IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001`.
- No se cambió 50.0%.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m7-igf-composition-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md
```

Solo los dos archivos autorizados.

## NEXT_TASK

`IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001` (propuesta; no autoriza G1 ni encadena).

## STOP
