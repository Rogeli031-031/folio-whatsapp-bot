# Reporte — ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
contracts_modified: []
ambiguities_or_contradictions: >
  mandatory_candidates nombra M5/M14/M15/M18 con etiquetas que no coinciden
  con las fichas canónicas. Se evaluaron ambas: la ficha vigente y el frente
  nombrado. No se reenumeró la matriz.
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta priorización: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

Criterio cambiado: **valor ejecutivo real**, no otro COMPLETE fácil. 005 sigue vigente: no hay COMPLETE de un slice. Esta tarea **no** repite esa búsqueda.

Baseline recalculado y **no modificado**: **8.5 / 20 = 42.5%**.

**Ganador: M2 — Kanban / Folios**, primer slice = **estatus/etapa read-only**.

Hoy Director IA puede hablar de KPIs agregados (M3), deltas comerciales (M9), acciones AR (M12) y forecast on-demand (M7/M8). **No puede decir en qué etapa está un folio ni qué hay en el tablero.** El planner ya detecta esas preguntas (`folio_status` 0.92) y `UNSUPPORTED_RULES.kanban` las corta. Eso es el hueco cotidiano más grande.

El primer slice **no** llega a COMPLETE. Queda **PARTIAL** (comentarios + estatus). Efecto porcentual del primer slice: **0.0 pp**. Permitido: el porcentaje es terciario.

**Segundo lugar: M6** (query estructurada GASTOS/INVERSIONES → PARTIAL +2.5). Pierde por frecuencia (mensual vs diaria) y porque «qué gasto explica» es secundario a «qué está pasando en el flujo».

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001` — solo el primer slice seguro (SELECT; **nunca** `GET /kanban` ni `GET /folios/:id`).

---

## Ejecución

- Rama: `architecture/director-ia-executive-value-prioritization-001` (≠ `main`).
- HEAD: `ca52b3fd Merge branch 'architecture/director-ia-next-module-prioritization-005'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T13:55:52-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin writes. Sin COMPARAR. Sin commit/push/merge.

---

## 1. Cambio de estrategia

| 005 | 001 (esta) |
|---|---|
| Criterio: P(COMPLETE) en un slice | Criterio: valor ejecutivo / razonamiento / uso / actionability |
| Resultado: STOPPED, 0.0 pp | Resultado: un frente, varios slices, primer estado PARTIAL |
| M6 descartado como COMPLETE | M6 reevaluado como residual de valor (2.º) |
| M4 no es COMPLETE read-only | Se respeta; no se reabre como COMPLETE |

No se cambian etiquetas COMPLETE/PARTIAL/INDIRECTA/NO INTEGRADA.

---

## 2. Baseline (recontado, no alterado)

Fuente: fichas M0–M20 + Parte 9. M19 = N_A → denominador 20.

| Grupo | Módulos | Peso |
|---|---|---|
| COMPLETE | M3, M9, M13, M16 | 4.0 |
| PARTIAL | M0, M1, M2, M7, M8, M11, M12, M17 | 4.0 |
| INDIRECTA | M20 | 0.5 |
| NOT_STARTED | M4, M5, M6, M10, M14, M15, M18 | 0.0 |
| **Total** | | **8.5 / 20 = 42.5%** |

---

## 3. Mapa de capacidades actuales (qué ya puede responder)

| Pregunta tipo | ¿Hoy? | Fuente |
|---|---|---|
| ¿Qué planta tiene más folios activos / MXN? | Sí (agregado) | M3 `get_dashboard_kpis` |
| ¿Cuántos pendientes ZP? ¿Aging medio? ¿El más viejo? | Sí (1 fila oldest) | M3 |
| ¿Qué proyectos EN_CURSO hay? | Sí | M3 |
| ¿Qué cambió en venta / descuento / ingreso? | Sí | M9 |
| ¿Qué cliente explica un delta comercial? | Sí (corte 80/20 de la muestra) | M9 |
| ¿Qué acciones AR están abiertas / vencidas? ¿Quién? | Sí (top-N, sin notas) | M12 |
| ¿Qué tema AR concentra atraso? | Sí | M12 |
| ¿Qué oportunidades DICF / comentarios cliente? | Sí (límites) | M11 |
| ¿Cómo va margen / forecast IGF-ARR? | Sí, on-demand | M7/M8 annex |
| ¿Hay posibles duplicados? | Sí (heurística) | M16 |
| ¿Qué comentaron de un folio? | Sí (80) | M2 comentarios |
| **¿En qué etapa está el folio X?** | **No** (`SOURCE_NOT_INTEGRATED`) | intent existe, tool `executor:null` |
| **¿Qué folios hay en carro / cheque / depósito?** | **No** | kanban no integrado |
| **¿Quién movió / aprobó el folio?** | **No** | historial no integrado |
| **¿Qué listado GASTOS/INVERSIONES hay en el mes?** | **No** (o peor: «gastos» → IGF) | M6 |
| ¿Qué dice el Excel de clasificación / COMPARAR? | No | M4 PARTIAL_ONLY |
| ¿Hay cotización / factura / póliza? | No | M15 |
| ¿Cuál es el carro semanal de presupuesto? | No | M18 |

