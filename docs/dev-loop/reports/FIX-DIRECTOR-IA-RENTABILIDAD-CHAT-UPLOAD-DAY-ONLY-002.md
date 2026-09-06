# FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002

```yaml
task_id: "FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
frontend_changed: false
formula_changed: false
delta_ingreso_changed: false
hardcoded_live: false
cutoff_date_used: false
first_bad_boundary: "askDirectorIa → assembleRentabilidadDeterioroSnapshot"
functional_line: "upload_day: (req && req.body && req.body.upload_day) || null"
rent_chat_cut_before: "001/002/003 FAIL; 004/005/006 PASS"
rent_chat_cut_after: "001..006 PASS"
rent_cut_after: "7/7 PASS"
delta_parity_after: "PASS"
delta_cut_after: "PASS"
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No next task."
```

## 1. BEFORE

Pack `test/director-ia-rent-chat-cut.test.js` primero. Cruza `askDirectorIa`.

```text
R-RENT-CHAT-CUT-001  FAIL   explicit cut no llegó; got=null
R-RENT-CHAT-CUT-002  FAIL   mini B upload_day=null
R-RENT-CHAT-CUT-003  FAIL   B util_oper MTD
R-RENT-CHAT-CUT-004  PASS
R-RENT-CHAT-CUT-005  PASS
R-RENT-CHAT-CUT-006  PASS
```

## 2. Cambio funcional

Única línea añadida en `lib/director-ia-chat.js`:

```js
upload_day: (req && req.body && req.body.upload_day) || null,
```

`git diff lib/director-ia-chat.js` no contiene `cutoff_date`.

## 3. AFTER

```text
R-RENT-CHAT-CUT-001..006     6/6 PASS
test/director-ia-rent-cut    7/7 PASS
R-DELTA-PARITY / R-DELTA-CUT PASS
TIER 1                       8/8 PASS
PRE-DEPLOY GATE              PASS
HTTP 5xx                     0
HARNESS FAILURE              0
NEW FAILURE                  0
```

`git diff --check`: sin errores.

## 4. Archivos

- `lib/director-ia-chat.js`
- `test/director-ia-rent-chat-cut.test.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-CHAT-UPLOAD-DAY-ONLY-002.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
