# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004"
outcome: "DONE_PENDING_REVIEW"
winner: "M12"
winner_scope: "notas de revisión Action Register (arr.action_register_revision_notes; includeNotes hoy false); no attachments binarios; no CRUD; no COMPLETE"
second_place: "M5"
second_scope: "query JSON de gasto taller por unidad AT (expandTallerRows); no workbook/xlsx; no COMPLETE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"
  - "lib/action-register-board.js, director-ia-context.js, director-ia-action-register.js (lectura)"
  - "lib/director-ia-tools.js, director-ia-planner.js, taller-at-excel.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "50.0% no cambia en esta tarea."
  - "Un IMPL futuro de notas M12 seguiría PARTIAL (0.0 pp). COMPLETE de M12 sigue exigiendo evidencias/CRUD fuera de este slice."
```

## Resumen ejecutivo

**Ganador: M12 — Action Register**, primer slice = **notas de revisión** (`arr.action_register_revision_notes`). **No** attachments binarios. **No** CRUD. **No** COMPLETE.

Tras M4 (comparativo), M6 (listado GASTOS/INVERSIONES) y M18 (carro semanal), Director IA ya cubre las preguntas de dinero SELECT de alta frecuencia. El hueco ejecutivo **nuevo** que queda es la **minuta de la revisión AR**: qué se acordó, quién lo escribió y cuándo. Eso no lo responden vencidas, responsables ni temas.

**Respuesta a la pregunta crítica de notas:** las notas **sí habilitan preguntas ejecutivas nuevas**. No son solo un adorno de respuestas que ya existen. El enriquecimiento de vencidas/temas es secundario y no estructurado: la fuente está anclada a `revision_id`, no al ítem.

**No se eligió M12 porque 003 lo dejó segundo.** Se reevaluó desde cero con baseline 50.0%. 003 ganó M18 porque entonces el carro era silencio total; ese silencio ya no existe. El resto de M18 (writes/cheques/WhatsApp) se penaliza como inercia.

**No se eligió M18 restante, M4 restante ni M6 restante** (inercia + writes/Excel). **No se eligió por porcentaje.**

**Segundo lugar: M5 — Taller por AT**, slice query JSON vía `expandTallerRows`. Abre un dominio NO INTEGRADA, pero pierde: Excel, colisión semántica TALLER/AT/AR Taller, frecuencia mensual, y M4 ya muestra la familia TALLER.

Esta tarea **no cambia** 10.0 / 20 = **50.0%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-004` (≠ `main`).
- HEAD: `61b793f6 Merge branch 'docs/director-ia-m18-capability-matrix-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline 50.0%

| Campo | Valor |
|---|---|
| M0–M20 | **10.0 / 20 = 50.0%** (ficha M18 PARTIAL; sync documental `719b3eaa`) |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, M4, M6, M7, M8, M11, M12, M17, **M18** (5.5) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M5, M10, M14, M15, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. **No se cuenta de nuevo** un PARTIAL ya puntuado (M4, M6, M12, M18).

Nombres canónicos vigentes: M4=Clasificación + COMPARAR; M5=Taller por AT; M12=Action Register; M14=Usuarios admin; M15=Documentos/PDF; M18=Presupuestos semanales (carro).

---

## Capacidad actual de Director IA

Ya responde (hechos): etapa/estatus, historial y metadata documental de folios; KPIs/proyectos; **comparativo M4** `mes_a` vs `mes_b` (GASTOS/INVERSIONES/TALLER); listado M6 GASTOS/INVERSIONES; **carro semanal M18** (asignado/seleccionado/disponible/folios/urgentes); deltas de periodos reales; posibles duplicados; AR vencidas/responsables/temas (top-N, **sin notas**); DICF/comentarios (límites); IGF/ARR annex on-demand; bitácora/entidades; commercial_state.

**No** responde con fuente propia: notas de revisión AR; Excel Taller AT; COMPARAR/xlsx M4; Export M6; writes/cheques/WhatsApp M18; PDF/S3; admin de permisos; weekly LD; health de producto; Home KPI como página.

---

## Huecos / preguntas ejecutivas nuevas

| Pregunta | ¿Hoy? | Hueco real |
|---|---|---|
| ¿Qué se acordó en la última revisión de Action Register? | No | **M12** notas (clase nueva) |
| ¿Qué dicen las notas de la revisión del {fecha} y quién las escribió? | No | **M12** notas |
| ¿Por qué está vencida la acción X? | Parcial (lista, no minuta) | M12 notas solo si el texto lo menciona; no es join al ítem |
| ¿Gasto taller por unidad AT? | No (M4 solo agrega familia TALLER) | **M5** |
| ¿Exportar clasificación o GASTOS? | No | M4/M6 resto (Excel) |
| ¿Asignar carro / enviar a cheques / WhatsApp? | No | M18 resto (writes/canal) |
| ¿Faltan docs / PDF? | Metadata sí | M15 |
| IGF/ARR/DICF/AR seguimiento | Sí on-demand (límites) | M7/M8/M11 neto bajo |

---

## Auditoría especial M12 — notas / `includeNotes`

### Hechos físicos

- Propósito canónico: «Tablero de temas, ítems, revisiones, **notas** y evidencias por planta.»
- Context fuerza `includeNotes: false` (`lib/director-ia-context.js` L93).
- `buildActionRegisterBoardPayload` (`lib/action-register-board.js`): `includeNotes` default **true** en el board de producto; si true, SELECT `arr.action_register_revision_notes` por `planta_id`, agrupado por `revision_id`.
- Columnas observadas: `id`, `revision_id`, `body`, `author_name`, `created_at`, `created_by_usuario_id`, `attachments_count` (COUNT de `arr.action_register_revision_note_attachments`).
- Tool `get_action_register_context` ya existe; limitation vigente: «notas de revisión excluidas del context.»
- `lib/director-ia-action-register.js` **no** menciona `notes` ni `includeNotes`. Exports: summary, responsables, temas, top_overdue, invalid_overdue, tema_details, executive_summary, DICF. **Ningún summarizer consume `board.notes`.**
- Intent existente: `action_status` / overdue (planner). No hay intent dedicado a minutas.
- Authz: la misma de AR (`assertPlantaAccess` + JWT de Director IA). SELECT-only. CRUD `/api/action-register/*` = C.
- Notas ≠ history M2 ≠ comentarios de folio/cliente ≠ comentarios DICF ≠ bitácora/Plaud. El chat ya prohíbe convertir notas Plaud en acciones formales.

### ¿Preguntas nuevas o solo enriquecimiento?

**Nuevas (no contestables hoy):**

1. ¿Qué se acordó en la última revisión de Action Register de {planta}?
2. ¿Qué dicen las notas de la revisión del {fecha}?
3. ¿Quién escribió la nota y cuándo?

**Ya cubiertas sin notas:** vencidas (top 10), responsables (10), temas, invalid_overdue, tema_details, executive_summary, Mejora Continua.

**Enriquecimiento (secundario):** una nota de revisión puede mencionar por qué un ítem sigue abierto. Eso **no** es un join estructurado nota→ítem. Afirmar «la nota de esta acción» sería semántica falsa.

**Conclusión:** las notas no son solo un adorno. Abren la clase **minuta de revisión**. El valor de razonamiento es alto (contexto de acuerdos). El valor de causalidad estructurada es medio (texto libre). Frecuencia alta (revisión de planta). Actionability: autor + fecha + planta + cuerpo; no crea acciones.

### Por qué no IMPL directo

`includeNotes: true` no basta. Falta recorte (todas las revisiones pueden ser voluminosas), summarizer que consuma `board.notes`, exclusión de binarios, wording planner («qué se acordó» ≠ overdue), y frontera explícita frente a Plaud/history M2/comentarios. Por eso NEXT_TASK = READINESS, no IMPL.

---

## Candidatos (auditoría física, 17 campos)

M13 COMPLETE. M16 COMPLETE. M9 COMPLETE. M3 COMPLETE. M2 no se reabre (EXIT_M2 vigente; sin evidencia nueva). M19 sistema paralelo clase C. **M18/M4/M6 restantes no se reeligen por inercia.**

### M12 — Action Register (PARTIAL) — **ganador**

1. **Nuevas:** minuta de la última revisión; texto/autor/fecha de notas de revisión.
2. **Ya cubiertas:** vencidas, responsables, temas, MC, executive_summary (top-N).
3. **Duplicación:** no es history M2 ni comentarios DICF/folio. Profundiza la misma fuente diaria. Riesgo: tratar nota de revisión como nota de ítem.
4. **Fuente:** `arr.action_register_revision_notes` ⋈ `arr.action_register_revisions` (`planta_id`).
5. **Helpers:** `buildActionRegisterBoardPayload({ includeNotes })`. No hay summarizer de notas.
6. **Queries:** SELECT-only del board (body, author_name, created_at, attachments_count).
7. **Intent:** `action_status` (existe; no cubre minuta).
8. **Tool:** `get_action_register_context` (existe; limitation excluye notas).
9. **Executor:** `buildDirectorIaContextPayload`.
10. **Authz:** planta del context / `assertPlantaAccess`.
11. **Planta:** `rv.planta_id`.
12. **Side effects del slice:** ninguno. CRUD AR = C. Attachments binarios fuera.
13. **Dependencia externa:** no.
14. **Riesgo semántico:** medio (nota ≠ evidencia ≠ Plaud ≠ history; nota es por revisión, no por ítem).
15. **First useful slice:** recorte de notas de la(s) revisión(es) reciente(s) en context/summarizers; sin binarios.
16. **State after slice:** **PARTIAL** (ya lo es).
17. **Percentage effect:** **0.0** ahora y tras IMPL futuro (PARTIAL ya vale 0.5).

### M5 — Taller por AT (NO INTEGRADA) — **segundo**

1. **Nuevas:** gasto taller por unidad AT; hoja de duplicados de taller (detector distinto a M16).
2. **Ya cubiertas:** celda/familia TALLER de M4; tema AR «Taller»; listado GASTOS M6.
3. **Duplicación:** alta si se vende como «taller» sin acotar «por AT».
4. **Fuente:** `public.folios` + parsers `unidad-taller`.
5. **Helpers:** `expandTallerRows` (JSON); `buildTallerAtWorkbook` = xlsx.
6. **Queries:** SELECT de folios + expansión por unidad/líneas. GET `taller-at-excel` no es transporte de chat.
7. **Intent:** planner mapea a `expense_analysis` + domain `taller_at`.
8. **Tool:** `get_taller_at_analysis`, `declared_not_integrated`.
9. **Executor:** `null` (stub).
10. **Authz:** JWT + `priv_clave` (ficha).
11. **Planta:** folios/`planta_id`.
12. **Side effects del slice JSON:** ninguno. Workbook = descarga.
13. **Dependencia externa:** no.
14. **Riesgo semántico:** **alto** (≠ familia TALLER de M4 ≠ tema AR Taller).
15. **First useful slice:** agregados JSON vía `expandTallerRows` (no workbook).
16. **State after slice:** **PARTIAL**.
17. **Percentage effect:** +2.5 luego; **0.0** ahora. **No se elige por el +2.5.**

Pierde frente a M12: Excel, colisión semántica, frecuencia mensual, y M4 ya enseña TALLER agregado. Abre dominio, pero el criterio vigente premia diagnóstico cotidiano y penaliza Excel/ambigüedad.

### M18 restante — writes / cheques / WhatsApp (PARTIAL)

1. Nuevas: ninguna de consulta. Operar el carro / emitir cheque / notificar.
2. Ya: asignado/seleccionado/disponible/folios/urgentes.
3. Duplica: inercia sobre PARTIAL ya puntuado.
4. Fuente: mismas tablas + writes en `server.js`.
5. Helpers: `linkFoliosToPresupuesto`, `enviarPresupuestoACheques`, `sendWhatsApp` (fuera).
6. Queries: no SELECT nuevo.
7. Intent: `budget_status` ya cableado a lectura.
8. Tool: `get_budget_status` ya available_on_demand.
9. Executor: `loadPresupuestoSemanalForChat` ya existe.
10. Authz: writes más estrictos / canal.
11. Planta: sí.
12. Side effects: **writes / cheques**.
13. Externa: **Twilio/WhatsApp**.
14. Semántica: presupuesto ≠ cheque ≠ pagado.
15. First slice útil de consulta: **ya hecho**.
16. Tras resto canónico: COMPLETE dudoso y clase C.
17. %: no se vuelve a contar PARTIAL; COMPLETE +2.5 dudoso.

**No.** Inercia + writes + canal.

### M4 restante — COMPARAR / Excel (PARTIAL)

1. Nuevas: ninguna de consulta. Reconciliar/escribir COMPARAR; bajar xlsx.
2. Ya: matriz `mes_a` vs `mes_b`.
3. Duplica: el dato de consulta ya está.
4–13. Workbook/POSTs; Excel; writes COMPARAR = C.
14. Medio.
15. No hay slice de consulta restante.
16. COMPLETE dudoso.
17. +2.5 dudoso.

**No.** Inercia + Excel + writes.

### M6 restante — Export / xlsx (PARTIAL)

1. Nuevas: ninguna. Descargar archivo.
2. Ya: listados GASTOS/INVERSIONES.
3. Duplica: el dato ya está en chat.
4–13. `buildCategoriaRangoWorkbook`; Excel.
14. Bajo.
15. No.
16. COMPLETE del propósito Excel.
17. +2.5 dudoso.

**No.** Inercia + Excel.

### M7 — IGF Forecast (PARTIAL)

1. Nuevas: UI/versiones/`sources.igf` en GET context; detalle folios IGF.
2. Ya: anexo on-demand (compromiso, margen) vía `loadIgfArrAnnexForChat`.
3. Duplica: «cómo van los gastos» cotidiano ya se enruta a IGF; no duplica el listado M6 (familias distintas).
4. Fuente: `igf.versions` / `igf.compromiso_lines`.
5. Helpers: `loadIgfCommitSnapshot`, `loadIgfArrAnnexForChat`.
6. Queries: las del annex.
7. Intent: pregunta financiera de planta.
8. Tool: `get_igf_snapshot` on-demand.
9. Executor: `loadIgfArrAnnexForChat`.
10. Authz: `acceso_igf_forecast_kpis`; GA/GV.
11. Planta: sí.
12. Side effects: PATCH IGF = C.
13. No (slice lectura).
14. Medio (IGF ≠ M6 ≠ carro).
15. Marcar `sources.igf` / más detalle de versiones.
16. PARTIAL.
17. 0.0.

Preguntas cotidianas de forecast ya se responden. Incremental neto bajo. **No ganador.**

### M8 — ARR / Forecast provincia (PARTIAL)

1. Nuevas: UI `/arr`, carga Excel, refresh provincia.
2. Ya: proyección, top clientes, motor DICF.
3. Duplica: **M9** (deltas de periodos reales sobre las mismas tablas ARR).
4. Fuente: `arr.ventas_diarias_cliente`, descuentos, forecast.
5. Helpers: `loadArrProyForPlant`, `dashboard-arr-forecast`.
6. Queries: annex + DICF.
7–9. `get_arr_snapshot` / annex.
10. GA bloqueado en commercial_state.
11. Planta/provincia.
12. Carga ARR = C.
13. Upload.
14. Medio (solapa M9).
15. Nada útil de consulta que no esté en annex/M9.
16. PARTIAL.
17. 0.0.

**No.**

### M11 — DICF + acciones + comentarios (PARTIAL)

1. Nuevas: attachments binarios; universo sin límite 40/80.
2. Ya: 40 detalles, 80 comentarios, commercial_state, acciones abiertas.
3. Duplica: más de lo mismo.
4. Fuente: `arr.dicf_*`, `arr.cliente_comentarios`.
5. Helpers: `summarizeDicfContext`, `loadCommercialStateForChat`.
6. Queries: las actuales.
7–9. Tools DICF/commercial_state existen.
10. `acceso_acciones_dicf`; GA restringido.
11. Planta.
12. CRUD DICF = C.
13. No.
14. Medio.
15. Subir límites / attachments (binarios penalizados).
16. PARTIAL.
17. 0.0.

Ya aporta causas/acciones/seguimiento comercial. No es el hueco neto. **No.**

### M20 — Home KPI / Inicio (INDIRECTA)

1. Nuevas: ninguna. Composición de `/`.
2. Ya: M3 KPIs + M7/M11 cuando el chat los activa.
3. Duplica: resumen redundante.
4. Fuente: no tiene fuente nueva (ficha: comparte IGF/DICF/comentarios).
5–13. `app/page.tsx`; no endpoint propio.
14. Medio.
15. Cablear `/` no agrega hechos.
16. INDIRECTA.
17. 0.0.

**No.**

### M2 restante (PARTIAL; EXIT_M2 vigente)

Kanban HTTP, cheque/póliza, PDF/S3, `kanban_flow` inferencial. Sin evidencia nueva que revoque EXIT_M2. Metadata documental ya está. **No.**

### M10 / M17 — WhatsApp / Weekly LD

Canal ≠ conocimiento. Envío = C. Twilio. M10 podría leer narrativa LD, pero no es diagnóstico cotidiano nuevo frente a M9/ARR. **No.**

### M14 — Usuarios admin (NO INTEGRADA)

Permisos/clave. Write = C. Riesgo alto. **No.**

### M15 — Documentos / PDF (NO INTEGRADA)

S3/contenido. Metadata es M2. EXIT_M2. **No.**

### M1 — Health (PARTIAL)

`/health-director-ia` ya. Health de producto nulo para dirección. **No.**

### M0 — Auth (PARTIAL)

Gates, no catálogo de respuesta. **No.**

### M19 — Delta Ingreso AI test (NO INTEGRADA)

Sistema paralelo clase C. WhatsApp. **No.**

---

## Rechecks mandatorios

| Frente | Conclusión |
|---|---|
| M12 | Reevaluado desde cero. Notas = clase nueva (minuta), no adorno. Path SELECT + helper; summarizer ausente. **Ganador.** No se hereda el 2º de 003. |
| M5 | Mejor dominio NO INTEGRADA restante. Pierde por Excel + colisión TALLER/AT/AR. **Segundo.** |
| M7 | Annex cotidiano ya existe. Solapa M6 solo de wording, no de fuente. Incremental bajo. |
| M8 | Duplica M9/DICF. Carga = C. |
| M11 | Reasoning comercial ya existe. Attachments/universo = más de lo mismo. |
| M18 resto | Query hecha. Writes/cheques/WhatsApp = inercia + C. |
| M4 resto | Query hecha. COMPARAR/Excel = inercia. |
| M6 resto | Query hecha. Export = inercia. |
| M20 | Sin fuente nueva. |
| M2 resto | EXIT_M2 vigente. |
| WhatsApp | Canal ≠ conocimiento. |
| M1 / M0 / M14 / M15 / M19 | Poco o nulo valor de dirección, o penalidad S3/C/paralelo. |

---

## Tabla comparativa

| rank | module | current_state | new_executive_questions | executive_value | reasoning_value | incremental_value | frequency | actionability | source_ready | wiring_ready | authz_fit | dependencies | mutation_risk | semantic_risk | first_useful_slice | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **M12 notas** | PARTIAL | minuta de revisión / autor / fecha | **4** | **4** | **3** | diaria/semanal | alta (autor+fecha+cuerpo) | SELECT `revision_notes` + board | tool existe; summarizer **no** | AR actual | no | CRUD C | medio (≠ ítem, ≠ Plaud, ≠ M2) | recorte notas recientes | **PARTIAL** | 0 | **GANADOR** |
| 2 | M5 | NO INTEGRADA | taller por AT | 3 | 2 | 3 | mensual | media | `expandTallerRows` | stub + bloqueo chat | JWT/priv | no | no | **alto** (≠ M4/AR) | query AT | PARTIAL | +2.5 luego; 0 ahora | **segundo** |
| 3 | M7 | PARTIAL | UI/versiones IGF | 2 | 2 | 1 | periódica | media ya | annex | executor annex | IGF | no | PATCH | medio | `sources.igf` | PARTIAL | 0 | no |
| 4 | M11 | PARTIAL | universo/attach | 2 | 3 ya | 1 | periódica | alta ya | summarizers | tools | DICF | no | CRUD | medio | límites | PARTIAL | 0 | no |
| 5 | M8 | PARTIAL | carga/UI ARR | 2 | 2 | 1 | periódica | media ya | annex+DICF | annex | GA | upload | load C | medio (M9) | nada útil | PARTIAL | 0 | no |
| 6 | M18 resto | PARTIAL | writes/cheques/WA | 1 | 0 | 0 | — | C | server writes | query ya hecha | más estricta | **Twilio** | **C** | medio | no | COMPLETE dudoso | no contar PARTIAL | no (inercia) |
| 7 | M4 resto | PARTIAL | xlsx / COMPARAR | 1 | 0 | 1 | rara | C | workbook/POSTs | query ya hecha | igual M4 | Excel | **C** | medio | no | COMPLETE dudoso | +2.5 dudoso | no (inercia) |
| 8 | M6 resto | PARTIAL | xlsx | 1 | 0 | 1 | rara | baja | workbook | query ya hecha | igual M6 | Excel | no | bajo | no | COMPLETE | +2.5 dudoso | no (inercia) |
| 9 | M15 | NO INTEGRADA | PDF/S3 | 3 | 2 | 1 | ocasional | media | `/media` | M2 metadata ya | GV | **S3** | subir | medio | no | PARTIAL | +2.5 | no |
| 10 | M10 | NO INTEGRADA | narrativa LD | 2 | 1 | 1 | semanal | baja | JSON lectura | no | GA/GV | **Twilio** | envío C | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| 11 | M17 | PARTIAL | (canal) | 1 | 0 | 0 | — | nula | Twilio | link existe | tokens | Twilio | bot | medio | nada | PARTIAL | 0 | no |
| 12 | M14 | NO INTEGRADA | permisos | 2 | 0 | 1 | rara | C | admin API | stub | clave | no | **C** | alto | lectura | PARTIAL | +2.5 | no |
| 13 | M1 | PARTIAL | health producto | 1 | 0 | 1 | rara | nula | GET `/health*` | no chat | sin JWT | no | no | medio | tres GET | PARTIAL | dudoso | no |
| 14 | M20 | INDIRECTA | Home | 2 | 0 | 0 | — | nula | M7/M11 | no | igual | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| 15 | M0 | PARTIAL | catálogo permisos | 1 | 0 | 0 | rara | nula | JWT | gates | sí | no | no | alto | — | PARTIAL | 0 | no |
| 16 | M2 resto | PARTIAL | kanban/cheque/PDF | 2 | 1 | 0 | — | baja | EXIT_M2 | slices ya hechos | folio | S3/HTTP | mutaciones C | alto | no | PARTIAL | 0 | no (EXIT) |
| 17 | M19 | NO INTEGRADA | sistema paralelo | 0 | 0 | 0 | — | C | stack propio | no | abierto | WhatsApp | C | alto | no | NO INTEGRADA | 0 | no |

---

## Ranking

Criterio: valor incremental neto + preguntas nuevas + diagnóstico/contexto + frecuencia + hechos + in-process. **No** porcentaje. **No** facilidad sola. **No** continuar M18/M4/M6. **No** heredar el 2º de 003. Penaliza Excel/S3/Twilio/write, stubs y duplicar M2/M3/M4/M6/M9/M18.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M12 notas de revisión** | Única clase cotidiana de contexto de acuerdos que hoy es silencio; SELECT y helper existen; summarizer no |
| **2** | M5 Taller AT | Mejor dominio nuevo; pierde por Excel y semántica TALLER |
| 3 | M7/M11/M8 más profundo | Ya cubren finanzas/comercial on-demand |
| 4 | M18/M4/M6 resto | Inercia; el dato de consulta ya está |
| 5 | M15 / M10 / M17 | S3 / canal |
| 6 | M14 / M1 / M20 / M0 / M2 resto / M19 | Poco o nulo valor de dirección |

---

## Ganador

**M12 — Action Register** (primer slice: notas de revisión, read-only, recortadas).

### Por qué gana

1. Habilita preguntas que **ninguna** fuente actual responde: qué se acordó en la revisión, qué se escribió, quién y cuándo.
2. No es adorno de vencidas. La fuente es otra tabla, anclada a la revisión. El director hoy lista acciones y no puede citar la minuta.
3. Tras M4/M6/M18 el dinero SELECT cotidiano ya está. El hueco que queda con más diagnóstico + frecuencia + actionability es el contexto de la revisión de planta.
4. Fuente física verificada: `arr.action_register_revision_notes`, SELECT-only, in-process, sin Excel/S3/Twilio.
5. Tool y authz de AR ya existen. El hueco es consumo (recorte + summarizer), no invención de dominio.
6. Reevaluación desde cero: 003 lo dejó segundo porque entonces M18 era silencio total de dinero semanal. Ese argumento **ya no aplica**. M12 gana ahora por valor residual, no por ranking previo.
7. **No** se eligió por facilidad: el flip `includeNotes` no es IMPL listo.
8. **No** se eligió por porcentaje: el slice futuro vale **0.0 pp**.

### Preguntas nuevas (si el readiness confirma el recorte)

- ¿Qué se acordó en la última revisión de Action Register de {planta}?
- ¿Qué dicen las notas de la revisión del {fecha}?
- ¿Quién escribió las notas y cuándo?

**No** las habilita: M4, M6, M18, IGF, Taller AT, history M2, comentarios de folio/cliente, bitácora/Plaud.

### Primer slice

```text
pregunta minuta / notas de revisión AR
  → intent action_status (o wording dedicado que fije el readiness)
  → tool get_action_register_context
       → JWT; planta autorizada; includeNotes con recorte
       → SELECT arr.action_register_revision_notes
       → summarizer de notas (body, author_name, created_at, revision)
       → no attachments binarios; no CRUD; no atribuir nota a un ítem
  → evidencia; openai_called false
```

No HTTP interno. No Excel evidencias. No Plaud como sustituto. No history M2.

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M12 | PARTIAL | **PARTIAL** |
| Global | **50.0%** | **50.0%** (0.0 pp) |

COMPLETE de M12 **no** se otorga (evidencias/CRUD siguen fuera). Esta priorización: **0.0 pp**.

### Riesgos

- Tratar la nota de revisión como nota del ítem.
- Confundir con bitácora/Plaud, history M2 o comentarios DICF/folio.
- Volcar todas las notas de todas las revisiones sin recorte.
- Incluir attachments binarios o export de evidencias.
- Afirmar causa estructurada («está vencida porque la nota dice…») si el texto no lo soporta.
- CRUD AR o «ya se actualizó el tablero».

### Dependencias

`arr.action_register_revision_notes`, `arr.action_register_revisions`, `buildActionRegisterBoardPayload`. Sin S3, Excel ni Twilio. Authz = la de AR actual.

### Gates del IMPL futuro

G2/G3 no (PARTIAL previsto; no se toca contrato). G1 nuevo para el readiness y, si aplica, para el IMPL.

---

## Segundo lugar

**M5 — Taller por AT** (primer slice hipotético: query JSON por unidad AT).

### Por qué pierde

Abre un dominio NO INTEGRADA y `expandTallerRows` existe. Pierde porque:

1. El módulo canónico es **Excel**; el path natural empuja xlsx.
2. Colisión semántica alta: familia TALLER de M4 vs unidad AT vs tema AR «Taller».
3. Frecuencia mensual, no diagnóstico diario de planta.
4. Tras M4, el agregado TALLER ya es visible; M5 añade desglose por AT, no una clase de pregunta de dirección equivalente a la minuta.
5. El +2.5 pp **no** es criterio. Si lo fuera, M5 ganaría de forma ilegítima.

No se elige M12 como ganador «porque 003 lo dijo». M12 gana ahora; M5 es el mejor *otro* frente.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001`

Hay que fijar: nota = minuta de **revisión** (no de ítem); recorte (última revisión o top-N notas); no binarios; no Plaud/history M2/comentarios; summarizer nuevo o extensión explícita; wording planner; authz idéntica a AR. No IMPL directo: el helper carga notas, el chat no las consume.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
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
On branch architecture/director-ia-global-next-module-prioritization-004
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md
```

Solo los dos archivos autorizados.

## STOP
