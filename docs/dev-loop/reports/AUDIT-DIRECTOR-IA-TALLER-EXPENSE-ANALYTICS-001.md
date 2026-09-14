# AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
code_changes: false
test_changes: false
docs_director_ia_changes: false
reference_main: "eb03e794"
branch: "audit/director-ia-taller-expense-analytics-001"
probes: "read-only planner + extractFolioSearchFilters + isFolioSearchQuestion; LIVE_DB=NOT_EXECUTED_NO_DB_URL"
next_task_proposed: "IMPL-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resumen ejecutivo

**DONE_PENDING_REVIEW. No se implementó Expense Analytics.**

Fuente física única de Taller / Gastos / Inversiones en chat: **`public.folios`**.

Hoy Director IA **no** tiene una familia de analítica de gasto. Tiene tres listados + una búsqueda:

| Ruta | Intent | Qué hace |
|------|--------|----------|
| M5 | `taller_at` | Folios `categoria LIKE '%TALLER%'` **y** token de unidad (AT-15). Total JS. |
| M6 | `expense_analysis` / `investment_analysis` | Folios GASTOS (excluye TALLER) o INVERSIONES. Partida opcional con prefijo. Total JS. |
| `folio_search` | keyword / secuencia de concepto | Lee cabecera por `mes_cargo` + texto. SUM solo en modo AGGREGATE. |

### Pregunta crítica

**¿Existe desglose físico que permita afirmar cuánto dinero corresponde exclusivamente a "llantas" dentro de un folio que también contiene otras cosas?**

**NO en la ruta que responde esa pregunta.**

- `public.folios.detalle_lineas` (JSONB) **existe**. Cada línea usable tiene `concepto`, `importe`, `beneficiario`. **No hay cantidad ni precio unitario.**
- M5/M6 pueden **explotar** esas líneas (`expandTallerRows` / `expandCategoriaRows`).
- **`folio_search` no selecciona ni lee `detalle_lineas`.** El match de «llantas» es sobre cabecera (`concepto`/`descripcion` fusionados, `subcategoria`, etc.).

Por tanto:

**`SUM(importes de folios que contienen "llantas") != gasto exacto en llantas`**

salvo que cada folio coincidente sea, demostrablemente, solo esa partida. El runtime **no** lo demuestra.

### Caso producción: apoyos de taller

Sonda `now=2026-09-14`:

`¿Cuánto gasté en apoyos de taller en enero?`

```
intent: folio_search
scope: SUPPORT_FAMILIES
period_month: 2026-01
concept_query: "apoyos de taller"    ← frase entera
operation: concept_sequence
analysis_mode: LIST
spend_asked: false
```

**Falta la descomposición.** No separa:

| Slot | Valor correcto | Lo que hace hoy |
|------|----------------|-----------------|
| dominio | Taller (`categoria`) | token dentro del concepto |
| métrica | SUM `importe` | LIST (porque dijo *gasté*, no *gastamos*) |
| periodo | enero → `2026-01` | sí extrae el mes |
| keyword | apoyos | pegado a «de taller» |

`phraseMatchesRow` exige la secuencia `apoyos` + `de` + `taller` en `concepto` o `subcategoria`. Si nadie escribió esa frase, **0 filas** — coherente con producción.

Contraste demostrado: `¿Cuánto gastamos en apoyos de taller en enero?` → mismo `concept_query`, pero `AGGREGATE` + `SUM` + `spend_asked: true`. El verbo *gasté* no está en el detector de gasto.

## 2. Fuente física

Tabla: `public.folios`.

Columnas relevantes (ensure + SELECT reales):

| Columna | Uso |
|---------|-----|
| `planta_id` | scope |
| `mes_cargo` | periodo YYYY-MM |
| `categoria` | TALLER / GASTOS / INVERSIONES (texto, LIKE) |
| `subcategoria` | partida (M6); match de concepto |
| `concepto`, `descripcion` | texto; folio_search fusiona `COALESCE(descripcion, concepto)` |
| `importe` | monto de **cabecera** |
| `estatus` | excluye CANCELADO en agregados; PAGADO solo se **menciona** |
| `beneficiario` | proveedor de cabecera |
| `unidad` | M5; **ausente** del SELECT de folio_search |
| `detalle_lineas` | JSONB; M5/M6; **ausente** de folio_search |
| `numero_folio`, `folio_codigo` | identidad |

`getFolioLineasFromRow` (`server.js` ~3398): línea = `{beneficiario, concepto, importe}`. Sin `cantidad`, sin `precio_unitario`.

Taller vs Gastos vs Inversiones:

- M5: `categoria LIKE '%TALLER%'`.
- M6 GASTOS: `GASTO` **y no** TALLER ni INVERSION.
- M6 INV: `INVERSION`.
- `folio_search` + «apoyos»: post-filtro unión de las tres familias (`supportFamilyOf`). **No** recorta a Taller solo.

