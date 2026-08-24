# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009"
outcome: "DONE_PENDING_REVIEW"
winner: "TRANSVERSAL — plant_diagnosis evidence assembly"
winner_type: "transversal"
winner_scope: >
  Cablear el tool plan ya declarado de plant_diagnosis
  (action_register + dicf + bitacora + arr + igf + commercial_state)
  con provenance separada; sin M9; sin M3; sin join inventado;
  sin causalidad; sin IES; sin Reasoning Run; sin COMPLETE
second_place: "M10"
second_type: "módulo"
second_scope: "narrativa weekly discount LD read-only; no scheduler; no Twilio/WhatsApp; no COMPLETE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md … 008.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
  - "lib/director-ia-planner.js / tools / orchestrator / chat / context (lectura)"
  - "lib/director-ia-financial-diagnosis.js / igf-arr / m9-deltas (lectura)"
  - "lib/weekly-discount-narrative.js / weekly-discount-ld-scheduler.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A para el slice ganador (wiring de tools ya declarados; no reabre 04/05)."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia en esta tarea ni tras el slice futuro."
  - "No es continuación de financial_diagnosis: otro intent, otras fuentes, sin M9."
```

## Resumen ejecutivo

**Ganador (transversal): ensamblaje de evidencia de `plant_diagnosis`.**

`financial_diagnosis` ya junta IGF + ARR + M9. Esa pregunta financiera dejó de ser el cuello de botella. El hueco ejecutivo que queda es **«cómo va la planta / qué riesgos hay»**.

El planner ya declara:

```text
plant_diagnosis → action_register, dicf, bitacora, arr, igf, commercial_state
```

El chat **no ejecuta ese plan**. Carga el GET context (AR + DICF + bitácora + comentarios) y responde con OpenAI. No carga IGF/ARR ni listas `commercial_state` salvo regex distintos. M9 **no** está en el mapa y **no** debe meterse (eso sería inercia de financial_diagnosis).

Clave física: `planta_id`. Sin join inventado. Provenance separada. Sin causalidad. Sin IES/N5.

**Segundo: M10** — narrativa weekly discount read-only. Reevaluado desde cero; **no** por haber sido segundo en 007/008. Grano intra-mes real; duplica tablas ARR; el valor fuerte del producto es Twilio (penalizado).

Esta tarea **no cambia** 10.5 / 20 = **52.5%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-009` (≠ `main`).
- HEAD: `583d7666 Merge branch 'docs/director-ia-financial-diagnosis-evidence-assembly-sync-001'`.
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

Recién cerrado (no repetir): `financial_diagnosis` = IGF + ARR + M9, provenance, 1 OpenAI, 0.0 pp.

Profundidad reciente (no inercia): M5, M7, M11, M12, M18.

---

## Current capability map

Director IA **describe por intent exclusivo**:

| Pregunta tipo | Qué entra hoy |
|---|---|
| «por qué cayó el ingreso» | **IGF + ARR + M9** (financial_diagnosis) |
| «cómo cambió venta/descuento/ingreso» | un delta M9 |
| «cómo va IGF / ARR» | annex |
| «cómo va la planta / riesgos / diagnóstico» | AR + DICF + bitácora (context). **No** IGF/ARR. **No** commercial_state lists |
| «dejaron de comprar» | commercial_state |
| expediente de un cliente | M11 dossier (sin bitácora) |
| folios / carro / taller / gastos | silos M2/M18/M5/M6 |

El director que pregunta la situación de planta **no** ve el pack que el planner ya nombró.

---

## Reasoning gaps

Tras financial_diagnosis, el reasoning financiero puntual existe. El reasoning **de planta** sigue siendo descriptivo de Action Register (top vencidas + JSON de context). No puede señalar tensiones etiquetadas entre:

- acciones vencidas (AR)
- listas comerciales (dejaron/disminuyeron)
- snapshot IGF/ARR

