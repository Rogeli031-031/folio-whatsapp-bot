# AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
code_changes: false
test_changes: false
docs_director_ia_changes: false
reference_main: "eb03e794"
branch: "audit/director-ia-user-identity-greeting-001"
probes: "read-only classifyConversationalIntent + buildConversationalAnswer"
next_task_proposed: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resumen ejecutivo

**DONE_PENDING_REVIEW. No se implementó saludo personalizado. No se hardcodeó ningún nombre. No se inventó “Ingeniero”.**

Hoy `hola` responde `Hola. Estoy en Acapulco. ¿Qué quieres revisar?` porque el early-return de smalltalk **solo** recibe la etiqueta de la planta seleccionada en la UI. **No lee** al usuario autenticado.

### Pregunta obligatoria

**¿Existe físicamente un campo que permita saber que este usuario debe ser tratado como "Ingeniero"?**

**NO. TITLE_AVAILABLE = NOT_AVAILABLE.**

No hay columna, claim JWT, preferencia ni catálogo de trato profesional (`Ingeniero`, `Licenciado`, `Doctor`, honorífico, título, tratamiento).  
`public.roles.nombre` es rol organizacional (`Gerente Operaciones`, `Subgerente`, …).  
`public.usuarios.nombre` es **puesto libre** (UI: “Nombre / puesto”), no un título profesional.  
`JWT.role` es clave gruesa de dashboard (`ZP`, `AD`, `GG`, `GA`, `GV`).  

Ninguno de esos campos autoriza decir “Ingeniero”. No se infiere por apellido, correo, rol ni planta.

### Clasificaciones

| Código | Resultado en runtime del saludo actual | Resultado físico si se cargara la fila del actor |
|--------|----------------------------------------|--------------------------------------------------|
| IDENTITY_AVAILABLE | No | Parcial: hay `nombre_persona` en DB; el chat no lo carga |
| IDENTITY_PARTIAL | Sí: `actor_id` + `role` en JWT típico; sin nombre | Sí, si `nombre_persona` está vacío |
| ROLE_AVAILABLE | Sí: `dashboardAuth.role` | Sí, más `roles.clave` / `roles.nombre` en DB |
| TITLE_AVAILABLE | **NOT_AVAILABLE** | **NOT_AVAILABLE** |
| PLANT_CONTEXT_ONLY | **Sí: el saludo actual es esto** | La planta sigue siendo contexto, no identidad |
| NOT_AVAILABLE | Nombre/trato en el greeting | Título profesional |
| NOT_SAFE_TO_USE | Teléfono, correo, `actor_id` en prosa, puesto como si fuera nombre, rol como “Ingeniero”, planta como “estoy en”, identidad de otro usuario, memoria global | Igual |

## 2. Ruta física de autenticación

No hay login por usuario/contraseña en el chat. El usuario entra con un **JWT de dashboard** emitido desde WhatsApp (teléfono → fila `public.usuarios`).

```
WhatsApp (From)
  → getActorByPhone(client, phone)          # server.js ~2688
  → CREATE JWT createDashboardToken(...)    # 20h
  → enlace ?t= JWT
  → frontend sessionStorage.dashboard_token
  → Authorization: Bearer <JWT>
  → dashboardAuthMiddleware
  → req.dashboardAuth = payload verificado
  → POST /api/director-ia/chat
  → handlePostChat → askDirectorIa(req, planta_id, question, user)
```

**Objeto de sesión real:** `req.dashboardAuth` (payload JWT).  

**No existe en esta ruta:** `req.dashboardUser` ni `req.user`. `handlePostChat` los busca; el middleware **nunca** los asigna. `_user` llega `null`.

### Emisión típica del JWT (dashboard / AR / DirectorIA)

Claims firmados:

- `role`
- `actor_id` = `usuarios.id`
- `plantas_permitidas` (vacío para ZP/AD/CF_CDMX; si no, plantas equivalentes a `usuarios.planta_id`)
- `default_filters`
- `permisos` (mapa de flags)

**No viajan** en el token típico: `nombre`, `nombre_persona`, `email`, `apellido`, título, planta seleccionada.

