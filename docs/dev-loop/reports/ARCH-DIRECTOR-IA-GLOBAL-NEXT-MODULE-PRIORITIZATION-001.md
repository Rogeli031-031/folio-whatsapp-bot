# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001"
outcome: "DONE_PENDING_REVIEW"
winner: "M6"
winner_scope: "query JSON GASTOS + INVERSIONES; no Excel; no COMPLETE; no IGF"
second_place: "M4"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"
  - "lib/director-ia-planner.js, tools, capabilities, chat, igf-arr (lectura)"
  - "lib/categoria-rango-excel.js (lectura)"
  - "server.js GET /categoria-rango-excel (lectura)"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK lista «M5 Presupuestos/Cheques», «M14 Documentos/PDFs» y
    «M15 Usuarios/permisos». La matriz canónica es M5=Taller AT, M14=Usuarios
    admin, M15=Documentos/PDF, M18=Presupuestos. Se evalúa por la matriz
    (autoridad superior + candidate_scope.derive_from).
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se vio priv_clave / CLASIFICACION_PRIV_CLAVE en server.js; no se copia)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. 42.5% no cambia en esta tarea."
  - "M6 primer slice sería PARTIAL (+2.5 teórico si se implementa después). COMPLETE de M6 sigue siendo Export/Excel."