sin que el usuario cambie de pregunta. **No** es causa. **No** es N5.

IES/RE runtime: contratos congelados. Reabrir 04/05 penalizado. **No es candidato.**

---

## Transversal gaps (auditados, no supuestos)

### 1) plant_diagnosis multi-source — **compite; gana**

Planner `INTENT_DOMAIN_MAP.plant_diagnosis` = AR + DICF + bitácora + arr + igf + commercial_state.

Tools: `get_action_register_context`, `get_dicf_context`, `get_bitacora_context`, `get_arr_snapshot`, `get_igf_snapshot`, `get_commercial_state`. Ejecutores nombrados y read-only.

Chat: **no hay rama** `intent === "plant_diagnosis"`. Cae a OpenAI. `isPlantDiagnosticQuestion` arma un prefijo de AR (`buildPlantDiagnosticUserPrefix`). `shouldAttachIgfArrAnnex("cómo va la planta")` es false. `isCommercialStateListQuestion` es false.

AR/DICF/bitácora **ya** están en `buildDirectorIaContextPayload`. Falta cargar IGF/ARR y commercial_state **en esa misma corrida**, bloques etiquetados.

Clave: `planta_id`. No se añade M9 ni M3 (no están en el mapa; M9 ya vive en financial_diagnosis).

### 2) commercial diagnosis multi-source — **no**

`client_analysis` declara DICF + comentarios + bitácora + entidades + arr. M11 **prohibió** bitácora en el expediente (sin join físico; no unir por nombre). Meter bitácora + dossier **inventaría join**. Expediente ya trae fila `dicf_cliente_mes`. **No es candidato.**

### 3) folio + budget + actions — **no**

M18 ya lista `presupuesto_folios`. Folio M2 y acciones M12 no comparten FK con el carro. Cheque/póliza/kanban HTTP siguen con side effects. **No.**

### 4) priorización ejecutiva cross-domain — **no como capa nueva**

«Qué atender esta semana» **es** `plant_diagnosis` si se ensamblan los bloques ya mapeados. Una capa abstracta de scoring cross-domain **no** tiene función ni contrato. **No.**

### 5) pack M3+M9+M11 — **no**

Sin `cliente_key` en KPIs de planta. Inventaría join. 008 vigente.

### 6) M4/M6 + M12 — **no**

`public.folios.categoria` ≠ tema AR. Correlación lingüística.

---

## Hidden evidence

| Dato | ¿Cargado? | ¿Lo ve el reasoning? | ¿Material? |
|---|---|---|---|
| AR board / DICF / bitácora / comentarios | sí (GET context) | sí | ya usado |
| `includeNotes: false` | notas existen on-demand M12 | no en board | no: ya hay intent `revision_notes` |
| `EMPTY_SOURCES.igf/arr/commercial_state` | chat sí / GET no | hallazgo Parte 8 | no abre pregunta nueva |
| IGF composición | annex + financial_diagnosis | sí si se pregunta | cerrado |
| `buildWeeklyDiscountNarrative` | dashboard/scheduler | **no** en Director IA | **sí** (grano semana) → M10 |
| `presupuesto_folios` | M18 | sí si `budget_status` | no oculto |

Solo cuenta M10 como evidencia oculta material.

---

## M10 — reevaluación desde cero

Definición canónica (matriz): **narrativa semanal de descuento + envío WhatsApp programado.**

