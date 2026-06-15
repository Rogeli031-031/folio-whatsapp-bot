"use strict";

/**
 * Auditoría v0.6: valida que tema_details llega al prompt de chat.
 * Uso: node scripts/audit-director-ia-tema-details.js [planta_id]
 * Requiere .env con DATABASE_URL, ENABLE_DIRECTOR_IA, AI_ENABLED, OPENAI_API_KEY si se llama OpenAI.
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

loadEnvFile();

const QUESTION = "¿En qué está trabajando mantenimiento?";
const plantaId = process.argv[2] != null ? parseInt(String(process.argv[2]), 10) : 3;

async function runFixtureAudit() {
  const {
    summarizeActionRegisterBoard,
    summarizeActionRegisterResponsables,
    summarizeActionRegisterTemas,
    summarizeTopOverdueActions,
    summarizeInvalidOverdue,
    summarizeTemaDetails,
    buildExecutiveSummary,
  } = require("../lib/director-ia-action-register");
  const {
    extractChatContextFromPayload,
    buildDirectorIaChatPrompt,
    buildFocusedNarrativeContext,
    isNarrativeQuestion,
    isAggregateQuestion,
    resolveNarrativeFocus,
  } = require("../lib/director-ia-chat");

  const board = {
    revisions: [{ id: 1 }],
    cells: {
      "1": {
        Mantenimiento: [
          {
            id: 501,
            closed: false,
            title: "Pintura de barda perimetral",
            tema: "Mantenimiento",
            due_date: "2026-06-30",
            responsable: "Giovana del Carmen",
            responsable_usuario_id: 9,
            created_at: "2026-04-05",
          },
          {
            id: 502,
            closed: false,
            title: "Iluminación exterior patio norte",
            tema: "Mantenimiento",
            due_date: "2026-05-15",
            responsable: "Giovana del Carmen",
            responsable_usuario_id: 9,
          },
        ],
      },
    },
  };
  const roleMap = new Map([[9, { role_key: "GO", role_name: "Gerente Operaciones" }]]);
  const summary = summarizeActionRegisterBoard(board);
  const responsables = summarizeActionRegisterResponsables(board, { roleMap });
  const temas = summarizeActionRegisterTemas(board);
  const top_overdue = summarizeTopOverdueActions(board, { roleMap });
  const invalid_overdue = summarizeInvalidOverdue(board);
  const tema_details = summarizeTemaDetails(board, { roleMap });
  const executive_summary = buildExecutiveSummary(summary, responsables, temas);

  const chatContext = extractChatContextFromPayload({
    action_register: {
      ok: true,
      summary,
      responsables,
      temas,
      top_overdue,
      invalid_overdue,
      tema_details,
      executive_summary,
    },
  });

  console.log("\n=== AUDIT FIXTURE (sin BD) ===\n");
  console.log("[DIRECTOR_IA] tema_details temas:", chatContext.tema_details?.length || 0);
  console.log(
    "[DIRECTOR_IA] primer tema:",
    JSON.stringify(chatContext.tema_details?.[0] || null, null, 2)
  );
  const focused = buildFocusedNarrativeContext(chatContext, QUESTION);
  const promptFocused = buildDirectorIaChatPrompt(chatContext, QUESTION, {
    useFocused: true,
    focusedText: focused.text,
  });

  console.log("\n--- v0.6.1 narrative detection ---");
  console.log("isNarrativeQuestion:", isNarrativeQuestion(QUESTION));
  console.log("isAggregateQuestion:", isAggregateQuestion(QUESTION));
  console.log("focus meta:", focused.meta);
  console.log("\n[DIRECTOR_IA] focused_context_sent:\n" + focused.text);
  console.log("\n--- userContent (focused, primeros 1200 chars) ---\n");
  console.log(promptFocused.userContent.slice(0, 1200));
  console.log("\n--- NO debe incluir JSON temas[] en focused ---");
  console.log("includes temas array:", promptFocused.userContent.includes('"temas":'));

  const m = chatContext.tema_details.find((t) => t.tema === "Mantenimiento");
  const narrativeQs = [
    "¿En qué está trabajando mantenimiento?",
    "¿Qué actividades tiene clientes?",
    "¿Qué acciones tiene Giovana del Carmen?",
    "¿Qué está haciendo Giovana?",
    "¿Qué proyectos lleva actualmente Giovana?",
    "¿Quién está dando seguimiento a seguridad?",
  ];
  console.log("\n--- narrative detection v0.6.2 ---");
  for (const nq of narrativeQs) {
    console.log(nq, "->", isNarrativeQuestion(nq), resolveNarrativeFocus(nq, chatContext)?.type || "null");
  }

  const personFocus = buildFocusedNarrativeContext(
    chatContext,
    "¿Qué acciones tiene Giovana del Carmen?"
  );
  console.log("\n--- person focused sample ---\n", personFocus.text.slice(0, 800));

  const checks = [
    ["tema_details existe", (chatContext.tema_details?.length || 0) > 0],
    ["Mantenimiento presente", !!m],
    ["open_actions", (m?.open_actions?.length || 0) > 0],
    ["títulos reales", m?.open_actions?.some((a) => a.title?.includes("Pintura"))],
    ["responsables", (m?.responsables?.length || 0) > 0],
    ["focused incluye Pintura", focused.text.includes("Pintura de barda")],
    ["formato ejecutivo numerado", focused.text.includes("1. ") && focused.text.includes("Responsable:")],
    ["ACCIONES ABIERTAS MÁS RELEVANTES", focused.text.includes("ACCIONES ABIERTAS MÁS RELEVANTES")],
    ["focused NO JSON agregado", !promptFocused.userContent.includes('"executive_summary"')],
    ["promptMode focused", promptFocused.promptMode === "focused"],
    ["clientes es narrativa", isNarrativeQuestion("¿Qué actividades tiene clientes?")],
    ["haciendo giovana narrativa", isNarrativeQuestion("¿Qué está haciendo Giovana?")],
    ["person focus acciones", personFocus.text.includes("ACCIONES ABIERTAS MÁS RELEVANTES")],
    ["métricas al final person", personFocus.text.indexOf("MÉTRICAS") > personFocus.text.indexOf("Pintura")],
    ["aggregate riesgo usa full", buildDirectorIaChatPrompt(chatContext, "¿Cuál es el principal riesgo operativo?").promptMode === "full"],
  ];
  for (const [name, ok] of checks) console.log(ok ? "OK" : "FAIL", name);

  return chatContext;
}

async function runLiveAudit() {
  if (!process.env.DATABASE_URL) {
    console.log("\n=== LIVE: omitido (sin DATABASE_URL en .env) ===\n");
    return null;
  }
  process.env.ENABLE_DIRECTOR_IA = process.env.ENABLE_DIRECTOR_IA || "true";

  const { Pool } = require("pg");
  const { buildActionRegisterBoardPayload } = require("../lib/action-register-board");
  const {
    summarizeActionRegisterBoard,
    summarizeActionRegisterResponsables,
    summarizeActionRegisterTemas,
    summarizeTopOverdueActions,
    summarizeInvalidOverdue,
    summarizeTemaDetails,
    buildExecutiveSummary,
    collectResponsableUsuarioIds,
    loadUsuarioRolesByIds,
  } = require("../lib/director-ia-action-register");
  const directorIaContext = require("../lib/director-ia-context");
  const { askDirectorIa } = require("../lib/director-ia-chat");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const noopEnsure = async () => {};

  directorIaContext.configureDirectorIaContext({
    pool,
    assertPlantaAccess: () => true,
    ensureActionRegisterTables: noopEnsure,
  });

  const client = await pool.connect();
  try {
    const board = await buildActionRegisterBoardPayload(client, plantaId, {
      ensureActionRegisterTables: noopEnsure,
      includeDicf: true,
      includeNotes: false,
    });
    const summary = summarizeActionRegisterBoard(board);
    const roleMap = await loadUsuarioRolesByIds(client, collectResponsableUsuarioIds(board));
    const tema_details = summarizeTemaDetails(board, { roleMap });
    const m = tema_details.find((t) => String(t.tema).toLowerCase() === "mantenimiento");
    console.log("\n=== LIVE BD preview (planta " + plantaId + ") ===\n");
    console.log("tema_details count:", tema_details.length);
    console.log("Mantenimiento:", JSON.stringify(m || null, null, 2));
  } finally {
    client.release();
  }

  const req = { query: {}, body: {}, dashboardUser: { id: 0 } };
  console.log("\n=== AUDIT LIVE + OpenAI planta_id=" + plantaId + " ===\n");
  console.log("Pregunta:", QUESTION);
  console.log("AI_ENABLED:", process.env.AI_ENABLED, "OPENAI:", !!process.env.OPENAI_API_KEY);

  if (process.env.AI_ENABLED !== "true" && process.env.AI_ENABLED !== "1") {
    console.log("OpenAI omitido: AI_ENABLED no activo");
    await pool.end();
    return null;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log("OpenAI omitido: sin OPENAI_API_KEY");
    await pool.end();
    return null;
  }

  const result = await askDirectorIa(req, plantaId, QUESTION, null);
  console.log("\n=== RESULTADO OpenAI ===\n", JSON.stringify(result, null, 2));
  if (result?.ok && result.answer) {
    const onlyMetrics =
      !/pintura|barda|iluminación|iluminacion|rehabilitación|rehabilitacion/i.test(result.answer) &&
      /\d+\s+accion|\d+\s+vencid|open_count|overdue_count|abiertas/i.test(result.answer);
    console.log(
      onlyMetrics
        ? "ALERTA: respuesta posiblemente solo métricas (revisar prompt)"
        : "OK: respuesta menciona actividades concretas o narrativa"
    );
  }
  await pool.end();
  return result;
}

(async () => {
  await runFixtureAudit();
  try {
    await runLiveAudit();
  } catch (e) {
    console.error("LIVE audit error:", e.message);
  }
})();
