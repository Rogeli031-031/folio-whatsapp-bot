# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008"
outcome: "DONE_PENDING_REVIEW"
winner: "TRANSVERSAL — financial_diagnosis evidence assembly"
winner_type: "transversal"
winner_scope: >
  Cablear en chat legado los loaders ya declarados por planner/tool plan
  para financial_diagnosis (get_igf_snapshot / get_arr_snapshot /
  get_delta_sales / get_delta_discount / get_delta_income), con provenance
  separado; sin join; sin causalidad; sin IES; sin Reasoning Run; sin COMPLETE
second_place: "M10"
second_type: "módulo"
second_scope: "narrativa weekly discount LD read-only; no scheduler; no Twilio/WhatsApp; no COMPLETE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"
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
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md … 007.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001.md"
  - "lib/director-ia-planner.js (lectura)"
  - "lib/director-ia-tools.js / director-ia-tool-orchestrator.js (lectura)"
  - "lib/director-ia-chat.js / director-ia-context.js (lectura)"
  - "lib/director-ia-igf-arr.js / director-ia-m9-deltas.js (lectura)"
  - "lib/weekly-discount-narrative.js / weekly-discount-ld-scheduler.js (lectura)"
  - "lib/director-ia-eks.js (lectura; no se reabre)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A para el slice ganador (wiring de tools ya declarados; no reabre 04/05)."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia en esta tarea ni tras el slice futuro (M7/M8/M9 ya puntuados)."
  - "IES v1.0 y Reasoning Engine v1.0 siguen congelados con runtime pendiente. No se implementan aquí."
```

## Resumen ejecutivo

**Ganador (transversal): ensamblaje de evidencia de `financial_diagnosis`.**

El planner ya declara que ese intent usa `arr` + `igf` + `delta_venta` + `delta_descuento` + `delta_ingreso`. El tool plan lista `get_igf_snapshot`, `get_arr_snapshot` y los tres `get_delta_*`. El chat **no despacha ese plan**: construye el tool plan solo para debug y ejecuta **un** loader por early-return, o cae a OpenAI con anexo IGF/ARR. M9 no entra en el diagnóstico.

No se inventó una capa. No se reabre IES/RE. El patrón físico ya existe (anexo IGF). Falta **wiring** de loaders ya SELECT-only, con provenance separado.

**No gana un módulo nuevo** porque, tras M5, los dominios silenciosos restantes o duplican ARR (M10) o son admin/S3/Twilio/Excel/writes.

**Segundo: M10** — narrativa weekly discount read-only. Reevaluado desde cero; **no** por haber sido segundo en 007. Pierde: misma evidencia ARR que M9; actionability real = Twilio.

Esta tarea **no cambia** 10.5 / 20 = **52.5%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-008` (≠ `main`).
- HEAD: `c50890af Merge branch 'docs/director-ia-m5-capability-matrix-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, contratos, commit, push, merge.

---

## Baseline 52.5%

| Campo | Valor |
|---|---|
| M0–M20 | **10.5 / 20 = 52.5%** |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, M4, M5, M6, M7, M8, M11, M12, M17, M18 (6.0) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M10, M14, M15, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. Esta tarea **no cambia estados ni porcentaje**.

Nombres canónicos: M4=Clasificación+COMPARAR; M5=Taller por AT; M7=IGF Forecast; M8=ARR; M11=DICF+acciones+comentarios; M12=Action Register; M14=Usuarios admin; M15=Documentos/PDF; M18=Presupuestos semanales.

Profundidad reciente (no continuar por inercia): M2 slices, M4 query, **M5 query**, M6 query, M7 composición, M9 deltas, M11 expediente, M12 notas, M18 carro.

---

## Capacidad actual

Director IA **describe en silos** (un intent → un loader o un foco OpenAI):

- Folios M2 (estatus/historial/metadata)
- KPIs/proyectos M3
- Comparativo M4
- Taller por unidad M5
- GASTOS/INVERSIONES M6
- Carro M18
- Deltas M9 (solo si el intent es `delta_*`)
- Duplicados M16
- AR + notas M12
- Expediente M11 (cliente único)
- Listas commercial_state
- Anexo IGF/ARR **con composición de 1 fila** (si regex financiero)
- Bitácora/entidades

**No** responde en un mismo turno: diagnóstico financiero que **muestre a la vez** composición IGF, snapshot ARR y deltas de periodos reales, cada uno con su procedencia.

---

## Auditoría IES / Reasoning Engine (sin reabrir)

| Contrato | Estado físico |
|---|---|
| `04-IES-STANDARD.md` v1.0 | Congelado. **Runtime pendiente.** El IES no se proyecta en chat. |
| `05-REASONING-ENGINE.md` v1.0 | Congelado. **Runtime pendiente.** RE no ejecuta tools ni consulta loaders. Entrada única = IES. |
| Índice | Chat legado **fuera** del N5 oficial. Fases 1–3 = entrada (catálogo / Plan / Tool Plan). Tool Orchestrator **declara y no ejecuta**. |
| EKS | Runtime mínimo (`lib/director-ia-eks.js`). No es IES. No es RE. Chat no ensambla Knowledge Bundle N1–N4. |

Pregunta contractual: ¿el hueco exige reabrir 04/05?

**No, para el ganador.** El índice ya admite «Tool Execution Results (futuro / parcial)». El chat ya yuxtapone anexo IGF con contexto AR. Completar loaders **ya listados** en el tool plan de `financial_diagnosis` es wiring de Fases 2–3 / chat legado, no un IES ni un Reasoning Run.

Implementar runtime de IES+RE como “capa transversal” **sí** exigiría realización de contratos congelados (G2/G3/G8, almacén Run, firma). **Penalizado. No es el ganador. No se propone.**

---

## Gaps transversales auditados (ejemplos pedidos, no supuestos)

### 1) ¿Puede una pregunta usar hoy M3 + M9 + M11/M12 a la vez?

**No.** Chat: early-return exclusivo por `directorIaPlan.intent` (`dashboard_kpis` / `delta_*` / `expediente_comercial` / `revision_notes` / …). Planner: un solo intent.

Claves: M3 y M9 se anclan en `planta_id` (+ periodo M9). M11 exige `cliente_key` de **un** cliente. No hay FK planta-KPI → expediente. Armar ese pack **inventaría un join**. **No es candidato.**

### 2) ¿M4/M6 + acciones M12 sin inventar join?

**No hay clave física.** Folios TALLER/GASTOS (`public.folios.categoria`) ≠ tema AR «Taller». Yuxtaponerlos sería colisión lingüística. **No es candidato.**

### 3) ¿IGF M7 + deltas M9 con provenance separado?

**Planner sí; runtime no.**

```text
INTENT_DOMAINS.financial_diagnosis
  = ["arr", "igf", "delta_venta", "delta_descuento", "delta_ingreso"]

