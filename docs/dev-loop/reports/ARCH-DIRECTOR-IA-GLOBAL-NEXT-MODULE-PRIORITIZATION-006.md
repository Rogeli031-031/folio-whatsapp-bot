# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006"
outcome: "DONE_PENDING_REVIEW"
winner: "M7"
winner_scope: "composición de igf.compromiso_lines (líneas ya en SELECT */snapshot, hoy no impresas); no causalidad; no PATCH; no Excel meta; no COMPLETE"
second_place: "M5"
second_scope: "Taller/AT query JSON (expandTallerRows); no workbook; no COMPLETE de Excel"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md … 005.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001.md"
  - "lib/director-ia-igf-arr.js (lectura)"
  - "lib/dashboard-arr-forecast.js IGF_*_COLS / computePronosticoProyByPlant (lectura)"
  - "igf-handler.js ORDER_DELTAS / obtenerDeltas* (lectura)"
  - "server.js recalcularUtilYResultado (lectura)"
  - "lib/taller-at-excel.js expandTallerRows (lectura)"
  - "lib/director-ia-tools.js get_igf_snapshot / get_taller_at_analysis (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "50.0% no cambia en esta tarea."
  - "Un IMPL futuro de composición M7 seguiría PARTIAL (0.0 pp). COMPLETE de M7 sigue exigiendo UI/PATCH/meta Excel/versiones."
```

## Resumen ejecutivo

**Ganador: M7 — IGF Forecast**, primer slice = **composición de `igf.compromiso_lines`**.

Evidencia **ya cargada** en runtime y **hoy omitida** del reasoning:

```text
loadIgfCommitSnapshot
  → SELECT * FROM igf.compromiso_lines
  → mapea todas las columnas numéricas al objeto row
  → el annex solo imprime venta_ton, margen_kg, com_desc_kg, hg_kg
     (+ ingreso aprox.)
