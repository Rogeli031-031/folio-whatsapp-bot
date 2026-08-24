# Reporte — ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005"
outcome: "DONE_PENDING_REVIEW"
winner: "M11"
winner_scope: "expediente comercial por cliente: estado comercial + comentarios almacenados + acciones DICF + historial/resultado; no inventar causa; no attachments; no CRUD; no COMPLETE"
second_place: "M7"
second_scope: "desglose composicional de igf.compromiso_lines (qué línea del KPI se movió); no PATCH; no Excel meta; no COMPLETE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M12-REVISION-NOTES-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"
  - "lib/director-ia-commercial-state.js, director-ia-action-register.js, dicf-acciones.js, cliente-comentarios.js (lectura)"
  - "lib/director-ia-igf-arr.js, director-ia-planner.js, director-ia-tools.js, director-ia-chat.js (lectura)"
  - "lib/taller-at-excel.js, server.js fetchIgfFoliosDetalleList (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "50.0% no cambia en esta tarea."
  - "Un IMPL futuro del expediente M11 seguiría PARTIAL (0.0 pp). COMPLETE de M11 sigue exigiendo attachments/universo/CRUD fuera de este slice."
```

## Resumen ejecutivo

**Ganador: M11 — DICF + acciones + comentarios cliente**, primer slice = **expediente comercial por cliente**. Ensambla evidencia ya existente y hoy silos:

```text
estado comercial (computeDicf)
  → comentarios almacenados (arr.cliente_comentarios)
  → acciones DICF (arr.dicf_acciones)
  → historial / resultado_cierre
