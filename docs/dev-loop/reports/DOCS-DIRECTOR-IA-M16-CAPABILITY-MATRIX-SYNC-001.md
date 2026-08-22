# Reporte — DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "server.js"
  - "lib/"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A. G3/G8 = N/A."
```

## Ejecución

- Rama: `docs/director-ia-m16-capability-matrix-sync-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T21:51:51-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin runtime, tests, commit, push, merge ni siguiente tarea.

## Definición canónica de M16 (antes de decidir)

Ficha Parte 2, sin reescribir el propósito:

| Campo | Valor canónico preexistente |
|---|---|
| Propósito | Detectar parejas de folios similares y **opcionalmente** cancelar |
| Lectura | DETECTAR RIESGOS / CONSULTAR |
| Escritura | CANCELAR folio desde UI — ALTO, capacidad **posible** |
| Parte 1 COMPLETA | Director IA consulta la fuente y responde de forma consistente **dentro del alcance de esa fuente** |
| Pregunta de negocio #14 | «¿Existen **posibles** folios duplicados?» — fuente `findDuplicatePairs` / `/analisis` |
| Parte 9 §9 clase C | Director IA **no** debe cancelar/editar folios de forma autónoma |

Cancelar no es requisito de COMPLETE: es opcional en el propósito y está prohibido como ejecución autónoma (clase C). Marcar COMPLETE no exige mutación ni redefinir M16.

## Evidencia de implementación (main)

`origin/main` incluye `c29102f2` / `54ccc92c` (`IMPL-DIRECTOR-IA-M16-DUPLICADOS-001`).

| Requisito | Evidencia |
|---|---|
| Intent `duplicate_folios` accesible | `lib/director-ia-planner.js`; chat rutea ese intent |
| `SOURCE_NOT_INTEGRATED` retirado solo para M16 | `UNSUPPORTED_RULES` ya no tiene `duplicados`; kanban/presupuesto siguen |
| `get_duplicate_folios` con executor real | `loadDuplicateFoliosForChat` |
| Fuente real `public.folios` | `loadFoliosParaDuplicados` |
| `findDuplicatePairs` reutilizado | umbral 0.72 sin recalibrar |
| Scope/authz | GV + `plantas_permitidas` GG/GA/AD |
| Evidencia estructurada | `possible_duplicate_heuristic` |
| Happy / empty / error | executor + `askDirectorIa` |
| Semántica de posibles duplicados | respuesta determinística; no confirmación |
| Sin mutaciones / HTTP interno / UI / cycle | IMPL + tests de fuente |
| Tests | focales 17/17; suite 416/416; capabilities 20/20; planner 28/28; orchestrator 19/19 |

Un endpoint solo no se usó como evidencia de COMPLETE. COMPLETE exige (y tiene) wiring accesible desde Director IA.

## Decisión G2

**G2 = N/A.**

La evidencia satisface la definición canónica de análisis/consulta de **posibles** duplicados. No se reinterpretó el propósito. No se convirtió «opcionalmente cancelar» en requisito de COMPLETE (eso habría sido redefinir M16 → G2 REQUIRED / STOP). No se hizo.

G3 = N/A. G8 = N/A.

## Estado anterior M16

- Cobertura: **NO INTEGRADA** / NOT_STARTED en el loop
- Información que sí consulta: ninguna
- Parte 4 #14: No / NO INTEGRADA
- Parte 9: listado en dominios NO INTEGRADA
- Scoring loop: 6.5/20 = **32.5%**

## Estado posterior M16

- Cobertura: **COMPLETA** (integración de la capacidad canónica de análisis)
- Consulta: `loadDuplicateFoliosForChat` → `findDuplicatePairs` sobre `public.folios`
- Semántica: **posibles** duplicados / candidatos heurísticos
- COMPLETE **no** significa confirmación determinística de cada par
- Cancelar / resolver / `/check` / Excel Taller: fuera
- Parte 4 #14: Sí (heurístico) / COMPLETA
- Parte 9: movido a dominios COMPLETA; retirado de NO INTEGRADA
- Scoring loop: 7.5/20 = **37.5%** (anotado en observaciones M16; el cuerpo de la matriz no tenía previamente esa cifra)

## Semántica de posibles duplicados

Se conserva en ficha, fuente Parte 3, pregunta #14 y lista COMPLETA. Prohibido afirmar fraude, intención o que un folio deba cancelarse.

## Scope / authz

Documentado: JWT dashboard, bloqueo GV, `plantas_permitidas` para GG/GA/AD, planta + equivalentes, exclusión CANCELADO, ventana temporal, `LIMIT 1500`.

## Tests

Registrados según evidencia IMPL (no reejecutados; esta tarea no modifica ni corre tests):

- M16 focal 17/17
- Suite Director IA 416/416
- capabilities 20/20, planner 28/28, orchestrator 19/19

## Porcentaje antes / después

| | Numerador | Denominador | % |
|---|---|---|---|
| Antes | 6.5 | 20 | 32.5 |
| Después (M16 COMPLETE = 1.0) | 7.5 | 20 | 37.5 |

M0–M15 y M17–M20 no cambian de etiqueta.

## Archivos modificados

1. `docs/dev-loop/CURRENT_TASK.md`
2. `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` (solo M16 y derivadas: fuente Duplicados, pregunta #14, Parte 9 §1/§2/§5/§6/§7, hallazgo 11 detector declarado, apéndice)
3. `docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md`

## Acciones no realizadas

- No runtime, código, tests, SQL, frontend.
- No M0–M15 ni M17–M20 (fichas).
- No contratos arquitectónicos ni índice.
- No mutaciones, UI, cycle, endpoint, algoritmo.
- No commit / push / merge / siguiente tarea.

## Cierre

- `status` = `DONE_PENDING_REVIEW`
- G2 = N/A
- STOP
