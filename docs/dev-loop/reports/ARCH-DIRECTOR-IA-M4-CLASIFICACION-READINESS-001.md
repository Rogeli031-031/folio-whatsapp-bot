# Reporte — ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "PARTIAL_ONLY"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: >
  CURRENT_TASK tiene ramas solapadas: partial_only (DONE_PENDING_REVIEW) y
  contract_or_architecture_decision_required (STOPPED) pueden dispararse
  ambas cuando COMPLETE exige COMPARAR/Excel. Se aplica expected_terminal_state
  + partial_only: la definición vigente es aplicable sin G2; la conclusión
  inequívoca es PARTIAL_ONLY. No se reinterpreta el contrato.
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (se leyó CLASIFICACION_PRIV_CLAVE en server.js; no se copia al reporte)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 de esta auditoría: N/A. COMPLETE de M4 no se redefinió."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

**PARTIAL_ONLY.** La lectura JSON de la matriz de Clasificación es real, SELECT-only e implementable in-process. **No** satisface por sí sola la definición canónica vigente de COMPLETE de M4.

M4 se llama **«Clasificación de apoyos + COMPARAR»**. El propósito empresarial vigente es **«Comparativo mensual por planta/categoría; reconciliación Excel»**. Parte 7 trata «solo lectura matriz» como integración **subconjunto** (Baja-Media), no como el módulo entero. Parte 9 lista M4 en NO INTEGRADA y marca COMPARAR que escribe folios como clase C.

No se reinterpretó la matriz para obtener +5.0 pp.

| Concepto | Valor |
|---|---|
| Baseline | **8.5 / 20 = 42.5%** (recontado en 004; no se asume otro) |
| +5.0 pp / 47.5% | **Rechazado** (exigiría COMPLETE) |
| Ganancia real si se implementara solo la lectura | **+2.5 pp** (NO INTEGRADA 0.0 → PARCIAL 0.5) → **9.0 / 20 = 45.0%** |
| DOCS COMPLETE | **No proponer** |

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005`, porque el ganador de 004 dependía de una hipótesis COMPLETE que esta auditoría falsifica. No IMPL encubierto como COMPLETE.

---

## Ejecución

- Rama: `architecture/director-ia-m4-clasificacion-readiness-001` (≠ `main`).
- HEAD: `7a5cfd93 Merge branch 'architecture/director-ia-next-module-prioritization-004'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T13:55:52-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin COMPARAR. Sin Excel. Sin escritura de folios. Sin commit/push/merge.

---

## 1. Definición canónica M4 (sin redefinir)

Fuente: ficha M4 + Parte 1 + Parte 7 + Parte 9.

| Campo | Texto vigente |
|---|---|
| ID / nombre | M4 — **Clasificación de apoyos + COMPARAR** |
| Propósito | Comparativo mensual por planta/categoría; **reconciliación Excel** |
| Cobertura | NO INTEGRADA |
| No consulta | Matrices clasificación, Excel, inspección/comparar/agregar/rechazar |
| Lectura posible | CONSULTAR / COMPARAR / RESUMIR (tipo de capacidad; hoy no cableadas) |
| Escritura posible | Actualizar/agregar folios vía comparar — ALTO; no en Director IA |
| Parte 1 COMPLETA | «consulta directamente **la fuente** y responde de forma consistente **dentro del alcance de esa fuente**» |
| Parte 7 | «Clasificación de apoyos (**solo lectura matriz**)» = integración de lectura, prioridad Baja-Media |
| Parte 9 | M4 en NO INTEGRADA; «COMPARAR que escribe folios» = C; «Tool lectura» sigue en «requieren herramientas nuevas» |

**COMPARAR** en Parte 1 es un *tipo de capacidad de lectura* (junto a CONSULTAR). **COMPARAR** en el nombre del módulo y en los POST es el *flujo de reconciliación Excel que puede escribir folios*. No son el mismo objeto.

El alcance de la fuente M4, según el nombre y el propósito, tiene **dos cláusulas**. Cerrar solo la primera (matriz JSON) deja la segunda (reconciliación Excel) fuera. Eso es **PARCIAL**, no COMPLETA.