```

El recálculo de producto (`recalcularUtilYResultado`) y el UI IGF (`ORDER_DELTAS`, `obtenerDeltasVariablesCargoPlanta`, `obtenerDeltasVariablesCorporativo`) ya saben qué líneas componen utilidad/resultado. Director IA no las ve.

**No se convierte composición en causalidad.** «Qué línea se movió» ≠ «por qué cayó el mercado» ≠ responsable.

**No se eligió M7 por haber sido segundo en 005.** Se eligió porque, tras M11, es el único frente con evidencia física ya en snapshot y no impresa.

**No se continúa M11/M12.** Expediente y notas ya están. El resto es attachments/CRUD/causa.

**No se eligió M5** (otra lista + Excel + frecuencia mensual). Queda **segundo**.

**No se eligió por porcentaje ni por facilidad.** El slice futuro de M7 vale **0.0 pp**.

Esta tarea **no cambia** 10.0 / 20 = **50.0%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-006` (≠ `main`).
- HEAD: `b0e307bb Merge branch 'docs/director-ia-m11-commercial-dossier-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline 50.0%

| Campo | Valor |
|---|---|
| M0–M20 | **10.0 / 20 = 50.0%** |
| COMPLETE | M3, M9, M13, M16 (4.0) |
| PARTIAL | M0, M1, M2, M4, M6, M7, M8, M11, M12, M17, M18 (5.5) |
| INDIRECTA | M20 (0.5) |
| NO INTEGRADA | M5, M10, M14, M15, M19 (0.0) |

Fórmula: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0. **No se cuenta de nuevo** un PARTIAL ya puntuado.

Nombres canónicos: M4=Clasificación + COMPARAR; M5=Taller por AT; M7=IGF Forecast; M8=ARR; M11=DICF + acciones + comentarios; M12=Action Register; M14=Usuarios admin; M15=Documentos/PDF; M18=Presupuestos semanales.

Esta tarea **no cambia estados ni porcentaje**.

---

## Capacidad actual

Tras M4/M6/M9/M11/M12/M18 Director IA **describe** mucho: folios (estatus/historial/metadata), KPIs/proyectos, comparativo M4, listados M6, carro M18, deltas M9, duplicados, AR + notas, **expediente comercial factual**, listas commercial_state, annex IGF/ARR (margen/venta/desc/HG), bitácora/entidades.

**No** responde: qué **línea** del compromiso IGF (gasto, impuesto, bancos, provisión, presupuesto, folios ZP/carro, corp, inversiones, util. oper., resultado) se movió frente al mes previo.

`financial_diagnosis` ya dispara esa pregunta («¿por qué cayó el ingreso?», «diagnóstico financiero») y solo recibe el annex recortado + M9. El modelo **no ve** las líneas.

---

## Reasoning gaps / hidden evidence

| Hueco | Hecho físico |
|---|---|
| Composición IGF | `SELECT *` carga el row; annex imprime 4 campos |
| «Cómo cambió» UI | `igf-handler.js` ya calcula deltas de cargo/corp; chat no los llama |
| Fórmula de utilidad | `recalcularUtilYResultado` usa 12+ columnas; chat no las cita |
| ARR oculto | **No hay.** `computePronosticoProyByPlant` solo produce `proy_venta_ton` / `proy_desc_kg`; el annex ya los imprime; M9 ya compara periodos |
| M11 restante | Expediente ya integrado; `summarizeDicfContext` sigue omitiendo `cliente_key` en always-on, pero el expediente cubre la pregunta de dirección |
| M12 restante | Notas ya on-demand; `includeNotes` always-on sigue false a propósito |
| M5 | `expandTallerRows` existe; tool stub; no es evidencia oculta, es dominio no cableado |

### Evidence connectivity

| Posible conexión | ¿Defendible? |
|---|---|
| Misma fila `compromiso_lines` mes A vs mes B | **Sí** (misma `empresa` / planta; annex ya resuelve prev year/month) |
| Líneas IGF ↔ M9 venta/desc/ingreso | Parcial / solapa: M9 es COMPLETE de periodos reales; composición IGF es **otro** objeto (compromiso/KPI) |
| `folios_aprob_zp_kg` / `folios_carro_kg` / `presupuesto_kg` ↔ M6 / M18 | **No hay FK.** Son $/kg en la fila IGF. No unir folios/carro por esas columnas |
| IGF ↔ expediente M11 | No hay `cliente_key` en `compromiso_lines` |
| ARR forecast ↔ M9 | Duplica venta/desc |

---

## Recheck especial M7 — `igf.compromiso_lines`

### ¿Ya viene del SELECT?

Sí. `loadIgfCommitSnapshot` (`lib/director-ia-igf-arr.js` L206–222):

```text
SELECT * FROM igf.compromiso_lines WHERE version_id = $1
→ por cada columna distinta de empresa/version_id/id: toNum(v) en row
```

### ¿Ya está en snapshot/runtime?

Sí. `igf.row` es la fila de planta (`findIgfRowForPlant`). Versión = última `igf.versions` `plant_code='GLOBAL'` del mes.

### ¿Hoy no se imprime?

Sí. El annex (L421–434) solo usa:

- `venta_ton`
- `margen_kg` (o `getMargenKgPorPeriodo`)
- `com_desc_kg`
- `hg_kg`
- ingreso aprox. `(margen+desc−HG)×ton×1000`

### Columnas físicas ya nombradas en producto (no inventadas)

`IGF_FORECAST_COLS` / `IGF_COMPROMISO_RAW_COLS` (`lib/dashboard-arr-forecast.js`):

- Forecast: `presupuesto_kg`, `folios_aprob_zp_kg`, `folios_carro_kg`, `impuesto_kg`, `hg_pct`, `bancos_planta_kg`, `provision_planta_kg`, `util_oper_kg`, `util_oper_importe`, `gtos_apoyos_corp_kg`, `bancos_corp_kg`, `otros_programas_kg`, `inversiones_kg`, `resultado_final_kg`, `resultado_final_importe`
- Raw compromiso: `gasto_kg` en lugar del trío presupuesto/folios
- Recálculo UI puede persistir `deposito_cierre_kg`

Cualquier columna **ausente** en una fila concreta se omite; no se inventa.

### ¿Puede explicar composición del KPI?

Sí, como **suma/resta de líneas almacenadas** (`recalcularUtilYResultado` L12268–12301):

```text
util_oper_kg =
  margen + com_desc + deposito_cierre
  − presupuesto − folios_ZP − folios_carro − impuesto − HG − bancos_planta − provisión

