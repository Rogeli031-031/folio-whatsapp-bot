"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_RESTRICTED,
  SOURCE_ERROR,
  DATA_NOT_FOUND,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const {
  REVISION_NOTES_SEMANTIC_CLASS,
  SOURCE,
  NOTE_LIMIT,
  NOTE_BODY_MAX_CHARS,
  assertActionRegisterAccess,
  isLatestRevisionTrigger,
  resolveRevisionSpec,
  truncateNoteBody,
  mapNoteRow,
  loadActionRegisterRevisionNotesForChat,
  buildRevisionNotesChatResult,
} = require("../lib/director-ia-m12-revision-notes");

const LIB_DIR = path.join(__dirname, "..", "lib");
const M12_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m12-revision-notes.js"), "utf8");
const CONTEXT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-context.js"), "utf8");
const BOARD_SRC = fs.readFileSync(path.join(LIB_DIR, "action-register-board.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-planner.js"), "utf8");

function revisionRow(over = {}) {
  return {
    id: 20,
    planta_id: 1,
    revision_date: "2026-08-20",
    ...over,
  };
}

function noteRow(over = {}) {
  return {
    id: 100,
    revision_id: 20,
    body: "Se revisó el tablero de mantenimiento.",
    author_name: "Ana Pérez",
    created_at: "2026-08-20T16:00:00.000Z",
    ...over,
  };
}

