# IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
sql_changes: false
docs_director_ia_changes: false
g2_created: false
constitution_touched: false
ies_04_touched: false
re_05_touched: false
new_intent: false
phrase_patch: false
focal_tests: "11/11 paraphrase battery + 55/55 CEL existente"
related_tests: "daily_executive_brief 23/23; sprint1 Q3 fallo preexistente en origin/main"
git_diff_check: "rama de trabajo"
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resultado

**DONE_PENDING_REVIEW.**

Se amplió el reconocimiento lingüístico de la need CEL existente `EXECUTIVE_STATUS`. No se construyó capacidad nueva. No se implementaron PERFORMANCE, DIAGNOSIS, PRIORITY ni TIME.

Las 18 frases `PARAPHRASE_PURE` de la auditoría llegan a `EXECUTIVE_STATUS`.

## 2. Autoridades consultadas

- `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md` (no modificado)
- `docs/dev-loop/LOOP_PROTOCOL.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001.md` (`audit_commit: 32621a11`)
- `origin/main` `4ed43213`

Contratos en `docs/director-ia/` no se modificaron.

## 3. Baseline físico (antes)

Sonda sobre `origin/main` `4ed43213` con la ruta real de chat:

`planDirectorIaQuestion` + `resolveExecutiveNeed` + `shouldHandleExecutiveStatus`.

| Métrica | Valor |
|---------|-------|
| Batería | 50 |
| Llegan a `EXECUTIVE_STATUS` (CEL) | 18 |
| Caen en `unknown` | 31 |
| Otra intención | 1 (`month_close_result`, frase 19) |
| `PARAPHRASE_PURE` → CEL | 12 / 18 |

IDs que ya llegaban a CEL: `1, 2, 3, 5, 7, 9, 12, 14, 15, 18, 21, 22, 25, 27, 30, 32, 38, 41`.

`PARAPHRASE_PURE` que faltaban: `4, 6, 13, 20, 24, 29`.

## 4. Frontera mínima

Propietario físico: `lib/director-ia-conversational-executive-layer.js`.

El planner no tiene intent `executive_status`. El intercepto vive en CEL.

Funciones exactas modificadas:

- `hasExecutiveStatusCue`
- `isExecutiveStatusQuestion`

Helpers nuevos (mismo archivo, no exportados):

- `isPersonalHowAreYouQuestion`
- `isNamedDayOverviewQuestion`

No se tocaron: pack, tools, fuentes, SQL, frontend, permisos, `buildExecutiveStatusPack`, contrato de respuesta.

## 5. Causa raíz

`hasExecutiveStatusCue` exigía `como` + una lista cerrada de verbos, o un cue de “situación / qué está pasando”. Eso perdía semántica equivalente:

- `qué tal` + `vamos` (sin `como`)
- verbos de marcha `marcha`, `pinta`, `encontramos`
- pedido de overview `resumen ejecutivo` / `reporte ejecutivo`

Además, `daily_executive_brief` es overridable por CEL. `¿Cómo va el día de hoy?` tenía cue de estado y el planner brief, y CEL se quedaba con el pack madre (colisión TIME).

## 6. Diff conceptual

1. Reconocer marcha/overview equivalente, no phrasebook de 50 `if`.
2. `qué tal` solo con `vamos|andamos` — no con `estas`, `marcha` ni `esta`.
3. Excluir `qué tal estás` de la need ejecutiva.
4. Excluir overview de **día nombrado** (`día` + `hoy`/`ayer`/`el día`) para no absorber TIME. `¿Cómo vamos hoy?` (sin `día`) sigue en CEL, como ya exigían los tests M1.

No se quitó `daily_executive_brief` de `CEL_OVERRIDABLE_PLANNER_INTENTS`. No se reimplementó el brief.

## 7. Cobertura antes / después

