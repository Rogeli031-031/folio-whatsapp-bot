# Reporte — IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
first_slice: "C — reviewable Folios read model + IGF counterfactual"
reviewability_model: "B_runtime_cancellable (reglas reales de cancelación)"
read_only: true
mutations: false
savings_claim: false
new_intent: "igf_reviewable_supports"
destination: "chat legado (askDirectorIa + planner + tools + conversation_state), NO Motor N1–N5, NO IES, NO Recommendation N5"
g2: "N/A"
g3: "N/A"
g5: "pending HUMAN_APPROVER"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "First slice C profundiza PARTIAL; no COMPLETE. 0.0 pp."
sql_017: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "test/director-ia-igf-reviewable-supports.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "lib/director-ia-capabilities.js"
  - "package.json"
  - "lockfiles"
  - "contracts"
  - "matrix"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001.md"
  - "server.js (cancelar, overlay IGF, recalcularUtilYResultado) — lectura"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/usuario-permisos.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - >
    server.js no se tocó. recalcularUtilYResultado y cubos IGF se copiaron
    con tests que anclan igualdad al cuerpo live; no se extrajo helper del
    dashboard (condicional: extraer solo si no cambia comportamiento).
  - >
    authCanVerFoliosSoloZpAd no está exportado en M2; el filtro usa
    usuarioPermisos.authHasPermiso(..., "acceso_ver_folios_solo_zp_ad").
  - >
    Excepción del guard cheques vive en askDirectorIa (capabilities.js
    fuera de writable). No habilita el módulo cheques.
next_task_proposed: "DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**First slice C implementado.** Director IA puede pasar de IGF del mes actual a una lectura **read-only** de Folios/apoyos reviewable según las reglas **reales** de cancelación, listar qué sigue siendo cancelable y qué ya no lo es, y calcular un escenario IGF contrafactual en memoria con la matemática live del overlay del GET dashboard.

REVIEWABLE = cancelable bajo las reglas actuales. **No** «no depositado = recortable».

- **No cancelable:** `PAGADO`, `CERRADO`, `COMPROBACIONES`, `EVIDENCIAS`
- **Fuera:** `CANCELADO`
- **Reviewable:** el resto, incluidos `CHEQUE_GENERADO`, `CUENTA_FONDOS`, `SOLICITANDO_PAGO`, `CANCELACION_SOLICITADA`, etapas de planta/carro

Director IA **no** cancela, no solicita cancelación, no mueve, no aprueba, no edita, no persiste el escenario.

El contrafactual se etiqueta **ESCENARIO HIPOTÉTICO**. Lenguaje: «Si estos folios dejaran de formar parte del cálculo bajo las mismas reglas actuales, el escenario matemático sería…». No se afirma ahorro, cash, ni que el IGF real mejorará.

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-igf-reviewable-supports-001` (≠ `main`).
- HEAD base: `3add2c5f Merge branch 'architecture/director-ia-igf-reviewable-supports-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, SQL, schema, matriz, commit, push, merge.

---

## Confirmaciones

| Requisito | Estado |
|-----------|--------|
| First slice C | Sí. Read model + contrafactual IGF. |
| Reglas reales de cancelación | Mismos 4 bloqueos que el dashboard. Resto reviewable. |
| No atajo «no depositado» | Clasifica por estatus, no por depósito. |
| Read-only | SELECT `public.folios`. Cero UPDATE/INSERT/DELETE. Sin endpoint de cancelar. |
| Pack: list / totals / status / category / amount / limitations / provenance | Sí. |
| Contrafactual IGF | Overlay live en memoria: actual / hipotético / delta / folios incluidos. |
| Misma matemática | `recalcularUtilYResultado` + cubos ZP / carro / depósito-cierre / inversiones mes actual. |
| No savings claim | Etiqueta obligatoria. Tests bloquean ahorrarías / IGF real mejorará / debes cancelarlos. |
| Cross-domain | IGF Puebla mes actual → «¿Qué podemos recortar de apoyos?» = same plant + same `mes_cargo` + Folios fresco. |
| Guard depósito/cierre | No cae a cheques `coverage:none` en este slice. «¿Tiene cheque…?» sigue bloqueado. |
| Riesgo comercial | Si falta join folio→cliente→venta, dice exactamente qué falta. |
| Ranking | Por importe = «para revisión». No recomienda cancelar. |
| 52.5% | 10.5 / 20. 0.0 pp. |
| Tests | Focal 26/26. Suite Director IA 897/897. `git diff --check` clean. |

