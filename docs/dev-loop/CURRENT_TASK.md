task_id: AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001

status: BLOCKED
authorized_by: "Human Approver"
authorized_at: "2026-09-02T21:42:52-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-02 - LIVE_DB READ_ONLY audit only"
objective: Resolver con LIVE_DB READ-ONLY la discrepancia entre el margen visible de IGF Forecast ARR Acapulco agosto 2026 (≈ 7.32 $/kg) y el fail-closed de Director IA ante «¿Cuál es el margen de agosto?».

in_scope:
- consulta LIVE_DB estrictamente SELECT / READ-ONLY (solo tras G1 que ponga live_db_authorized: YES)
- igf.versions y igf.compromiso_lines para plant_code GLOBAL year=2026 month=8
- lectura de lib/director-ia-historical-margin.js (loadClosedMonth / findUniquePlantRow) para mapear reason
- lectura de server.js resolveIgfGlobalVersion / buildIgfForecastPayload (paridad dashboard)
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001.md

out_of_scope:
- modificar producto
- modificar tests
- cambiar Golden / Runtime expectations
- modificar docs/director-ia/
- nuevos contratos
- decidir si latest debe usarse como histórico
- implementar fallback FORECAST para mes cerrado
- continuidad historical_margin → como vamos?
- DB writes / schema / migrations
- merge a main
- deploy
- siguiente tarea

contracts_in_force:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
- docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md
- contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
- (solo tras G1) crear rama audit/director-ia-august-margin-version-parity-001
- (solo si G1 deja live_db_authorized: YES) SELECT READ-ONLY a igf.versions / igf.compromiso_lines 2026-08 GLOBAL
- mapear filas al reason de loadClosedMonth sin ejecutar producto
- escribir reporte
- commit en la rama de tarea
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- consultar LIVE_DB mientras live_db_authorized sea NO
- INSERT / UPDATE / DELETE / DDL
- modificar producto
- modificar tests
- cambiar contratos
- decidir que latest es histórico
- servir o proponer 7.32 como ACTUAL_FINANCIAL
- merge/push a main
- deploy
- abrir siguiente tarea
- almacenar secretos, connection strings o credenciales en el reporte

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-AUGUST-MARGIN-VERSION-PARITY-001.md

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: YES
## Estado

DRAFT. No hay Gate G1. No es ejecutable.

Esta auditoría **requiere** `live_db_authorized: YES` para ejecutarse. Hoy permanece `NO` hasta que un humano lo escriba en G1.

## Discrepancia a resolver (evidencia humana LIVE)

Planta: Acapulco.

IGF Forecast ARR, agosto 2026, columna MARGEN de planta ≈ **7.32 $/kg**.

Director IA, chat nuevo, sin herencia:

`¿Cuál es el margen de agosto?`

→ `No hay un margen histórico FINAL defendible para agosto 2026.`

Tracing previo (READ-ONLY, sin LIVE_DB): dashboard = `MAX(version_number)` GLOBAL sin filtro FINAL; Director IA mes cerrado = única `financial_state='FINAL'`. El `reason` físico exacto (`NOT_FINAL` vs `NO_PLANT_ROW` vs otro) queda **NOT_PROVEN** hasta esta auditoría.

7.32 y agosto son evidencia/fixture de la pregunta. No se incrustan en producto.

## Demostraciones obligatorias (después de G1 + LIVE_DB YES)

Consultar solo lectura y registrar:

1. todas las versiones GLOBAL de 2026-08: `id`, `version_number`, `financial_state`, `created_at`;
2. cuál es la latest por `version_number`;
3. si existe una o más versiones `FINAL`;
4. `margen_kg` de Acapulco en la latest;
5. `margen_kg` de Acapulco en FINAL, si existe (y si el matcher único de `findUniquePlantRow` sería unique / missing / ambiguous);
6. `reason` físico exacto que produciría `loadClosedMonth`: `NO_VERSION` / `NOT_FINAL` / `VERSION_AMBIGUOUS` / `NO_PLANT_ROW` / `PLANT_AMBIGUOUS` / `NULL_MARGIN` / `valid`;
7. si el 7.32 del dashboard es latest/current forecast, FINAL, o ambos;
8. si Dashboard y Director IA muestran correctamente dos estados epistemológicos distintos, o existe un bug real.

No concluir ausencia física de FINAL sin las filas. No concluir bug de producto solo porque el chat no copia el 7.32.

## Queries previstas (no ejecutar en DRAFT)

```sql
SELECT id, version_number, financial_state, created_at
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 8
 ORDER BY version_number DESC;

SELECT financial_state, COUNT(*)
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 8
 GROUP BY 1;

SELECT empresa, margen_kg
  FROM igf.compromiso_lines
 WHERE version_id = :latest_id
 ORDER BY empresa;

SELECT empresa, margen_kg
  FROM igf.compromiso_lines
 WHERE version_id = :final_id
 ORDER BY empresa;
```

Sustituir `:latest_id` / `:final_id` por los ids leídos. No copiar secretos al reporte. Redactar `empresa`/valores como evidencia de auditoría, no como hardcode de producto.

## Contratos a citar, no a cambiar

- EKE: FORECAST ≠ ACTUAL_FINANCIAL; missing ACTUAL_FINANCIAL no cae a FORECAST; mes cerrado no FINAL = `NOT_FINAL`.
- `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md`: `latest ≠ FINAL`; `mes transcurrido ≠ FINAL`.
- `loadClosedMonth`: mes cerrado exige única FINAL.

Esta tarea **no** decide si el chat debe usar latest como histórico.

## Completion

status: BLOCKED

LIVE_DB autorizada pero no alcanzable (sin DATABASE_URL / .env en el entorno).
SELECT no ejecutado.
NO merge.
NO deploy.
NO next task.

STOP.