## 3. Caso Acapulco / enero 2026 / llantas

Evidencia humana: 7 folios al preguntar *qué folios contienen la palabra llantas en enero*.

Sonda de routing (sin DB):

```
intent: folio_search
operation: keyword_search
concept_query: "llantas"
period_month: 2026-01
analysis_mode: LIST
```

`LIVE_PROBE=NOT_EXECUTED_NO_DB_URL`. **No hay cifra de suma en este entorno.** No se inventa.

Lo que **sí** se afirma:

1. Esos 7 son **coincidencias de texto de cabecera**, no partidas atribuidas.
2. La suma de sus `importe` (si se calculara) es **folio-total de coincidentes**.
3. Esa suma **no** puede llamarse «gasto en llantas».
4. `folio_search` no mira `detalle_lineas`; una línea «LLANTA» dentro de un folio cuyo encabezado no dice llantas **no entra**.
5. Follow-up «¿cuál es la suma del mes?» → `unknown`; `isFolioSearchAggregateFollowUp` exige `por mes` + «sumarlos/dame el total». Continuidad de result-set **no implementada** (fuera de esta tarea).

**Respuesta correcta conceptual** (aunque la suma viva se desconozca aquí):

> Encontré N folios en Acapulco, mes_cargo 2026-01, cuyo texto contiene «llantas». Puedo listar (y, si se pide bien, sumar) sus importes de cabecera. Eso es el total de folios coincidentes, no el gasto exclusivo en llantas. No atribuyo partidas mixtas.

## 4. Por qué «gasté» no suma y «apoyos de taller» no es dominio

Demostrado, no asumido:

1. Gate `isFolioSearchQuestion` exige `apoyos|folios`. Sin eso, «¿Cuánto gasté en Taller en agosto?» **ni siquiera entra**.
2. Esa frase cae a **`client_profile`**: «Taller» capitalizado pasa `hasNamedClientToken` + periodo «agosto». **Taller se trata como cliente.**
3. Con «apoyos», `locateConceptSpan` toma todo lo que queda: `"apoyos de taller"`.
4. `askedSpendWording` = `/\b(gastado|gastamos)\b/` — **no** `gasté`.
5. `ANALYTIC_FRAME_PHRASES` incluye «cuanto gastamos / cuanto suman», no «cuanto gaste».

Descomposición ausente: dominio ≠ métrica ≠ periodo ≠ keyword.

## 5. Matriz 1 — campos

| campo | fuente | disponible | tipo | filtro | agrupación | observaciones |
|-------|--------|------------|------|--------|------------|---------------|
| planta | `folios.planta_id` | sí | id | sí (request) | no en chat | UI |
| mes_cargo | `folios.mes_cargo` | sí | YYYY-MM | sí (extractores / M5 YYYY-MM token) | folio_search AGGREGATE `group_by MONTH` | rango máx. 12 meses en search |
| rango meses | extractor folio_search | sí extractor; M5/M6 tokens YYYY-MM | periodo | parcial | por mes solo search AGGREGATE | «enero a agosto» no entra si no hay apoyos/folios |
| categoría | `folios.categoria` | sí | texto | M5/M6 SQL; search solo scope familias | no | «Taller» en pregunta ≠ filtro categoría en search |
| descripción/concepto | `descripcion`/`concepto` | sí | texto | search / M6 partida | no | search fusiona en un campo |
| palabra clave | runtime | sí | match | keyword_search | no | cabecera; no líneas |
| importe | `folios.importe` | sí | money | no | SUM search AGGREGATE; total M5/M6 | cabecera |
| estatus | `folios.estatus` | sí | texto | excluye CANCELADO en SUM | no | no hay filtro PAGADO |
| PAGADO | mismo | valor posible | flag | **no** | no | «PAGADO no prueba gasto contable» |
| beneficiario | `folios.beneficiario` | sí | texto | no group-by | **no** | keyword puede matchearlo |
| proveedor | = beneficiario | sí cabecera | texto | no ranking | **no** | |
| unidad | `folios.unidad` | sí tabla; M5 sí; **search no** | texto | M5 token AT | no ranking | search SELECT sin unidad |
| folio | numero/codigo/id | sí | id | implícito | COUNT | límite 40 |
| detalle_lineas | JSONB | sí tabla; M5/M6 | líneas | no en search | no | concepto+importe; no qty/PU |
| cantidad | — | **no** | — | no | no | DIMENSION_MISSING |
| precio unitario | — | **no** | — | no | no | DIMENSION_MISSING |
| subpartida | `subcategoria` + líneas | parcial | texto | M6 `partida\|concepto` | no | |

## 6. Matriz 2 — preguntas