---

## Mecanismo

1. Intent nuevo `igf_reviewable_supports` (dominios `folios` + `igf`). El planner lo resuelve **antes** de documentos / cheques / `igf_status`.
2. `isIgfReviewableSupportsQuestion` no captura cheque/póliza ni clasificación/comparativo M4.
3. Guard de capabilities: excepción mínima en `askDirectorIa` si el turno es este slice y el bloqueo es `cheques`. No habilita cheques.
4. Loader `loadIgfReviewableSupportsForChat`: misma planta (IDs equivalentes M3; Puebla 2 → `[2, 14]`), mismo `mes_cargo`, Folios fresco. `CANCELADO` fuera del listado. `solo_zp_ad` respeta permiso.
5. Clasificación: `classifyCancellationEligibility` = 4 estados no cancelables; resto reviewable.
6. Contrafactual: overlay de cubos sobre la fila snapshot IGF (`loadIgfArrSourceBlocksForChat`). Simula en memoria que los reviewable dejan de entrar. `ventaKg = venta_ton * 1000`. `deposito_cierre_kg` negativo si el total > 0. Inversiones live solo mes actual. GA 403 → lista sí, contrafactual no. Sin `venta_ton` no se inventa overlay cero.
7. `INHERITABLE_INTENTS` incluye este intent: «¿Cuánto suman?» hereda el pack. No se hereda `igf_status` (evitar pegarse a IGF).
8. Tool `get_igf_reviewable_supports` es read-only. Handler in-process. GPT opcional; fallback determinista.

`presupuesto_kg` y campos no-folio del snapshot **no** se reconsultan. `gtos_apoyos_corp_kg` no sale de esta lista. Limitaciones del pack lo declaran.

---

## Invariante de lenguaje

cancelable operacional ≠ materializado contable ≠ ahorro realizado.

No se llama «materializado» a todo lo no cancelable. Etiqueta preferida: «ya no cancelable bajo reglas actuales».

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal `test/director-ia-igf-reviewable-supports.test.js` | **26/26** |
| Reviewability (4 bloqueos + CANCELADO + elegibles) | pass |
| Authz GV/GA + misma planta/`mes_cargo` | pass |
| Misma math live + reconciliación contrafactual + no mutation | pass |
| IGF → apoyos + depósito/cierre no-cheques + inherit | pass |
| `node --test test/director-ia-*.test.js` | **897/897** |
| `git diff --check` | clean |

Cobertura focal incluye: planner hop, M4 no robado, cheque operativo sigue bloqueado, overlay kg, exclusión cubo, falta de venta no es overlay cero, riesgo comercial pide el vínculo, tool registry sin writes.

Preservados por la suite: IGF, Folios, daily sales, daily discount, cross-metric, topic return, action-person, persistent memory, M9, planner, capabilities, orchestrator.

---

## Límites (READY_WITH_LIMITS, no reabiertos)

- Closed-month IGF semantic fix: diferido.
- Historical forecast: diferido.
- Motor de riesgo comercial / ROI: diferido. El slice solo declara la ausencia del join.
- Mutations / SQL / schema / contratos / matriz: fuera.
- Overlay no reconsulta presupuesto del GET dashboard; usa snapshot.
- Inventario `docs/director-ia/` no se toca (sync documental es la NEXT_TASK).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-IGF-REVIEWABLE-SUPPORTS-SYNC-001`

STOP.