M3 **no** sustituye M2: da conteos y un solo folio más viejo, no el tablero ni la etapa de un folio pedido.

M12 **no** sustituye M2: acciones de mejora continua ≠ flujo de folios.

---

## 4. Mapa de huecos ejecutivos

| Hueco | Frente canónico | Novedad vs hoy | Frecuencia |
|---|---|---|---|
| Flujo operativo (etapa, atasco, tablero) | **M2** | Alta | Diaria |
| Listado de gasto/inversión de folios | **M6** | Alta (distinto de IGF) | Mensual |
| Timeline / quién movió | M2 slice 2 | Alta | Diaria-semanal |
| Cheque / póliza / depósito de un folio | M2 slice posterior (no M5) | Media | Semanal |
| Documentos que respaldan | **M15** (ficha; el prompt lo llamó M14) | Media | Ocasional |
| Carro semanal | **M18** (ficha; el prompt lo llamó M5/M18) | Media | Semanal |
| Matriz clasificación | M4 | Media-baja | Mensual |
| Excel taller AT | M5 canónico | Baja-media | Mensual |
| Profundizar IGF/ARR UI/`sources` | M7/M8 | **Baja neta** | — |
| Profundizar notas/evidencias AR | M12 | Baja (ya hay seguimiento) | — |
| Health liveness | M1 | Nula para dirección | — |
| Canal WhatsApp | M10/M17 | Nula como inteligencia | — |

**Nota de numeración:** el prompt etiqueta M5=Presupuestos/Cheques, M14=Documentos, M15=Usuarios, M18=Folios relacionados. Las fichas vigentes son: M5=Taller AT, M14=Usuarios admin, M15=Documentos, M18=Presupuestos semanales. Cheques/póliza = superficie M2. «Folios relacionados» no es un módulo.

---

## 5. Rechecks pedidos (sin reabrir 005)

### M4

Readiness 001: JSON = **PARTIAL_ONLY**. Preguntas nuevas de matriz sí; COMPLETE no. Valor 3. No gana.

### M6

Query estructurada (`expandCategoriaRows`) puede ser PARTIAL útil. No se descarta por Excel. Valor 4. Segundo lugar.

### M2

`GET /kanban` (L5410–5423) y `GET /folios/:id` (L12672) llaman `maybeAdvanceFolioToComprobaciones`. **No** son read-only. Helpers SELECT-only ya existen: `getFolioById` (L2869), `getManyFoliosStatus` (L2909), `getHistorialByFolioId` (L2892). Timeline GET (L12510) **no** muta.

### M7 / M8 — valor neto

El annex ya responde margen, forecast, top clientes. Igualar `sources.igf/arr` o cablear la UI **no** abre preguntas nuevas de director. Profundizar = bajo valor neto. No gana.

### M11 / M12

Ya cubren: abiertas, vencidas, responsable, tema, avance, riesgo, comentarios cliente, DICF. El hueco es notas/evidencias/top-N, no «no hay seguimiento». Un slice más profundo es PARTIAL→PARTIAL con unicidad baja. No gana.

### WhatsApp (M10 / M17)

Canal ≠ conocimiento. El link `/director-ia` ya existe. Envío = C. Cero valor de inteligencia incremental.

---

## 6. Tabla comparativa