Precedente contrario a 004: **M1** permanece PARCIAL aunque ya consulta `/health-director-ia`, porque el resto del dominio Health de producto sigue fuera. No se marcó COMPLETA por un subconjunto.

Precedentes M3/M9 no autorizan este salto: sus propósitos canónicos *eran* la consulta (KPIs/proyectos; deltas de periodos). La escritura era extra. En M4 la reconciliación Excel **está en el propósito**.

---

## 2. Clasificación JSON (lectura)

| Campo | Evidencia física |
|---|---|
| Ruta | `GET /api/dashboard/clasificacion-apoyos` (`server.js` 6520–6558) |
| Método | GET |
| Auth | `dashboardAuthMiddleware` + `dashboardBlockGVForbidden` |
| Side effects | **Ninguno en este handler.** Solo `SELECT` + `buildClasificacionMatrix`. Sin INSERT/UPDATE/DELETE. |
| Periodos | `mes_a`, `mes_b` query, `YYYY-MM`, **obligatorios**. `mes_a === mes_b` → 400. Sin default. |
| Planta | `planta_id` opcional. `resolvePlantasComparativo` |
| Query | `SELECT f.planta_id, f.categoria, f.importe, f.mes_cargo FROM public.folios` no CANCELADO, `mes_cargo = ANY`, `planta_id = ANY` |
| Privados | sin `priv_clave` válida: `solo_zp_ad = false`. Con clave: incluye privados |
| Helper | `buildClasificacionMatrix` (`lib/clasificacion-apoyos-excel.js` 89–167) |
| Categorías | `normalizeCat` → GASTOS / INVERSIONES / TALLER; el resto se descarta |
| Shape | `{ ok, mes_a, mes_b, mes_*_label, vs_label, planta_filtro, plantas[], totales, diffs_categoria }` |
| Ceros | celda ausente → `0` (`val()` usa `\|\| 0`). No es null |
| Freshness | live `public.folios`; sin snapshot |

`GET /clasificacion-apoyos/detalle` (6564–6636): desglose de una celda (`mes`, `planta` label, `categoria`). También SELECT-only. `importe` de folio puede ser `null` en el JSON de detalle.

El GET **no** revisa `plantas_permitidas`. `planta_id` omitido → las 6 provincias hardcodeadas. `planta_id` fuera de `PLANTAS_COMPARATIVO` → **fallback a todas** (`resolvePlantasComparativo` 22–28). Un path Director IA debería ser **más restrictivo** (exigir `planta_id` del scope; no fallback global).

---

## 3. Frontera COMPARAR

| Ruta | Método | Efecto |
|---|---|---|
| `/clasificacion-comparar/inspeccionar` | POST | Parsea Excel; no escribe |
| `/clasificacion-comparar` | POST | Exige `fileBase64`; SELECT folios; `compareExcelVsDashboard`; JSON de diffs. **No escribe** |
| `/clasificacion-comparar/agregar` | POST | **Crea folio** (`insertFolio`) + `UPDATE mes_cargo` (L6232–6233). GA 403. Exige `acceso_crear_folios` |
| `/clasificacion-comparar/rechazar` | POST | Escritura (rechazo CDJZ) |
| `/clasificacion-comparar/confirmar-mismo` | POST | Escritura |
| `/clasificacion-comparar/son-distintos` | POST | Escritura |

`lib/clasificacion-comparar.js`: parser/compare en memoria. **No** contiene SQL de mutación. Las escrituras están en `server.js`.

Parte 9: COMPARAR que escribe = **C**. No entra a Director IA.

COMPARAR **no** es separable del COMPLETE *del módulo M4 tal como está nombrado y definido*. **Sí** es separable de un slice de *lectura* (quedaría PARTIAL). Separarlo para declarar COMPLETE **sería reinterpretar el contrato**.

---

## 4. Frontera Excel

| Pieza | Rol |
|---|---|
| `GET /clasificacion-apoyos-excel` | Workbook xlsx; mismos `mes_a`/`mes_b`/`planta_id`/`priv_clave` |
| `buildClasificacionApoyosWorkbook` | Hoja COMPARATIVOS = misma lógica de suma que la matriz JSON |
| Hojas extra | Detalle GASTOS/INVERSIONES/TALLER por planta + Movimientos; queries adicionales (`folio_historial` fecha_envio, `detalle_lineas`, etc.) |

