# Reporte — DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
m5_state_before: "NO INTEGRADA"
m5_state_after: "PARTIAL"
m5_complete: false
global_before: "10.0 / 20 = 50.0%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 2.5
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-m5-taller-at.js (lectura)"
  - "lib/director-ia-chat.js, tools, planner, capabilities (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M5; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M5 = PARTIAL. M5 != COMPLETE. 10.5/20 = 52.5%."
  - "Excel/workbook/duplicados/writes siguen fuera."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con el slice read-only de **M5 — Taller por AT** ya integrado (merge `848d3eb1`).

**M5 pasa de NO INTEGRADA a PARTIAL.** No se marcó COMPLETE. El propósito canónico sigue incluyendo Excel/workbook y hoja de duplicados.

**Porcentaje global: 10.0 / 20 = 50.0% → 10.5 / 20 = 52.5%** (+2.5 pp).

Unidad = token físico de `public.folios.unidad` (`AT-15` / `PT-03`). **No** `at_id`. **No** catálogo AT. Unidad ≠ responsable. `YYYY-MM` obligatorio; si falta, clarifica; no inventa mes. TALLER ≠ GASTOS ≠ INVERSIONES. Detalle M5 ≠ familia agregada M4. «cómo va Taller» sigue Action Register. Excel, workbook, duplicados, HTTP interno y writes **fuera**. Authz de folios fail-closed, sin cross-planta.

Ningún otro módulo cambió de etiqueta.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008`.

---

## Ejecución

- Rama: `docs/director-ia-m5-capability-matrix-sync-001` (≠ `main`).
- HEAD: `848d3eb1 Merge branch 'implementation/director-ia-m5-taller-at-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, contratos, Excel, duplicados, writes, commit, push, merge ni siguiente tarea.

---

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M5-TALLER-AT-001 |
| Merge | `848d3eb1` |
| Estado matriz M5 antes | NO INTEGRADA (0.0) |
| Estado matriz M5 después | **PARTIAL** (0.5) |
| COMPLETE | **no** |
| M0–M20 antes | 10.0 / 20 = **50.0%** |
| M0–M20 después | 10.5 / 20 = **52.5%** |
| Efecto | **+2.5 pp** |

Fórmula vigente: COMPLETE=1.0, PARCIAL/INDIRECTA=0.5, NO INTEGRADA=0.0.

---

## Implementación verificada / path físico

Verificado en HEAD (`lib/director-ia-m5-taller-at.js`, chat/tools/planner/capabilities):

```text
taller_at
  → get_taller_at
  → loadTallerAtForChat
  → SELECT public.folios (categoria LIKE '%TALLER%')
  → expandTallerRows
  → evidencia
  → respuesta
```

- Authz **antes** del SELECT: `assertFolioStatusAccess`.
- Stub Excel `get_taller_at_analysis` sigue `declared_not_integrated`.
- No se llama `buildTallerAtWorkbook`. No HTTP interno. No writes.

---

## UNIDAD

| Regla | Documentada |
|---|---|
| Campo físico | `public.folios.unidad` |
| Tokens | `AT-15` / `PT-03` (homologación `unidad-taller.parseUnidadesList` / `normalizeUnidadToken`) |
| `at_id` | **no existe** |
| Catálogo AT | **no existe** |
| Unidad ≠ responsable | sí |
| Fuzzy match silencioso | no |

---

## PERIODO

| Regla | Documentada |
|---|---|
| Formato | `YYYY-MM` obligatorio (un mes o rango de dos) |
| Falta periodo | clarificación; no inventa mes |
| Periodo inválido | error de fuente |

---

## TALLER / fronteras

| Frontera | Documentada |
|---|---|
| TALLER ≠ GASTOS | predicado `categoria LIKE '%TALLER%'`; distinto de M6 |
| TALLER ≠ INVERSIONES | sí |
| M5 detalle por unidad ≠ M4 familia agregada/comparativa | sí |
| TALLER ≠ Action Register | «cómo va Taller» / acciones AT-15 siguen AR |
| Excel / workbook | **fuera** (`buildTallerAtWorkbook`; GET `/taller-at-excel`) |
| Duplicados taller | **fuera** (detector ≠ M16) |
| Writes | **fuera** |
| HTTP interno | **fuera** |