| module | current_state | executive_questions_enabled | executive_value | reasoning_value | frequency | actionability | new_information | existing_backend | existing_director_ia_wiring | primary_source | authz | plant_scope | mutation_risk | external_dependency | semantic_risk | first_useful_slice | state_after_first_slice | path_to_complete | estimated_effort | percentage_effect | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 | PARTIAL | ¿qué permiso tengo? | bajo | bajo | rara | baja | no | JWT | gates | usuarios | sí | sí | no | no | alto | catálogo permisos | PARTIAL | no es dominio | alto | 0 luego +2.5 | ficha M0 |
| M1 | PARTIAL | ¿el servicio está up? | 1 | nulo | rara | nula | no para negocio | `/health*` | header IA | process/DB | sin JWT | no | no | no | medio | `/health`+`/health-db` | PARTIAL | + health-proyectos (choca M3) | bajo | 0 / +2.5 dudoso | L5150 |
| M2 | PARTIAL (comentarios) | ¿etapa? ¿qué hay en carro/cheque? ¿qué está trabado? | **5 / Alta** | **alto** | **diaria** | **alta** | **sí** (M3 solo agrega) | kanban SELECT; `getFolioById`; `getManyFoliosStatus` | intent+tool `executor:null`; unsupported | `public.folios` | JWT+GV folios | `plantas_permitidas` | **GET mutan; helpers no** | no | medio (etapa vs estatus) | estatus/etapa SELECT | **PARTIAL** | status → timeline → cheque/póliza; nunca write; docs = M15 | medio | **0.0** primer slice; +2.5 solo al COMPLETE | L2869; L5374; planner 196 |
| M4 | NOT_STARTED | ¿comparativo mensual por categoría? | 3 | medio | mensual | media | sí | GET matriz JSON | unsupported | folios | GV; priv | `planta_id` | COMPARAR write | Excel COMPARAR | medio | lectura matriz | PARTIAL_ONLY | COMPLETE exige COMPARAR/Excel | medio | +2.5 si PARTIAL | Readiness 001 |
| M5 | NOT_STARTED | ¿gasto taller por AT? | 3 | medio | mensual | media | sí | xlsx | `taller_at`→expense | folios | GV; priv | sí | no | no | alto (≠ AR Taller) | query AT | PARTIAL | COMPLETE = Excel+duplicados | medio-alto | +2.5 | ficha M5 |
| M6 | NOT_STARTED | ¿qué GASTOS/INV del mes? ¿qué partida explica? | **4** | **alto** | mensual | alta | **sí** (≠ IGF) | xlsx + `expandCategoriaRows` | intents+tools null | folios | GV; priv | `planta_id` | no en GET | no | **alto** (gastos→IGF) | query JSON ambas familias | PARTIAL | COMPLETE = Export | medio | **+2.5** primer slice | L5908; planner 293 |
| M7 | PARTIAL | ¿margen/forecast? | 5 ya parcial | medio neto | periódica | media | **baja neta** | annex | `get_igf_snapshot` | `igf.*` | IGF permiso | sí | PATCH | no | medio | `sources.igf` | PARTIAL | UI/versiones | alto | 0 | EMPTY_SOURCES |
| M8 | PARTIAL | ¿proyección/top clientes? | 5 ya parcial | medio neto | periódica | media | **baja neta** | annex | `get_arr_snapshot` | `arr.*` | GA | sí | load = C | no | medio | `sources.arr` | PARTIAL | carga fuera | alto | 0 | ficha M8 |
| M10 | NOT_STARTED | ¿narrativa semanal descuento? | 2 | bajo (solapa M9) | semanal | baja | baja | JSON lectura | no | ARR | GA/GV | nombre | envío C | Twilio | medio | narrativa | PARTIAL | COMPLETE = envío C | bajo | +2.5 | ficha M10 |
| M11 | PARTIAL | ¿quién dejó de comprar? ¿comentarios? | 5 ya | medio neto | periódica | alta ya | baja | summarizers | tools | dicf_* | DICF | sí | CRUD | no | medio | subir límites | PARTIAL | attachments/UI | alto | 0 | ficha M11 |
| M12 | PARTIAL | ¿quién? ¿qué venció? ¿qué tema? | 5 ya | alto ya | diaria ya | alta ya | **baja** | board | tools | AR_* | DICF | sí | CRUD | no | medio | notas / quitar top-N | PARTIAL | evidencias+CRUD | alto | 0 | includeNotes false |
| M14 | NOT_STARTED | ¿quién tiene qué permiso? | 2 | nulo | rara | C si escribe | no | admin API | user_permissions | usuarios | clave | global | **C** | no | alto | lectura catálogo | PARTIAL | COMPLETE = administrar | medio | +2.5 teórico | Parte 9 C |
| M15 | NOT_STARTED | ¿qué evidencia (PDF) hay? | 4 | medio | ocasional | media | sí | media/docs | folio_documents null | folio_archivos | GV | sí | subir ALTO | **S3** | medio | metadatos existencia | PARTIAL | COMPLETE = superficie docs | alto | +2.5 | ficha M15 |
| M17 | PARTIAL | (canal) | — | nulo | — | nula | no | Twilio | link | Twilio | tokens | — | bot | Twilio | medio | nada útil | PARTIAL | Twilio | alto | 0 | ficha M17 |
| M18 | NOT_STARTED | ¿qué hay en el carro semanal? | 4 | medio | semanal | alta | sí | SQL embebido | budget_status null | presupuesto_* | GG | nombre | cheques ALTO | WhatsApp | alto | — (API carro ausente) | — | blocker | alto | 0 ahora | L15751 ≠ carro |
| M20 | INDIRECTA | lo de la Home | 2 | nulo | — | nula | no | M7/M11 | no | mismas | igual | — | no | no | medio | cablear página | INDIRECTA/PARTIAL | no es fuente | medio | 0 | ficha M20 |

