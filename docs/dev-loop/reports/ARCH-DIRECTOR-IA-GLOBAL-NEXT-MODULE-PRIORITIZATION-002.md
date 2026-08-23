# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002"
outcome: "DONE_PENDING_REVIEW"
winner: "M4"
winner_scope: "query JSON de matriz de clasificación (comparativo mes A vs mes B); no COMPARAR; no Excel; no COMPLETE"
second_place: "M18"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md"
  - "lib/clasificacion-apoyos-excel.js (lectura)"
  - "lib/director-ia-planner.js, tools, capabilities, chat, igf-arr, m6 (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se vio priv_clave / CLASIFICACION_PRIV_CLAVE en readiness previa; no se copia)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "45.0% no cambia en esta tarea."
  - "Un IMPL futuro de la query M4 sería PARTIAL (+2.5 → 47.5%). COMPLETE de M4 sigue exigiendo COMPARAR/Excel."
```

## Resumen ejecutivo

**Ganador: M4 — Clasificación de apoyos + COMPARAR**, primer slice = **query JSON** de la matriz comparativa (`mes_a` vs `mes_b`). **No** COMPARAR que escribe. **No** Excel. **No** COMPLETE.

Tras M6 PARTIAL, Director IA ya lista GASTOS e INVERSIONES de folios. El hueco ejecutivo **nuevo** que no duplica eso es el **comparativo mensual por planta y familia** (GASTOS / INVERSIONES / TALLER) con diffs A vs B. M6 prohíbe afirmar desviación sin baseline; M4 es exactamente ese baseline de dos meses.

**No se eligió M6 Export** (inercia). **No se eligió por porcentaje.**

**Segundo lugar: M18 — Presupuestos semanales.** Valor semanal alto, pero sin API de producto; SQL embebido + WhatsApp. No es frente coherente ahora.

Esta tarea **no cambia** 9.0 / 20 = **45.0%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-002` (≠ `main`).
- HEAD: `2ec98a5e Merge branch 'docs/director-ia-m6-capability-matrix-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline 45.0%

| Campo | Valor |
|---|---|
| M0–M20 | **9.0 / 20 = 45.0%** (ficha M6 PARTIAL; sync documental) |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, **M6**, M7, M8, M11, M12, M17 (4.5) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M4, M5, M10, M14, M15, M18, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. **No se cuenta de nuevo** un PARTIAL ya puntuado (M6 query). Export M6 no suma.

Nombres **canónicos** (matriz): M4=Clasificación de apoyos + COMPARAR; M5=Taller por AT; M14=Usuarios admin; M15=Documentos/media folio; M18=Presupuestos semanales. Se ignoran etiquetas intercambiadas de prompts viejos.

---

## Capacidad actual de Director IA

Ya responde (hechos): etapa/estatus y listado de folios; historial; metadata documental; KPIs/proyectos; **GASTOS e INVERSIONES de folios por planta y YYYY-MM** (M6); deltas de periodos reales; posibles duplicados; AR vencidas/responsables/temas (top-N); DICF/comentarios (límites); IGF/ARR annex on-demand; bitácora/entidades; commercial_state.

**No** responde con fuente propia: comparativo mensual de clasificación; Export M6; Excel Taller AT; carro semanal; PDF/S3; admin de permisos; weekly LD; health de producto.

---

## Huecos / preguntas ejecutivas nuevas

| Pregunta | ¿Hoy? | Hueco real |
|---|---|---|
| ¿Cómo cambió la clasificación de apoyos mes A vs mes B? | No | **M4** matriz JSON |
| ¿Subieron GASTOS / INVERSIONES / TALLER vs el mes previo (agregado)? | M6 lista un rango; **no** compara | **M4** diffs |
| ¿Cómo va el presupuesto semanal / carro? | No | **M18** (API ausente) |
| ¿Gasto taller por AT? | No | **M5** (≠ AR Taller; ≠ celda TALLER de M4) |
| ¿Exportar GASTOS/INVERSIONES? | No | M6 resto (Excel) |
| ¿Faltan docs / tiene cheque-póliza? | Metadata sí; resto no | M15 / fuera |
| Acciones vencidas / IGF / ARR / DICF | Sí on-demand (límites) | M7/M8/M11/M12 neto bajo |

---

## Candidatos (auditoría física)

M2 no se reabre (EXIT_M2; sin evidencia nueva). M13 COMPLETE. M19 sistema paralelo clase C. M6 **no** se elige por inercia.

### M4 — Clasificación de apoyos + COMPARAR (NO INTEGRADA) — **ganador**

1. **Estado:** NO INTEGRADA. Readiness 001: lectura JSON = PARTIAL_ONLY.
2. **Nuevas:** comparativo `mes_a` vs `mes_b` por planta; totales y diffs de GASTOS / INVERSIONES / TALLER; detalle de celda.
3. **Ya cubierto:** listado de líneas M6 (un rango, sin diffs); M3 agregados; M9 deltas ARR.
4. **Incremental neto:** alto. Es el único comparativo mensual de apoyos. No es M6 (M6 no afirma desviación).
5. **Fuente:** `public.folios` (`planta_id`, `categoria`, `importe`, `mes_cargo`).
6. **Helper:** `buildClasificacionMatrix` (`lib/clasificacion-apoyos-excel.js` 89+), exportado. GET `clasificacion-apoyos` es SELECT + helper; **después** opcionalmente workbook.
7. **Intent:** no existe. `UNSUPPORTED_RULES.clasificacion_apoyos` bloquea hoy.
8. **Tool:** no hay tool de clasificación (`get_budget_status` es M18).
9. **Executor:** null.
10. **Authz:** GET = JWT + GV 403. **No** revisa `plantas_permitidas`. `planta_id` omitido o fuera de `PLANTAS_COMPARATIVO` → fallback a todas las provincias. Director IA debe ser **más estricto** (exigir planta del scope; patrón M6 `assertFolioStatusAccess`).
11. **Planta:** `resolvePlantasComparativo`; chat debe exigir `planta_id`.
12. **Side effects:** GET matriz = SELECT-only. COMPARAR agregar/rechazar/confirmar = **writes (C)**.
13. **Externas:** no si no se usa xlsx. `priv_clave` solo en GET Excel/privados — chat fail-closed sin clave.
14. **Semántica:** matriz usa `f.importe` + `normalizeCat` (no `expandCategoriaRows`). **No** igualar totales a M6. Celda TALLER ≠ M5 Excel por AT. COMPARAR lectura (tipo) ≠ COMPARAR escritura (flujo).
15. **Primer slice:** JSON `buildClasificacionMatrix` + dos YYYY-MM obligatorios y distintos; una planta; sin workbook; sin COMPARAR writes.
16. **Después:** **PARTIAL**. COMPLETE sigue = reconciliación Excel / COMPARAR.
17. **% si IMPL:** +2.5 → **47.5%**. Esta tarea: **0.0**.

### M18 — Presupuestos semanales (NO INTEGRADA) — **segundo**

1. NO INTEGRADA. Propósito canónico: solicitudes/asignación semanal (carro). **No** es Taller AT ni cheques de folio.
2. Nuevas: ¿qué hay en el carro / presupuesto de esta semana?
3. Ya: nada de `presupuesto_*`. M6 no es carro.
4. Incremental: alto en abstracto (dinero semanal, actionability).
5. Tablas `public.presupuestos_semanales` y relacionadas.
6. Lógica embebida en `server.js` + WhatsApp. Sin lib Director IA.
7. Intent `budget_status` existe.
8. Tool `get_budget_status`, `executor: null`, `declared_not_integrated`.
9. Executor null.
10. Roles GG / avance etapa (ficha).
11. Nombre/planta vía bot, no API dashboard inventariada.
12. Modificar presupuesto / enviar a cheques = C.
13. **WhatsApp** acoplado.
14. Alto: carro ≠ cheque/póliza M2 ≠ IGF.
15. No hay primer slice seguro sin extraer SELECT y fijar contrato de lectura.
16. — (blocker).
17. 0 ahora.

Pierde frente a M4: valor semanal alto, pero **fuente no empaquetada** y dependencia de canal. M4 ya tiene JSON SELECT-only auditado.

### M6 restante — Export (PARTIAL)

Query ya integrada. Export/xlsx es el resto canónico de COMPLETE. **No** aporta preguntas ejecutivas nuevas (el dato ya está en chat). Penalidad Excel + inercia. **No.**

### M7 IGF (PARTIAL)

Ya: anexo on-demand (compromiso, margen). Falta UI/versiones/`sources.igf`/detalle folios. No causalidad nueva. M6 ya separó listado de folios. PATCH = C. Incremental neto bajo. **No.**

### M8 ARR (PARTIAL)

Ya: proyección, top clientes, motor DICF. Profundizar solapa **M9**. Carga ARR = C. **No.**

### M11 DICF (PARTIAL)

Ya: 40 detalles, 80 comentarios, commercial_state, acciones. Falta attachments / universo. Más de lo mismo. **No.**

### M12 Action Register (PARTIAL)

Ya: vencidas, responsables, temas, MC. Falta notas (`includeNotes: false`) y binarios. Duplica la fuente primaria diaria. Notas ≠ history M2, pero el valor marginal es bajo frente a un dominio nuevo. **No.**

### M5 — Taller por AT (NO INTEGRADA)

Excel por unidad AT + hoja duplicados. Confunde con AR «Taller» y con la celda TALLER de M4. `get_taller_at_analysis` sigue no integrado. **No.**

### M1 Health (PARTIAL)

Ya `/health-director-ia`. `/health` `/health-db` `/health-proyectos` no son dirección. **No.**

### M10 Weekly discount LD (NO INTEGRADA)

Narrativa + envío WhatsApp. Solapa M9 descuento. Canal ≠ conocimiento. Envío = C. **No.**

### M14 Usuarios admin (NO INTEGRADA)

¿Quién tiene permiso? Write = C. Valor 2. **No.**

### M15 Documentos/PDF (NO INTEGRADA)

S3/contenido. M2 ya lista metadata. EXIT_M2. **No.**

### M17 WhatsApp bridge (PARTIAL)

Link `/director-ia` existe. Twilio no es fuente. **No.**

### M20 Home KPI (INDIRECTA)

Compone `/` con M7/M11. Sin fuente nueva. **No.**

### M0 Auth (PARTIAL)

Gates, no catálogo de respuesta. **No.**

---

## Rechecks mandatorios

| Frente | Conclusión |
|---|---|
| M4 | PARTIAL_ONLY vigente. Query ≠ COMPLETE. **Ganador.** Revalidar wiring vs stack post-M6. |
| M6 Export | Query hecha. Excel = COMPLETE. **Inercia: no.** |
| M7 | Annex cotidiano ya existe. |
| M8 | Duplica M9/DICF. |
| M11 | Reasoning ya existe. |
| M12 | Ya es el seguimiento diario. |
| M18 | Carro sin API. Segundo por valor, no por readiness. |
| WhatsApp | Canal ≠ conocimiento (M10/M17). |

---

## Tabla comparativa

| rank | module | current_state | new_executive_questions | executive_value | reasoning_value | incremental_value | frequency | actionability | source_ready | wiring_ready | authz_fit | dependencies | mutation_risk | semantic_risk | first_useful_slice | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **M4** | NO INTEGRADA | comparativo mensual A vs B | **4** | **4** (diffs) | **4** | mensual | alta (planta+familia+mes) | `buildClasificacionMatrix` | unsupported; sin tool | JWT/GV; falta plantas_permitidas | folios | COMPARAR C | medio (≠ M6 expand; ≠ M5) | matriz JSON | **PARTIAL** | +2.5 luego; 0 ahora | **GANADOR** |
| 2 | M18 | NO INTEGRADA | carro semanal | 4 | 2 | 3 | semanal | alta | SQL embebido ≠ API | `budget_status` null | GG/bot | WhatsApp | cheques C | alto | — blocker | — | 0 | **segundo** |
| 3 | M6 Export | PARTIAL | archivo xlsx | 1 neto | 0 | 1 | rara | baja | workbook existe | query ya hecha | igual M6 | Excel | no | bajo | no | COMPLETE solo con Export | +2.5 dudoso | no (inercia) |
| 4 | M5 | NO INTEGRADA | taller por AT | 3 | 2 | 2 | mensual | media | xlsx | stub no integrado | JWT/priv | no | no | alto (≠ AR, ≠ M4 TALLER) | query AT | PARTIAL | +2.5 | no |
| 5 | M12 | PARTIAL | notas/evidencias | 2 neto | 3 ya | 1 | diaria ya | alta ya | board | tools | DICF | no | CRUD | medio | notas | PARTIAL | 0 | no |
| 6 | M11 | PARTIAL | universo/attach | 2 neto | 3 ya | 1 | periódica | alta ya | summarizers | tools | DICF | no | CRUD UI | medio | límites | PARTIAL | 0 | no |
| 7 | M7 | PARTIAL | UI/versiones IGF | 2 neto | 2 | 1 | periódica | media ya | annex | executor annex | IGF | no | PATCH | medio | `sources.igf` | PARTIAL | 0 | no |
| 8 | M8 | PARTIAL | carga/UI ARR | 2 neto | 2 | 1 | periódica | media ya | annex+DICF | annex | GA | upload | load C | medio (M9) | nada útil | PARTIAL | 0 | no |
| 9 | M15 | NO INTEGRADA | PDF/S3 | 3 | 2 | 1 | ocasional | media | `/media` | M2 metadata ya | GV | **S3** | subir | medio | no | PARTIAL | +2.5 | no |
| 10 | M10 | NO INTEGRADA | narrativa LD | 2 | 1 | 1 | semanal | baja | JSON lectura | no | GA/GV | **Twilio** | envío C | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| 11 | M17 | PARTIAL | (canal) | 1 | 0 | 0 | — | nula | Twilio | link existe | tokens | Twilio | bot | medio | nada | PARTIAL | 0 | no |
| 12 | M14 | NO INTEGRADA | permisos | 2 | 0 | 1 | rara | C | admin API | `user_permissions` | clave | no | **C** | alto | lectura | PARTIAL | +2.5 | no |
| 13 | M1 | PARTIAL | health producto | 1 | 0 | 1 | rara | nula | GET `/health*` | no chat | sin JWT | no | no | medio | tres GET | PARTIAL | dudoso | no |
| 14 | M20 | INDIRECTA | Home | 2 | 0 | 0 | — | nula | M7/M11 | no | igual | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| 15 | M0 | PARTIAL | catálogo permisos | 1 | 0 | 0 | rara | nula | JWT | gates | sí | no | no | alto | — | PARTIAL | 0 | no |

---

## Ranking

Criterio: valor incremental neto + preguntas nuevas + hechos + in-process. **No** porcentaje. **No** facilidad sola. **No** continuar M6. Penaliza duplicar M2/M3/M6/M9/M12 y Excel/S3/Twilio/write.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M4 query matriz** | Único NO INTEGRADA con comparativo mensual estructurado, helper JSON y readiness PARTIAL_ONLY; no duplica el listado M6 |
| **2** | M18 carro | Valor semanal alto; API ausente |
| 3 | M5 Taller AT | Excel + semántica AR |
| 4 | M12/M11 más profundo | Ya cubren seguimiento |
| 5 | M7/M8 más profundo | Ya on-demand; M8 solapa M9 |
| 6 | M6 Export | Inercia; el dato ya está en chat |
| 7 | M15 contenido | S3; metadata M2 hecha |
| 8 | M10/M17 | Canal |
| 9 | M14 / M1 / M20 / M0 | Poco o nulo valor de dirección |

---

## Ganador

**M4 — Clasificación de apoyos + COMPARAR** (primer slice: query JSON de matriz, dos YYYY-MM, una planta).

### Por qué gana

1. Habilita el comparativo mensual que **hoy no tiene fuente** y que M6 **no puede afirmar**.
2. No duplica M6 (líneas de un rango ≠ diffs A vs B; helper distinto: `importe`+`normalizeCat`, no `expandCategoriaRows`).
3. No duplica M2/M3/M9/M12.
4. Fuente y helper verificados (`buildClasificacionMatrix`). GET matriz es SELECT-only.
5. Actionability: planta + familia (GASTOS/INVERSIONES/TALLER) + mes A/B + magnitud del diff.
6. 001 ya lo dejó segundo; M6 query se cerró. El criterio sigue siendo **utilidad incremental**, no P(COMPLETE).

### Preguntas nuevas (si el readiness confirma el path)

- ¿Cómo cambió la clasificación de apoyos en {planta} entre {YYYY-MM} y {YYYY-MM}?
- ¿Qué familia (GASTOS / INVERSIONES / TALLER) explica el movimiento?
- ¿Cuál es el total A, el total B y el diff?

**No** las habilita: listado de partidas M6; Export M6; COMPARAR que crea folios; Taller por AT (M5); carro M18; «cómo van los gastos» IGF.

### Por qué es más valioso ahora

M6 cerró «qué hay». Falta «qué cambió mes contra mes» en apoyos. IGF/M9 no son esa matriz.

### Primer slice

```text
pregunta clasificación / comparativo de apoyos + dos YYYY-MM
  → detectUnsupported no corta el listado JSON
  → intent nuevo o mapeo clasificacion_apoyos
  → tool + loader in-process
       → JWT; GV 403; planta_id del scope; plantas_permitidas; no fallback global
       → mes_a ≠ mes_b obligatorios; no inventar
       → SELECT public.folios + buildClasificacionMatrix
       → JSON (plantas[], totales, diffs_categoria); no xlsx
  → evidencia; openai_called false