function injectOpts(revision, notes, extras = {}) {
  return {
    resolvePlanta: extras.resolvePlanta || (async () => ({ id: 1, nombre: "Puebla", clave: "E7" })),
    queryRevisionById: extras.queryRevisionById || (async () => revision),
    queryRevisionByDate: extras.queryRevisionByDate || (async () => revision),
    queryLatestRevision: extras.queryLatestRevision || (async () => revision),
    queryRevisionNotes: extras.queryRevisionNotes || (async () => notes || []),
    question: extras.question,
    auth: extras.auth,
  };
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function gaReq(plantas = [1]) {
  return { dashboardAuth: { role: "GA", plantas_permitidas: plantas } };
}

function gvReq(plantas = [1]) {
  return { dashboardAuth: { role: "GV", plantas_permitidas: plantas } };
}

function adReq() {
  return { dashboardAuth: { role: "AD" } };
}

function ggReq(plantas) {
  return { dashboardAuth: { role: "GG", plantas_permitidas: plantas } };
}

describe("M12 intent, capability y tools", () => {
  it("preguntas de notas usan revision_notes y no action_status", () => {
    assert.equal(planDirectorIaQuestion("¿Qué dicen las notas de la última revisión?").intent, "revision_notes");
    assert.equal(planDirectorIaQuestion("notas de revisión 2026-08-20").intent, "revision_notes");
    assert.equal(planDirectorIaQuestion("qué se acordó en la revisión").intent, "revision_notes");
    assert.equal(planDirectorIaQuestion("comentarios del día de la revisión").intent, "revision_notes");
    assert.equal(detectUnsupportedDirectorIaDomain("¿Qué dicen las notas de la última revisión?"), null);
    assert.equal(isDirectorIaDomainReadable("revision_notes"), true);
  });

  it("no altera intents AR existentes", () => {
    assert.equal(planDirectorIaQuestion("¿Qué acciones están vencidas?").intent, "overdue_actions");
    assert.equal(planDirectorIaQuestion("¿Quién es responsable de mantenimiento?").intent, "responsible_lookup");
    assert.equal(planDirectorIaQuestion("¿Cómo va Taller?").intent, "action_status");
  });

  it("no captura Plaud, folio comments ni history M2", () => {
    const bitacora = planDirectorIaQuestion("¿Qué dice la bitácora?");
    assert.notEqual(bitacora.intent, "revision_notes");
    const folio = planDirectorIaQuestion("¿Qué comentarios hay del folio?");
    assert.notEqual(folio.intent, "revision_notes");
    const history = planDirectorIaQuestion("¿Cuál fue el último movimiento del folio 123?");
    assert.equal(history.intent, "folio_history");
  });

  it("tool tiene executor read-only dedicado", () => {
    const t = getDirectorIaTool("get_action_register_revision_notes");
    assert.equal(t.executor, "loadActionRegisterRevisionNotesForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_action_register_revision_notes"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M12 resolución de revisión", () => {
  it("última revisión es trigger físico", () => {
    assert.equal(isLatestRevisionTrigger("notas de la última revisión"), true);
    assert.equal(isLatestRevisionTrigger("revisión más reciente"), true);
    assert.equal(isLatestRevisionTrigger("notas de revisión"), false);
  });

  it("revision_id y fecha explícita", () => {
    const byId = resolveRevisionSpec("notas de la revisión 20");
    assert.equal(byId.ok, true);
    assert.equal(byId.mode, "revision_id");
    assert.equal(byId.revision_id, 20);
    const byDate = resolveRevisionSpec("notas de revisión 2026-08-20");
    assert.equal(byDate.ok, true);
    assert.equal(byDate.mode, "revision_date");
    assert.equal(byDate.revision_date, "2026-08-20");
  });

  it("sin revisión pide clarificación", () => {
    const missing = resolveRevisionSpec("qué dicen las notas");
    assert.equal(missing.ok, false);
    assert.equal(missing.code, "missing_revision");
    assert.match(missing.error, /No elijo la revisión/);
  });

  it("fecha inválida no se acepta", () => {
    const invalid = resolveRevisionSpec("notas de revisión 2026-13-40");
    assert.equal(invalid.ok, false);
    assert.equal(invalid.code, "invalid_revision");
  });
});

describe("M12 recorte y autor", () => {
  it("trunca a 500 con flag explícito y no completa", () => {
    const long = "x".repeat(620);
    const clipped = truncateNoteBody(long);
    assert.equal(clipped.note_text.length, NOTE_BODY_MAX_CHARS);
    assert.equal(clipped.truncated, true);
    assert.equal(clipped.original_length, 620);
    assert.equal(clipped.note_text, long.slice(0, 500));
  });

  it("autor vacío se preserva; no inventa sistema", () => {
    const mapped = mapNoteRow(noteRow({ author_name: "", body: "texto" }));
    assert.equal(mapped.author, "");
    assert.equal(mapped.note_text, "texto");
    assert.equal(mapped.truncated, false);
    assert.equal(Object.prototype.hasOwnProperty.call(mapped, "item_id"), false);
  });
});

describe("M12 loader authz y lookup", () => {
  it("consulta por revision_id", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow()], { question: "notas de la revisión 20" })
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.found, true);
    assert.equal(payload.revision_id, 20);
    assert.equal(payload.revision_date, "2026-08-20");
    assert.equal(payload.notes.length, 1);
    assert.equal(payload.notes[0].note_id, 100);
    assert.equal(payload.notes[0].author, "Ana Pérez");
    assert.equal(payload.notes[0].created_at, "2026-08-20T16:00:00.000Z");
    assert.equal(payload.notes[0].note_text, "Se revisó el tablero de mantenimiento.");
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, REVISION_NOTES_SEMANTIC_CLASS);
  });

  it("consulta por revision_date", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow()], { question: "notas de revisión 2026-08-20" })
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.revision_source, "revision_date");
    assert.equal(payload.revision_date, "2026-08-20");
  });

  it("última usa queryLatest y no inventa si no hay fila", async () => {
    let latestSqlUsed = false;
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(null, [], {
        question: "notas de la última revisión",
        queryLatestRevision: async () => {
          latestSqlUsed = true;
          return null;
        },
      })
    );
    assert.equal(latestSqlUsed, true);
    assert.equal(payload.ok, true);
    assert.equal(payload.found, false);
    assert.equal(payload.notes.length, 0);
  });

  it("múltiples notas respetan orden y tope 8", async () => {
    const many = [];
    for (let i = 1; i <= 10; i += 1) {
      many.push(noteRow({ id: i, body: `nota ${i}`, created_at: `2026-08-20T16:0${i % 10}:00.000Z` }));
    }
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), many, { question: "notas de la última revisión" })
    );
    assert.equal(payload.notes.length, NOTE_LIMIT);
    assert.equal(payload.notes_count, 10);
    assert.equal(payload.notes_omitted, 2);
    assert.equal(payload.truncated, true);
    assert.equal(payload.notes[0].note_id, 1);
    assert.equal(payload.notes[7].note_id, 8);
  });

  it("nota > 500 queda truncada de forma explícita", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow({ body: "y".repeat(540) })], {
        question: "notas de la última revisión",
      })
    );
    assert.equal(payload.notes[0].note_text.length, 500);
    assert.equal(payload.notes[0].truncated, true);
    assert.equal(payload.notes[0].original_length, 540);
    assert.equal(payload.truncated, true);
  });

  it("0 notas en revisión existente", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [], { question: "notas de la última revisión" })
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.found, true);
    assert.equal(payload.notes.length, 0);
    assert.equal(payload.notes_count, 0);
  });

  it("sin revisión en la pregunta clarifica", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow()], { question: "qué dicen las notas" })
    );
    assert.equal(payload.ok, false);
    assert.equal(payload.revision_code, "missing_revision");
  });

  it("autor vacío no se convierte en sistema", async () => {
    const payload = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow({ author_name: "" })], {
        question: "notas de la última revisión",
      })
    );
    assert.equal(payload.notes[0].author, "");
    assert.doesNotMatch(JSON.stringify(payload.notes[0]), /sistema/i);
  });

  it("AR authz: ZP/AD globales; GA/GV/GG por plantas_permitidas; fail-closed", async () => {
    const zp = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      zpReq(),
      injectOpts(revisionRow(), [noteRow()], { question: "notas de la última revisión" })
    );
    assert.equal(zp.ok, true);

    const ad = await loadActionRegisterRevisionNotesForChat(
      null,
      9,
      adReq(),
      injectOpts(revisionRow({ planta_id: 9 }), [noteRow()], { question: "notas de la última revisión" })
    );
    assert.equal(ad.ok, true);

    const gaOk = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      gaReq([1]),
      injectOpts(revisionRow(), [noteRow()], { question: "notas de la última revisión" })
    );
    assert.equal(gaOk.ok, true);

    const gaDeny = await loadActionRegisterRevisionNotesForChat(
      null,
      2,
      gaReq([1]),
      injectOpts(revisionRow(), [], { question: "notas de la última revisión" })
    );
    assert.equal(gaDeny.ok, false);
    assert.equal(gaDeny.code, SOURCE_RESTRICTED);
    assert.equal(gaDeny.status, 403);

    const gvOk = await loadActionRegisterRevisionNotesForChat(
      null,
      1,
      gvReq([1]),
      injectOpts(revisionRow(), [noteRow()], { question: "notas de la última revisión" })
    );
    assert.equal(gvOk.ok, true);

    const gvDeny = await loadActionRegisterRevisionNotesForChat(
      null,
      2,
      gvReq([1]),
      injectOpts(revisionRow(), [], { question: "notas de la última revisión" })
    );
    assert.equal(gvDeny.ok, false);
    assert.equal(gvDeny.status, 403);

    const ggCross = await loadActionRegisterRevisionNotesForChat(
      null,
      9,
      ggReq([1]),
      injectOpts(revisionRow(), [], { question: "notas de la última revisión" })
    );
    assert.equal(ggCross.ok, false);
    assert.equal(ggCross.status, 403);

    const noAuth = assertActionRegisterAccess({}, 1);
    assert.equal(noAuth.ok, false);
    const missingPlanta = await loadActionRegisterRevisionNotesForChat(
      null,
      null,
      zpReq(),
      injectOpts(revisionRow(), [], { question: "notas de la última revisión" })
    );
    assert.equal(missingPlanta.ok, false);
  });
});

