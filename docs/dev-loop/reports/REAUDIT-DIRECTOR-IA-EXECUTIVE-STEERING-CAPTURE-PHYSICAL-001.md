# REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001

```yaml
task_id: "REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS"
mode: "REAUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
g2_canonical_docs: false
f_authz_001_reproduced: false
f_corr_001_reproduced: false
new_critical: 0
new_major: 0
new_minor: 0
new_observation: 0
independent_probes: "60/60 pass"
focal_steering: "36/36"
director_ia_suite: "1101/1101 pass, 0 fail, 0 skipped"
git_diff_check: "clean"
next_task_proposed: "G2-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-SYNC-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Verdict

**PASS.**

F-AUTHZ-001 **no se reproduce**. F-CORR-001 **no se reproduce**. No hay hallazgo material nuevo.

No se heredó el PASS del FIX. 60 probes independientes (fuera de `test/director-ia-executive-steering-capture.test.js`) + reejecución real de suites.

## 2. Executive summary

El FIX localizado cerró ambos defectos:

- Autoridad steering por `role`/`rol_clave`/aliases documentados. `actor_nombre` no eleva. Sin `isDirectorZPForDashboard` en el módulo.
- `supersede_original: false` no deja dos CURRENT. Cadena con una sola atestación current-effective; historia intacta; `RECORDED` ≠ verdad.

Helper dashboard histórico **intacto** (sigue el heurístico de nombre para otros dominios).

## 3. F-AUTHZ-001 reproduction attempt

| Probe | Resultado |
|-------|-----------|
| A1 GA + «Director ZP» + Acapulco | DENY `UNAUTHORIZED`, class=NONE |
| A2 GG + «Director ZP» + assigned Puebla + Acapulco | DENY `SCOPE_DENIED`, class=**GG** |
| A3 GG + nombre + Puebla | ALLOW, class=**GG** (no ZP) |

**Reproduced: NO.**

## 4. Name-spoof probes

Variantes `Director ZP` / `director zp` / `DIRECTOR ZP` / `ZP Director` / `Dir ZP` / `Director-ZP` × roles GA, SEH, OTRA_CLAVE: class=NONE, persist deny. ACCESS_KEY + nombre: NONE. **18/18 name variants deny.**

## 5. Canonical ZP aliases

`ZP` `DIR_ZP` `DIRZP` `DIRECTORZP` `DIRECTOR_ZP` `DZP` `DIR-ZP`: cada uno class=ZP y RECORD Acapulco allow (ALL_PLANTS).

## 6. AD/GG/rest matrix

AD ALL_PLANTS allow. GG class=GG. GA/GV/CF_CDMX/GO NONE. USUARIOS DENY.

## 7. MULTI_PLANT regression

assigned [Puebla, Querétaro] + requested [Puebla, Acapulco]: DENY, events=0, plants=0, rels=0. Subset [Puebla, Querétaro]: ALLOW.

## 8. ZONE regression

Full assigned: allow. Partial: SCOPE_DENIED. Label-only: ZONE_UNRESOLVED.

## 9. Read leakage regression

MULTI Puebla+Acapulco: GG get sin `event`, list 0. ZONE análoga: invisible. Sin recorte.

## 10. F-CORR-001 reproduction attempt

`supersede_original: false` → original SUPERSEDED, correction CURRENT, currentN=1, `twoCurrent=false`.

**Reproduced: NO.**

## 11. supersede_original=false probe

Flag ignorado en original y en segundo eslabón de la cadena. No reabre el MINOR.

## 12. Original preservation

+40 t `raw_text` y `numeric_value=40` intactos. `attestation_state=RECORDED`. Relaciones CORRECTS + SUPERSEDES.

## 13. Current-effective semantics

Una sola fila `vigor=CURRENT`. `meaning.recorded=attestation_exists_with_provenance`. `meaning.not` incluye ORGANIZATIONALLY_CONFIRMED, APPROVED, ACTUAL, FINAL. No es verdad.

## 14. Correction chain

original → c1 → c2: n=3, original +40 preservado, dos primeros SUPERSEDED, current=c2. Ambos niveles con `supersede_original=false`.

## 15. Correction AUTHZ

GG assigned: allow. GG unassigned: deny. GG MULTI parcial + nombre Director ZP: deny. GA + nombre: UNAUTHORIZED.

## 16. RECORDED_BY / DECLARED_BY

auth actor_id 77 + body recorded_by 1 → captured=77. UNKNOWN no copia recorder.

## 17. Truth semantics

CORRECTION y SUPERSEDED no relabelan a CONFIRMED/APPROVED/ACTUAL/FINAL. SUPERSEDED = vigencia de cadena, no «era falso».

## 18. Other-domain isolation

Módulo sin SQL a igf / action_register / ventas_diarias / financial_state / compromiso_lines. COMMITMENT +40 + CORRECTION no tocan esos stores. Suites IGF/ARR/AF/AR/PRE_CLOSE/month_close: 0 fail.

## 19. Regression suites

Reejecutadas en este turno:

| Suite | pass/fail/skipped |
|-------|-------------------|
| Probes REAUDIT independientes | 60/0/0 |
| Focal steering | 36/0/0 |
| PRE_CLOSE | 37/0/0 |
| ACTUAL_FINANCIAL | 23/0/0 |
| IGF M7 | 13/0/0 |
| IGF reviewable | 26/0/0 |
| IGF FINAL | 28/0/0 |
| ARR | 24/0/0 |
| Action Register | 19/0/0 |
| month_close_result | 27/0/0 |
| `test/director-ia-*.test.js` | **1101/0/0** |

## 20. New findings

Ninguno. CRITICAL/MAJOR/MINOR/OBSERVATION nuevos: **0**.

## 21. Residual risks

- `role="Director ZP"` (campo clave) normaliza a alias `DIRECTORZP`. No es elevación por `actor_nombre`.
- `isDirectorZPForDashboard` sigue con heurístico de nombre **fuera** de steering.
- Inmutabilidad de producto, no de superusuario PG.
- Sin HTTP; la matriz se aplica al objeto `auth` in-process.

## 22. Matrix impact

10.5 / 20 = 52.5%. Delta **0.0 pp**. M0–M20 no modificados.

## 23. Exactly one NEXT_TASK

**`G2-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-SYNC-001`**

Sync documental/canónico de la materialización física. **No autorizada. No ejecutada.** Ownership contractual a decidir en ese G2.

## Findings table

| ID | ORIGINAL_SEVERITY | FIX_STATUS | REAUDIT_RESULT | EVIDENCE | FINAL_STATUS |
|----|-------------------|------------|----------------|----------|--------------|
| F-AUTHZ-001 | MAJOR | claimed CLOSED | **not reproduced** | A1–A5, Z1, I1–I3 | **CLOSED_CONFIRMED** |
| F-CORR-001 | MINOR | claimed CLOSED | **not reproduced** | C1–C7 | **CLOSED_CONFIRMED** |

STOP. No commit. No push. No merge. Código de producto intacto.
