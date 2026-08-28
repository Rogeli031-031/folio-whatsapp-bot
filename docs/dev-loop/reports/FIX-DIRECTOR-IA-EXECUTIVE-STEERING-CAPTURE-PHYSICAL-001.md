# FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001

```yaml
task_id: "FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
sql_changes: false
matrix_changes: false
g2_canonical_docs: false
dashboard_helper_changed: false
f_authz_001: "CLOSED"
f_corr_001: "CLOSED"
focal_tests: "36/36 pass, 0 fail, 0 skipped"
director_ia_suite: "1101/1101 pass, 0 fail, 0 skipped"
git_diff_check: "clean"
next_task_proposed: "REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive result

**DONE_PENDING_REVIEW.** Ambos hallazgos CLOSED con evidencia ejecutada.

FIX localizado al dominio steering. `isDirectorZPForDashboard` **no** se modificó. SQL `020` no se tocó. Contrato/ARCH/AUTHZ decision / docs canónicos / G2 intactos.

## 2. Files changed

| Archivo | Por qué |
|---------|---------|
| `lib/director-ia-executive-steering-capture.js` | F-AUTHZ-001 + F-CORR-001 |
| `test/director-ia-executive-steering-capture.test.js` | Focales adversariales de cierre |
| `docs/dev-loop/CURRENT_TASK.md` | IN_PROGRESS → DONE_PENDING_REVIEW |
| este reporte | evidencia |

No tocados: `dashboard-es-zp.js`, `sql/020`, `docs/director-ia/`, PRE_CLOSE, AF, AR, IGF, composer.

## 3. F-AUTHZ root cause

`isZpToken` delegaba a `isDirectorZPForDashboard(clave, nombre)`, que trata `/director/i` + `/zp/i` en `actor_nombre` como ZP. Un GA/GG con ese display name obtenía ALL_PLANTS.

## 4. Authz fix

Validación **local** `isGovernedZpClave`: solo `role` / `rol_clave` ∈ aliases documentados. Se eliminó el `require` de `dashboard-es-zp`. `actor_nombre` / `rol_nombre` no entran a la clase.

GG con nombre «Director ZP» sigue siendo **GG** (ASSIGNED_PLANTS).

## 5. ZP alias semantics

Lista congelada (case + strip de espacios): `ZP`, `DIR_ZP`, `DIRZP`, `DIRECTORZP`, `DIRECTOR_ZP`, `DZP`, `DIR-ZP`.

No se inventaron aliases. `role="Director ZP"` normaliza a `DIRECTORZP` (alias de **clave**, no de nombre). `actor_nombre="Director ZP"` con rol GA/GG **no** eleva.

## 6. Authz negative probes

Ejecutados en `FIX F-AUTHZ-001`:

| Caso | Resultado |
|------|-----------|
| GA + nombre Director ZP | DENY UNAUTHORIZED |
| GG + nombre + Acapulco unassigned | DENY SCOPE_DENIED |
| GG + nombre + Puebla assigned | ALLOW como GG |
| SEH + nombre | DENY |
| OTRA_CLAVE + «ZP Director» | DENY |
| cada alias + spacing | ZP ALL_PLANTS |
| AD / GG canónicos | AD / GG |
| «director  zp» / «Director de Z.P.» como nombre + GA | NONE |
| ACCESS_KEY (test 6 previo) | DENY |

VIEW y RECORD siguen `authorizeSteeringScope` (misma matriz).

## 7. Other-domain/helper regression

Helper global intacto. Consumidores (`composer`, `financial-actual`, `igf-financial-final`, `dicf-acciones`, `server.js`) no se tocaron.

Suites: PRE_CLOSE 37, AF 23, IGF 13+26+28, ARR 24, AR 19, month_close 27 — 0 fail.

## 8. F-CORR root cause

`supersede_original: body.supersede_original !== false` permitía al caller dejar original y CORRECTION ambos `CURRENT`.

## 9. Contract interpretation

No es `SEMANTIC_DECISION_REQUIRED`.

- Contrato §6: «El original pasa a vigencia SUPERSEDED»; patrón nuevo event + ref; sin overwrite.
- ARCH §16: SUPERSEDES append-only; **rechazó flag suelto (C)**.
- ARCH §15: CORRECTION + CORRECTS; SUPERSEDES cuando el sucesor reemplaza vigencia. Una CORRECTION canónica **es** ese sucesor.

No se inventó tercera semántica. No es SUPERSEDE organizacional / APPROVE / CONFIRM.

## 10. Correction fix

`supersede_original` queda **siempre true** en el normalizador. El body `false` se ignora. Toda CORRECTION válida: event nuevo + CORRECTS + SUPERSEDES + `vigor` del target SUPERSEDED en la misma TX.

SQL no requirió cambio.

## 11. Current-effective semantics

`list({ vigor: "CURRENT" })` = atestación no superseded. Sigue `meaning.recorded=attestation_exists_with_provenance` y `meaning.not` incluye APPROVED / ORGANIZATIONALLY_CONFIRMED / FINAL / ACTUAL. No `is_current=truth`.

## 12. History preservation

Cadena original → correction1 → correction2: 3 eventos, payloads originales intactos, dos primeros SUPERSEDED, último CURRENT.

## 13. Authz correction checks

GG fuera de assigned: deny (test 25). GG MULTI parcialmente fuera: deny, original CURRENT.

## 14. Regression

| Suite | pass/fail/skipped |
|-------|-------------------|
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

## 15. Tests

Focales nuevos: F-AUTHZ-001 (12 subcasos), F-CORR-001 (opt-out + chain), GG MULTI correction deny. Suite +3 vs 1098 previos.

## 16. Findings closure table

| ID | SEVERITY | ROOT_CAUSE | FIX | TEST | STATUS |
|----|----------|------------|-----|------|--------|
| F-AUTHZ-001 | MAJOR | Name heuristic vía helper dashboard | Clave/alias gobernados only; sin import del helper | `FIX F-AUTHZ-001` pass | **CLOSED** |
| F-CORR-001 | MINOR | Flag caller `supersede_original` | Siempre SUPERSEDES en CORRECTION; body ignorado | `FIX F-CORR-001` ×2 pass | **CLOSED** |

## 17. Remaining risks

- `role="Director ZP"` (campo de **clave**) sigue siendo alias `DIRECTORZP` por normalización de espacios. No es elevación por `actor_nombre`.
- Helper dashboard conserva heurístico de nombre para **otros** dominios (fuera de alcance).
- Inmutabilidad sigue siendo de producto, no de superusuario PG (AUDIT OBS-001).
- Sin HTTP; REAUDIT debe re-probar A10/A11.

## 18. Matrix impact

10.5 / 20 = 52.5%. Delta **0.0 pp**. M0–M20 no modificados.

## 19. Exactly one NEXT_TASK

**`REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`**

No autorizada. No ejecutada. G2 después de REAUDIT PASS.

STOP. No commit. No push. No merge.