Sonda planner `2026-09-14`. «Soportada hoy» = hay ruta que responde **esa** pregunta con el dato pedido.

| pregunta | intención actual | dato requerido | soportada hoy | clasificación | respuesta correcta conceptual |
|----------|------------------|----------------|---------------|---------------|-------------------------------|
| ¿Cuánto gasté en Taller en agosto? | **client_profile** | SUM importe, `categoria` TALLER, `2026-08` | no | AMBIGUOUS | No es cliente. Si se enruta: SUM de cabecera TALLER del mes, no «gasto contable». |
| ¿Cuánto gasté en Taller de enero a agosto? | **client_profile** | SUM TALLER rango | no | AMBIGUOUS | Igual; rango físico posible en search/M5, no cableado así. |
| ¿Cuánto gasté en llantas en enero? | unknown | gasto **atribuible** a llantas | no | BREAKDOWN_MISSING | No afirmar gasto exclusivo. Ofrecer FOLIO_TOTAL de coincidencias, etiquetado. |
| ¿Cuánto fue de llantas? | unknown | follow-up atribuible | no | BREAKDOWN_MISSING + continuidad | Igual; además no hereda el set. |
| ¿Cuánto gasté en refacciones? | unknown | atribuible / periodo | no | BREAKDOWN_MISSING | Keyword ≠ partida. |
| ¿Cuántos folios de Taller hubo? | folio_search, concept=`taller hubo` | COUNT `categoria` TALLER | no (match texto basura) | KEYWORD_MATCH_ONLY / AMBIGUOUS | COUNT por categoría, no por «taller hubo» en concepto. |
| ¿Cuántos folios de Taller hubo en agosto? | folio_search, concept=`taller hubo` | COUNT TALLER + mes | no | AMBIGUOUS | Igual. |
| ¿Cuál fue el más caro? / folio más caro agosto | folio_search concept=`taller mas caro` o unknown | MAX importe | no | DIMENSION_MISSING (agg) | MAX sobre universo TALLER+mes; hoy no hay MAX. |
| ¿Cuál fue el promedio por folio? | folio_search concept=`fue promedio por` | AVG | no | DIMENSION_MISSING (agg) | AVG = SUM/COUNT del mismo universo; no existe. |
| ¿Qué proveedor recibió más? | unknown | GROUP BY beneficiario | no | AMBIGUOUS | Dimensión existe; ranking no. |
| ¿Qué unidad gastó más? | unknown | GROUP BY unidad | no | DIMENSION_MISSING en search | Unidad no viaja en folio_search; M5 pide AT concreto. |
| ¿Cuánto gasté solo en folios PAGADOS? | folio_search, concept sucio | SUM filtro estatus | no | AMBIGUOUS | Estatus existe; no hay filtro PAGADO. PAGADO ≠ gasto contable. |
| ¿Y solo en Taller? / ¿Y en febrero? | unknown | refine set | no | AMBIGUOUS | Continuidad fuera de alcance. |
| ¿Cuánto suman esos folios? | folio_search AGGREGATE, concept=`cuanto suman esos` | SUM del set previo | no (no hereda set) | AMBIGUOUS | Requery si spec válida; «esos» no ancla el result-set. |
| ¿Cuál es la suma del mes? | unknown | SUM del set | no | AMBIGUOUS | Follow-up agg exige `por mes`. |
| ¿Cuánto gasté en apoyos de taller en enero? | folio_search LIST, concept=`apoyos de taller` | SUM TALLER + keyword apoyos + enero | no | KEYWORD_MATCH_ONLY | Descomponer; si 0 filas, no «no hay gasto». |
| ¿Qué folios contienen la palabra llantas en enero? | folio_search keyword LIST | listado | **sí (listado)** | KEYWORD_MATCH_ONLY | Listar cabeceras. No llamarlas gasto en llantas. |
| ¿Cuánto suman los folios que contienen llantas en enero? | folio_search AGGREGATE, concept **contaminado** `cuanto suman contienen llantas` | FOLIO_TOTAL | parcial / roto | FOLIO_TOTAL_ONLY | SUM de coincidencias, etiquetado; extractor actual ensucia el concepto. |
| ¿Cuánto fue exclusivamente de llantas? | unknown | partidas | no | BREAKDOWN_MISSING | Decir que no hay atribución exclusiva. |
| ¿Cuánto gastamos en apoyos de Taller en agosto? | folio_search SUM, mismo concept pegado | SUM | parcial | FOLIO_TOTAL_ONLY / KEYWORD_MATCH_ONLY | Suma de secuencia «apoyos de taller», no categoría TALLER. |

M5 (`taller` + `AT-n`) y M6 (`gastos de folios` + YYYY-MM) siguen siendo EXACT_SUPPORTED **solo** para su contrato estrecho (listado/total de ese universo), no para estas preguntas de negocio.