`actor_nombre` / `actor_telefono` **solo** se embeben si `scope === "seh"` o `includeActorProfile` (`server.js` ~8483–8485). El comando WhatsApp `DirectorIA` llama `buildDashboardSignedUrlForUsuario(..., "director-ia")` **sin** ese flag. El comando `dashboard` tampoco embebe nombre.

Cuando sí se embebe `actor_nombre`, el orden es `usuarioRow.nombre || usuarioRow.nombre_persona`: **prioriza puesto**, no nombre de persona. Eso es el inverso del display admin (`nombre_persona` primero). **No usar ese claim como preferred name** sin releer DB.

`getActorByPhone` **no selecciona** `nombre_persona` ni `email`. Solo `id, telefono, nombre, planta_id, permisos_json, rol_*, planta_nombre`.

## 3. Campos de identidad disponibles

Schema físico `public.usuarios` (ensure en `server.js` ~2212–2223):

| Columna | Tipo | Semántica física (UI admin) |
|---------|------|-----------------------------|
| `id` | SERIAL PK | Identidad de sesión (`actor_id`) |
| `telefono` | VARCHAR(50) NOT NULL | Llave de alta WhatsApp |
| `email` | VARCHAR(255) | Contacto; no en JWT típico |
| `nombre` | VARCHAR(100) | **Puesto** (“Nombre / puesto”) |
| `nombre_persona` | VARCHAR(150) | **Nombre de la persona** (un solo string; no hay apellido aparte) |
| `activo` | BOOLEAN | Alta/baja |
| `permisos_json` | JSONB | Overrides de permisos |
| `planta_id` | FK `plantas` | Planta **asignada** al usuario (home), no la seleccionada en chat |
| `rol_id` | FK `roles` | Rol organizacional |

`public.roles`: `id`, `nombre` UNIQUE, `clave`, `nivel`.

**No existen:** `apellido`, `display_name`, `titulo`, `tratamiento`, `honorifico`, `preferred_name`, `saludo`.

Display ya usado en admin / Action Register / DICF:

`COALESCE(NULLIF(TRIM(nombre_persona), ''), nombre)`

Eso es **etiqueta de listado**, no contrato de trato. Para saludo, `nombre` (puesto) **no** es nombre de persona.

## 4. Campos de rol / título

| Campo | Qué es | ¿“Ingeniero”? |
|-------|--------|----------------|
| `roles.clave` | ZP, AD, GG, GA, GV, GO, SG, SEH, … | No |
| `roles.nombre` | “Gerente Operaciones”, etc. | No |
| `JWT.role` | Recorte a ZP/AD/CF_CDMX/GA/GV/GG | No |
| `usuarios.nombre` | Puesto libre | Solo si un humano escribió literalmente esa palabra; no es campo de título y no debe usarse como trato |

**TITLE_AVAILABLE = NOT_AVAILABLE.** Si un día se quiere “Ingeniero Zaragoza”, hace falta un campo o preferencia **explícita** (fuera de esta auditoría; `out_of_scope` incluye schema y preferencias nuevas).

## 5. Cómo llega identidad al chat

```
Frontend Acciones (producción observada)
  plantas.find(id === plantaId).nombre     → plantaNombre  (p. ej. "Acapulco")
  DirectorIaChatModal → DirectorIaChatPanel
  buildDirectorIaChatBody:
    planta_id, question, planta_nombre?, upload_day?, history?, conversation_state?
  NO envía nombre de usuario, actor_id, rol ni título.

Backend
  dashboardAuthMiddleware → req.dashboardAuth
  handlePostChat: user = req.dashboardUser || req.user || null   # null
  askDirectorIa(req, planta_id, question, _user)
  Greeting: NO lee dashboardAuth ni _user.
```

`conversation_state` es eco del cliente, efímero, por planta. No guarda identidad. El saludo **ni siquiera lo devuelve** en `context_meta`.

Memoria persistente usa `usuario:{actor_id}` + `planta_id` para pendientes de trabajo. **Scope, no display name.** `hola` no es turn `resume`/`dismiss`. La memoria **no decide** quién es el usuario ni construye el saludo.

## 6. Origen de la respuesta actual

Sonda read-only sobre `origin/main` `eb03e794`:

```
classifyConversationalIntent("hola") → { mode: "smalltalk" }
buildConversationalAnswer("smalltalk", "Acapulco")
  → "Hola. Estoy en Acapulco. ¿Qué quieres revisar?"
```