DOMAIN_TO_TOOLS
  igf → get_igf_snapshot          executor loadIgfArrAnnexForChat
  arr → get_arr_snapshot          executor loadIgfArrAnnexForChat
  delta_* → get_delta_*           executors loadDelta*ForChat
```

Chat (`lib/director-ia-chat.js`):

```text
buildDirectorIaToolPlan(...)  // debug only
// "el resto de tools no se despacha de forma genérica"
if (intent === "delta_sales") → solo M9; return
// no hay rama financial_diagnosis
→ OpenAI
  wantFinancialKpi → igf_arr_focused (solo annex)
  // no llama loadDeltaVenta/Descuento/IngresoForChat
```

Clave física defendible: `planta_id` + mes calendario. Objetos **distintos** (fila `igf.compromiso_lines` vs periodos reales ARR). Provenance separado = permitido. Unirlos como un hecho o como causa = prohibido.

**Este es el gap transversal físico. Compite.**

### 4) ¿M18 + folios M2?

M18 ya lee `presupuesto_folios`. El resto (cheque/póliza/kanban HTTP) está excluido por side effects. **No es candidato.**

### 5) ¿Planner/tool path para diagnóstico cross-domain?

Declarativo **sí** (`financial_diagnosis`, `plant_diagnosis`). Ejecución **no**. `can_execute_all` existe y no se usa.

### 6) ¿La arquitectura ya lo permite pero el runtime no lo cablea?

**Sí, para financial_diagnosis.** Fase 3 declara tools ejecutables; chat no las corre en conjunto.

### 7) ¿Haría falta contrato nuevo o solo wiring?

**Solo wiring** para el slice ganador (mismo patrón que el annex). **Contrato nuevo** solo si se pretendiera IES+RE; eso se rechaza.

`plant_diagnosis` declara AR+DICF+bitácora+arr+igf+commercial_state, **no** M3 ni M9 ni expediente. El context already-on ya cubre AR/DICF/bitácora. Meter M3/M9 en «cómo va la planta» cambiaría semántica de producto (hoy AR). **No gana.**

---

## Evidence connectivity — qué cuenta y qué no

| Conexión | ¿Física? | Decisión |
|---|---|---|
| `financial_diagnosis` → IGF + ARR + M9 | Sí: planner + tools + loaders; chat no junta | **Candidato** |
| GET `sources.igf/arr/commercial_state` siempre false | Hallazgo Parte 8; no abre diagnóstico nuevo | No ganador |
| M3 + M11 | Sin `cliente_key` compartido | Inventaría join |
| M4/M6 + M12 | Sin FK | Inventaría correlación |
| IGF `gasto_kg` ↔ M6/M18 | Sin FK (ya vetado en 006/007) | Prohibido |
| IES fact bank multi-fuente | Contrato sí; runtime no | Reabrir 04/05; penalizado |

---

## Rechecks de módulos (no COMPLETE)

### M10 — Weekly discount LD (NO INTEGRADA) — segundo

Definición canónica: narrativa semanal de descuento + envío WhatsApp programado.

| Pregunta | Hecho |
|---|---|
| Evidencia nueva | **No de tabla.** Misma ARR (`arr.descuentos_diarios_cliente` + proyección). Aporta **ventana semanal**. |
| Duplica M9/ARR | Alta. M9 ya compara descuento entre YYYY-MM reales. Annex ya imprime desc $/kg. |
| Twilio | Scheduler `weekly-discount-ld-scheduler.js` llama `sendWhatsApp`. Producto = canal. |
| Slice read-only | Sí: `buildWeeklyDiscountNarrative` + `POST /weekly-discount-lectura` (dashboardAuth). No send. |
| Preguntas nuevas | «¿Cómo va el descuento **esta semana**?» Parcialmente nueva (grano intra-mes). |

No se eligió por ranking 007. Queda segundo porque es el único dominio **silencioso** con helper SELECT-ready y pregunta operativa. Pierde el oro: no conecta evidencia nueva; el valor fuerte es Twilio (penalizado).

### M8 — ARR restante (PARTIAL)

Annex ya imprime `proy_venta_ton` / `proy_desc_kg` y top desc. M9 COMPLETE compara periodos reales. Resto = UI `/arr` y `POST /arr/load`. **Sin campo oculto.** No.

### M20 — Home KPI (INDIRECTA)

`frontend-dashboard/app/page.tsx` reusa IGF mini + DICF + comentarios. **No** resume M3. **No** es priorización cross-domain. Cablear `/` no crea evidencia. Sigue INDIRECTA. No.

### M5 restante (PARTIAL)

Query Taller por `public.folios.unidad` ya integrada. Resto = Excel/workbook/duplicados. **No inercia.** Penalizado.

### M7 / M11 / M12 restantes (PARTIAL)

Composición IGF, expediente y notas ya profundizados. Resto = UI/PATCH/Excel, attachments/causa, CRUD/S3. **No inercia.**

### M4 / M6 / M18 restantes (PARTIAL)

COMPARAR/xlsx, Export, writes/cheques/WhatsApp. Penalizados.

### M2 restante (PARTIAL)

Cheque/póliza/kanban HTTP/PDF. Side effects / S3. No.

### M14 / M15 / M17 / M1 / M0 / M19

Admin (riesgo alto); PDF/S3 (M2 ya metadata); canal Twilio; health de producto; catálogo permisos; IA paralela. Valor ejecutivo de dirección nulo o C.

---

## Candidatos — mapa obligatorio

### T1 — financial_diagnosis evidence assembly (TRANSVERSAL) — **ganador**

| Campo | Contenido |
|---|---|
| Preguntas nuevas | ¿El movimiento del ingreso/utilidad aparece en la **composición IGF**, en el **snapshot ARR** y/o en los **deltas M9 de periodos reales**? ¿Difieren esos objetos? |
| Ya responde | IGF annex (margen/venta/desc/HG + composición); M9 solo si el wording es `delta_*` exclusivo |
| Duplica | Si se fusionan IGF y M9 en un número. El slice debe **separarlos** |
| Reasoning nuevo | Diagnóstico con evidencia yuxtapuesta, no descriptiva de un solo silo. **No** causa |
| Evidencia que conecta | Tools ya declarados; no hay join de filas |
| Clave física | `planta_id` + YYYY-MM; provenance por fuente |
| NO afirmar | Causa de mercado; responsable; «IGF explica el delta M9»; un KPI único |
| Source/helper | `loadIgfArrAnnexForChat`; `loadDeltaVenta/Descuento/IngresoForChat` |
| Intent/tool/executor | `financial_diagnosis` → tools arriba; orchestrator no ejecuta hoy |
| Context builder | Hoy `igf_arr_focused` **excluye** M9. GET context no marca `sources.igf/arr` |
| Authz | IGF/ARR: GA 403. M9: GA restringido. Fail-closed **por fuente**, no cruzar plantas |
| Side effects | Ninguno (SELECT). No PATCH IGF. No forecast write |
| External | No Twilio/S3/Excel |
| Contract impact | **Ninguno** si no se implementa 04/05. Chat legado sigue legado |
| First slice | Ejecutar el tool plan de `financial_diagnosis` in-process; bloques etiquetados; truncar; no causa |
| State after | M7/M8 PARTIAL, M9 COMPLETE **sin cambio**. Global **52.5%** |
| % | **0.0** |

### M10 — Weekly LD (NO INTEGRADA) — **segundo**

| Campo | Contenido |
|---|---|
| Preguntas nuevas | Descuento **esta semana**; narrativa LD |
| Ya responde | M9 mensual; annex desc |
| Duplica | Alta con M9/ARR |
| Reasoning | Ventana intra-mes |
| Clave | planta ARR + rango de fechas de semana |
| Source | `buildWeeklyDiscountNarrative` |
| Intent/tool | No cableado |
| Authz | dashboardAuth del POST lectura |
| Side effects | Scheduler WhatsApp **fuera del slice** |
| Contract | N/A |
| First slice | Narrativa RO; no send |
| State after | PARTIAL |
| % | +2.5 **luego** (no decide) |

### T-rejected — pack M3+M9+M11

Inventaría cliente para KPIs de planta. Sin planner. No.

### T-rejected — runtime IES+RE

Contratos congelados, runtime pendiente, G8. Capa nueva. No.

### Módulos restantes

M8/M20/M5-resto/M7-resto/M11-resto/M12-resto/M4/M6/M18-resto/M2-resto/M14/M15/M17/M1/M0/M19: ver rechecks. No ganan.

---

## Tabla comparativa

Ponderación 008: **executive + reasoning + evidence connectivity** (CRITICAL) > new_domain / actionability / incremental (VERY_HIGH) > frequency (HIGH) > path (MEDIUM) > risk (MEDIUM) > **percentage (LOW)**. No ranking previo. No facilidad. No inercia M5/M7/M11/M12/M18/M4/M6. No elegir M10 por ser segundo en 007.

| rank | candidate | type | current_state | new_questions | executive_value | reasoning_value | evidence_connectivity | new_domain_value | actionability | incremental_value | source_ready | wiring_ready | contract_impact | dependencies | risk | first_slice | state_after_slice | percentage_effect | decision |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | financial_diagnosis assembly | transversal | n/a (M7/M8 P, M9 C) | diagnóstico multi-objeto | **5** | **5** | **5** | 1 | 2 | **5** | loaders sí | plan sí / exec no | **ninguno** (no 04/05) | planta + mes | semántica ≠ causa | ejecutar tools declarados | sin cambio de módulo | **0.0** | **ganador** |
| 2 | M10 Weekly LD | módulo | NO INTEGRADA | descuento esta semana | 3 | 3 | 2 | **4** | 2 | 2 | narrativa sí | no | N/A | ARR + **Twilio** | duplica M9 | narrativa RO | PARTIAL | +2.5 luego | **segundo** |
| 3 | IES+RE runtime | transversal | runtime pendiente | hipótesis N5 | 4 | 4 | 4 | 0 | 1 | 4 | contrato sí | **no** | **G2/G3/G8** | IES+Run | capa nueva | no | n/a | 0 | rechazado |
| 4 | M8 resto | módulo | PARTIAL | UI/carga | 1 | 1 | 1 | 1 | 1 | 0 | annex/M9 | sí | N/A | ARR UI | bajo | nada oculto | PARTIAL | 0 | no |
| 5 | M5 resto | módulo | PARTIAL | Excel/duplicados | 1 | 0 | 1 | 0 | 1 | 0 | query hecha | sí | N/A | workbook | inercia | no | PARTIAL | 0 | no |
| 6 | M15 | módulo | NO INTEGRADA | PDF/S3 | 2 | 1 | 1 | 2 | 1 | 1 | `/media` | M2 metadata | N/A | **S3** | alto | no | PARTIAL | +2.5 | no |
| 7 | M7 resto | módulo | PARTIAL | UI/PATCH | 1 | 1 | 1 | 0 | 0 | 0 | composición hecha | sí | N/A | UI | inercia | no | PARTIAL | 0 | no |
| 8 | M11/M12 resto | módulo | PARTIAL | attachments/CRUD | 1 | 1 | 1 | 0 | C | 0 | slices hechos | sí | N/A | S3 | inercia | no | PARTIAL | 0 | no |
| 9 | pack M3+M9+M11 | transversal | — | «todo a la vez» | 3 | 2 | 0 | 0 | 1 | 1 | loaders sí | no | N/A | sin FK cliente | **join inventado** | no | — | 0 | rechazado |
| 10 | M4/M6+M12 | transversal | — | gastos vs acciones | 2 | 2 | 0 | 0 | 1 | 1 | sí | no | N/A | sin FK | correlación | no | — | 0 | rechazado |
| 11 | M2 resto | módulo | PARTIAL | cheque/PDF | 2 | 1 | 1 | 1 | 1 | 0 | slices | sí | N/A | HTTP/S3 | alto | no | PARTIAL | 0 | no |
| 12 | M4/M6/M18 resto | módulo | PARTIAL | Excel/write/canal | 1 | 0 | 1 | 0 | C | 0 | query hecha | sí | N/A | Excel/Twilio | penalizado | no | PARTIAL | 0 | no |
| 13 | M20 | módulo | INDIRECTA | Home | 1 | 0 | 2 | 0 | 0 | 0 | M7/M11 | no | N/A | página `/` | nulo | no | INDIRECTA | 0 | no |
| 14 | M17 / M14 / M1 / M0 / M19 | módulo | P / NI | canal/admin/health/paralelo | 0–1 | 0 | 0 | 0–1 | C | 0 | varios | no | N/A | Twilio/admin | alto | no | — | 0/+2.5 | no |

---

## Ranking

| # | Frente | Tipo | Por qué |
|---:|---|---|---|
| **1** | **financial_diagnosis assembly** | transversal | Gap físico planner/tools vs chat; conecta hechos ya integrados; 0.0 pp |
| **2** | M10 Weekly LD | módulo | Único dominio silencioso con helper; pierde por ARR ya vista + Twilio |
| 3 | IES+RE runtime | transversal | Arquitectura lo describe; runtime = reabrir congelados |
| 4 | M8 / restos M5/M7/M11/M12 | módulo | Sin oculto o inercia |
| 5 | Packs M3+M11 / M4+M12 | transversal | Join/correlación inventados |
| 6 | M15 / M2 / Excel-write / M20 / admin / canal | módulo | S3 / HTTP / poco valor de dirección |

---

## Ganador

**Tipo: transversal.** Ensamblaje de evidencia de `financial_diagnosis` (M7 composición/annex + M8 snapshot + M9 deltas), wiring only.

### Preguntas nuevas

- ¿El diagnóstico de caída/utilidad/margen tiene **los tres objetos** a la vista, cada uno etiquetado?
- ¿M9 (periodos reales) y IGF (compromiso de 1 fila) **discrepan** sin que el modelo los fusione?

No habilita: «la causa fue…», «el responsable es…», «el delta M9 es la línea IGF».

### Reasoning nuevo

Pasa de una respuesta de un silo (annex **o** M9) a un diagnóstico con **evidencia conectada y no fusionada**. Hipótesis, si las hay, siguen prohibidas como hecho (RE no existe; el slice no las crea).

### Evidence connectivity

Planner y `DOMAIN_TO_TOOLS` ya listan las fuentes. Loaders existen. Chat no las ejecuta juntas. Clave: `planta_id` + mes. Provenance por tool.

### Por qué gana

1. Tras M5, el hueco ejecutivo mayor **no** es otro dominio silencioso débil; es que el intent de diagnóstico **ya existe** y está sub-evidenciado.
2. Gap **físico** en planner, tool orchestration (declarado, no ejecutado), context assembly (`igf_arr_focused` excluye M9) y provenance (hoy un bloque o un early-return).
3. Reasoning Run oficial **no existe**; no se inventa. El ganador no es N5.
4. No reabre 04/05. G2/G3 **N/A**.
5. SELECT-only, in-process, authz fail-closed por fuente (GA 403 IGF y M9).
6. **No** se eligió por porcentaje: el slice vale **0.0 pp**.
7. **No** se continúa M7 por inercia (no UI/PATCH). Se usa M7/M9 **ya integrados**.
8. **No** se eligió M10 por ranking 007.

### Por qué pierde el segundo

M10 abre dominio, pero la evidencia es ARR ya usada por M9. El envío WhatsApp (valor de producto) se penaliza. No arregla el diagnóstico multi-fuente.

### Primer slice

```text
«por qué cayó el ingreso» / «diagnóstico financiero»
  → intent financial_diagnosis (ya)
  → tool plan (ya: igf + arr + delta_*)
  → ejecutar loadIgfArrAnnexForChat + loadDelta*ForChat in-process
  → bloques con source/tool/periodo propios
  → no fusionar números; no causa; no FK a M6/M18
  → no IES; no Reasoning Run; no dispatcher genérico de todos los intents
  → fail-closed por fuente; sin cross-planta