describe("M12 chat result", () => {
  it("bloque separado sin atribuir a ítem ni acuerdo formal", () => {
    const result = buildRevisionNotesChatResult({
      ok: true,
      found: true,
      planta_id: 1,
      planta_nombre: "Puebla",
      revision_id: 20,
      revision_date: "2026-08-20",
      notes: [mapNoteRow(noteRow())],
      notes_count: 1,
      notes_omitted: 0,
      truncated: false,
      source: SOURCE,
      semantic_class: REVISION_NOTES_SEMANTIC_CLASS,
    });
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "revision_notes");
    assert.equal(result.context_meta.openai_called, false);
    assert.match(result.answer, /Se revisó el tablero de mantenimiento/);
    assert.match(result.answer, /Ana Pérez/);
    assert.doesNotMatch(result.answer, /responsable inferido|item_id|folio_historial/i);
    assert.equal(result.revision_notes.notes[0].note_id, 100);
    assert.equal(Object.prototype.hasOwnProperty.call(result.revision_notes.notes[0], "item_id"), false);
  });

  it("not found y clarificación", () => {
    const missing = buildRevisionNotesChatResult({
      ok: true,
      found: false,
      planta_id: 1,
      planta_nombre: "Puebla",
      notes: [],
      source: SOURCE,
    });
    assert.equal(missing.context_meta.veracity, DATA_NOT_FOUND);
    const clar = buildRevisionNotesChatResult({
      ok: false,
      code: SOURCE_ERROR,
      status: 400,
      revision_code: "missing_revision",
      error: "Indica la revisión. No elijo la revisión.",
    });
    assert.match(clar.answer, /No elijo la revisión/);
  });

  it("authz restringida", () => {
    const result = buildRevisionNotesChatResult({
      ok: false,
      code: SOURCE_RESTRICTED,
      status: 403,
      error: "Sin acceso a esta planta",
    });
    assert.equal(result.context_meta.veracity, SOURCE_RESTRICTED);
    assert.equal(result.limitation.code, SOURCE_RESTRICTED);
  });
});