```

## Resumen ejecutivo

**Ganador: M6 — GASTOS / INVERSIONES**, primer slice = **query JSON** de folios por categoría y rango de meses. **No** Excel. **No** COMPLETE.

Tras EXIT_M2, Director IA ya cubre flujo de folio (estatus, listado, history, metadata), KPIs/proyectos (M3), deltas (M9), duplicados (M16) y seguimiento AR/DICF (M12/M11). El hueco ejecutivo **nuevo** más grande que no duplica eso es:

- ¿Qué **GASTOS** de folios hay en esta planta / este rango de meses / esta partida?
- ¿Qué **INVERSIONES** hay / están pendientes?

Hoy esas preguntas son `SOURCE_NOT_INTEGRATED` o caen al **IGF** (palabra «gastos»). Eso no es el Excel ni el listado de folios.

**Segundo lugar: M4** (matriz read-only). Útil, ya auditada PARTIAL_ONLY, valor mensual menor y COMPARAR/Excel fuera.

Esta tarea **no cambia** 8.5/20 = **42.5%**. No se eligió M6 por porcentaje. Un IMPL futuro de la query sería PARTIAL (**+2.5 → 45.0%**); COMPLETE de M6 sigue exigiendo Export.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-001` (≠ `main`).
- HEAD: `d5a17433 Merge branch 'architecture/director-ia-m2-next-slice-prioritization-003'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| M0–M20 | **8.5 / 20 = 42.5%** |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, M7, M8, M11, M12, M17 (4.0) |
| INDIRECTA | M20 (0.5) |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 (0.0) |
| N_A | M19 (excluido) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NOT_STARTED=0.0. Verificado contra Parte 9 + fichas. **No se cuenta de nuevo** un PARTIAL ya puntuado.

---

## EXIT_M2 (contexto)

`ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003`: M2 ya cubre comentarios, `folio_status`, listado planta/etapa, history y documents metadata. Huecos restantes = dwell inferido, S3/PDF, financial fragmentado, writes. **M2 no es candidato** salvo evidencia extraordinaria. No hay evidencia nueva.

---

## Capacidad actual de Director IA

Ya responde (hechos): etapa/estatus y tablero por planta; historial observado; metadata documental; KPIs/proyectos; deltas de periodos reales; posibles duplicados; AR vencidas/responsables/temas (top-N); DICF/comentarios cliente (límites); IGF/ARR annex on-demand; bitácora/entidades; commercial_state.

**No** responde con fuente propia: listados GASTOS/INVERSIONES de folios; matriz clasificación; Excel Taller AT; carro semanal; PDF/S3; admin de permisos; weekly LD; health de producto.

---

## Mapa de huecos globales / preguntas ejecutivas

| # | Pregunta | ¿Hoy? | Hueco real |
|---|---|---|---|
| 15 | ¿Qué gastos existen por planta? | No / IGF si wording ambiguo | **M6** listado folios |
| 16 | ¿Qué inversiones están pendientes? | No | **M6** |
| — | ¿Comparativo mensual clasificación? | No | **M4** (PARTIAL_ONLY) |
| 17 | ¿Cómo va el presupuesto semanal? | No | **M18** (API carro ausente) |
| 12–13 | ¿Faltan docs / tiene cheque-póliza? | Metadata sí; resto no | M2/M15/M18; bajo residual |
| 2–3 | ¿Acciones vencidas / responsable? | Sí (top-N) | M12 límites |
| 6–8 | ¿ARR/IGF/clientes? | Sí on-demand | M7/M8/M11 neto bajo |
| — | ¿Gasto taller por AT? | No | **M5** (≠ AR Taller) |

---

## Candidatos (15 preguntas; compacto si el valor es nulo)

IDs **canónicos**. M2 excluido. M19 excluido.

### M6 — GASTOS / INVERSIONES (NOT_STARTED) — **ganador**

1. **Nuevas:** listado/resumen de folios GASTOS e INVERSIONES por planta, `mes_cargo`, subcategoría/partida, importe/concepto (líneas de `detalle_lineas`).
2. **Ya responde:** IGF «gastos/margen» (otra fuente); M2 lista por **etapa**, no por categoría GASTOS/INVERSIONES; M3 es agregado de folios, no partidas.
3. **Incremental:** alto. Cierra #15/#16. No duplica M2/M3/M9/M12.
4. **Fuente:** `public.folios` (`categoria`, `mes_cargo`, `detalle_lineas`, `importe`, …).
5. **Helper:** `expandCategoriaRows` (`lib/categoria-rango-excel.js` 98–154). SELECT en `server.js` 5977–5991.
6. **Wiring:** intents `expense_analysis` / `investment_analysis`; tools `get_expense_analysis` / `get_investment_analysis` `executor: null`; `UNSUPPORTED_RULES.gastos/inversiones` bloquean hoy.
7. **In-process:** sí (misma SELECT + expand; **no** `buildCategoriaRangoWorkbook` / xlsx).
8. **Authz:** JWT; `dashboardBlockGVForbidden`; `buildDashboardWhere`. `priv_clave` del GET Excel fuerza privados — el readiness debe fijar la regla de chat (fail-closed, sin clave en el LLM).
9. **Planta:** `planta_id` + `getPlantaIdsEquivalentesForPendientes`; GET permite planta opcional — chat debe **exigir** scope.
10. **Side effects:** el GET escribe un .xlsx al cliente; la query es SELECT-only. No `maybeAdvance`.
11. **Excel:** el HTTP es xlsx. El slice útil **omite** Excel. Sin S3/Twilio/write.
12. **Semántica:** «gastos» → `PLANT_FINANCIAL_KPI_RE` (IGF). Planner ya aclara wording ambiguo. Hay que interceptar **antes** del annex. Taller AT no entra (el SQL excluye `%TALLER%`; el tool no debe mezclar M5).
13. **Primer slice:** JSON GASTOS + INVERSIONES; rango YYYY-MM obligatorio o fail-closed; no xlsx; no IGF.
14. **Después:** **PARTIAL**. COMPLETE sigue = Export.
15. **% si se implementara:** **+2.5 → 45.0%**. Esta tarea: **0.0**.

### M4 — Clasificación + COMPARAR (NOT_STARTED) — **segundo**

1. Comparativo mensual por categoría/planta.
2. Nada de la matriz. No es M2/M3/M9.
3. Medio (Parte 7 Baja-Media). Mensual, no diario.
4. `public.folios` vía `buildClasificacionMatrix` (readiness 001).
5. Sí (JSON de matriz).
6. Unsupported `clasificacion_apoyos`; sin tool.
7. Sí, SELECT-only.
8. JWT; GV; `priv_clave` para privados.
9. `planta_id`.
10. COMPARAR escribe folios (C). Lectura no.
11. Excel/COMPARAR = COMPLETE, no el primer slice.
12. Reconciliación ≠ lectura de matriz.
13. Matriz JSON (ya PARTIAL_ONLY).
14. PARTIAL.
15. +2.5 teórico. Esta tarea 0.0.

Pierde frente a M6: menor frecuencia, menor actionability de partida, readiness ya hecha y no ejecutada; COMPARAR no se toca.

### M1 Health (PARTIAL)

Nuevas: ¿está up `/health`/`/health-db`? Ya tiene `/health-director-ia`. Incremental nulo para dirección. `/health-proyectos` es global sin JWT (choca M3). Valor 1. Side effects no. % +2.5 dudoso. **No.**

### M5 — Taller AT (NOT_STARTED)

Nuevas: gasto por unidad AT + hoja duplicados. Confunde con AR «Taller». Solo xlsx. `get_expense_analysis` **no** debe absorberlo. Peor que M6. **No.**

### M7 IGF (PARTIAL)

Ya: anexo on-demand (compromiso, margen). Falta: UI/versiones/`sources.igf`/detalle folios. No aporta causalidad nueva (M9 tampoco afirma por qué). Incremental neto bajo. PATCH existe (C). **No.**

### M8 ARR (PARTIAL)

Ya: proyección, top clientes, motor DICF. Profundizar solapa **M9** (venta/descuento) y commercial_state. Carga `POST /arr/load` = C. **No.**

### M10 Weekly discount (NOT_STARTED)

Narrativa + **envío** WhatsApp. Narrativa solapa M9 descuento. Canal ≠ conocimiento. Envío = C. **No.**

### M11 DICF (PARTIAL)

Ya: detalles (40), comentarios (80), commercial_state, acciones abiertas. Falta: attachments, universo sin top-N. Incremental = más de lo mismo. Causalidad sigue narrativa. **No** gana contra un dominio nuevo.

### M12 Action Register (PARTIAL)

Ya: vencidas, responsables, temas, MC. Falta: notas (`includeNotes: false`), evidencias binarias, CRUD. Duplica lo que ya es la fuente primaria. **No.**

### M14 — Usuarios admin (NOT_STARTED)

¿Quién tiene qué permiso? Write = C. Valor 2. No es M15. **No.**

### M15 — Documentos/PDF (NOT_STARTED)

Contenido/S3. M2 ya lista metadata. Incremental bajo vs S3. EXIT_M2 ya lo descartó. **No.**

### M17 WhatsApp bridge (PARTIAL)

Link `/director-ia` ya existe. Twilio no es fuente de conocimiento. **No.**

### M18 — Presupuestos semanales (NOT_STARTED)

¿Qué hay en el carro? Alto en abstracto. `GET /presupuesto-detalle` / `POST /presupuesto-comparar` son **otro uso** (asignación mensual), no el carro. SQL embebido + WhatsApp. Enviar a cheques = C. Blocker de API vigente (005). **No** es un frente coherente ahora. Cheque/póliza de folio ≠ este módulo.

### M20 Home KPI (INDIRECTA)

Compone `/` con M7/M11. No hay fuente nueva. **No.**

### M0 Auth (PARTIAL)

Gates, no catálogo de respuesta. **No.**

---

## Rechecks mandatorios (síntesis)

| Frente | Conclusión |
|---|---|
| M4 | PARTIAL_ONLY vigente. No COMPLETE. Segundo lugar. |
| M6 | Query real; Excel = COMPLETE. Colisión IGF controlable. **Ganador.** |
| M7 | Annex ya cubre el valor financiero cotidiano. |
| M8 | Duplica M9/DICF si se profundiza. |
| M11 | Reasoning ya existe; top-N no es un módulo nuevo. |
| M12 | Ya es el seguimiento diario. |
| M18 | Carro sin API de producto. No absorber cheques M2. |
| WhatsApp | Canal ≠ conocimiento (M10/M17). |

---

## Tabla comparativa

| module | current_state | new_executive_questions | executive_value | reasoning_value | incremental_value | frequency | actionability | source_ready | director_ia_wiring | authz_fit | plant_scope | external_dependency | mutation_risk | semantic_risk | first_useful_slice | state_after_first_slice | percentage_effect | recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **M6** | NOT_STARTED | GASTOS/INV por planta/mes/partida | **4** | **4** (partida) | **5** | semanal | **alta** | SELECT + `expandCategoriaRows` | intent+tool `executor:null` | JWT/GV; priv chat a auditar | sí (exigir) | no si no xlsx | no | **alto** (IGF) | query JSON ambas familias | **PARTIAL** | +2.5 luego; 0 ahora | **GANADOR** |
| M4 | NOT_STARTED | comparativo mensual | 3 | 3 | 3 | mensual | media | matriz JSON | unsupported | JWT/GV | sí | Excel solo COMPARAR | COMPARAR C | medio | matriz JSON | PARTIAL | +2.5 luego | **segundo** |
| M5 | NOT_STARTED | taller por AT | 3 | 2 | 2 | mensual | media | xlsx | mal mapeado a expense | JWT/priv | sí | no | no | alto (≠ AR) | query AT | PARTIAL | +2.5 | no |
| M7 | PARTIAL | UI/versiones IGF | 2 neto | 2 | 1 | periódica | media ya | annex | executor annex | IGF permiso | sí | no | PATCH | medio | `sources.igf` | PARTIAL | 0 | no |
| M8 | PARTIAL | carga/UI ARR | 2 neto | 2 | 1 | periódica | media ya | annex+DICF | executor annex | GA | sí | upload | load C | medio (M9) | nada útil | PARTIAL | 0 | no |
| M11 | PARTIAL | universo/attach | 2 neto | 3 ya | 1 | periódica | alta ya | summarizers | tools | DICF | sí | no | CRUD UI | medio | subir límites | PARTIAL | 0 | no |
| M12 | PARTIAL | notas/evidencias | 2 neto | 3 ya | 1 | diaria ya | alta ya | board | tools | DICF | sí | no | CRUD | medio | notas | PARTIAL | 0 | no |
| M18 | NOT_STARTED | carro semanal | 4 | 2 | 3 | semanal | alta | SQL embebido ≠ API | `budget_status` null | GG | nombre | WhatsApp | cheques C | alto | — blocker | — | 0 ahora | no |
| M15 | NOT_STARTED | PDF/S3 | 3 | 2 | 1 | ocasional | media | `/media` | M2 metadata ya | GV | sí | **S3** | subir | medio | no | PARTIAL | +2.5 | no |
| M10 | NOT_STARTED | narrativa LD | 2 | 1 | 1 | semanal | baja | JSON lectura | no | GA/GV | nombre | **Twilio** | envío C | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| M17 | PARTIAL | (canal) | 1 | 0 | 0 | — | nula | Twilio | link existe | tokens | — | Twilio | bot | medio | nada | PARTIAL | 0 | no |
| M14 | NOT_STARTED | permisos | 2 | 0 | 1 | rara | C | admin API | `user_permissions` | clave | global | no | **C** | alto | lectura | PARTIAL | +2.5 | no |
| M1 | PARTIAL | health producto | 1 | 0 | 1 | rara | nula | GET `/health*` | no chat | sin JWT | no en proyectos | no | no | medio | tres GET | PARTIAL | dudoso | no |
| M20 | INDIRECTA | Home | 2 | 0 | 0 | — | nula | M7/M11 | no | igual | — | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| M0 | PARTIAL | catálogo permisos | 1 | 0 | 0 | rara | nula | JWT | gates | sí | sí | no | no | alto | — | PARTIAL | 0 | no |

---

## Ranking

Criterio: valor incremental neto + preguntas nuevas + hechos + in-process. **No** porcentaje. **No** facilidad sola. Penaliza duplicar M2/M3/M9/M12 y Excel/S3/Twilio/write.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M6 query** | Único dominio NOT_STARTED con preguntas diarias/semanales nuevas, helper estructurado e intents listos, sin duplicar M2/M3/M9/M12 |
| **2** | M4 matriz | Comparativo real; menor frecuencia; PARTIAL_ONLY ya sabido |
| 3 | M18 carro | Valor alto, API ausente |
| 4 | M5 Taller AT | Excel + semántica AR |
| 5 | M11/M12 más profundo | Ya cubren seguimiento |
| 6 | M7/M8 más profundo | Ya on-demand; M8 solapa M9 |
| 7 | M15 contenido | S3; metadata M2 hecha |
| 8 | M10/M17 | Canal |
| 9 | M14 / M1 / M20 / M0 | Poco o nulo valor de dirección |

---

## Ganador

**M6 — GASTOS / INVERSIONES** (primer slice: query JSON, ambas familias).

### Por qué gana

1. Habilita preguntas que **hoy no tienen fuente** (#15/#16).
2. No duplica M2 (etapa ≠ categoría GASTOS), M3 (KPI ≠ partida), M9 (delta ARR ≠ Excel de folios) ni M12.
3. Fuente y helper verificados. Wiring de intent/tool ya existe (`executor: null`).
4. In-process SELECT-only es posible **sin** generar xlsx.
5. Actionability: planta + partida + mes + folio.
6. 005 ya lo señaló como residual; esta tarea lo elige porque el criterio ahora es **utilidad incremental**, no P(COMPLETE).

### Preguntas nuevas concretas (si el readiness confirma el path)

- ¿Qué gastos de folios hay en {planta} de {YYYY-MM} a {YYYY-MM}?
- ¿Qué partidas/subcategorías concentran el gasto?
- ¿Qué inversiones hay / están pendientes en el rango?
- ¿Qué folios GASTOS/INVERSIONES no cancelados aparecen en `mes_cargo`?

**No** las habilita: «cómo van los gastos» IGF; export Excel; Taller AT; carro M18.

### Por qué es más valioso ahora

EXIT_M2 cerró el flujo operativo. El siguiente hueco de **dinero operativo de folios** (gasto/inversión por partida) no lo cubre IGF (forecast) ni M9 (venta/descuento/ingreso ARR).

### Primer slice

```text
pregunta listado GASTOS o INVERSIONES de folios / rango de meses
  → detectUnsupported no corta esos intents
  → expense_analysis | investment_analysis
  → interceptar ANTES de PLANT_FINANCIAL_KPI_RE
  → get_expense_analysis | get_investment_analysis
  → loader in-process
       → JWT; GV; planta del scope; no priv_clave al modelo
       → mes_desde/mes_hasta o fail-closed
       → SELECT equivalente a categoria-rango-excel + expandCategoriaRows
       → JSON (resumen subcategoría × mes + filas); no xlsx
  → evidencia; openai_called false
