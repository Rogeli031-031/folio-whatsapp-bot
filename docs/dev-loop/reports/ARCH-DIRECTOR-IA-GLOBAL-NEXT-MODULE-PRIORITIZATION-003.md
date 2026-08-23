# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003"
outcome: "DONE_PENDING_REVIEW"
winner: "M18"
winner_scope: "query JSON read-only del carro/presupuesto semanal (asignado/seleccionado/disponible); no envío a cheques; no WhatsApp; no COMPLETE"
second_place: "M12"
second_scope: "notas de revisión Action Register (includeNotes hoy false)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "server.js getPresupuestoResumen / presupuestos_semanales (lectura)"
  - "lib/director-ia-planner.js, tools, capabilities, context, igf-arr, taller-at-excel (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "47.5% no cambia en esta tarea."
  - "Un IMPL futuro de la query M18 sería PARTIAL (+2.5 → 50.0%). COMPLETE de M18 sigue exigiendo writes/cheques/WhatsApp."
```

## Resumen ejecutivo

**Ganador: M18 — Presupuestos semanales**, primer slice = **query JSON read-only del carro de la semana** (asignado / seleccionado / disponible / folios / urgentes). **No** envío a cheques. **No** WhatsApp. **No** COMPLETE.

Tras M4 y M6, Director IA ya lista GASTOS/INVERSIONES y compara clasificación mes a mes. El hueco ejecutivo **nuevo** que no duplica eso es el **dinero semanal del carro**: pregunta canónica #17 («¿Cómo va el presupuesto semanal?»). No se eligió porque hubiera sido segundo en 002: se reevaluó desde cero. Gana porque es el único NO INTEGRADA con pregunta cotidiana de dinero que hoy no tiene fuente, tablas SELECT-only reales y un resumen ya calculado en `getPresupuestoResumen`.

**No se eligió M4 COMPARAR/Excel ni M6 Export** (inercia). **No se eligió por porcentaje.**

**Segundo lugar: M12 — Action Register**, slice de **notas de revisión** (`includeNotes: false` hoy). Alto valor de contexto, path in-process. Pierde porque profundiza la fuente diaria ya integrada; no abre un dominio nuevo.

Esta tarea **no cambia** 9.5 / 20 = **47.5%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-003` (≠ `main`).
- HEAD: `06a85813 Merge branch 'docs/director-ia-m4-capability-matrix-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline 47.5%

| Campo | Valor |
|---|---|
| M0–M20 | **9.5 / 20 = 47.5%** (ficha M4 PARTIAL; sync documental) |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, **M4**, M6, M7, M8, M11, M12, M17 (5.0) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M5, M10, M14, M15, M18, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. **No se cuenta de nuevo** un PARTIAL ya puntuado (M4 query, M6 query).

Nombres canónicos: M4=Clasificación + COMPARAR; M5=Taller por AT; M12=Action Register; M14=Usuarios admin; M15=Documentos/media; M18=Presupuestos semanales (carro).

---

## Capacidad actual de Director IA

Ya responde (hechos): etapa/estatus, historial y metadata documental de folios; KPIs/proyectos; GASTOS e INVERSIONES por planta y `YYYY-MM`; **comparativo M4** `mes_a` vs `mes_b` (GASTOS/INVERSIONES/TALLER); deltas de periodos reales; posibles duplicados; AR vencidas/responsables/temas (top-N, **sin notas**); DICF/comentarios (límites); IGF/ARR annex on-demand; bitácora/entidades; commercial_state.

**No** responde con fuente propia: carro/presupuesto semanal; notas de revisión AR; Excel Taller AT; Export M4/M6; PDF/S3; admin de permisos; weekly LD; health de producto; Home KPI como página.

---

## Huecos / preguntas ejecutivas nuevas

| Pregunta | ¿Hoy? | Hueco real |
|---|---|---|
| ¿Cómo va el presupuesto / carro de esta semana? | No | **M18** |
| ¿Cuánto queda disponible / qué folios están en el carro? | No | **M18** |
| ¿Qué dicen las notas de revisión de esta acción? | No | **M12** notas |
| ¿Gasto taller por unidad AT? | No (M4 solo agrega TALLER) | **M5** |
| ¿Exportar clasificación o GASTOS? | No | M4/M6 resto (Excel) |
| ¿Faltan docs / PDF? | Metadata sí | M15 |
| IGF/ARR/DICF/AR seguimiento | Sí on-demand (límites) | M7/M8/M11 neto bajo |

---

## Candidatos (auditoría física)

M2 no se reabre (EXIT_M2; sin evidencia nueva). M13 COMPLETE. M19 sistema paralelo clase C. **M4 query y M6 query no se reeligen.**

### M18 — Presupuestos semanales (NO INTEGRADA) — **ganador**

1. **Nuevas:** ¿cómo va el presupuesto semanal?; ¿cuánto está asignado / seleccionado / disponible?; ¿cuántos folios hay en el carro y cuáles son urgentes?
2. **Ya cubierto:** nada de `presupuesto_*`. M6 lista partidas de un mes; M4 compara familias; ninguno es el carro semanal.
3. **Duplica:** no, si el slice es **carro** (`presupuestos_semanales` + `presupuesto_folios`). Sí duplicaría M4/M6 si se usara `presupuesto_asignacion_detalle` (montos mensuales por categoría).
4. **Fuente:** `public.presupuestos_semanales`, `public.presupuesto_folios`.
5. **Helpers en `server.js`:** `getPresupuestoResumen` (SELECT: asignado, seleccionado, disponible, numFolios, urgentes, lista); lookup por planta + semana México. **No** hay lib Director IA.
6. **Queries:** SELECT-only en esos helpers. INSERT/envío a cheques existen aparte (C).
7. **Intent:** `budget_status` (planner).
8. **Tool:** `get_budget_status`, `declared_not_integrated`.
9. **Executor:** `null`.
10. **Authz:** ficha: roles GG / avance etapa. Chat hoy: JWT de Director IA; no hay assert de carro.
11. **Planta:** `planta_id` en `presupuestos_semanales`. Semana = `getCurrentWeekMexico` en producto; Director IA no debe inventar semana si falta.
12. **Side effects del slice de lectura:** ninguno. Enviar a cheques / modificar presupuesto = C.
13. **Externas:** WhatsApp acoplado al bot; el slice **no** debe usarlo.
14. **Semántica:** carro ≠ cheque/póliza M2 ≠ IGF ≠ asignación mensual `presupuesto_asignacion_detalle`. «Disponible» es asignado − seleccionado, no cumplimiento presupuestal IGF.
15. **Primer slice:** JSON de `getPresupuestoResumen` para la semana en curso (o semana explícita), una planta autorizada.
16. **Después:** **PARTIAL**. COMPLETE sigue = writes / cheques / operación bot.
17. **% si IMPL:** +2.5 → **50.0%**. Esta tarea: **0.0**.

### M12 — Action Register (PARTIAL) — **segundo**

1. **Nuevas:** ¿qué dicen las notas de la última revisión?; ¿qué quedó acordado en el ítem?
2. **Ya:** vencidas, responsables, temas, MC, executive_summary (top-N).
3. **Duplica:** no es history M2. Sí profundiza la misma fuente diaria.
4. **Fuente:** `arr.action_register_*`.
5. **Helper:** `buildActionRegisterBoardPayload` ya soporta `includeNotes` (default true en board; context lo fuerza `false` en `director-ia-context.js` 93).
6. **Query:** la del board existente.
7. **Intent:** `action_status` / `overdue_actions` (existen).
8. **Tool:** `get_action_register_context` (existe).
9. **Executor:** `buildDirectorIaContextPayload`.
10. **Authz:** la de AR actual.
11. **Planta:** la del context.
12. **Side effects:** lectura. CRUD AR = C.
13. **Externas:** no.
14. **Semántica:** nota ≠ evidencia binaria ≠ history de folio.
15. **Primer slice:** `includeNotes: true` en context/summarizers, con recorte.
16. **Después:** **PARTIAL** (ya lo es).
17. **%:** **0.0** (PARTIAL ya vale 0.5).

Pierde frente a M18: el director ya pregunta y obtiene vencidas/responsables. Las notas enriquecen; no habilitan un dominio que hoy es silencio total.

### M4 restante — COMPARAR / Excel (PARTIAL)

Query hecha. Resto canónico = COMPARAR writes + xlsx. Penalidad Excel + writes + inercia. **No.**

### M6 restante — Export (PARTIAL)

Query hecha. Export/xlsx = COMPLETE. El dato ya está en chat. **No.**

### M5 — Taller por AT (NO INTEGRADA)

1. Nuevas: gasto por unidad AT; duplicados de taller (detector distinto a M16).
2. Ya: celda TALLER de M4; tema AR «Taller»; GASTOS M6.
3. Duplica semántica si no se acota «por AT».
4. `public.folios`.
5. `expandTallerRows` exportado; `buildTallerAtWorkbook` = xlsx.
6. GET `taller-at-excel`.
7. Planner mapea a `expense_analysis` + domain `taller_at` y el chat **bloquea**.
8. `get_taller_at_analysis`, executor null.
9. null.
10. JWT + `priv_clave`.
11. Folios/planta.
12. Export archivo.
13. no.
14. Alto: ≠ AR Taller ≠ M4 TALLER.
15. Query JSON vía `expandTallerRows` (no workbook).
16. PARTIAL.
17. +2.5 luego.

Útil, pero más estrecho que el carro semanal y con colisión semántica. **No ganador.**

### M7 IGF (PARTIAL)

Ya: anexo on-demand (compromiso, margen). Falta UI/versiones/`sources.igf`/detalle folios. No pregunta nueva cotidiana. PATCH = C. **No.**

### M8 ARR (PARTIAL)

Ya: proyección, top clientes, motor DICF. Profundizar solapa **M9**. Carga = C. **No.**

### M11 DICF (PARTIAL)

Ya: 40 detalles, 80 comentarios, commercial_state, acciones. Hueco = attachments / universo. Más de lo mismo. **No.**

### M20 Home KPI (INDIRECTA)

Compone `/` con M7/M11. Sin fuente nueva. **No.**

### M1 Health (PARTIAL)

`/health-director-ia` ya. Health de producto nulo para dirección. **No.**

### M10 / M17 WhatsApp

Canal ≠ conocimiento. Envío = C. Twilio. **No.**

### M14 Usuarios admin (NO INTEGRADA)

Permisos. Write = C. **No.**

### M15 Documentos (NO INTEGRADA)

S3/PDF. Metadata es M2. EXIT_M2. **No.**

### M0 Auth (PARTIAL)

Gates, no catálogo de respuesta. **No.**

---

## Rechecks mandatorios

| Frente | Conclusión |
|---|---|
| M4 resto | Query hecha. COMPARAR/Excel = inercia. |
| M6 resto | Query hecha. Export = inercia. |
| M7 | Annex cotidiano ya existe. |
| M8 | Duplica M9/DICF. |
| M11 | Reasoning comercial ya existe. |
| M12 | Notas = mejor profundización in-process. **Segundo.** |
| M18 | Carro semanal; SELECT `getPresupuestoResumen` existe. **Ganador.** Reevaluado desde cero, no por ranking 002. |
| M20 | Sin fuente nueva. |
| WhatsApp | Canal ≠ conocimiento. |

---

## Tabla comparativa

| rank | module | current_state | new_executive_questions | executive_value | reasoning_value | incremental_value | frequency | actionability | source_ready | wiring_ready | authz_fit | dependencies | mutation_risk | semantic_risk | first_useful_slice | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **M18** | NO INTEGRADA | carro semanal / disponible | **4** | 2 | **4** | semanal | alta | `getPresupuestoResumen` en server.js | intent sí; executor null | JWT; GG/carro por auditar | WhatsApp (no usar) | cheques C | medio (≠ IGF, ≠ asignacion_detalle) | resumen JSON semana | **PARTIAL** | +2.5 luego; 0 ahora | **GANADOR** |
| 2 | M12 notas | PARTIAL | notas de revisión | 3 | **4** | 2 | diaria | alta ya | board `includeNotes` | tools existen | AR | no | CRUD C | medio (≠ M2) | includeNotes true | PARTIAL | 0 | **segundo** |
| 3 | M5 | NO INTEGRADA | taller por AT | 3 | 2 | 3 | mensual | media | `expandTallerRows` | stub + bloqueo chat | JWT/priv | no | no | alto (≠ M4/AR) | query AT | PARTIAL | +2.5 | no |
| 4 | M7 | PARTIAL | UI/versiones IGF | 2 | 2 | 1 | periódica | media ya | annex | executor annex | IGF | no | PATCH | medio | `sources.igf` | PARTIAL | 0 | no |
| 5 | M11 | PARTIAL | universo/attach | 2 | 3 ya | 1 | periódica | alta ya | summarizers | tools | DICF | no | CRUD | medio | límites | PARTIAL | 0 | no |
| 6 | M8 | PARTIAL | carga/UI ARR | 2 | 2 | 1 | periódica | media ya | annex+DICF | annex | GA | upload | load C | medio (M9) | nada útil | PARTIAL | 0 | no |
| 7 | M4 resto | PARTIAL | xlsx / COMPARAR | 1 | 0 | 1 | rara | C | workbook/POSTs | query ya hecha | igual M4 | Excel | **C** | medio | no | COMPLETE dudoso | +2.5 dudoso | no (inercia) |
| 8 | M6 resto | PARTIAL | xlsx | 1 | 0 | 1 | rara | baja | workbook | query ya hecha | igual M6 | Excel | no | bajo | no | COMPLETE | +2.5 dudoso | no (inercia) |
| 9 | M15 | NO INTEGRADA | PDF/S3 | 3 | 2 | 1 | ocasional | media | `/media` | M2 metadata ya | GV | **S3** | subir | medio | no | PARTIAL | +2.5 | no |
| 10 | M10 | NO INTEGRADA | narrativa LD | 2 | 1 | 1 | semanal | baja | JSON lectura | no | GA/GV | **Twilio** | envío C | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| 11 | M17 | PARTIAL | (canal) | 1 | 0 | 0 | — | nula | Twilio | link existe | tokens | Twilio | bot | medio | nada | PARTIAL | 0 | no |
| 12 | M14 | NO INTEGRADA | permisos | 2 | 0 | 1 | rara | C | admin API | stub | clave | no | **C** | alto | lectura | PARTIAL | +2.5 | no |
| 13 | M1 | PARTIAL | health producto | 1 | 0 | 1 | rara | nula | GET `/health*` | no chat | sin JWT | no | no | medio | tres GET | PARTIAL | dudoso | no |
| 14 | M20 | INDIRECTA | Home | 2 | 0 | 0 | — | nula | M7/M11 | no | igual | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| 15 | M0 | PARTIAL | catálogo permisos | 1 | 0 | 0 | rara | nula | JWT | gates | sí | no | no | alto | — | PARTIAL | 0 | no |

---

## Ranking

Criterio: valor incremental neto + preguntas nuevas + hechos + in-process. **No** porcentaje. **No** facilidad sola. **No** continuar M4/M6. **No** heredar el 2º de 002. Penaliza Excel/S3/Twilio/write y duplicar M2/M3/M4/M6/M9/M12.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M18 query carro semanal** | Única pregunta cotidiana de dinero que hoy es silencio total; SELECT de resumen existe |
| **2** | M12 notas | Mejor profundización de razonamiento; no abre dominio nuevo |
| 3 | M5 Taller AT | Nuevo, pero colisiona TALLER/AR y empuja Excel |
| 4 | M7/M11/M8 más profundo | Ya cubren finanzas/comercial on-demand |
| 5 | M4/M6 resto | Inercia; el dato de consulta ya está |
| 6 | M15 / M10 / M17 | S3 / canal |
| 7 | M14 / M1 / M20 / M0 | Poco o nulo valor de dirección |

---

## Ganador

**M18 — Presupuestos semanales** (primer slice: query JSON del carro de la semana).

### Por qué gana

1. Habilita la pregunta #17 que **ninguna** fuente actual responde.
2. No duplica M4 (comparativo mensual de familias) ni M6 (listado de partidas) si se acota al **carro semanal**.
3. Fuente física verificada: `presupuestos_semanales` + `presupuesto_folios` + `getPresupuestoResumen` (SELECT-only).
4. Intent `budget_status` y tool `get_budget_status` ya existen (executor null).
5. Actionability: planta + semana + monto + folios del carro + urgentes.
6. Reevaluación desde cero: 002 lo dejó segundo por API ausente. Ahora el criterio sigue siendo **utilidad incremental**; el resumen SELECT ya está en `server.js`. Eso no autoriza IMPL directo: hace falta readiness de authz/semana/límites.

### Preguntas nuevas (si el readiness confirma el path)

- ¿Cómo va el presupuesto semanal de {planta}?
- ¿Cuánto está asignado, seleccionado y disponible esta semana?
- ¿Cuántos folios hay en el carro y cuáles están marcados urgentes?

**No** las habilita: M4, M6, IGF, COMPARAR, Taller AT, notas AR.

### Primer slice

```text
pregunta presupuesto semanal / carro
  → UNSUPPORTED ya no corta la lectura JSON
  → intent budget_status
  → tool get_budget_status + executor
       → JWT; planta autorizada; plantas_permitidas; no WhatsApp
       → semana en curso o YYYY-MM-DD explícitos; no inventar
       → SELECT presupuestos_semanales + presupuesto_folios
       → getPresupuestoResumen (asignado/seleccionado/disponible/folios)
       → no envío a cheques; no UPDATE
  → evidencia; openai_called false