describe("M12 boundaries en fuente", () => {
  it("loader dedicado; no includeNotes; no writes; no HTTP; no Plaud/M2/binarios", () => {
    assert.match(M12_SRC, /loadActionRegisterRevisionNotesForChat/);
    assert.match(M12_SRC, /ORDER BY revision_date DESC, id DESC/);
    assert.match(M12_SRC, /assertActionRegisterAccess/);
    assert.doesNotMatch(M12_SRC, /require\(["'].*director-ia-m2-folio-status["']\)/);
    assert.doesNotMatch(M12_SRC, /includeNotes\s*:\s*true/);
    assert.doesNotMatch(M12_SRC, /\bINSERT INTO\b|\bUPDATE\b|\bDELETE FROM\b/);
    assert.doesNotMatch(M12_SRC, /axios|http\.request|localhost:\d+/);
    assert.doesNotMatch(M12_SRC, /folio_historial|loadFolioHistory|loadFolioComentarios|s3_key|getBufferFromS3/);
    assert.doesNotMatch(M12_SRC, /require\(["'].*director-ia-bitacora["']\)/);
    assert.doesNotMatch(M12_SRC, /item_id/);
    assert.match(CONTEXT_SRC, /includeNotes:\s*false/);
    assert.doesNotMatch(CONTEXT_SRC, /includeNotes:\s*true/);
    assert.match(BOARD_SRC, /includeNotes !== false/);
    assert.match(CHAT_SRC, /loadActionRegisterRevisionNotesForChat/);
    assert.match(CHAT_SRC, /revision_notes/);
    assert.match(PLANNER_SRC, /revision_notes/);
    assert.doesNotMatch(PLANNER_SRC, /intent === "action_status".*revision_notes/);
  });
});

describe("M12 chat wiring", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(revision, notes) {
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM arr\.action_register_revisions/.test(sql) && /ORDER BY revision_date DESC/.test(sql)) {
            assert.match(sql, /ORDER BY revision_date DESC, id DESC/);
            return { rows: revision ? [revision] : [] };
          }
          if (/FROM arr\.action_register_revisions/.test(sql) && /revision_date =/.test(sql)) {
            return { rows: revision ? [revision] : [] };
          }
          if (/FROM arr\.action_register_revisions/.test(sql) && /id =/.test(sql)) {
            if (params && Number(params[0]) !== 1) return { rows: [] };
            return { rows: revision ? [revision] : [] };
          }
          if (/FROM arr\.action_register_revision_notes/.test(sql)) {
            assert.match(sql, /rv\.planta_id/);
            assert.doesNotMatch(sql, /item_id|s3_key|folio_historial|plaud/i);
            return { rows: notes || [] };
          }
          if (/folio_historial|cliente_comentarios|director_ia_bitacora|revision_note_attachments/.test(sql)) {
            throw new Error("no debe consultar fuentes ajenas");
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("pregunta de última revisión llega al executor", async () => {
    configureDirectorIaChat({
      pool: poolWith(revisionRow(), [noteRow()]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Qué dicen las notas de la última revisión?"
    );
    assert.equal(result.ok, true);
    assert.equal(result.context_meta.mode, "revision_notes");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.revision_notes.revision_id, 20);
    assert.equal(result.revision_notes.notes[0].author, "Ana Pérez");
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /folio_historial|item_id/i);
  });

  it("sin revisión clarifica y no llama latest", async () => {
    let latestHits = 0;
    configureDirectorIaChat({
      pool: {
        connect: async () => ({
          query: async (sql) => {
            if (/ORDER BY revision_date DESC/.test(sql)) latestHits += 1;
            return { rows: [] };
          },
          release() {},
        }),
      },
    });
    const result = await askDirectorIa({ body: {}, dashboardAuth: { role: "ZP" } }, 1, "qué dicen las notas de revisión");
    assert.equal(latestHits, 0);
    assert.match(result.answer, /No elijo la revisión|Indica la revisión/);
    assert.equal(result.revision_notes, null);
  });

  it("cross-planta no ve la revisión", async () => {
    configureDirectorIaChat({
      pool: poolWith(revisionRow(), [noteRow()]),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "GG", plantas_permitidas: [1] } },
      9,
      "notas de la última revisión"
    );
    assert.equal(result.context_meta.veracity, SOURCE_RESTRICTED);
  });
});