---

## AUTHZ

| Regla | Documentada |
|---|---|
| JWT / contexto / rol | sí |
| `planta_id` / `plantas_permitidas` | sí |
| GV | 403 |
| GA | en planta autorizada |
| Cross-planta | 403 |
| Fail-closed | sí |
| Privados | excluidos (sin `priv_clave`) |
| Orden | authz **antes** del SELECT |

---

## Tests reportados (IMPL, no reejecutados aquí)

| Suite | Resultado reportado |
|---|---|
| Focal M5 | 16/16 |
| capabilities | 56/56 |
| planner | 49/49 |
| orchestrator | 26/26 |
| `test/director-ia-*.test.js` | 673/673 |
| `git diff --check` (IMPL) | limpio |

---

## Recálculo 10.0/20 → 10.5/20 (desde fichas)

Suma independiente de las 21 fichas M0–M20 **después** de cambiar solo M5:

| Etiqueta | Módulos | Puntos |
|---|---|---|
| COMPLETA (1.0) | M3, M9, M13, M16 | 4.0 |
| PARCIAL (0.5) | M0, M1, M2, M4, **M5**, M6, M7, M8, M11, M12, M17, M18 | 6.0 |
| INDIRECTA (0.5) | M20 | 0.5 |
| NO INTEGRADA (0.0) | M10, M14, M15, M19 | 0.0 |

Total: **10.5 / 20 = 52.5%**. Antes M5 valía 0.0 → 10.0. Ningún otro módulo cambió de etiqueta.

La nota «cómo va Taller → Action Register» permanece como colisión lingüística, **no** como score INDIRECTA de M5 (evitaría doble conteo).

---

## Cambios exactos en matriz

- Ficha M5: NO INTEGRADA → PARTIAL; path `loadTallerAtForChat`; `public.folios.unidad`; no `at_id`; `YYYY-MM`; fronteras Excel/duplicados/AR/M4/M6; authz; scoring 52.5%.
- Parte 1 superficie chat: añade `loadTallerAtForChat`.
- Catálogo Fuente: Taller por AT → PARCIAL; loader; 1 token; no catálogo.
- Parte 4 pregunta adicional: gasto Taller de AT-15 / PT-03.
- Parte 7: query marcada Hecha (PARTIAL); Excel/duplicados siguen fuera.
- Parte 9: M5 en PARCIAL; Excel/workbook/duplicados en residual NO INTEGRADA; capacidad CONSULTAR Taller por AT; fila §7 Excel; apéndice `lib/director-ia-m5-taller-at.js`.

No se cambió la etiqueta de M0–M4, M6–M20.

---

## Acciones no realizadas

- No se modificó código, runtime, tests, frontend, SQL, contratos.
- No se integró Excel, workbook, duplicados ni writes.
- No se marcó M5 COMPLETE.
- No se subió el global por encima de 52.5%.
- No commit, no push, no merge.
- No se autorizó ni ejecutó `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008`.

---

## Gates

| Gate | Estado |
|---|---|
| G1 | AUTHORIZED (`HUMAN_APPROVER` / `2026-08-23`); intacto |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | Pendiente de HUMAN_APPROVER |

---

## secrets_check

none

---

## git diff --check / git status

Ejecutados al cierre de esta tarea. `git diff --check` limpio. Solo los tres archivos autorizados cambian por esta sync.

---

## NEXT_TASK

Propuesta exactamente una (no autoriza G1; no encadena; no ejecutar):

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008`

Regla: repriorizar globalmente desde 52.5%. No continuar M5 por inercia.

---

## Confirmación de cierre

- M5 = **PARTIAL**
- M5 ≠ COMPLETE
- 10.5 / 20 = **52.5%**
- Excel / workbook / duplicados / writes siguen **fuera**
- Ningún otro módulo cambió de etiqueta
- STOP