| Pregunta | Hecho físico |
|---|---|
| Fuente | `arr.descuentos_diarios_cliente` + kg `arr.ventas_diarias_cliente` + proyección `venta-proyeccion-mes`; ventana **fecha a fecha** (MTD / semana), no par YYYY-MM M9 |
| Helper | `buildWeeklyDiscountNarrative` (`lib/weekly-discount-narrative.js`) |
| Endpoint RO | `POST /api/dashboard/weekly-discount-lectura` (`dashboardAuthMiddleware`) |
| Qué duplica ARR/M9 | **Tablas.** M9 compara dos meses. Annex imprime desc $/kg de un mes. financial_diagnosis ya muestra ARR+M9 **mensual** |
| Qué aporta de nuevo | **Grano intra-mes** + vs proyección + narrativa LD + cliente de mayor impacto en la ventana |
| Twilio | `weekly-discount-ld-scheduler.js` llama el helper y envía WhatsApp. Producto canónico = canal. **Fuera del slice RO** |
| Slice read-only | Sí: helper + POST lectura. Sin `sendWhatsApp` |
| Pregunta nueva | «¿Cómo va el descuento **esta semana** vs proyección?» |
| Actionability | Media sin envío; alta solo con Twilio (penalizado) |
| Frecuencia | Semanal (scheduler lunes) |

No se eligió por ranking 007/008. Sigue siendo el único **módulo silencioso** con helper SELECT-ready. Pierde el oro: no conecta evidencia nueva de otro dominio; financial_diagnosis ya cubrió el pack mensual.

---

## M8 — qué queda después de ARR + M9 + financial_diagnosis

Annex: `proy_venta_ton` / `proy_desc_kg` / top desc. M9: deltas mensuales. financial_diagnosis: bloque ARR junto a IGF y M9.

Resto canónico: UI `/arr`, `POST /api/arr/load`. **Sin campo de chat oculto.** Incremental ≈ 0. No.

---

## Rechecks de módulos (no COMPLETE)

### Recientes — solo si hueco NUEVO y MATERIAL

| Módulo | Resto | ¿Hueco nuevo material? |
|---|---|---|
| M5 | Excel/workbook/duplicados | no (inercia + Excel) |
| M7 | UI/PATCH/overlay/recálculo | no; composición y financial_diagnosis ya profundizaron lectura |
| M11 | attachments/Excel/bitácora/causa | no; bitácora en expediente = join prohibido |
| M12 | CRUD/S3; `includeNotes` | no; notas ya on-demand |
| M18 | writes/cheques/WhatsApp | no (C) |

### Otros

| Módulo | Veredicto |
|---|---|
| M1 | Health de producto (`/health`, `/health-db`) no es pregunta directiva. No |
| M2 resto | Cheque/póliza/kanban HTTP/PDF. Side effects / S3. No |
| M4 resto | COMPARAR/xlsx. Writes/Excel. No |
| M6 resto | Export/xlsx. No |
| M14 | Admin usuarios/permisos. Riesgo ALTO. Unlock. No |
| M15 | Contenido PDF/S3/OCR. M2 ya metadata. S3. No |
| M17 | Canal WhatsApp; tokens en URL. No es fuente de negocio. No |
| M20 | `page.tsx` reusa IGF mini + DICF. financial_diagnosis cubre el valor financiero de inicio. **No** prioriza. Sigue INDIRECTA |
| M0 | Catálogo de permisos al LLM. No |
| M19 | IA paralela + test sin auth. C. No |

---

## Candidatos — mapa obligatorio

### T1 — plant_diagnosis evidence assembly — **ganador**

