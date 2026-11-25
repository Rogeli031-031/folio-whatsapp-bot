# IGF-ACAPULCO-PIPAS-VENTA-TOTAL

- outcome: DONE
- Estado: DONE_PENDING_REVIEW; base revisada: `5a0b5a10f755191fe5bfe2f386a294f271317af9`.
- Alcance: cuatro hojas de pipas del IGF Diario Acapulco. Sumar Casa y Comisionista una vez por PDV de autotanque validado, sin depender del subcanal. La conciliación ARR sigue siendo obligatoria.
- Archivos tocados: `lib/igf-acapulco-productividad.js`, `lib/igf-acapulco-productividad-model.js`, `test/igf-acapulco-productividad.test.js` y este reporte.
- No tocados: `CURRENT_TASK.md`, ramas ajenas, exportador de otras plantas, taller, colores, folios, criterios A/B/C, calendario, hojas de estaciones, migraciones, permisos ni datos de producción.
- Contratos consultados: `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`, `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md`. Contratos modificados: ninguno.
- Contradicciones o desvíos: ninguno. La venta Comisionista clasificada como Carburación se atribuye a la pipa solamente cuando el PDV identifica una unidad válida.
- Pruebas: nueve pruebas locales pasaron, incluyendo escritura y reapertura del XLSX por el módulo de exportación, exclusión de estaciones Comisionista y PDV inválidos, cierre y folios/estilos. Se verificó estáticamente en la base revisada la llamada del exportador principal antes de serializar. Consulta ARR de solo lectura: 24 días completos, cero llaves sin conciliar; el caso de control suma ambos canales, se conserva la unidad en tipo A. No se ejecutó la descarga autenticada de producción ni se integró el cambio.
- next_task_proposed: ninguna.
- secrets_check: none.
- human_decision_needed: revisión del PR y decisión de integración por separado.

## owner_chat_attestation

- method: verified_owner_chat
- approved_at: 2026-11-25T20:09:24.274623+00:00
- receipt_id: 0a38483b-48e2-4c20-9548-dd45e9711e33
- scope_sha256: 526cda6155d36add2451c337ab8a743a3f0c5e680a31cc7798f938c1857ce820