Misma respuesta para `Buenos días`, `buenas tardes`, `buenas noches`, `qué tal`. **No distingue hora ni texto de cortesía.**

Cadena:

1. `askDirectorIa` ~4408: `classifyConversationalIntent(q)`
2. `resolvePlantaLabelForChat(planta_id, req)` — primero `req.body.planta_nombre`; si falta, `public.plantas.nombre`
3. `buildConversationalAnswer` → `buildNeutralGreeting(plant)`
4. `lib/director-ia-conversational-executive-layer.js` `buildNeutralGreeting`:

```
if (plant) return `Hola. Estoy en ${plant}. ¿Qué quieres revisar?`;
return "Hola. ¿Qué quieres revisar?";
```

CEL `resolveExecutiveNeed` marca `greeting: true` **después** de este early-return. El saludo **no pasa** por planner ni OpenAI.

`scripts/test-director-ia-smalltalk.js` aún espera el texto viejo `Hola, soy Director IA` + mención DICF. El runtime vigente ya no es ese. Observación; no se corrigió.

## 7. Por qué aparece Acapulco

Acapulco **no** es identidad del usuario ni “dónde está Director IA”.

Es el **nombre de la planta seleccionada** en Acciones (`plantas.find(...).nombre`) enviado como `body.planta_nombre`. El greeting lo interpola como si el asistente “estuviera” ahí.

La planta home (`usuarios.planta_id`) **no** interviene en este string. Un ZP puede saludar “Estoy en Acapulco” solo porque eligió esa planta en la UI.

`body.planta_nombre` es controlado por el cliente. El backend confía en ese label para el saludo.

## 8. Separación identidad vs planta vs conversación

| Capa | Qué es | Qué no es |
|------|--------|-----------|
| Identidad de usuario | JWT `actor_id` (+ fila `usuarios`) | Planta, hilo, memoria |
| Planta seleccionada | `body.planta_id` + `planta_nombre` UI | Quién habla |
| Planta asignada | `usuarios.planta_id` | Planta del chat (ZP elige otra) |
| Contexto conversacional | `history`, `conversation_state` (tema/entidad/corte) | Identidad |
| Memoria persistente | pendientes `usuario:{id}` + planta | Quién es el usuario |

**Separación real en datos: sí. En el saludo: no.** El saludo colapsa planta en la voz del asistente y omite identidad.

## 9. Matriz de campos

| campo | fuente | disponible en runtime del greeting | confiable | puede usarse en saludo | observaciones |
|-------|--------|------------------------------------|-----------|-------------------------|---------------|
| `actor_id` | JWT `dashboardAuth` | Sí | Sí (firma) | No en prosa | Única llave de sesión |
| `nombre_persona` | `usuarios` | **No** (no se consulta) | Sí, si se lee por `actor_id` | Sí, si no vacío | Preferred name. Un string; no hay apellido aparte |
| `nombre` (puesto) | `usuarios` | No | Es puesto, no persona | **No** | UI “Nombre / puesto” |
| `actor_nombre` JWT | Solo SEH / `includeActorProfile` | Casi nunca en Director IA | Orden invertido (puesto primero) | **No** como fuente primaria | Recargar DB |
| display COALESCE admin | derivado | No en chat | Mezcla persona+puesto | No como trato | Listados, no saludo |
| apellido | — | No | — | No | **Campo inexistente** |
| display name dedicado | — | No | — | No | Inexistente |
| `JWT.role` | JWT | Sí | AuthZ, no trato | **No** como título | ZP ≠ Ingeniero |
| `roles.nombre` / `clave` | DB | No en greeting | Rol org | **No** como “Ingeniero” | ROLE_AVAILABLE ≠ TITLE |
| título / tratamiento | — | No | — | No | **NOT_AVAILABLE** |
| `email` | DB | No | Contacto | **No** | NOT_SAFE_TO_USE |
| `telefono` | DB / JWT SEH | No en greeting típico | Identificación WhatsApp | **No** | NOT_SAFE_TO_USE |
| `usuarios.planta_id` / `planta_nombre` home | DB | No | Asignación | No como “estoy en” | Distinta de la UI |
| planta UI `planta_nombre` | body | Sí | Label de scope | Solo si el usuario pide scope; **no** en `hola` | Causa de “Estoy en Acapulco” |
| `planta_id` body | body + authz | Sí | Scope de datos | No en saludo simple | |
| `conversation_state` | eco cliente | Presente en POST; unused en greeting | Hilo, no identidad | **No** para nombre | Reset al cambiar planta |
| `history` | cliente | Sí | Texto | **No** para identidad | |
| memoria persistente | store por `usuario:{id}` | Scope sí; nombre no | Aislada por actor | **No** | No decide quién es |
| `_user` / `dashboardUser` | — | null | — | No | Dead path |