```

No HTTP interno. No `buildClasificacionApoyosWorkbook`. No COMPARAR writes. No igualar a totales M6. No despachar Taller AT.

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M4 | NO INTEGRADA | **PARTIAL** |
| M6 | PARTIAL | PARTIAL |
| Global | **45.0%** | **47.5%** (+2.5) |

COMPLETE de M4 **no** se otorga. Esta priorización: **0.0 pp**.

### Riesgos

- Confundir diffs M4 con listado M6 o con IGF.
- Confundir celda TALLER con M5.
- Fallback a todas las plantas si falta `planta_id`.
- Inventar `mes_a`/`mes_b`.
- Invocar COMPARAR writes o xlsx.
- Afirmar COMPLETE o +5.0.

### Dependencias

`public.folios`, `buildClasificacionMatrix`, `resolvePlantasComparativo`. Sin S3, Twilio, migration. Authz de scope = tema del readiness (más estricto que el GET).

### Gates del IMPL futuro

G2/G3 no (PARTIAL ya previsto). G1 nuevo para el readiness y, si aplica, para el IMPL.

---

## Segundo lugar

**M18 — Presupuestos semanales.**

### Por qué pierde

El carro semanal sería la otra pregunta de dinero cotidiano que Director IA no responde. Pierde porque **no hay superficie JSON de producto**: tablas sí, API dashboard dedicada no, lógica mezclada con WhatsApp, writes a cheques = C. El readiness 001/005 y esta reauditoría confirman el blocker. No se fuerza un slice inseguro.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001`

Hace falta revalidar el path contra el stack post-M6 (authz de folios, no fallback global, no chocar con M6/M5/IGF, no COMPARAR). La readiness 001 de M4 sigue vigente como PARTIAL_ONLY de fuente; **no** sustituye este slice de wiring. No IMPL directo.

---

## Acciones no realizadas

- No se implementó nada. No se tocó código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 45.0%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-global-next-module-prioritization-002
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md
```

Solo los dos archivos autorizados.

## STOP
