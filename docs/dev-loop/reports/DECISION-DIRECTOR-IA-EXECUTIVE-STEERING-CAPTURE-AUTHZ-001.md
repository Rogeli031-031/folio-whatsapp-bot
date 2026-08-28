# DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001

```yaml
task_id: "DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001"
phase: "final_human_decision_recorded"
outcome: "DONE_PENDING_REVIEW"
mode: "HUMAN_AUTHZ_DECISION_PREPARATION"
implementation: false
permissions_changed_in_code: false
runtime: false
usuarios_is_role: false
authz_decision: "RESOLVED"
view: "ZP+aliases+AD ALL_PLANTS; GG ASSIGNED_PLANTS; REST NO"
record: "ZP+aliases+AD ALL_PLANTS; GG ASSIGNED_PLANTS; REST NO"
record_types: "same authority for PROPOSAL/DECISION/COMMITMENT/CAUSE/CORRECTION (first slice)"
correction_higher_authority: false
declared_by_neq_recorded_by: true
multi_plant_gg: "YES iff ALL plants in ASSIGNED_PLANTS; else FAIL CLOSED"
zone_gg: "YES iff entire event scope contained in ASSIGNED_PLANTS; else FAIL CLOSED"
confirm: "FUTURE / AUTHZ_DECISION_REQUIRED"
approve: "FUTURE / AUTHZ_DECISION_REQUIRED"
organizational_confirmation: "PENDING / FUTURE"
organizational_supersede: "FUTURE / AUTHZ_DECISION_REQUIRED"
link_action: "FUTURE / AUTHZ_DECISION_REQUIRED"
plaud_record: false
llm_record: false
director_ia_autonomous_record: false
live_copilot_record: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001.md"
files_not_touched:
  - "lib/"
  - "test/"
  - "sql/"
  - "docs/director-ia/"
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. HUMAN_DECISION = RESOLVED

HUMAN_APPROVER resolvió las 22 preguntas (2026-08-26). Cursor **no** inventó la matriz.

| Capacidad first slice | Quién | Scope |
|-----------------------|-------|--------|
| VIEW | ZP + aliases documentados; AD | ALL_PLANTS |
| VIEW | GG | ASSIGNED_PLANTS |
| VIEW | resto + USUARIOS ACCESS_KEY | NONE |
| RECORD (cinco tipos) | ZP + aliases; AD | ALL_PLANTS |
| RECORD (cinco tipos) | GG | ASSIGNED_PLANTS |
| RECORD | resto + USUARIOS ACCESS_KEY | NONE |

Semántica de `RECORDED` **no** cambia: atestación con provenance ≠ confirmado / aprobado / ejecutado / cumplido / target / forecast / actual / FINAL.

No se implementa middleware, tabla, API ni runtime en esta tarea.

---

## 2. Matriz final

| ROLE | VIEW | VIEW_SCOPE | RECORD | RECORD_SCOPE | PLANT | MULTI_PLANT | ZONE |
|------|------|------------|--------|--------------|-------|-------------|------|
| ZP + aliases documentados | YES | ALL_PLANTS | YES | ALL_PLANTS | YES (cualquier planta) | YES (ALL_PLANTS) | YES |
| AD | YES | ALL_PLANTS | YES | ALL_PLANTS | YES (cualquier planta) | YES (ALL_PLANTS) | YES |
| GG | YES | ASSIGNED_PLANTS | YES | ASSIGNED_PLANTS | YES solo assigned | YES solo si **todas** assigned; si una queda fuera: **DENY / FAIL CLOSED** | YES solo si el scope **completo** cabe en assigned; si no se demuestra: **DENY / FAIL CLOSED** |
| GA | NO | NONE | NO | NONE | NO | NO | NO |
| GV | NO | NONE | NO | NONE | NO | NO | NO |
| CF_CDMX | NO | NONE | NO | NONE | NO | NO | NO |
| CDMX | NO | NONE | NO | NONE | NO | NO | NO |
| ZC | NO | NONE | NO | NONE | NO | NO | NO |
| GO | NO | NONE | NO | NONE | NO | NO | NO |
| SG | NO | NONE | NO | NONE | NO | NO | NO |
| SEH | NO | NONE | NO | NONE | NO | NO | NO |
| OTRA_CLAVE / no autorizado explícitamente | NO | NONE | NO | NONE | NO | NO | NO |

RECORD aplica por igual a: `RECORD_PROPOSAL`, `RECORD_DECISION`, `RECORD_COMMITMENT`, `RECORD_HUMAN_DECLARED_CAUSE`, `RECORD_CORRECTION`.  
No hay permisos separados por tipo en este slice. Los tipos **siguen** siendo semánticamente distintos.

### ADMIN_FUNCTIONS (no es fila de rol)

| Function | VIEW | RECORD |
|----------|------|--------|
| USUARIOS (`Tomza-Priv` ACCESS_KEY) | NO. No es rol. ACCESS_KEY no concede VIEW | NO. ACCESS_KEY no concede RECORD |

JWT fallback que etiqueta GO/SG/SEH/OTRA_CLAVE como `GG`: la autoridad mira la **clave/autorización real**, no el colapso JWT. Si no es ZP/AD/GG autorizado explícitamente → DENY.

---

## 3. Respuestas a las 22 preguntas

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | ¿AD VIEW? | YES, ALL_PLANTS |
| 2 | ¿ZP + aliases VIEW? | YES, ALL_PLANTS |
| 3 | ¿GG VIEW? | YES, ASSIGNED_PLANTS |
| 4 | ¿Resto VIEW? | NO, NONE (GA, GV, CF_CDMX, CDMX, ZC, GO, SG, SEH, OTRA_CLAVE) |
| 5 | ¿AD RECORD? | YES, ALL_PLANTS |
| 6 | ¿ZP + aliases RECORD? | YES, ALL_PLANTS |
| 7 | ¿GG RECORD? | YES, ASSIGNED_PLANTS |
| 8 | ¿GA RECORD? | NO |
| 9 | ¿GV RECORD? | NO |
| 10 | ¿CF_CDMX RECORD? | NO |
| 11 | ¿CDMX RECORD? | NO |
| 12 | ¿ZC RECORD? | NO |
| 13 | ¿GO RECORD? | NO |
| 14 | ¿SG RECORD? | NO |
| 15 | ¿SEH RECORD? | NO |
| 16 | ¿OTRA_CLAVE RECORD? | NO |
| 17 | ¿RECORD igual para los cinco tipos? | YES en first slice (misma autoridad; semántica de tipos intacta) |
| 18 | ¿CORRECTION autoridad más alta? | NO en first slice. Misma matriz RECORD |
| 19 | ¿Quién RECORD PLANT? | ZP/AD cualquier planta; GG solo assigned; resto NO |
| 20 | ¿Quién RECORD MULTI_PLANT? | ZP/AD ALL; GG solo si **todas** assigned (fail closed); resto NO |
| 21 | ¿Quién RECORD ZONE? | ZP/AD YES; GG solo si el scope entero está contenido en assigned (fail closed); resto NO |
| 22 | ¿Registrar declaración de otra persona? | YES si el capturador tiene RECORD. `DECLARED_BY` ≠ `RECORDED_BY`. Sin inventar identidad |

---

## 4. VIEW scopes

- ZP + aliases / AD: ALL_PLANTS.
- GG: ASSIGNED_PLANTS.
- Resto: NONE.

No se reutiliza automáticamente ACTUAL_FINANCIAL; el humano **eligió** un patrón coincidente con PRE_CLOSE VIEW, como **decisión propia**, no como herencia.

---

## 5. RECORD scopes

Igual que VIEW para ZP/AD/GG. Resto NONE.

RECORD crea `attestation_state=RECORDED`. No concede CONFIRM/APPROVE.

---

## 6. PLANT / MULTI_PLANT / ZONE

Ver matriz §2. Fail closed para GG: una planta o un fragmento de zona fuera de assigned → DENY.  
Zona Provincia completa: GG **no** si el evento incluye plantas fuera de su scope, o si no se puede demostrar contención.

---

## 7. DECLARED_BY vs RECORDED_BY

Obligatorio preservar cuando son personas distintas.

Ejemplo aprobado: gerente de Acapulco declara +40 t; ZP registra.

- `DECLARED_BY` = gerente (KNOWN_USER / FREE_TEXT / UNKNOWN)
- `RECORDED_BY` = ZP

ZP no se convierte en declarante. Speaker no demostrado → `UNKNOWN` / `FREE_TEXT_SPEAKER`. No inventar `KNOWN_USER`.

---

## 8. CORRECTION authority

Misma RECORD authority que los otros tipos en este slice.

CORRECTION = nueva atestación + historial intacto. ≠ ORGANIZATIONAL_CONFIRMATION, APPROVAL, VERIFIED_TRUE, ACTUAL, FINAL. Original no se borra. Sin overwrite destructivo.

---

## 9. CONFIRM / APPROVE / SUPERSEDE / LINK_ACTION

| Capacidad | Estado |
|-----------|--------|
| CONFIRM | FUTURE / AUTHZ_DECISION_REQUIRED |
| APPROVE | FUTURE / AUTHZ_DECISION_REQUIRED |
| Organizational confirmation | PENDING / FUTURE. RECORD no la concede |
| SUPERSEDE organizacional | FUTURE / AUTHZ_DECISION_REQUIRED. ≠ registrar CORRECTION |
| LINK_ACTION | FUTURE / AUTHZ_DECISION_REQUIRED. COMMITMENT ≠ ACTION |

No se diseñan ni implementan.

---

## 10. Automated systems = no RECORD authority

| Actor | RECORD |
|-------|--------|
| Plaud | NO |
| LLM | NO |
| Director IA autónomo | NO |
| Live copilot | NO |

CANDIDATE ≠ RECORDED. Un evento canónico futuro exige acción gobernada de un actor **con** RECORD.

---

## 11. No-herencia

Congelado:

- PRE_CLOSE access ≠ RECORD
- Action Register access ≠ RECORD
- Bitácora access ≠ RECORD
- IGF access ≠ RECORD
- ACTUAL_FINANCIAL access ≠ RECORD
- USUARIOS ACCESS_KEY ≠ RECORD

Esta matriz es la fuente de decisión para `EXECUTIVE_STEERING_CAPTURE`.

---

## 12. Riesgos / guardrails

- JWT que colapsa OTRA_CLAVE → `GG`: **fail closed** si la clave real no es GG/ZP/AD.
- GG + zona sin roster demostrable: DENY (no inventar plantas de Zona Provincia).
- CF_CDMX escribe bitácora/AR y **no** tiene VIEW/RECORD steering: no “arreglarlo” por analogía.
- RECORD de declaración ajena no autoriza afirmar cumplimiento ni forecast.
- CORRECTION con misma autoridad puede cambiar `vigor`; sigue siendo atestación, no FINAL.
- No middleware en esta tarea: IMPL debe aplicar fail closed **antes** de SQL.

---

## 13. Evidencia física (auditoría previa, no reabierta)

Roles/aliases/scopes observados en repo (DECISION financiera + `usuario-permisos.js`, `dashboard-es-zp.js`, PRE_CLOSE composer, AR helper, `canViewFinancialActual`, USUARIOS `Tomza-Priv`) permanecen como **evidencia**. La autoridad steering **solo** es la matriz §2.

---

## 14. Reevaluación del STOP físico

`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001` quedó STOPPED **solo** por RECORD/WRITE.

G2 Index/EKE/CAPACIDADES: el ARCH físico eligió **C** (después de IMPL). El contrato v1.0 ya es autoridad semántica. G2 **no** es gate previo a IMPL.

Esta decisión elimina el único bloqueo. No aparece otro prerrequisito contractual/físico.

---

## 15. Matrix M0–M20

| | |
|--|--|
| Baseline | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| Modificada | **No** |

---

## 16. Exactly one NEXT_TASK

**`IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`**

| Campo | Valor |
|-------|--------|
| Por qué IMPL | AUTHZ RESOLVED; ARCH física ya diseñada; G2 posterior |
| Alcance esperado | First slice B: persist/read `RECORDED`; fail closed según esta matriz; sin Plaud/Consejo/CONFIRM/AR link/UI |
| Autorizada | **No** |
| Ejecutada | **No** |

STOP. No commit. No push. No merge.