```

La unión es físicamente defendible por `planta_id` + `cliente_key` (fallback de nombre ya usado por `injectAccionesAbiertas`). **No** inventa causa. Comentario ≠ causa inferida. Clasificación DICF ≠ motivo. Texto de acción ≠ acuerdo formal de Action Register.

**No se premia “otra consulta”.** Tras M4/M6/M12/M18 Director IA ya describe mucho. El hueco residual es **razonar con evidencia ya cargada pero no conectada**.

**No se eligió M5** (004 lo dejó segundo; sería otra lista). **No se continúa M12** (notas ya integradas; resto = binarios/CRUD). **No se eligió por porcentaje ni por ranking anterior.**

**Segundo lugar: M7 — IGF Forecast**, slice = desglose composicional de `igf.compromiso_lines` (qué componente del KPI se movió). Explica el número; no aporta responsable ni seguimiento. M9 ya cubre deltas de periodos reales.

Esta tarea **no cambia** 10.0 / 20 = **50.0%**.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-global-next-module-prioritization-005` (≠ `main`).
- HEAD: `3987b64b Merge branch 'docs/director-ia-m12-revision-notes-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
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

Nombres canónicos: M4=Clasificación + COMPARAR; M5=Taller por AT; M11=DICF + acciones + comentarios; M12=Action Register; M14=Usuarios admin; M15=Documentos/PDF; M18=Presupuestos semanales (carro).

Esta tarea **no cambia estados ni porcentaje**.

---

## Capacidad actual (cobertura descriptiva amplia)

Ya responde hechos: estatus/historial/metadata de folio; KPIs/proyectos; comparativo M4; listados M6; carro M18; deltas M9; duplicados; AR vencidas/responsables/temas + **notas de revisión**; DICF acciones (límite ~40) y comentarios (80) **por separado**; commercial_state (listas) **por separado**; IGF/ARR annex on-demand; bitácora/entidades.

**No** responde como cadena única: para el cliente X, cuál es su estado comercial, qué se escribió de él, qué acción existe, qué seguimiento/cierre hay.

**No** responde: por qué se movió un componente IGF más allá del KPI/agregado ya impreso; Taller por AT; COMPARAR/xlsx; writes/cheques/WhatsApp; PDF/S3; admin; weekly LD; Home como página.

### Reasoning gaps

| Hueco | Qué falta |
|---|---|
| Expediente de cliente | Las tres capas M11 existen y el planner las **separa** |
| Causa comercial | No hay columna `causa` en DICF; solo texto almacenado (comentario / descripción / resultado_cierre) |
| Por qué se mueve un KPI IGF | Annex imprime margen/venta/desc/HG; `SELECT *` de `compromiso_lines` ya trae más columnas que no se usan |
| Priorizar atención | commercial_state inyecta **conteo** de acciones abiertas, no el expediente |

### Evidence connectivity gaps

| Posible conexión | ¿Físicamente defendible? |
|---|---|
| commercial_state ↔ dicf_acciones | **Sí**: `cliente_key` / `buildClienteKey` (ya usado para el conteo) |
| dicf_acciones ↔ cliente_comentarios | **Sí**: `planta_id` + `cliente_key` (comentario puede tener `cliente_key` null → fallback nombre) |
| IGF fila ↔ M9 deltas | Parcial / solapa: mismas tablas ARR; M9 ya es COMPLETE de periodos reales |
| IGF fila ↔ folios (`igf-folios-detalle`) | Composición por `mes_cargo` + planta + estatus/categoría; **no** FK; solapa M6/M2 |
| M4/M6 ↔ ítems AR | **No** hay `folio_id` en notas/ítems AR que permita el join |
| Notas M12 ↔ resultados | Texto libre; **no** `item_id`; no se atribuye |

---

## Preguntas ejecutivas nuevas

| Pregunta | ¿Hoy? | Frente |
|---|---|---|
| Este cliente dejó de comprar: ¿qué se escribió, qué acción hay y qué se cerró? | No como cadena | **M11** expediente |
| Entre quienes disminuyeron, ¿quién tiene seguimiento abierto y con qué compromiso? | Solo conteo `acciones_abiertas` | **M11** |
| ¿El margen/utilidad se movió por HG, desc, folios ZP, carro o inversiones? | Annex no desglosa | **M7** composición |
| ¿Gasto taller por unidad AT? | No | M5 (otra lista) |
| ¿Qué más hay en evidencias AR / CRUD? | No | M12 resto (binario/write) |

---

## Recheck especial M11

### Qué ya consume Director IA

- Always-on: `summarizeDicfContext` (máx. 40) — `descripcion`, `estado`, `fecha_compromiso`, `resultado_cierre`, `responsable`, `historial`. **No proyecta `cliente_key`.**
- Always-on: `loadClienteComentariosForDirectorIa` — últimos 80 de la **planta**, no expediente por cliente.
- On-demand: `loadCommercialStateForChat` → `dicf.computeDicf` + `injectAccionesAbiertas` (solo `COUNT` abierto).
- Planner: `isCommercialStateListQuestion` **excluye** acciones/historial/cierre. `buildCommercialStateFocusedContext` dice explícitamente no confundir con acciones/historial.
- `client_analysis` junta dominios en el intent, pero no hay loader que arme el expediente.

`dicf.js` **no** tiene columna `causa`/`motivo`. La “causa” solo puede ser texto ya guardado.

### Qué no entra al reasoning conjunto

1. Estado comercial del cliente + comentario + acción + historial en **un** artefacto.
2. `cliente_key` en la proyección DICF del chat.
3. Comentarios filtrados al cliente de la pregunta (hoy: cola planta).
4. Acción abierta **con** texto/fecha, no solo el entero `acciones_abiertas`.

### Conexión defendible (sin inventar join ni causalidad)

```text
cliente en computeDicf
  ⋈ arr.dicf_acciones.cliente_key   (buildClienteKey)
  ⋈ arr.cliente_comentarios.cliente_key
  + arr.dicf_accion_historial.accion_id
