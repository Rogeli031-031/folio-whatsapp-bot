# IGF-TALLER-BOTON-FORECAST

```yaml
task_id: IGF-TALLER-BOTON-FORECAST
outcome: DONE
status: DONE_PENDING_REVIEW
files_touched:
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - docs/dev-loop/reports/IGF-TALLER-BOTON-FORECAST.md
files_not_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - "API de carga, base y permisos"
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: none
human_decision_needed:
  - "Revisar e integrar el PR. Falta protección de base para el merge asistido."
owner_chat_attestation:
  method: verified_owner_chat
  approved_at: "2026-11-25T04:35:19.721445+00:00"
  receipt_id: "4b9086ef-394b-4f8d-9519-d3f6bc7302bd"
  scope_sha256: "1272490afa65362debaae8b733e53ffb7f5bc46c1f7814b273632dedcd055066"
```

En IGF Forecast → IGF Diario acumulado, para Acapulco, se muestra **Reporte diario de taller** junto a **IGFDiario** si el servicio de acceso existente lo permite. Se reutiliza la carga y se conserva el acceso anterior de IGF Diario.

TypeScript sin emisión y revisión de diff aprobados. Ruta real local en Edge/Chromium a 1366 y 390 px con API simulada: ubicación junto a IGFDiario dentro del ancho, apertura, selección de archivo, vista previa y confirmación, ocultación para Todas, Puebla y Forecast, reaparición al volver, y ocultación con acceso denegado. No se hizo ninguna carga real ni se desplegó.