## 10. Contrato propuesto de saludo

Ámbito: early-return `smalltalk` de `hola` / `buenos días` / `buen día` / `buenas tardes` / `buenas noches` / `qué tal` / `saludos`. Sin OpenAI. Sin hardcode de persona.

### Preferred name

1. Tomar **solo** `req.dashboardAuth.actor_id` de la sesión verificada.
2. Leer `nombre_persona` de `public.usuarios` donde `id = actor_id` (y `activo` no false).
3. `preferred_name` = `trim(nombre_persona)` si length ≥ 2.
4. Si falta: **sin nombre**. No usar puesto. No usar JWT `actor_nombre`. No parsear apellido. No usar memoria ni body.
5. Nunca un literal de persona en código.

### Título

1. Si no hay campo físico de trato: **omitir**.
2. No mapear rol → Ingeniero/Licenciado.
3. No usar puesto como título salvo que un contrato futuro cree un campo explícito de trato (G2/G3 + schema; fuera de este slice).

### Formato

- Con nombre: `Hola, buen día, {preferred_name}. ¿En qué te ayudo?`
- Sin nombre: `Hola, buen día. ¿En qué te ayudo?`
- Cálido, breve. Sin “Estoy en {planta}”.
- Help puede nombrar la planta como **scope de trabajo**, no como ubicación del asistente.
- Thanks: sin nombre obligatorio; no planta-como-identidad.

### Hora del día (utterance, no reloj)

| Utterance | Apertura |
|-----------|----------|
| `buenos días` / `buen día` | `Buenos días` / `Buen día` + nombre si hay |
| `buenas tardes` | `Buenas tardes` + nombre si hay |
| `buenas noches` | `Buenas noches` + nombre si hay |
| `hola` / `qué tal` / `saludos` / `hola director…` | `Hola, buen día` (neutro-cálido; **no** inferir noche por reloj del server) |

Hoy todos colapsan al mismo string. El contrato exige eco del registro del usuario, no reloj.

### Cuándo mencionar planta

- **No** en saludo simple.
- **Sí** si el usuario pregunta por planta, cambia de planta y hay que confirmar scope, o está en modo help (“estado ejecutivo de {planta}”).
- Nunca “Estoy en {planta}” como si fuera identidad o domicilio de Director IA.

### Fallbacks

| Situación | Respuesta conceptual |
|-----------|----------------------|
| Sin `actor_id` | Saludo sin nombre; no inventar |
| `nombre_persona` vacío | Saludo sin nombre |
| Token SEH con `actor_nombre` puesto | Ignorar claim; o no saludar con él |
| Usuario B | Solo fila de B |
| Planta Acapulco seleccionada | No entra al saludo |

## 11. Matriz de casos

| caso | identidad disponible | planta | respuesta correcta conceptual |
|------|----------------------|--------|-------------------------------|
| Usuario con `nombre_persona` “Luis Zaragoza”, sin título | IDENTITY_PARTIAL (nombre sí, título no) | Acapulco | `Hola, buen día, Luis Zaragoza. ¿En qué te ayudo?` — **no** Ingeniero; **no** Acapulco |
| Mismo usuario dice “buenas tardes” | igual | Puebla | `Buenas tardes, Luis Zaragoza. ¿En qué te ayudo?` |
| Usuario con nombre y sin título | IDENTITY_PARTIAL | cualquiera | Nombre; no inventar Ingeniero/Licenciado |
| Usuario sin `nombre_persona` usable | IDENTITY_PARTIAL / NOT_AVAILABLE para display | Acapulco | `Hola, buen día. ¿En qué te ayudo?` |
| Usuario con planta seleccionada | identidad ≠ planta | Acapulco | Planta no sustituye identidad |
| Otro usuario | Solo su `actor_id` | misma o distinta | Nunca el nombre/trato de A |
| `hola` / días / tardes / noches | según fila | irrelevante | Distinguir por texto; no por clock |
| JWT típico hoy (id, sin nombre en token) | hay que leer DB | Acapulco | Hoy: PLANT_CONTEXT_ONLY. Contrato: cargar nombre_persona |
| Memoria de A con pendiente | scope A | planta P | `hola` no resume; no usa entity_display como nombre |