| Campo | Contenido |
|---|---|
| Pregunta nueva | ¿Cómo va **la planta** si se miran a la vez acciones/riesgos AR, listas comerciales y snapshot IGF/ARR, cada uno con su origen? ¿Hay tensiones entre esos bloques? |
| Ya responde | AR/DICF/bitácora en context; IGF/ARR solo con wording financiero; listas solo con «dejaron…»; financial_diagnosis solo con caída/diagnóstico financiero |
| Duplica | Si se fusionan bloques o se mete M9. El slice **no** debe fusionar ni traer M9 |
| Evidencia nueva | IGF/ARR + commercial_state **en la misma corrida** que AR (hoy ausentes en esa pregunta) |
| Reasoning nuevo | Tensiones/coincidencias etiquetadas planta-nivel. **No** causa. **No** N5 |
| Actionability | Priorizar atención: vencidas vs clientes que dejaron vs KPI de planta |
| NO afirmar | Causa; «AR explica IGF»; responsable; M9 como parte de este intent |
| Source/helper | Context AR/DICF/bitácora ya cargado; `loadIgfArrSourceBlocksForChat` o annex; `loadCommercialStateForChat` |
| Intent/tool/executor | `plant_diagnosis` → tools del mapa; orchestrator no ejecuta |
| Physical keys | `planta_id` (y plant_code ARR). Sin FK cliente |
| Authz | AR vs GA 403 en IGF/ARR/commercial_state: **por fuente**; partial OK; fail-closed planta |
| Dependencies | Loaders existentes. No Twilio/S3/Excel |
| Contract | **Ninguno** si no se implementa 04/05. No meter M9 (cambiaría el mapa) |
| First slice | Rama `plant_diagnosis` in-process: context + bloques IGF/ARR + commercial_state; provenance; una OpenAI; sin M9 |
| State after | M7/M8/M11/M12 **sin cambio**. Global **52.5%** |
| % | **0.0** |

### M10 — Weekly LD — **segundo**

| Campo | Contenido |
|---|---|
| Pregunta nueva | Descuento **esta semana** vs proyección |
| Ya responde | M9 mensual; annex; financial_diagnosis mensual |
| Duplica | Alta (mismas tablas ARR) |
| Evidencia nueva | Ventana diaria/semana + vs forecast mes |
| Reasoning | Grano intra-mes, no cross-domain |
| Actionability | Media sin WhatsApp |
| Source | `buildWeeklyDiscountNarrative` |
| Intent/tool | No existe en planner/tools |
| Authz | dashboardAuth del POST lectura |
| Dependencies | ARR; Twilio **fuera** |
| Contract | N/A |
| First slice | Narrativa RO; no send |
| State after | PARTIAL |
| % | +2.5 **luego** (no decide) |

### Rechazados (resumen)

IES+RE runtime (G2/G3/G8). Commercial+bitácora (join). M3+M9+M11 (join). M8 resto (nada oculto). M5/M7/M11/M12/M18 resto (inercia). M14/M15/M17/M20/M1/M2 resto/M4 resto/M6 resto/M19.

---

## Ranking mezclado

Ponderación 009: **executive + reasoning + evidence connectivity** (CRITICAL) > new_domain / actionability / incremental (VERY_HIGH) > frequency (HIGH) > path (MEDIUM) > risk (MEDIUM) > **percentage (LOW)**.

No % . No facilidad. No ranking 008. No inercia financial_diagnosis (no M9). No inercia M5/M7/M11/M12/M18. No elegir M10 por segundo previo.