```

Presentación permitida: «evidencias co-localizadas de este cliente».  
Prohibido: «dejó de comprar **porque** el comentario dice…» salvo que el texto lo afirme.

### Por qué no IMPL directo

Authz a intersectar (GA bloqueado en commercial_state; DICF/`acceso_acciones_dicf`; comentarios). Recorte por cliente. Restaurar `cliente_key`. Intent que no mute las listas. Frontera frente a Plaud/bitácora/notas AR/M2. Por eso NEXT_TASK = READINESS.

---

## Recheck especial M7

Annex (`loadIgfArrAnnexForChat`) ya responde margen curr vs prev, ARR venta/desc, fila IGF (venta, margen, com_desc, hg, ingreso aprox.) y totales comerciales.

`loadIgfCommitSnapshot` hace `SELECT * FROM igf.compromiso_lines` y **solo imprime 4 campos**. El recálculo de producto (`recalcularUtilYResultado`) usa más: impuesto, bancos, provisión, presupuesto, folios ZP/carro, depósito, corporativos, inversiones, util. oper., resultado.

Eso permite **composición** («qué línea se movió»), no causa de mercado.

`GET /igf-folios-detalle` lista `public.folios` por `mes_cargo` + planta + estatus/categoría. Solapa M6/M2. No es FK al KPI.

M9 COMPLETE ya compara venta/descuento/ingreso de periodos reales. Profundizar ARR en M8 duplicaría eso.

---

## Recheck especial M8

Annex + motor DICF + M9 ya leen `arr.ventas_diarias_cliente` / descuentos / forecast. Resto canónico = UI `/arr` y `POST /api/arr/load` (write/upload). **Sin capacidad causal nueva.** No.

---

## Recheck especial M5

Propósito canónico: **Excel** de gasto taller por unidad AT + hoja de duplicados. Helper `expandTallerRows` existe; tool `get_taller_at_analysis` sigue stub. M4 ya agrega familia TALLER. Frecuencia mensual. Colisión TALLER/AT/AR. Bajo el criterio 005 es **otra consulta descriptiva**. No gana por ser NO INTEGRADA ni por haber sido segundo en 004.

---

## Recheck especial M12 restante

Notas de revisión **ya** están. Resto: attachments/S3/PDF y CRUD. Más detalle del mismo tablero, no dominio nuevo. **No continuar por inercia.**

---

## Recheck especial M20

`app/page.tsx` reúne IGF mini + DICF + comentarios. Sin fuente propia. Redundante. Sin reasoning nuevo. No.

---

## Candidatos (14 puntos mandatorios)

M13/M16/M9/M3 COMPLETE. M2: EXIT_M2 vigente, sin evidencia nueva.

### M11 — expediente comercial (PARTIAL) — **ganador**

1. **Preguntas nuevas:** expediente del cliente (estado + escrito + acción + seguimiento); quién de la lista comercial tiene compromiso abierto y con qué texto.
2. **Ya cubierto:** listas dejaron/disminuyeron/aumentaron/nuevos; acciones DICF top-N; comentarios cola planta; bitácora si se pregunta aparte.
3. **Duplica:** no si el slice es la **cadena**. Sí si solo se suben límites 40/80 o se vuelven a listar las mismas acciones.
4. **Reasoning nuevo:** priorizar y seguir con evidencia cualitativa **almacenada**, no otra tabla.
5. **Conexión:** `cliente_key` / planta entre computeDicf, `dicf_acciones`, `cliente_comentarios`, historial.
6. **Fuente:** `dicf.computeDicf`; `arr.dicf_acciones`; `arr.dicf_accion_historial`; `arr.cliente_comentarios`. Sin `dicf_acciones_attachments`.
7. **Helpers:** `loadCommercialStateForChat`, `summarizeDicfContext`, `loadClienteComentariosForDirectorIa` / `listClienteComentarios`. Falta loader de expediente.
8. **Intent/tool/executor:** intents y tools existen y están **separados**. No hay tool de expediente.
9. **Authz:** intersectar GA-block commercial_state + DICF + planta; fail-closed a la más estricta.
10. **Side effects del slice:** ninguno. CRUD DICF / WhatsApp de acción = C.
11. **Dependencia externa:** no (lectura). Twilio solo en alta de acción (fuera).
12. **Primer slice:** un cliente (o top-N de una categoría) con las cuatro capas; sin causa inventada; sin binarios.
13. **State after:** **PARTIAL**.
14. **Percentage effect:** **0.0** (PARTIAL ya vale 0.5).

### M7 — composición IGF (PARTIAL) — **segundo**

1. **Nuevas:** qué componente (HG, desc, folios ZP, carro, inversiones, corp) se movió vs el mes previo.
2. **Ya:** margen/venta/desc/HG e ingreso aprox. del annex; M9 deltas.
3. **Duplica:** M9 en venta/desc/ingreso; `igf-folios-detalle` solapa M6/M2.
4. **Reasoning:** composición del número, no causa ni acción.
5. **Conexión:** misma fila `compromiso_lines` mes A vs B; folios detalle = recorte de `public.folios`.
6. **Fuente:** `igf.versions` / `igf.compromiso_lines` (ya `SELECT *`).
7. **Helpers:** `loadIgfCommitSnapshot`, `loadIgfArrAnnexForChat`.
8. **Intent/tool:** `get_igf_snapshot` / annex ya cableados.
9. **Authz:** `acceso_igf_forecast_kpis`; GA/GV.
10. **Side effects:** PATCH IGF = C (fuera).
11. **Externa:** no.
12. **Primer slice:** imprimir el resto de columnas + delta vs mes previo; no afirmar causa.
13. **State after:** PARTIAL.
14. **%:** 0.0.

Pierde: no hay responsable/fecha/seguimiento; M9 ya explica periodos; es profundizar el mismo annex.

### M5 — Taller por AT (NO INTEGRADA)

1. Nuevas: gasto por unidad AT; duplicados de taller (≠ M16).
2. Ya: celda TALLER M4; tema AR Taller; listado M6.
3. Duplica si se vende como «taller» genérico.
4. Reasoning: bajo (lista).
5. Conexión: no une M3/M9/M11/M12.
6. Fuente: `public.folios` + `expandTallerRows`.
7. Helper: `expandTallerRows`; workbook = xlsx.
8. Tool stub `get_taller_at_analysis`.
9. Authz: JWT + `priv_clave`.
10. Slice JSON: sin write. Workbook = descarga.
11. No.
12. Query JSON por AT.
13. PARTIAL (+2.5 luego).
14. +2.5 luego; **0.0 ahora. No se elige por el +2.5.**

### M12 restante (PARTIAL)

Attachments/CRUD. Inercia + binarios/writes. No.

### M8 (PARTIAL)

Carga/UI. Duplica M9/DICF. No.

### M4/M6/M18 restantes (PARTIAL)

COMPARAR/xlsx; Export; writes/cheques/WhatsApp. Inercia + C/Excel/Twilio. El dato de consulta ya está. No.

### M20 (INDIRECTA)

Composición de `/`. Sin fuente. No.

### M2 restante (PARTIAL)

EXIT_M2. Kanban HTTP / PDF / cheque / `kanban_flow`. No.

### M10 / M17 / WhatsApp

Canal ≠ conocimiento. Twilio. M10 narrativa LD solapa M9. No.

### M14 / M15 / M1 / M0 / M19

Admin write; S3/PDF; health de producto; gates; sistema paralelo C. No.

---

## Tabla comparativa

| rank | module | current_state | new_executive_questions | executive_value | reasoning_value | evidence_connectivity | incremental_value | actionability | frequency | source_ready | wiring_ready | dependencies | mutation_risk | semantic_risk | first_useful_slice | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **M11 expediente** | PARTIAL | estado+escrito+acción+cierre de un cliente | **4** | **5** | **5** | **4** | **5** | diaria | keys físicas sí; loader no | tools silos | no | CRUD C | medio (causa inventada) | expediente recortado | **PARTIAL** | 0 | **GANADOR** |
| 2 | M7 composición | PARTIAL | qué línea del KPI se movió | 3 | 4 | 3 | 3 | 1 | periódica | `SELECT *` ya | annex sí | no | PATCH C | medio (≠ causa) | desglose columnas | PARTIAL | 0 | **segundo** |
| 3 | M5 | NO INTEGRADA | taller por AT | 3 | 1 | 1 | 3 | 2 | mensual | `expandTallerRows` | stub | Excel | no | **alto** | query AT | PARTIAL | +2.5 luego | no (otra lista) |
| 4 | M8 | PARTIAL | carga/UI ARR | 2 | 1 | 2 | 1 | 1 | periódica | annex+M9 | annex | upload | load C | medio (M9) | nada útil | PARTIAL | 0 | no |
| 5 | M12 resto | PARTIAL | evidencias/CRUD | 2 | 1 | 1 | 1 | C | — | attachments | notas ya | **S3** | **C** | medio | no | PARTIAL | 0 | no (inercia) |
| 6 | M18 resto | PARTIAL | writes/cheques/WA | 1 | 0 | 0 | 0 | C | — | server | query hecha | **Twilio** | **C** | medio | no | COMPLETE dudoso | 0 | no |
| 7 | M4 resto | PARTIAL | COMPARAR/xlsx | 1 | 0 | 0 | 1 | C | rara | workbook | query hecha | Excel | **C** | medio | no | COMPLETE dudoso | 0 | no |
| 8 | M6 resto | PARTIAL | xlsx | 1 | 0 | 0 | 1 | 1 | rara | workbook | query hecha | Excel | no | bajo | no | COMPLETE | 0 | no |
| 9 | M15 | NO INTEGRADA | PDF/S3 | 3 | 2 | 1 | 1 | 2 | ocasional | `/media` | M2 metadata | **S3** | subir | medio | no | PARTIAL | +2.5 | no |
| 10 | M10 | NO INTEGRADA | narrativa LD | 2 | 2 | 1 | 1 | 1 | semanal | JSON | no | **Twilio** | envío C | medio (M9) | narrativa | PARTIAL | +2.5 | no |
| 11 | M17 | PARTIAL | canal | 1 | 0 | 0 | 0 | 0 | — | Twilio | link | Twilio | bot | medio | nada | PARTIAL | 0 | no |
| 12 | M20 | INDIRECTA | Home | 2 | 0 | 0 | 0 | 0 | — | M7/M11 | no | no | no | medio | cablear `/` | INDIRECTA | 0 | no |
| 13 | M14 | NO INTEGRADA | permisos | 2 | 0 | 1 | 1 | C | rara | admin API | stub | no | **C** | alto | lectura | PARTIAL | +2.5 | no |
| 14 | M1 | PARTIAL | health producto | 1 | 0 | 0 | 1 | 0 | rara | `/health*` | no chat | no | no | medio | GET | PARTIAL | 0 | no |
| 15 | M0 | PARTIAL | catálogo permisos | 1 | 0 | 0 | 0 | 0 | rara | JWT | gates | no | no | alto | — | PARTIAL | 0 | no |
| 16 | M2 resto | PARTIAL | kanban/cheque/PDF | 2 | 1 | 0 | 0 | 1 | — | EXIT_M2 | slices hechos | S3/HTTP | C | alto | no | PARTIAL | 0 | no |
| 17 | M19 | NO INTEGRADA | paralelo | 0 | 0 | 0 | 0 | C | — | stack propio | no | WhatsApp | C | alto | no | NO INTEGRADA | 0 | no |

---

## Ranking

Criterio 005: reasoning + evidencia conectada + actionability + preguntas nuevas. **No** porcentaje. **No** facilidad. **No** ranking 004. **No** continuar M12/M18/M4/M6. Penaliza otra lista, Excel/S3/Twilio/write, joins inventados y causalidad inventada.

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M11 expediente comercial** | Única cadena cotidiana estado→escrito→acción→cierre con keys físicas; hoy silos |
| **2** | M7 composición IGF | Mejor “por qué se movió el número”; pierde actionability y solapa M9 |
| 3 | M5 | Dominio nuevo, pero otra consulta + Excel + semántica TALLER |
| 4 | M8 / M12 resto / M4/M6/M18 resto | Duplicación, inercia o C |
| 5 | M15 / M10 / M17 / WhatsApp | S3 / canal |
| 6 | M20 / M14 / M1 / M0 / M2 resto / M19 | Poco o nulo valor de dirección |

---

## Ganador

**M11 — DICF + acciones + comentarios**, primer slice = expediente comercial read-only por cliente.

### Por qué gana

1. Habilita preguntas que **ninguna** tool responde hoy como cadena: estado + escrito + acción + seguimiento del mismo cliente.
2. No es otra lista. Las listas ya existen. Falta **conectar** evidencia.
3. `cliente_key` ya une commercial_state con acciones (conteo). El chat tira esa clave en `summarizeDicfContext`.
4. Actionability real: responsable, `fecha_compromiso`, estado, `resultado_cierre`, historial.
5. Priorización: de “quiénes disminuyeron” a “quiénes tienen seguimiento y qué dice el expediente”.
6. In-process, SELECT-only, sin Excel/S3/Twilio.
7. Reevaluación desde cero: 004 descartó M11 porque buscaba una consulta nueva (notas). Ese criterio **ya no aplica**.
8. **No** se eligió por porcentaje: el slice futuro vale **0.0 pp**.

### Preguntas nuevas (si el readiness confirma recorte y keys)

- Este cliente está en {dejaron|disminuyeron}: ¿qué comentarios hay, qué acción DICF y qué cierre?
- De la categoría comercial, ¿quién tiene acciones abiertas y con qué compromiso/fecha?
- ¿Qué se registró de seguimiento para {cliente} (historial + `resultado_cierre`)?

**No** las habilita: M5, M7 desglose, M12 notas, M4/M6/M18, M9 solo.

### Primer slice

```text
pregunta expediente / qué pasó con {cliente} / seguimiento de quienes disminuyeron
  → intent dedicado (readiness) — no silenciar con commercial_state_list
  → resolver cliente (entidad / cliente_key / nombre)
  → estado comercial (computeDicf, categoría observada)
  → comentarios (arr.cliente_comentarios por key)
  → acciones + historial + resultado_cierre
  → recorte; evidencia separada por capa
  → no causa inventada; no Plaud; no notas AR; no M2; no binarios