```

No HTTP interno. No `presupuesto_asignacion_detalle` como si fuera el carro. No Twilio.

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M18 | NO INTEGRADA | **PARTIAL** |
| Global | **47.5%** | **50.0%** (+2.5) |

COMPLETE de M18 **no** se otorga. Esta priorización: **0.0 pp**.

### Riesgos

- Confundir carro semanal con `presupuesto_asignacion_detalle` (mensual) o con IGF.
- Inventar la semana (`getCurrentWeekMexico` como default silencioso).
- Copiar writes / envío a cheques / bot WhatsApp.
- Afirmar COMPLETE o «ya enviado a cheques» sin hecho.
- Authz de carro más laxa que Director IA.

### Dependencias

`public.presupuestos_semanales`, `public.presupuesto_folios`, helpers en `server.js` a extraer. Sin S3. Twilio **fuera** del slice.

### Gates del IMPL futuro

G2/G3 no (PARTIAL previsto). G1 nuevo para el readiness y, si aplica, para el IMPL.

---

## Segundo lugar

**M12 — Action Register (notas de revisión).**

### Por qué pierde

Las notas darían contexto causal sobre acciones que Director IA **ya lista**. Path in-process (`includeNotes`). Pierde porque el incremento es de profundidad, no de dominio: el director ya hace seguimiento diario. M18 es silencio total sobre dinero semanal.

No se elige M18 como segundo «porque 002 lo dijo». M18 gana ahora; M12 es el mejor *otro* frente.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001`

Hay que fijar: carro ≠ asignación mensual; semana sin inventar; authz; no WhatsApp; no cheques; extraer SELECT de `server.js`. No IMPL directo.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 47.5%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-global-next-module-prioritization-003
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md
```

Solo los dos archivos autorizados.

## STOP