Excel **no** es la fuente primaria de la matriz (esa es `public.folios` + `buildClasificacionMatrix`). Tampoco es un clon exacto del JSON: el xlsx **añade** hojas de detalle.

El detalle por celda ya existe en JSON (`GET /detalle`). El xlsx es **exportación empaquetada**, no un requisito canónico *adicional* para *consultar la matriz*.

Sí es requisito canónico de la **segunda cláusula del propósito** (reconciliación Excel / COMPARAR). Por eso Excel no se «saca» de COMPLETE sin recortar el propósito.

---

## 5. Determinación COMPLETE vs PARTIAL_ONLY

`completion_test`: ¿un slice read-only satisface COMPLETE vigente de M4 sin COMPARAR/Excel/escrituras?

**NO.**

| Criterio `complete_ready` | ¿Cumple? |
|---|---|
| Definición canónica permite COMPLETE read-only | **No** (nombre + propósito + Parte 7 subconjunto) |
| Matriz JSON cubre consulta de comparativo | Sí |
| Fuente primaria real | Sí (`public.folios`) |
| Sin side effects en GET matriz/detalle | Sí |
| Authz preservable (más restrictiva) | Sí, si se endurece |
| COMPARAR separable *para COMPLETE* | **No sin reinterpretar** |
| Excel separable *para COMPLETE* | **No** (está en el propósito) |
| Un slice cierra gaps de COMPLETE | **No** |

`partial_only` aplica: lectura JSON válida y útil; COMPLETE canónico exige también reconciliación COMPARAR/Excel.

No STOPPED: no hay contradicción que impida concluir. No BLOCKED: no falta gate para *esta* auditoría. G7 no se abre: el texto vigente basta.

---

## 6. Planner / tools / capabilities

| Pieza | Estado |
|---|---|
| Capability `clasificacion_apoyos` | `coverage: none`, `canRead: false`, `canWrite: false`. Descripción: «Matrices **y comparación Excel**» |
| `UNSUPPORTED_RULES.clasificacion_apoyos` | Bloquea «clasificación de apoyos» / «comparar clasificación» → `SOURCE_NOT_INTEGRATED` |
| Planner | **Cero** intents `clasificacion*` |
| Tools | **Cero** `get_clasificacion*` |
| Chat | Sin rama; cae al gate de unsupported |
| Cycle | No entra |

Patrón M3/M9 es técnicamente aplicable a la **lectura**. No convierte esa lectura en COMPLETE.

---

## 7. Authz / planta / periodos / datos

**Authz dashboard (GET matriz):** JWT; GV 403; `priv_clave` opcional para `solo_zp_ad`. **No** `plantas_permitidas`. GA no está bloqueado en lectura (sí en POSTs COMPARAR).

**Director IA (si hubiera slice PARTIAL):** exigir `planta_id` del scope; fallar si no está en `PLANTAS_COMPARATIVO` (**no** fallback a las 6); no ampliar privados; no aceptar `priv_clave` desde el chat; GV 403. Igual o más restrictivo que dashboard.

**Periodos:** `YYYY-MM`; A≠B; ambos obligatorios; sin default en el GET. Un loader no debe inventar meses. Vacío de filas → matriz de ceros (semántica fuente), no error.

**Contrato de datos:**

- Observado: `importe` de folios no cancelados, `mes_cargo`, categoría normalizada.
- Agregado: sumas por planta canónica × mes × {GASTOS, INVERSIONES, TALLER}.
- Derivado: `total`, `diff`, `diffs_categoria`, labels ES.
- Cero fuente: categoría/planta/mes sin filas → 0.
- Null: `importe` null en detalle de folio se preserva; no debe volverse 0 en evidencia de línea.
- Unidad: MXN redondeado en matriz.

---

## 8. Tabla de evidencia