```

No HTTP interno. No Excel. No M5. No COMPARAR. No cycle.

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M6 | NOT_STARTED | **PARTIAL** |
| M2 | PARTIAL | PARTIAL |
| Global | **42.5%** | **45.0%** (+2.5) |

COMPLETE de M6 **no** se otorga. Esta priorización: **0.0 pp**.

### Riesgos

- «Gastos» → IGF si no se intercepta.
- Mezclar Taller AT en `get_expense_analysis`.
- Generar o adjuntar xlsx.
- Inventar rango de meses.
- Exponer folios `solo_zp_ad` sin regla de chat.
- Afirmar COMPLETE o +5.0.

### Dependencias

`public.folios`, `buildDashboardWhere` / equivalentes, `expandCategoriaRows`. Sin S3, Twilio, migration, ARR upload. Authz de privados = tema del readiness.

---

## Segundo lugar

**M4 — Clasificación (matriz read-only).**

### Por qué pierde

1. Valor 3 vs 4; frecuencia mensual vs operativa semanal de partidas.
2. Ya hay readiness PARTIAL_ONLY; no hay preguntas nuevas respecto a ese informe.
3. COMPLETE sigue atado a COMPARAR/Excel (C).
4. No identifica partida de gasto/inversión.

Sigue siendo el mejor **alternativa** si el humano rechaza M6 por colisión IGF.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M6-GASTOS-INVERSIONES-READINESS-001`

Debe auditar: SELECT vs xlsx, `expandCategoriaRows`, rango fail-closed, authz/privados, intercept IGF, exclusión M5, semántica «pendiente» ≠ estatus almacenado, y confirmar PARTIAL_ONLY (no COMPLETE). **No** implementar. **No** autorizar desde este reporte.

El gap **no** está completamente determinado (privados, default de meses, una vs dos tools) → no IMPL.

---

## Acciones no realizadas

- No se implementó M6 ni ningún módulo.
- No se modificó código, tests, runtime, matriz ni contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- No se cambió 42.5%. No se marcó M6 COMPLETE.

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A.
- G5: pendiente humano.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-global-next-module-prioritization-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md
```

Solo los dos archivos autorizados.

## STOP
