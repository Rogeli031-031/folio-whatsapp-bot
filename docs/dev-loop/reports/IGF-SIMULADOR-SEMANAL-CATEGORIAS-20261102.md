# IGF simulator, weekly history and category table

State: DONE_PENDING_REVIEW. Base: 1a551de (origin/main).
Branch: feature/igf-simulador-semanal.

## Request and authority

The user explicitly authorized implementing this integration as an exception to the file-based task authorization requirement: “adelante lo autorizo”. They also requested correcting the November summary and adding sales/discount tables by category/subcategory. CURRENT_TASK.md and all approval fields remain unchanged. No architectural contracts or Director IA runtime code were edited. No merge or production deployment was performed.

## Delivered behavior

- Each plant's Resultado Final - Importe opens its own simulator, including a pending-data view when its financial result is unavailable.
- Large rotatable SVG surface with compact controls, selected scenario, closest equilibrium and its sales/discount values, weekly trajectory and current monthly closing trend.
- Weekly sales and results are converted to monthly equivalents using the exact calendar duration of each period. Actual weekly figures and dates remain visible. Incomplete financial coverage never becomes a plotted result. Projected/partial periods have distinct markers and labels.
- Authenticated proposals are stored in a separate arr.igf_simulation_proposals table, scoped by canonical plant ID, year and month. Assumptions, source mode, cutoff and timestamp are retained; no session credentials are stored. Read/create/delete enforce financial role and plant permissions. Existing budgets and operational commissions are untouched.
- CASA/COMISIONISTA tables group existing ARR clients by subcategory, with monthly volume, discount cost and kg-weighted rate. Source sales/discounts end the day before the selected cutoff. Volume distribution uses the selected monthly target. Current classification and differences versus IGF are disclosed. This is a reference breakdown; changing aggregate scenario controls does not silently alter client-level rates or category mix.
- November missing-HG data no longer hides every plant's summary. Known values remain visible; income and final result dependent on missing HG remain null. Zone financial totals do not sum unknown results as zero, and weighted unit metrics require complete plant coverage.

## Verification

- 74/74 relevant tests pass, covering simulator math, global closest-equilibrium search, SVG pointer/touch rotation, partial rows, opening the correct plant, proposal validation/isolation, category weighting/cutoff and existing weekly/expense behavior.
- Final npm run build passes, including TypeScript checks and standalone preparation. Generated tracked .next files were restored; they are not included in the changes.
- node --check server.js and route module pass; git diff --check passes.
- General Director IA predeploy gate FAIL: 22 failed cases, identical IDs and first bad boundaries on this branch and a clean archive of origin/main (3 Tier1 planner failures and 19 runtime failures; 4 HTTP500). Logs are outside the repository in the parent workspace tmp directory. These unrelated issues were not changed.
- The older 059 Excel test “sin histórico la TARIFA del día 1 queda vacía y el dato propio prevalece” fails identically with the original test from origin/main at line 207. It concerns unchanged purchase-sheet code and is not attributed to this integration.
- Browser visual QA, live proposal persistence and production-data verification have not been performed. Database behavior was tested with controlled clients; the idempotent table/index are created on first authorized proposal access after backend deployment.

## Release status

Ready for human review of this scoped change. Production remains unchanged. The repository's manual G4 integration rule and the failing general predeploy gate must be resolved by the human before release. This report does not authorize or approve either gate.