```

### Estado posterior / porcentaje

| | Esta tarea | Tras IMPL futuro del slice (si se autoriza) |
|---|---|---|
| M11 | PARTIAL | **PARTIAL** |
| Global | **50.0%** | **50.0%** (0.0 pp) |

COMPLETE de M11 **no** se otorga (attachments/universo/CRUD/Excel DICF siguen fuera).

### Riesgos

- Inventar «dejó de comprar porque…».
- Tratar comentario como causa estructurada o acción como ítem AR.
- Mezclar bitácora/Plaud o notas M12 como capa del expediente.
- Authz laxa (GA ve commercial_state vía el join).
- Volcar 40 acciones × 80 comentarios sin recorte.
- Subir límites o attachments y venderlo como el mismo slice.

### Dependencias

`dicf.computeDicf`, `arr.dicf_acciones`, `arr.dicf_accion_historial`, `arr.cliente_comentarios`, `buildClienteKey`. Sin S3/Excel/Twilio en lectura. Authz = intersección fail-closed.

### Gates del readiness/IMPL futuro

G2/G3 no (PARTIAL previsto; no se toca contrato). G1 nuevo para el readiness y, si aplica, para el IMPL.

---

## Segundo lugar

**M7 — IGF Forecast** (desglose composicional de `compromiso_lines`).

### Por qué pierde

1. Explica **qué línea** se movió, no **qué hacer** ni **quién** sigue.
2. M9 ya compara periodos reales de venta/descuento/ingreso.
3. `igf-folios-detalle` recorta folios que M6/M2 ya pueden listar; no hay FK al KPI.
4. Es profundizar el annex ya on-demand, no una cadena de evidencia nueva.
5. El +0.0 pp **no** decide; M11 también es 0.0. Gana M11 por reasoning + actionability + conexión.

No se elige M5 como segundo «porque 004 lo dijo». Bajo 005, M5 es otra consulta.

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001`

Fijar: capas y orden; `cliente_key` obligatorio en proyección; fallback nombre; recorte; intersección de authz; wording que no mute a lista comercial; prohibición de causa inferida; fronteras Plaud / notas AR / M2 / binarios. No IMPL directo: los helpers existen, el expediente no.

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
On branch architecture/director-ia-global-next-module-prioritization-005
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md
```

Solo los dos archivos autorizados.

## STOP