resultado_final_kg =
  util_oper − gtos_corp − bancos_corp − otros_programas − inversiones
```

Eso responde «qué línea mueve compromiso/resultado». **No** responde causa de mercado ni dueño del desempeño.

### Comparación vs M6 y M9

| Frente | Qué hace | Relación con M7 composición |
|---|---|---|
| M9 COMPLETE | Δ venta / desc / ingreso de periodos reales ARR | No sustituye líneas IGF; no se reabre |
| M6 PARTIAL | Lista folios GASTOS/INVERSIONES | No es el KPI IGF; sin FK desde las columnas $/kg |
| M7 annex hoy | 4 campos + margen mes vs mes | Profundizar el **mismo** snapshot |

### Authz / side effects

Annex ya: JWT; **GA 403**; GV vía `assertGVPlantaNombreAccess`; planta del request. PATCH `/api/dashboard/igf-forecast` = C, fuera. Sin HTTP interno a `/api/dashboard/igf-*`.

### Por qué no IMPL directo

DDL de `compromiso_lines` no está completo en `sql/`. Hay que fijar: set de columnas (raw vs forecast); comparación a dos meses (annex ya tiene prev, pero **no** carga IGF del mes previo); no reutilizar `financial_diagnosis` como causa; no llamar `igf-handler` si arrastra vistas/HTTP; no unir M6/M18. Por eso NEXT_TASK = READINESS.

---

## Recheck especial M8

`computePronosticoProyByPlant` **solo** emite `{proy_venta_ton, proy_desc_kg}`. El annex ya imprime ambos + Δ vs mes previo. `loadTopClientesDescBrief` ya lista top 8. M9 COMPLETE ya compara venta/desc/ingreso reales. Resto canónico = UI `/arr` y `POST /api/arr/load` (write). **No hay evidencia ARR oculta que no duplique M9.** No.

---

## Recheck especial M5

Propósito canónico: **Excel** de gasto taller por unidad AT + hoja de duplicados (≠ M16). `expandTallerRows` + `unidad-taller.js` existen. Tool `get_taller_at_analysis` = `declared_not_integrated`, `executor: null`. M4 ya agrega familia TALLER. Frecuencia **mensual**. Colisión TALLER / AT / tema AR. Un query JSON sería otra lista descriptiva. **No gana.** Queda segundo porque es el único NO INTEGRADA con helper SELECT-ready y pregunta de dirección real, no por +2.5 pp.

---

## Recheck M11 / M12 / write-heavy

| Frente | Decisión |
|---|---|
| M11 restante | Expediente factual ya integrado. Attachments / bitácora-en-expediente / causa = no. **No inercia.** |
| M12 restante | Notas ya on-demand. Attachments/S3/CRUD = C. **No inercia.** |
| M4 COMPARAR / Excel | Write + workbook. Query JSON ya existe. Penalizado. |
| M6 Export | Workbook. Query JSON ya existe. Penalizado. |
| M18 writes / cheques / WhatsApp | C + Twilio. Carro read-only ya existe. Penalizado. |

---

## Rechecks restantes

| Módulo | Estado | Decisión |
|---|---|---|
| M0 | PARTIAL | Gates; no catálogo. No. |
| M1 | PARTIAL | Health de producto, no reasoning. No. |
| M2 resto | PARTIAL | EXIT_M2; PDF/S3/kanban HTTP/cheque. No. |
| M10 | NO INTEGRADA | Narrativa LD + Twilio; solapa M9. No. |
| M14 | NO INTEGRADA | Admin write. No. |
| M15 | NO INTEGRADA | PDF/S3. Metadata M2 ya existe. No. |
| M17 | PARTIAL | Canal, no conocimiento. No. |
| M19 | NO INTEGRADA | Paralelo C. No. |
| M20 | INDIRECTA | Página `/`; sin fuente propia. No. |

---

## Candidatos (puntos mandatorios del ganador y segundo)

### M7 — composición IGF (PARTIAL) — **ganador**

1. **Preguntas nuevas:** ¿qué línea del compromiso/resultado se movió (HG, gasto, impuesto, bancos, provisión, presupuesto, folios ZP/carro, corp, inversiones, util. oper.)?; ¿el KPI se movió por cargo planta o por corporativo?
2. **Ya responde:** margen curr vs prev; venta/desc ARR; 4 campos IGF; M9 deltas.
3. **Duplica:** M9 si se vende como «por qué cayó el ingreso». `igf-folios-detalle` solapa M6/M2 (fuera).
4. **Reasoning nuevo:** composición del número ya persistido.
5. **Evidencia oculta:** columnas de `SELECT *` no impresas; deltas UI no llamados.
6. **Conexiones:** misma fila mes A vs B. **No** join a folios/carro.
7. **Fuente:** `igf.versions` + `igf.compromiso_lines`.
8. **Helper/query:** `loadIgfCommitSnapshot` (ya); segundo snapshot del mes previo; opcionalmente la semántica de `ORDER_DELTAS` **sin** importar el handler HTTP.
9. **Intent/tool/executor:** `get_igf_snapshot` / `loadIgfArrAnnexForChat` ya cableados; `financial_diagnosis` ya pregunta y no desglosa.
10. **Authz:** GA 403; GV; `planta_id`; fail-closed (mismo annex).
11. **Side effects:** ninguno en lectura. PATCH IGF = C.
12. **Riesgo semántico:** composición ≠ causa; línea ≠ responsable; columna null ≠ cero de negocio.
13. **Primer slice:** imprimir líneas presentes + Δ vs mes previo cuando ambas filas existan; truncation; no causa.
14. **State after:** **PARTIAL**. **%:** 0.0.

### M5 — Taller por AT (NO INTEGRADA) — **segundo**

1. **Nuevas:** gasto por unidad AT; duplicados de taller (≠ M16).
2. **Ya:** celda TALLER M4; listado M6; tema AR Taller.
3. **Duplica** si se vende como «taller» genérico.
4. **Reasoning:** bajo (lista).
5. **Evidencia oculta:** no; el helper no está cableado.
6. **Conexión:** no une M7/M9/M11.
7. **Fuente:** `public.folios` + `expandTallerRows`.
8. **Helper:** `expandTallerRows`; workbook = xlsx (penalizado).
9. **Tool:** stub `get_taller_at_analysis`.
10. **Authz:** JWT + `priv_clave`.
11. **Side effects:** query JSON = no; workbook = descarga.
12. **Riesgo:** alto (TALLER/AT/AR).
13. **Slice:** query JSON por AT / mes; no Excel.
14. **State after:** PARTIAL; +2.5 **luego**. **No se elige por el +2.5.**

---

## Tabla comparativa

| rank | module | current_state | new_questions | reasoning_value | evidence_connectivity | executive_value | actionability | incremental_value | frequency | source_ready | wiring_ready | dependencies | risk | first_slice | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **M7 composición** | PARTIAL | qué línea del KPI se movió | **5** | **4** (misma fila A/B; no FK cruzado) | **4** | 1 | **5** (ya en snapshot) | periódica | `SELECT *` sí | annex + tool sí | no | medio (≠ causa) | desglose + Δ mes | **PARTIAL** | 0 | **GANADOR** |
| 2 | M5 | NO INTEGRADA | gasto por AT | 1 | 1 | 3 | 2 | 3 | mensual | `expandTallerRows` | stub | Excel | **alto** | query AT | PARTIAL | +2.5 luego | **segundo** |
| 3 | M8 | PARTIAL | UI/carga ARR | 1 | 2 | 2 | 1 | 1 | periódica | annex+M9 | annex | upload | medio (M9) | nada oculto | PARTIAL | 0 | no |
| 4 | M11 resto | PARTIAL | attachments/causa | 1 | 1 | 1 | C | 0 | — | expediente ya | ya | S3 | medio | no | PARTIAL | 0 | no (inercia) |
| 5 | M12 resto | PARTIAL | evidencias/CRUD | 1 | 1 | 2 | C | 1 | — | attachments | notas ya | **S3** | medio | no | PARTIAL | 0 | no (inercia) |
| 6 | M18 resto | PARTIAL | writes/cheques/WA | 0 | 0 | 1 | C | 0 | — | server | query hecha | **Twilio** | medio | no | COMPLETE dudoso | 0 | no |
| 7 | M4 resto | PARTIAL | COMPARAR/xlsx | 0 | 0 | 1 | C | 1 | rara | workbook | query hecha | Excel | medio | no | COMPLETE dudoso | 0 | no |
| 8 | M6 resto | PARTIAL | xlsx | 0 | 0 | 1 | 1 | 1 | rara | workbook | query hecha | Excel | bajo | no | COMPLETE | 0 | no |
| 9 | M15 | NO INTEGRADA | PDF/S3 | 2 | 1 | 3 | 2 | 1 | ocasional | `/media` | M2 metadata | **S3** | medio | no | PARTIAL | +2.5 | no |
| 10 | M10 | NO INTEGRADA | narrativa LD | 2 | 1 | 2 | 1 | 1 | semanal | JSON | no | **Twilio** | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| 11 | M17 | PARTIAL | canal | 0 | 0 | 1 | 0 | 0 | — | Twilio | link | Twilio | medio | nada | PARTIAL | 0 | no |
| 12 | M20 | INDIRECTA | Home | 0 | 0 | 2 | 0 | 0 | — | M7/M11 | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| 13 | M14 | NO INTEGRADA | permisos | 0 | 1 | 2 | C | 1 | rara | admin API | stub | no | alto | lectura | PARTIAL | +2.5 | no |
| 14 | M1 | PARTIAL | health producto | 0 | 0 | 1 | 0 | 1 | rara | `/health*` | no chat | no | medio | GET | PARTIAL | 0 | no |
| 15 | M0 | PARTIAL | catálogo permisos | 0 | 0 | 1 | 0 | 0 | rara | JWT | gates | no | alto | — | PARTIAL | 0 | no |
| 16 | M2 resto | PARTIAL | kanban/cheque/PDF | 1 | 0 | 2 | 1 | 0 | — | EXIT_M2 | slices hechos | S3/HTTP | alto | no | PARTIAL | 0 | no |
| 17 | M19 | NO INTEGRADA | paralelo | 0 | 0 | 0 | C | 0 | — | stack propio | no | WhatsApp | alto | no | NO INTEGRADA | 0 | no |

---

## Ranking

Criterio 006: evidencia ya cargada y no vista + composición físicamente soportada + reasoning. **No** porcentaje. **No** facilidad. **No** ranking 005. **No** continuar M11/M12/M18/M4/M6. **No** otra lista. Penaliza Excel/S3/Twilio/write y causalidad inventada.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M7 composición `compromiso_lines`** | Única evidencia oculta verificada: `SELECT *` → row completo → annex de 4 campos |
| **2** | M5 Taller/AT | Dominio nuevo; pierde por lista + Excel + frecuencia |
| 3 | M8 / M11 resto / M12 resto | Sin oculto, inercia o write |
| 4 | M4/M6/M18 resto | Writes/Excel/Twilio; consulta ya hecha |
| 5 | M15 / M10 / M17 | S3 / canal |
| 6 | M20 / M14 / M1 / M0 / M2 resto / M19 | Poco o nulo valor de dirección |

---

## Ganador

**M7 — IGF Forecast**, primer slice = composición read-only de `igf.compromiso_lines`.

### Por qué gana

1. Las líneas **ya están en memoria**. El reasoning no las ve. Eso es el criterio 006.
2. Habilita preguntas que el annex y M9 **no** contestan: qué componente del compromiso/resultado se movió.
3. `financial_diagnosis` ya pregunta y hoy responde con 4 campos + deltas M9.
4. La fórmula de utilidad/resultado es física (`recalcularUtilYResultado`), no inferida.
5. In-process, SELECT-only, tool/authz existentes. Sin Excel/S3/Twilio.
6. **No** se eligió por ser segundo en 005. M11 ya no es candidato. M8 no tiene oculto. M5 es otra lista.
7. **No** se eligió por porcentaje: el slice vale **0.0 pp**.

### Preguntas nuevas

- ¿El resultado/utilidad se movió por HG, gasto, impuesto, bancos, provisión, presupuesto o folios ZP/carro?
- ¿El movimiento es de cargo planta o de corporativo/inversiones?
- ¿Qué líneas del compromiso cambiaron vs el mes previo?

**No** habilita: «la causa de la caída es…», «el responsable es…», «esta línea solucionó…».

### Primer slice

```text
pregunta IGF / utilidad / resultado / de qué se movió el compromiso
  → get_igf_snapshot / loadIgfArrAnnexForChat (o extensión SELECT-only)
  → authz GA/GV/planta (ya)
  → loadIgfCommitSnapshot mes consultado
  → loadIgfCommitSnapshot mes previo (hoy no se hace)
  → emitir líneas presentes con procedencia
  → Δ por línea solo si ambas filas tienen el campo
  → no causa; no FK a M6/M18; no PATCH; no Excel meta