| rank | candidate | type | current_state | new_questions | executive_value | reasoning_value | evidence_connectivity | new_domain_value | actionability | incremental_value | source_ready | wiring_ready | contract_impact | dependencies | risk | first_slice | state_after_slice | percentage_effect | decision |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | plant_diagnosis assembly | transversal | n/a (P en M7/M8/M11/M12) | cómo va la planta multi-bloque | **5** | **5** | **5** | 1 | 3 | **5** | loaders sí | plan sí / exec no | **ninguno** | planta_id | semántica ≠ causa; no M9 | ejecutar mapa declarado | sin cambio de módulo | **0.0** | **ganador** |
| 2 | M10 Weekly LD | módulo | NO INTEGRADA | descuento esta semana | 3 | 3 | 2 | **4** | 2 | 3 | narrativa sí | no | N/A | ARR + **Twilio** | duplica M9/ARR | narrativa RO | PARTIAL | +2.5 luego | **segundo** |
| 3 | IES+RE runtime | transversal | runtime pendiente | hipótesis N5 | 4 | 4 | 4 | 0 | 1 | 4 | contrato sí | **no** | **G2/G3/G8** | IES+Run | capa nueva | no | n/a | 0 | rechazado |
| 4 | client_analysis + bitácora | transversal | — | cliente 360 | 3 | 3 | 0 | 0 | 1 | 2 | loaders sí | no | choca M11 | **sin FK** | join nombre | no | — | 0 | rechazado |
| 5 | M8 resto | módulo | PARTIAL | UI/carga | 1 | 1 | 1 | 1 | 1 | 0 | annex/FD | sí | N/A | ARR UI | bajo | nada oculto | PARTIAL | 0 | no |
| 6 | M15 | módulo | NO INTEGRADA | PDF/S3 | 2 | 1 | 1 | 2 | 1 | 1 | `/media` | M2 metadata | N/A | **S3** | alto | no | PARTIAL | +2.5 | no |
| 7 | M5/M7/M11/M12/M18 resto | módulo | PARTIAL | Excel/CRUD/canal | 1 | 0–1 | 1 | 0 | C | 0 | slices hechos | sí | N/A | Excel/S3 | inercia | no | PARTIAL | 0 | no |
| 8 | pack M3+M9+M11 | transversal | — | todo a la vez | 3 | 2 | 0 | 0 | 1 | 1 | sí | no | N/A | sin FK | join | no | — | 0 | rechazado |
| 9 | M14 / M17 / M20 / M1 / M19 | módulo | NI/P/I | admin/canal/home/health | 0–1 | 0 | 0 | 0–1 | C | 0 | varios | no | N/A | unlock/Twilio | alto/nulo | no | — | 0/+2.5 | no |
| 10 | M2/M4/M6 resto | módulo | PARTIAL | cheque/Excel | 1–2 | 0 | 1 | 0 | C | 0 | query hecha | sí | N/A | HTTP/Excel | penalizado | no | PARTIAL | 0 | no |

---

## Ganador

**`plant_diagnosis` evidence assembly** (transversal, chat legado).

Por qué gana:

1. Pregunta ejecutiva **#1** de la matriz («cómo va una planta») sigue cubierta solo por AR.
2. El planner **ya** exige IGF/ARR/commercial_state; el runtime no los carga.
3. Conectividad física (`planta_id`) sin join inventado.
4. No es financial_diagnosis: **no M9**, no «por qué cayó el ingreso».
5. Contrato 04/05 intacto. 0.0 pp.

Por qué no es inercia: financial_diagnosis cerró el pack **mensual financiero**. Este slice cierra el pack **operativo + comercial + snapshot** de planta. Distinto intent, distinto mapa, distinta pregunta.

## Segundo

**M10 weekly discount LD read-only.**

Por qué pierde: misma materia ARR que M9/annex/financial_diagnosis; el delta útil es solo el grano semana; actionability canónica = WhatsApp (penalizado). Gana el segundo porque es el único dominio **silencioso** con helper listo y pregunta concreta.

## First slice / state / % / contract

```text
cómo va la planta / riesgos / diagnóstico de planta
  → plant_diagnosis
  → context AR+DICF+bitácora (ya)
  → IGF + ARR (bloques)
  → commercial_state (listas)
  → provenance separada
  → una OpenAI
  → respuesta
```

- State after: ningún módulo cambia.
- Percentage: **0.0** (52.5% intacto).
- G2/G3: N/A.
- Risks: fusionar bloques; meter M9; tratar tensiones como causa; GA abort vs AR visible (debe ser partial).
- Dependencies: loaders IGF/ARR/commercial_state existentes; JWT/`planta_id`.

## NEXT_TASK

Propuesta exacta (no autoriza G1; no encadena; no ejecutar):

**ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001**

## Acciones no realizadas

No código, matriz, contratos, tests, frontend, SQL, writes, commit, push, merge. NEXT_TASK no ejecutada.

## Gates

G1 intacto. G2/G3/G8 N/A. Solo CURRENT_TASK + este reporte.

## git diff --check

Limpio (se confirma al cerrar).

## git status

```text
On branch architecture/director-ia-global-next-module-prioritization-009
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
Untracked:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md
```