## 7. Matriz 3 — cifra vs desglose

| consulta | cifra exacta | solo folios coincidentes | requiere desglose | debe aclarar limitación |
|----------|--------------|--------------------------|-------------------|-------------------------|
| SUM TALLER + un mes (categoría) | sí, *si* se filtra `categoria` (hoy no en estas frases) | no | no | cabecera; no gasto contable; tope 40 |
| SUM TALLER ene–ago | sí en estructura (loop meses) | no | no | igual |
| COUNT TALLER + mes | sí en estructura | no | no | igual |
| AVG / MAX folio TALLER | no runtime | — | no | falta agregador |
| ranking proveedor | no runtime | — | no | falta group-by |
| ranking unidad | no en search | — | no | unidad no en SELECT search |
| keyword llantas enero Acapulco (7) | **suma de cabeceras: no medida aquí (sin DB)** | **sí** | **sí** para «gasto en llantas» | N=7 ≠ gasto exclusivo |
| exclusivamente llantas | no | no basta | **sí** | BREAKDOWN_MISSING |
| PAGADOS only | no runtime | — | no | sin filtro; PAGADO ≠ contable |
| apoyos de taller enero | 0 o match de frase | sí | no para dominio Taller | concepto pegado |

## 8. Continuidad (no implementar)

`folio_search_spec` se guarda en `conversation_state`. `folio_search` está en `INHERITABLE_INTENTS` pero la herencia genérica **lo excluye**. El follow-up de suma es un detector estrecho (`por mes` + sumarlos/total).

«¿Cuál es la suma del mes?» y «¿Cuánto fue de llantas?» **pierden el hilo**. Dependencia documentada. **No se abre continuidad en esta tarea.**

## 9. Contrato propuesto de Expense Analytics

Familia nueva (no parche de «llantas»). Slots:

1. **dominio** = `TALLER` | `GASTOS` | `INVERSIONES` | `SUPPORT_FAMILIES` — por `categoria`, no por texto «taller» en concepto.
2. **métrica** = SUM | COUNT | AVG | MAX — sobre `importe` de cabecera, etiquetada.
3. **periodo** = mes | rango `mes_cargo`.
4. **keyword** = opcional, match de texto, **nunca** sustituye dominio.
5. **estatus** = opcional; CANCELADO fuera de SUM; PAGADO no es gasto contable.
6. **Etiqueta obligatoria:** si hay keyword, el total es **«importe de folios coincidentes»** (FOLIO_TOTAL), no «gasto en X».
7. **BREAKDOWN:** no afirmar partida exclusiva sin líneas usables **y** sin que la suma de líneas de esa keyword cubra el claim. Hoy folio_search no lee líneas.
8. **Verbo:** `gasté` = mismo marco analítico que `gastamos` / `gastado`.
9. **No** tratar «Taller» capitalizado como cliente.
10. Continuidad de result-set: dependencia, **otro** G1.

### Familia que la estructura **puede** soportar (futuro slice)

- Cuánto / cuántos folios de **Taller|Gastos|Inversiones** en un mes o rango.
- Folio máximo / promedio **del mismo universo**.
- Ranking por **beneficiario** (cabecera).
- Listado + FOLIO_TOTAL por keyword, **etiquetado**.

### Lo que la estructura **no** soporta

- Gasto exclusivo en llantas/refacciones/motor dentro de folio mixto (sin líneas usadas y sin qty/PU).
- Cantidad × precio.
- Gasto contable / tesorería por PAGADO.
- Ranking por unidad en folio_search (columna no viaja).

## 10. Slice mínimo de implementación (propuesta, no autorizada)

`IMPL-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001` — **no autorizado**.

1. Intent `expense_analytics`: dominio + métrica + periodo + keyword opcional.
2. `gasté` en el marco analítico.
3. No pegar «apoyos de taller» como un concepto.
4. SUM/COUNT sobre `public.folios` filtrando `categoria` + `mes_cargo`; keyword aparte.
5. Copy: FOLIO_TOTAL ≠ gasto de partida.
6. No SQL/schema nuevo. No continuidad. No desglose inventado. No Taller-como-cliente.

## 11. Contratos / archivos / secretos

Consultados: `CURRENT_TASK`, `LOOP_PROTOCOL`, planner, folio-search, M5, M6, CEL no tocado, `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` (M5/M6 sí; `folio_search` ausente).  
`docs/director-ia/`: no modificados.

Tocados: `CURRENT_TASK.md`, este reporte.

`LIVE_PROBE` 7 folios: **NOT_EXECUTED_NO_DB_URL**.  
`secrets_check`: none.

`human_decision_needed`: autorizar o no el IMPL. Este DONE no autoriza implementación ni continuidad.