| surface | canonical_requirement | current_state | endpoint_or_helper | source | method | side_effects | authz | plant_scope | period_contract | response_shape | existing_director_ia_wiring | missing_delta | required_for_complete | testability | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Matriz JSON | Comparativo mensual | Existe; IA no la llama | `GET /clasificacion-apoyos` + `buildClasificacionMatrix` | `public.folios` | GET | no | JWT+GV; priv opcional; sin `plantas_permitidas` | `planta_id` opcional; fallback todas | A≠B obligatorio | matrix JSON | unsupported | loader+intent+tool+chat | **parcial** (consulta) | alta | medio (ceros, fallback) | L6520; L89–167 |
| Detalle JSON | Desglose celda | Existe | `GET /clasificacion-apoyos/detalle` | `public.folios` | GET | no | igual | label de `PLANTAS_COMPARATIVO` | un `mes` | folios[] | no | opcional en slice PARTIAL | no para COMPLETE | alta | bajo | L6564 |
| Excel xlsx | Export + hojas detalle | Existe | `GET /clasificacion-apoyos-excel` | folios + historial | GET | no (export) | igual | igual | A≠B | xlsx | no | no cablear | **sí para propósito «reconciliación Excel»** | baja | medio | L5592 |
| COMPARAR inspect/diff | Reconciliar vs Excel | Existe | POST comparar* | Excel + folios | POST | inspect/diff: no write | GV; GA 403 en write | planta de hojas | `mes_cargo` | diffs | no | **no integrar** | **sí para COMPLETE del módulo** | media | **C** si write | L6023–6233 |
| COMPARAR write | agregar/rechazar/… | Existe | POST agregar/… | `public.folios` | POST | **INSERT/UPDATE** | `acceso_crear_folios` | item.planta_id | mes_cargo | folio nuevo | no | **prohibido** | sí si COMPLETE=módulo entero | alta | **C** | L6166+ |

---

## 9. Tabla de gaps

| gap_id | surface | missing_capability | required_for_complete | reusable_component | proposed_physical_change | architecture_change | contract_change | authz_change | estimated_complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Módulo M4 | Reconciliación Excel / COMPARAR en Director IA | **sí** para COMPLETE vigente | `clasificacion-comparar.js` + POSTs | Integrar write/Excel en chat | no | no (el contrato ya lo exige) | sí (C) | alto | **sí** — clase C; no hacer |
| G2 | Matriz JSON | Wiring IA | no (solo PARTIAL) | `buildClasificacionMatrix` | loader in-process patrón M3/M9 | no | no | endurecer planta | medio | no para PARTIAL |
| G3 | Intent/tool | no existen | no para COMPLETE | capability id | crear en un IMPL PARTIAL | no | no | no | bajo | no |
| G4 | Authz IA | `plantas_permitidas` + no fallback global | para cualquier slice | `assertM3*` / `assertM9*` | fail-closed | no | no | más restrictivo | bajo | no |
| G5 | COMPLETE documental | DOCS COMPLETE | — | — | **no proponer** | — | reinterpretaría M4 | — | — | **sí** |

---

## 10. Delta físico (si un humano pidiera solo PARTIAL, no COMPLETE)

No se implementa aquí. El delta mínimo de **lectura** (resultado contractual: PARCIAL, no COMPLETA):

```text
pregunta ("clasificación de apoyos" / comparativo mensual)
  → retirar UNSUPPORTED solo para lectura (no «comparar clasificación» write)
  → intent nuevo o mapeo
  → tool read-only
  → loader in-process
       → authz (GV, planta_id scope, no fallback 6 plantas, no priv_clave de chat)
       → mes_a/mes_b de la pregunta o fail-closed (no inventar)
       → SELECT folios + buildClasificacionMatrix
  → respuesta con matriz; openai_called false
```

In-process: **sí** (mismo patrón M3/M9). Extraer query + `buildClasificacionMatrix`. Sin HTTP interno. Sin cycle. Sin COMPARAR. Sin xlsx. Sin migration. Sin contrato nuevo.

Authz/scope: **sí**, si se endurece respecto del GET dashboard (`planta_id` obligatorio del scope; fail-closed si el id no está en `PLANTAS_COMPARATIVO`).

Side effects del slice de lectura: **ninguno** (SELECT + helper puro).

Eso **no** cierra COMPLETE. No autoriza `IMPL-DIRECTOR-IA-M4-CLASIFICACION-001` como si fuera COMPLETE.

### Archivos que tocaría un IMPL PARTIAL (no tocados ahora)