```

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M7 | PARTIAL | **PARTIAL** |
| Global | **50.0%** | **50.0%** (0.0 pp) |

COMPLETE de M7 **no** se otorga (UI IGF, PATCH HG, meta Excel, versiones, `sources.igf` en GET).

### Riesgos

- Traducir composición a «la causa fue».
- Tratar `null` como 0 de negocio.
- Mezclar columnas raw (`gasto_kg`) y forecast (`presupuesto_kg` / folios) como si fueran la misma.
- Unir `folios_*_kg` a listados M6/M18 sin FK.
- Reabrir M9 como si faltara.
- Importar `igf-handler` y arrastrar HTTP/vistas.

### Dependencias

`igf.versions`, `igf.compromiso_lines`, `loadIgfCommitSnapshot`, annex/authz vigentes. Semántica de `ORDER_DELTAS` como **especificación de lectura**, no como transporte. Sin S3/Excel/Twilio.

---

## Segundo lugar

**M5 — Taller por AT** (query JSON por unidad; no workbook).

### Por qué pierde

1. No es evidencia oculta: el helper **no se llama**. Es dominio nuevo, otra lista.
2. Propósito canónico = Excel; frecuencia mensual; colisión TALLER/AT/AR.
3. No explica un KPI ya mostrado.
4. El +2.5 pp **no** decide.

No se elige M8 como segundo: no hay campo ARR oculto. No se elige M11/M12 resto: inercia.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001`

Fijar: columnas emitibles (raw vs forecast); comparación a dos meses; omisión de null; lenguaje de composición (prohibir causa); no HTTP a `/api/dashboard/igf-*`; no `igf-folios-detalle`; no PATCH; no join M6/M18; no reabrir M9; recorte. No IMPL directo: el snapshot existe, el contrato de exposición no.

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 50.0%.
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
On branch architecture/director-ia-global-next-module-prioritization-006
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md
```

Solo los dos archivos autorizados.

## STOP