```

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M7 / M8 | PARTIAL | **PARTIAL** |
| M9 | COMPLETE | **COMPLETE** |
| Global | **52.5%** | **52.5%** (0.0 pp) |

### Contract / gate impact

| Gate | Slice ganador |
|---|---|
| G2 | N/A (no edita `docs/director-ia/`) |
| G3 | N/A (no crea 04/05 runtime ni canal) |
| G8 | N/A (no calibra materiality/firma) |

Si un IMPL futuro pretendiera emitir IES o Reasoning Result: **STOP** y pedir G2/G3. Esa no es esta NEXT_TASK.

### Riesgos

- El LLM traduzca yuxtaposición a causa.
- Fusionar ingreso IGF con ingreso M9.
- Despachar **todos** los intents (M3+M11+…) — fuera de alcance.
- Reusar `wantFinancialKpi` sin M9, o `delta_*` early-return que **oculta** IGF.
- Authz: una fuente 403 no debe filtrar otra planta «por ayudar».
- Traer GET context `sources.*` como si fuera este slice (hallazgo distinto).

### Dependencias

`lib/director-ia-planner.js` (`financial_diagnosis`), `lib/director-ia-tools.js` / orchestrator, `loadIgfArrAnnexForChat`, `loadDelta*ForChat`, authz IGF y M9 vigentes. Sin S3/Excel/Twilio. Sin `04`/`05` runtime.

---

## Segundo lugar

**M10 — Weekly discount LD**, narrativa read-only; no send.

Reevaluado: helper real; pregunta intra-mes; slice RO posible. Pierde por duplicación ARR/M9 y canal Twilio. **No** se eligió por ser segundo en 007.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001`

Fijar: qué tools del plan se ejecutan (igf/arr/delta_*); orden y recorte; etiquetas de provenance; qué pasa si una fuente 403 y otra OK; no early-return `delta_*` que robe el diagnóstico; no dispatcher universal; no IES; no Reasoning Run; no causa; no join M6/M18/M11; no COMPLETE de ningún módulo. No IMPL directo: los loaders existen, el contrato de exposición conjunta no.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No se reabrió IES ni Reasoning Engine.
- No commit / push / merge.
- No se cambió 52.5%.
- No se autorizó ni ejecutó la NEXT_TASK.

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-global-next-module-prioritization-008
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md
```

Solo los dos archivos autorizados.

## STOP