| Métrica | Antes | Después |
|---------|-------|---------|
| `PARAPHRASE_PURE` → `EXECUTIVE_STATUS` | 12 / 18 | **18 / 18** |
| Total CEL en la batería de 50 | 18 | 23 |
| `unknown` | 31 | 25 |
| Otra intención | 1 (`month_close_result`) | 2 (`daily_executive_brief` #7 + `month_close_result` #19) |
| Intención planner nueva | no | no |

Las 18 CEL previas: 17 siguen. La #7 deja de ser CEL por frontera TIME autorizada (`¿Cómo va el día de hoy?` → `daily_executive_brief`).

## 8. Tabla frase | clasificación | antes | después | PASS/FAIL

| frase | clasificación auditoría | antes | después | PASS/FAIL |
|-------|-------------------------|-------|---------|-----------|
| ¿Cómo vamos? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Cómo estamos? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Cómo estamos yendo? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Qué tal vamos? | PARAPHRASE_PURE | UNK | CEL | PASS |
| ¿Cómo está la planta? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Cómo marcha todo? | PARAPHRASE_PURE | UNK | CEL | PASS |
| ¿Cómo va el día de hoy? | SPECIALIZATION_TIME | BRIEF→CEL | daily_executive_brief | PASS |
| ¿Qué tal marcha el negocio? | SPECIALIZATION_DOMAIN | UNK | UNK | PASS |
| ¿Cómo se ve la situación? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Cómo avanza la operación? | SPECIALIZATION_DOMAIN | UNK | UNK | PASS |
| Dame el estado actual. | AMBIGUOUS | UNK | UNK | PASS |
| Dame un panorama de cómo vamos. | PARAPHRASE_PURE | CEL | CEL | PASS |
| Dame el resumen ejecutivo. | PARAPHRASE_PURE | UNK | CEL | PASS |
| ¿Cuál es la situación actual? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Cómo está el negocio? | SPECIALIZATION_DOMAIN | CEL | CEL | PASS |
| Preséntame el balance general de la jornada. | AMBIGUOUS | UNK | UNK | PASS |
| Requiero el estatus operativo general. | SPECIALIZATION_DOMAIN | UNK | UNK | PASS |
| Despliégame el reporte de situación de la planta. | PARAPHRASE_PURE | CEL | CEL | PASS |
| Dame una lectura rápida de cómo cerramos el indicador. | AMBIGUOUS | month_close_result | month_close_result | PASS |
| Pásame el reporte ejecutivo de cómo nos encontramos. | PARAPHRASE_PURE | UNK | CEL | PASS |
| A ver, ¿cómo vamos? | PARAPHRASE_PURE | CEL | CEL | PASS |
| Cuéntame cómo estamos. | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Qué tal las cosas? | AMBIGUOUS | UNK | UNK | PASS |
| ¿Cómo pinta esto? | PARAPHRASE_PURE | UNK | CEL | PASS |
| ¿Cómo anda la planta? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Qué onda con los números de hoy? | SPECIALIZATION_TIME | UNK | UNK | PASS |
| A ver, ¿cómo andamos por aquí? | PARAPHRASE_PURE | CEL | CEL | PASS |
| ¿Qué dice el tablero de control? | SPECIALIZATION_DOMAIN | UNK | UNK | PASS |
| Ponme al tanto de cómo marcha todo. | PARAPHRASE_PURE | UNK | CEL | PASS |
| ¿Cómo se está viendo el panorama en este momento? | SPECIALIZATION_TIME | CEL | CEL | PASS |
| ¿Estamos bien o mal? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Cómo está el desempeño? | SPECIALIZATION_PERFORMANCE | CEL | CEL | PASS |
| ¿Vamos mejorando? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Estamos cumpliendo? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Cómo vienen los resultados? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Qué tal está rindiendo la operación? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Estamos dentro de los objetivos o fuera? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Cómo va el nivel de cumplimiento actual? | SPECIALIZATION_PERFORMANCE | CEL | CEL | PASS |
| ¿El rendimiento va de acuerdo a lo planeado? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Estamos logrando las metas trazadas para el periodo? | SPECIALIZATION_PERFORMANCE | UNK | UNK | PASS |
| ¿Qué está pasando? | SPECIALIZATION_DIAGNOSIS | CEL | CEL | PASS |
| ¿Qué debería preocuparme? | SPECIALIZATION_DIAGNOSIS | UNK | UNK | PASS |
| ¿Qué está funcionando y qué no? | SPECIALIZATION_DIAGNOSIS | UNK | UNK | PASS |
| ¿Dónde estamos fallando? | SPECIALIZATION_DIAGNOSIS | UNK | UNK | PASS |
| ¿Dónde tenemos problemas? | SPECIALIZATION_DIAGNOSIS | UNK | UNK | PASS |
| ¿Qué tengo que atender? | SPECIALIZATION_PRIORITY | UNK | UNK | PASS |
| ¿Qué es lo más importante ahorita? | SPECIALIZATION_PRIORITY | UNK | UNK | PASS |
| ¿Dónde debería poner atención? | SPECIALIZATION_PRIORITY | UNK | UNK | PASS |
| ¿Qué requiere mi atención? | SPECIALIZATION_PRIORITY | UNK | UNK | PASS |
| ¿Qué tenemos pendiente importante? | SPECIALIZATION_PRIORITY | UNK | UNK | PASS |
| ¿Qué tal estás? | FALSE_POSITIVE | UNK | UNK | PASS |

`PARAPHRASE_PURE` PASS: **18 / 18**.

## 9. Fronteras preservadas

| Frase | Regla | Resultado |
|-------|-------|-----------|
| ¿Qué tal estás? | no estado ejecutivo | UNK |
| ¿Cómo va el día de hoy? | TIME / daily brief | `daily_executive_brief`, no CEL |
| ¿Estamos cumpliendo? | PERFORMANCE | UNK |
| ¿Qué debería preocuparme? | DIAGNOSIS | UNK |
| ¿Qué tengo que atender? | PRIORITY | UNK |
| Preséntame el balance general de la jornada. | AMBIGUOUS | UNK |
| Dame una lectura rápida de cómo cerramos el indicador. | no reparar | `month_close_result` |

Cero regresiones **nuevas** hacia `EXECUTIVE_STATUS` en TIME, PERFORMANCE, DIAGNOSIS, PRIORITY.

Las no-puras que ya eran CEL (`15`, `30`, `32`, `38`, `41`) se conservan. No se absorbieron `8`, `10`, `17`, `26`, `28`, `31`, `33–37`, `39–40`, `42–50`.

## 10. Frases que siguen sin cobertura `EXECUTIVE_STATUS` (y por qué)

Todas las no-`PARAPHRASE_PURE` que la auditoría dejó fuera, más la #7 TIME ahora en brief:

- DOMAIN `8, 10, 17, 28` — no son la madre.
- TIME `7, 26` — semántica de día / números de hoy.
- TIME `30` — sigue en CEL porque ya era una de las 18 previas y no es el ejemplo TIME protegido.
- PERFORMANCE `31, 33–37, 39–40` — no este slice.
- DIAGNOSIS `42–45` — no este slice.
- PRIORITY `46–50` — no este slice.
- AMBIGUOUS `11, 16, 23` — no forzar.
- AMBIGUOUS `19` — colisión `como cerr`; fuera de alcance.

Ninguna `PARAPHRASE_PURE` queda sin cobertura.

## 11. Tests ejecutados

- `node --test test/director-ia-executive-status-paraphrase-coverage.test.js` — 11/11
- `node --test test/director-ia-conversational-executive-status.test.js` — 55/55
- `node --test test/director-ia-daily-executive-brief.test.js` — 23/23
- `test/director-ia-sprint1-core-conversational-recovery.test.js` Q3 (`client_profile`) **falla igual en `origin/main`**; no es regresión de este slice. No se tocó.

La batería de 50 vive en `test/director-ia-executive-status-paraphrase-coverage.test.js` con clasificación de auditoría e intención esperada.

## 12. Archivos

Tocados:

- `lib/director-ia-conversational-executive-layer.js`
- `test/director-ia-executive-status-paraphrase-coverage.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001.md`
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001.md` (traído como evidencia; no reescrito)

No tocados: planner intents, chat contract, tools, SQL, frontend, `docs/director-ia/`.

## 13. Desvíos respecto a CURRENT_TASK

Ninguno material.

La métrica “no degradar las 18 que ya funcionan” convive con la frontera TIME autorizada: la #7 deja el pack madre y queda en `daily_executive_brief`. Las otras 17 CEL previas se conservan.

No se reparó `como cerr` (la auditoría lo sugería en otro corte; este G1 lo prohíbe).

## 14. Contradicciones / ambigüedades

Ninguna que bloquee este slice.

## 15. human_decision_needed

Revisión humana G4/G5. No merge. No push a `main`. No deploy.

## 16. STOP

No se inicia PERFORMANCE, DIAGNOSIS ni PRIORITY. Un `DONE` no autoriza la siguiente tarea.