## 12. Riesgos multiusuario

1. **A no recibe a B:** el nombre solo puede salir de `usuarios` filtrado por `dashboardAuth.actor_id` de **esta** request. Prohibido cache global `lastUserName`, module singleton, o body `nombre`.
2. **Planta ≠ identidad:** `planta_nombre` / home plant no se interpolan como trato.
3. **Memoria no identifica:** `user_scope_key` aísla pendientes; `entity_display` es cliente de negocio, no el hablante. `hola` no debe leer memoria para saludar.
4. **`conversation_state` ecoable:** no guardar preferred name ahí (el cliente podría reenviar estado ajeno).
5. **`actor_nombre` JWT:** no elevar rol (contrato steering) y no saludar con puesto.
6. **Teléfono/email:** no en saludo.
7. **Si `actor_id` falta:** no adivinar; saludo anónimo.

Hoy el saludo no cruza nombres de usuarios (no usa ninguno). El riesgo futuro es **introducir** un cache o un fallback a puesto/JWT sucio.

## 13. Fallbacks (resumen)

- Sin nombre usable → saludo natural sin vocativo.
- Sin título → omitir. **No inferir.**
- Sin planta en help → “la planta”.
- Auth inválida → 401 existente; no saludo.
- No implementar preferencias nuevas ni ALTER.

## 14. Slice mínimo de implementación (propuesta, no autorizada)

`next_task_proposed`: `IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001`  
**No autorizado. No ejecutado.**

In scope propuesto:

1. Resolver `{ actor_id, preferred_name }` solo desde JWT + `SELECT id, nombre_persona FROM public.usuarios WHERE id = $1` (columnas existentes; sin schema nuevo).
2. Extender `buildConversationalAnswer` / `buildNeutralGreeting` con identidad + modo de cortesía del utterance. Dejar de usar planta en smalltalk.
3. Tests: A vs B; sin nombre; sin Ingeniero; `hola` vs `buenas tardes`; planta no aparece en `hola`; memoria/history no cambian el nombre.
4. No frontend extra. No persistir preferencias. No Taller. No merge.

Fuera: hardcode “Ingeniero Zaragoza”; inferir título; “Estoy en {planta}”; SQL nuevo; deploy.

## 15. Contratos consultados / no modificados

Consultados: Constitución (no redefinida), `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`, evidencia previa `AUDIT-DIRECTOR-IA-POST-DEPLOY-CONVERSATIONAL-FINDINGS-001` §H1 (greeting sin nombre; se confirma y se detalla).  
Modificados en `docs/director-ia/`: ninguno.

## 16. Archivos tocados / no tocados

Tocados (esta ejecución):

- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md`

No tocados: `lib/**`, `frontend-dashboard/**`, `server.js`, schema, tests.

## 17. Desvíos respecto a CURRENT_TASK

Ninguno material. Sonda in-process, no DB live (el nombre de un usuario concreto de producción no se consultó; no hace falta para la pregunta del título).

## 18. Contradicciones / ambigüedades

Ninguna contractual que bloquee el hallazgo. Ambigüedad de producto (no resuelta aquí): si `nombre_persona` trae nombre completo, el saludo usa el string entero; no se recorta a apellido.

## 19. secrets_check

none

## 20. human_decision_needed

- Aceptar TITLE_AVAILABLE = NOT_AVAILABLE (no decir “Ingeniero” hasta haber campo explícito).
- Aceptar preferred_name = solo `nombre_persona` (no puesto).
- Autorizar o no el IMPL propuesto (G1 nuevo). Este DONE no autoriza implementación.