Cheques/póliza (nombrados como «M5» en el prompt): tool `get_folio_financial_status` `executor:null`; `UNSUPPORTED_RULES.cheques/polizas`. Es **slice posterior de M2**, no un módulo aparte, y **no** es el primer slice (más estrecho y con semántica financiera).

---

## 7. Ranking por valor ejecutivo

| # | Frente | Por qué |
|---:|---|---|
| **1** | **M2 estatus/etapa** | Única pregunta diaria ya detectada y bloqueada; M3 no la cubre; actionability de atascos |
| **2** | **M6 query** | Única vía a «qué partida de gasto/inversión»; mensual; IGF si se hace mal |
| 3 | M2 timeline (slice 2) | «quién / por qué se movió»; depende del 1 |
| 4 | M15 metadatos docs | «qué evidencia»; S3; no diagnostica el flujo |
| 5 | M4 matriz | Comparativo; PARTIAL_ONLY; valor 3 |
| 6 | M18 carro | Alto si existiera API; blocker vigente |
| 7 | M12 más profundo | Ya entrega seguimiento |
| 8 | M11 más profundo | Ya entrega DICF/comentarios |
| 9 | M5 Taller AT | Excel; confunde con AR |
| 10 | M7/M8 más profundo | Valor neto bajo |
| 11 | M2 cheque/póliza | Útil; más estrecho que el tablero |
| 12 | M10/M17 | Canal |
| 13 | M1 / M14 / M20 / M0 | Poco o nulo valor de dirección |

---

## 8. Ganador

**M2 — Kanban / Folios**, trayectoria incremental. Primer trabajo: **consulta read-only de estatus/etapa**.

| Campo | Valor |
|---|---|
| Por qué gana | Cierra el hueco «qué está pasando» del flujo real. Frecuencia diaria. Parte 7 = 5. El planner ya lo pide. M3/M9/M12 no lo sustituyen. |
| Qué no puede hoy | Etapa de un folio; composición del tablero; atascos por etapa. Responde `SOURCE_NOT_INTEGRATED`. |
| Preguntas nuevas (primer slice) | Ver §9 |
| Primer slice | SELECT estatus/etapa + listado por planta/etapa. Sin GET mutantes. Sin write. Sin timeline. Sin docs. Sin cheque/póliza. |
| Estado después | **PARTIAL** (comentarios + estatus). Sigue sin ser COMPLETE. |
| % primer slice | **0.0 pp** (ya era 0.5). |
| % si un día COMPLETE | +2.5 pp → 45.0% (terciario; COMPLETE exige más slices). |

### Preguntas concretas que habilitaría el primer slice

Soportadas por `public.folios.estatus` + mapa etapa visual (misma semántica dashboard), **si** el folio está en el scope de planta:

- ¿En qué etapa/estatus está el folio {id/código}?
- ¿Qué folios de esta planta están en {aprobación / carro / cheque / depósito / comprobaciones / evidencias}?
- ¿Qué está trabado en {etapa} (listado, no causa)?
- ¿Cuántos hay en cada etapa visible? (conteo del mismo SELECT; no sustituye M3 pero concreta el tablero)

**No** las habilita el primer slice (fuente no cableada o mutación):

