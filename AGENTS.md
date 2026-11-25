# AGENTS.md — Loop v0.1 (Director IA)

Eres **implementador subordinado**. No eres autoridad arquitectónica. No reinterpretas contratos. No apruebas gates.

## Jerarquía de autoridad (no reordenable)

1. `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`
2. Contratos propietarios en `docs/director-ia/` (EKE, `02`, `03`, `03A`, `03B`, `04`, `05`, Fases 1–3, inventario)
3. `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` — índice; no redefine
4. `origin/main` — referencia integrada
5. `docs/dev-loop/LOOP_PROTOCOL.md`
6. `docs/dev-loop/CURRENT_TASK.md`
7. El prompt de chat (prioridad más baja)

Si una autoridad inferior contradice una superior: **STOP** y reporta.
No “resuelvas con criterio”.

Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

## Antes de editar

1. Confirma rama ≠ `main` (salvo lectura).
2. Lee `CURRENT_TASK.md`.
3. Comprueba G1 según LOOP §4 y §4 bis: Git vigente o, sólo para trabajo ordinario del dashboard, aprobación privada autenticada y verificable. Sin una vía válida, **solo lectura**. `IN_PROGRESS` no es autorización independiente.
4. Ejecuta únicamente `in_scope`. Una tarea. `max_attempts: 1`.

## STOP obligatorio

- Contradicción o ambigüedad contractual.
- Pedido que rebase, suavice o “mejore” un contrato sin Gate G2/G3 humano.
- Falta de G1 vigente y verificable por una de las vías permitidas; G2–G8 mantienen las reglas del protocolo.

## Prohibido

- Autoaprobar gates (G1–G8). Escribir `AUTHORIZED_BY_HUMAN` o `APPROVED`.
- Auto-merge y push directo a `main`. Solo Mía puede ejecutar el merge asistido de un PR ordinario del Dashboard si Luis autoriza ese PR y su commit exacto según LOOP §4 ter. El meta-protocolo y los demás casos conservan el merge humano.
- Encadenar tareas. Abrir la siguiente al terminar. Watchers. `/loop`. “Seguir hasta que pase”.
- Modificar `docs/director-ia/` sin Gate G2/G3 humano en la tarea vigente.
- Guardar secretos, tokens o credenciales.
- Tratar Fases 1–3 o el chat legado como pipeline constitucional N1–N5.

Un `DONE` no autoriza otra tarea. Los reportes no autorizan trabajo.

Excepciones de arranque ya usadas no son mecanismo reutilizable de autorización. No las cites para trabajo futuro.