| Archivo | Cambio probable |
|---|---|
| `lib/director-ia-m4-clasificacion.js` (nuevo) | loader SELECT + `buildClasificacionMatrix` |
| `lib/director-ia-chat.js` | rama intent antes de OpenAI |
| `lib/director-ia-planner.js` | intent `clasificacion_apoyos` o equivalente |
| `lib/director-ia-tools.js` | tool read-only + executor |
| `lib/director-ia-capabilities.js` | `canRead`/coverage PARCIAL; recortar UNSUPPORTED de lectura |
| `server.js` | **no** reusar GET HTTP; no COMPARAR |
| `test/director-ia-m4-*.test.js` (nuevo) | tests del slice |
| `scripts/test-director-ia-*.js` | conteos si el IMPL los exige |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | **no** en el IMPL de código; DOCS COMPLETE **prohibido** |

---

## 11. Tests que harían falta (si hubiera IMPL PARTIAL)

No hay `test/*clasificacion*` hoy.

Mínimo: intent/gate; executor read-only; GA/GV/`planta_id`/cross-planta/fallback; A≠B; vacíos=0; error ≠ ceros; no IGF; no INSERT; e2e chat in-process. **No** tests que ejecuten COMPARAR write.

---

## 12. Riesgos

**Semánticos:** presentar la matriz como «ya reconciliado»; afirmar que `diff` es error; inventar categorías; usar ceros como «no hay dato» cuando la fuente coalesce a 0; colisión «COMPARAR» (verbo vs flujo write).

**Productivos:** fallback a 6 plantas; `priv_clave` en query; POSTs COMPARAR (C); no hay tests.

**Dependencias de un slice PARTIAL:** `public.folios`, lista hardcodeada `PLANTAS_COMPARATIVO`, JWT. Sin S3/Twilio/migrations.

**Fit:** la *lectura* cabe en arquitectura existente.

| Gate | ¿Requerido por esta auditoría? | Nota |
|---|---|---|
| G2 | **No** | Solo sería necesario si un humano quisiera *redefinir* M4 (quitar COMPARAR/Excel del propósito) para declarar COMPLETE=solo matriz. Esta tarea **no** lo pide ni lo hace. |
| G3 | **No** | No hace falta contrato nuevo para concluir PARTIAL_ONLY. |
| G8 | **No** | |

Cycle: no.

---

## 13. Feasibility COMPLETE / ganancia

| Pregunta | Respuesta |
|---|---|
| ¿COMPLETE read-only posible? | **No** |
| ¿PARTIAL_ONLY? | **Sí** |
| ¿STOPPED/BLOCKED? | **No** (conclusión contractual clara) |
| ¿+5.0 pp / 47.5%? | **No** |
| ¿Ganancia real de un IMPL de lectura? | **+2.5 pp → 45.0%** y etiqueta PARCIAL |
| ¿DOCS COMPLETE? | **No** |

---

## 14. NEXT_TASK (una, no autorizada)

**`ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005`**

004 eligió M4 por COMPLETE +5.0. Esa premisa es falsa. Hay que re-rankear M6, M1 y el resto **sin** tratar M4 como COMPLETE-ready. Un IMPL M4 PARTIAL sería otra decisión de producto (+2.5, valor 3) y no debe colarse como «el siguiente» de 004.

No `IMPL-DIRECTOR-IA-M4-CLASIFICACION-001`. No `DOCS-DIRECTOR-IA-M4-*`.

| Gate | Valor |
|---|---|
| G1 | requerido para la priorización 005 |
| G2 | N/A en esta auditoría; G2 solo si un humano quisiera *redefinir* M4 para hacer COMPLETE=solo matriz |
| G3 | N/A |
| G8 | N/A |

---

## Acciones no realizadas

- No código, tests, scripts, runtime, frontend, SQL, matriz, contratos.
- No se ejecutó COMPARAR ni se generó Excel ni se escribieron folios.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.

## secrets_check

none en el reporte. `CLASIFICACION_PRIV_CLAVE` existe en `server.js`; no se reproduce.

## git diff --check

limpio (exit 0, sin output)

## git status

```text
On branch architecture/director-ia-m4-clasificacion-readiness-001
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md

no changes added to commit (use "git add" and/or "git commit -a")
```

HEAD: `7a5cfd93 Merge branch 'architecture/director-ia-next-module-prioritization-004'`

## STOP