- ¿Por qué se movió? / ¿quién aprobó? → timeline (slice 2; `getHistorialByFolioId` existe, SELECT)
- ¿Tiene cheque/póliza/factura? → slice posterior / M15
- ¿Avánzalo / apruébalo / cancélalo? → C
- ¿Está reconciliado contra Excel? → M4

### Primer slice seguro

```text
pregunta etapa/estatus/tablero
  → folio_status (ya existe)
  → NO usar GET /api/dashboard/kanban
  → NO usar GET /api/folios/:id
  → tool get_folio_status
  → loader in-process
       → GV / plantas_permitidas / solo_zp_ad (igual o más restrictivo)
       → getFolioById | getManyFoliosStatus | SELECT estilo kanban SIN maybeAdvance
       → estatusToEtapaVisual / getEtapaVisibleLabel
  → evidencia + respuesta; openai_called false
```

Authz: JWT; bloqueo GV de folios; `assertPlantaPermitida`; no ampliar privados. Scope: solo planta del token / equivalentes. Sin HTTP interno. Sin cycle. Sin migration.

### Roadmap hasta COMPLETE (honesto; no se ejecuta)

1. **Slice 1 (este):** estatus/etapa + listado por etapa → sigue PARTIAL.
2. **Slice 2:** historial/timeline (`getHistorialByFolioId`; GET timeline no muta, igual extraer SELECT).
3. **Slice 3:** cheque/depósito/póliza **como campos** del folio (no S3).
4. **Fuera de M2:** documentos binarios = M15; carro = M18; writes = C.
5. **COMPLETE M2** solo cuando la consulta cubra el propósito «flujo operativo por etapas» (tablero + estatus + historial + datos operativos de lectura). Un slice no basta. **No se reinterpreta COMPLETE.**

### Riesgos del ganador

- Reutilizar un GET que auto-avanza a Comprobaciones.
- Confundir estatus técnico con etapa visual.
- Afirmar causa («está trabado porque…») sin historial.
- Mezclar AR «Taller» / proyectos M3 con el tablero.
- Listar folios `solo_zp_ad` sin permiso.
- Prometer COMPLETE o +2.5 en el primer slice.

### Dependencias / fit / gates

- `public.folios`; helpers en `server.js` (extraer, patrón M3).
- Intent/tool ya declarados.
- G2 **no**. G3 **no**. Cabe en `intent → tool → executor → helper → evidencia → respuesta`.
- No alimenta cycle. Compatible con OP/EB/EKS/IES como hecho de etapa (readiness lo confirma).

---

## 9. Segundo lugar — por qué pierde

**M6 — query GASTOS / INVERSIONES**

Habilitaría: ¿qué folios GASTOS/INVERSIONES hay en el rango? ¿qué subcategoría/partida suma? Distinto de IGF y de M9.

Pierde porque:

1. Frecuencia mensual vs diaria del tablero.
2. «Qué está pasando en el flujo» es la pregunta primaria de esta tarea; el gasto de folios la explica después.
3. Colisión `gasto(s)` → IGF (`PLANT_FINANCIAL_KPI_RE`).
4. COMPLETE sigue siendo Export (lección M4); el primer slice es PARTIAL. Eso no lo descalifica, pero no lo pone primero.

Si el humano más adelante quisiera M6, el primer slice sería la query JSON (no xlsx). No se propone ahora.

---

## 10. NEXT_TASK (una, no autorizada)

**`ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001`**

Solo el primer slice seguro: path SELECT, frontera contra GET mutantes, folio-id vs tablero, mapa etapa, authz/privados, tests. **No** timeline, docs, cheque, writes, COMPLETE.

No IMPL directo: los helpers viven en `server.js` junto a mutación; la readiness debe fijar la extracción.

| Gate | Valor |
|---|---|
| G1 | requerido para esa auditoría |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |

---

## Acciones no realizadas

- No código, runtime, frontend, tests, SQL, matriz, contratos.
- No writes, COMPARAR, uploads, WhatsApp.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- No se buscó un COMPLETE artificial.
- Baseline 42.5% no se alteró.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

```text
On branch architecture/director-ia-executive-value-prioritization-001
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md

no changes added to commit (use "git add" and/or "git commit -a")
```

HEAD: `ca52b3fd Merge branch 'architecture/director-ia-next-module-prioritization-005'`

Solo `CURRENT_TASK.md` y este reporte.

## STOP
