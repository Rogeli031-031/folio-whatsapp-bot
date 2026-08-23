"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  detectUnsupportedDirectorIaDomain,
  isDirectorIaDomainReadable,
  SOURCE_NOT_INTEGRATED,
  SOURCE_RESTRICTED,
  DATA_NOT_FOUND,
} = require("../lib/director-ia-capabilities");
const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  getDirectorIaTool,
  isDirectorIaToolExecutable,
  validateDirectorIaToolRegistry,
} = require("../lib/director-ia-tools");
const {
  FOLIO_DOCUMENTS_SEMANTIC_CLASS,
  SOURCE,
  projectDocument,
  loadFolioDocumentsMetadataForChat,
  buildFolioDocumentsMetadataChatResult,
} = require("../lib/director-ia-m2-documents-metadata");

const LIB_DIR = path.join(__dirname, "..", "lib");
const DOCS_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-m2-documents-metadata.js"), "utf8");
const CHAT_SRC = fs.readFileSync(path.join(LIB_DIR, "director-ia-chat.js"), "utf8");

function baseFolio(over = {}) {
  return {
    id: 123,
    numero_folio: "F-202601-001",
    folio_codigo: "F-202601-001",
    planta_id: 1,
    planta_nombre: "Puebla",
    estatus: "COMPROBACIONES",
    creado_por_rol_clave: "ZP",
    solo_zp_ad: false,
    ...over,
  };
}

function folioByNumero(over = {}) {
  return baseFolio({
    id: 456,
    numero_folio: "F-202601-002",
    folio_codigo: "F-202601-002",
    ...over,
  });
}

function docRow(over = {}) {
  return {
    id: 10,
    folio_id: 123,
    numero_folio: "F-202601-001",
    tipo: "COTIZACION",
    status: "APROBADO",
    file_name: "cotizacion.pdf",
    subido_en: "2026-01-10T10:00:00.000Z",
    s3_key: "secret/path/file.pdf",
    url: "https://bucket.example/file.pdf",
    sha256: "abc123",
    file_size_bytes: 4096,
    ...over,
  };
}

function injectOpts(folioRows, documentRows, extras = {}) {
  const rows = folioRows || [];
  const idMap = new Map(rows.map((r) => [Number(r.id), r]));
  const numMap = new Map(rows.map((r) => [String(r.numero_folio), r]));
  let documentCalls = 0;
  let folioCalls = 0;
  const opts = {
    resolveEquivalentIds: extras.resolveEquivalentIds || ((id) => [Number(id)]),
    getFolioById:
      extras.getFolioById ||
      (async (_c, id) => {
        folioCalls += 1;
        return idMap.get(Number(id)) || null;
      }),
    getFolioByNumero:
      extras.getFolioByNumero ||
      (async (_c, num) => {
        folioCalls += 1;
        return numMap.get(String(num).trim()) || null;
      }),
    listDocumentsMetadataForFolio:
      extras.listDocumentsMetadataForFolio ||
      (async () => {
        documentCalls += 1;
        return {
          rows: extras.documentRows || documentRows || [],
          truncated: !!extras.truncated,
          limit: extras.limit || 50,
        };
      }),
    question: extras.question,
    auth: extras.auth,
    limit: extras.limit,
  };
  opts._calls = () => ({ documentCalls, folioCalls });
  return opts;
}

function zpReq() {
  return { dashboardAuth: { role: "ZP" } };
}

function assertSafeProjection(doc) {
  const keys = Object.keys(doc);
  assert.deepEqual(keys.sort(), ["document_id", "file_name", "source", "status", "subido_en", "tipo"].sort());
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "s3_key"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "url"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "sha256"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "bucket"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "signed_url"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(doc, "file_size_bytes"), false);
}

function assertNoStorageLeak(value) {
  const text = JSON.stringify(value);
  assert.doesNotMatch(text, /s3_key/i);
  assert.doesNotMatch(text, /signed[_ ]?url/i);
  assert.doesNotMatch(text, /https?:\/\//i);
  assert.doesNotMatch(text, /"bucket"/i);
  assert.doesNotMatch(text, /sha256/i);
  assert.doesNotMatch(text, /file_size_bytes/);
}

describe("M2 documents metadata intent, capability y tool", () => {
  it("folio_documents metadata soportada ya no es SOURCE_NOT_INTEGRATED", () => {
    assert.equal(planDirectorIaQuestion("listar documentos del folio 123").intent, "folio_documents");
    assert.equal(planDirectorIaQuestion("qué documentos tiene el folio 123").intent, "folio_documents");
    assert.equal(planDirectorIaQuestion("registros documentales del folio 123").intent, "folio_documents");
    assert.equal(detectUnsupportedDirectorIaDomain("listar documentos del folio 123"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("qué documentos tiene el folio 123"), null);
    assert.equal(detectUnsupportedDirectorIaDomain("registros documentales del folio 123"), null);
    assert.equal(isDirectorIaDomainReadable("documentos"), true);
  });

  it("faltan / PDF / contenido siguen bloqueados", () => {
    const faltan = detectUnsupportedDirectorIaDomain("¿Qué documentos le faltan?");
    assert.ok(faltan);
    assert.equal(faltan.id, "documentos");
    assert.equal(planDirectorIaQuestion("¿Qué documentos faltan del folio?").intent, "folio_documents");
    const pdf = detectUnsupportedDirectorIaDomain("muéstrame el PDF del folio 123");
    assert.ok(pdf);
    assert.equal(pdf.id, "documentos");
    const contenido = detectUnsupportedDirectorIaDomain("contenido del documento del folio 123");
    assert.ok(contenido);
    assert.equal(contenido.id, "documentos");
    const cheque = detectUnsupportedDirectorIaDomain("¿Tiene cheque o depósito?");
    assert.ok(cheque);
    assert.equal(cheque.id, "cheques");
  });

  it("no redirige a Action Register ni a M3", () => {
    const plan = planDirectorIaQuestion("listar documentos del folio 123");
    assert.equal(plan.intent, "folio_documents");
    assert.ok(plan.domains.includes("documentos"));
    assert.equal(plan.domains.includes("action_register"), false);
    assert.equal(plan.domains.includes("dashboard_kpis"), false);
    assert.notEqual(planDirectorIaQuestion("¿Qué acciones están vencidas?").intent, "folio_documents");
    assert.notEqual(planDirectorIaQuestion("¿Cuáles son los kpis del dashboard?").intent, "folio_documents");
  });

  it("get_folio_documents tiene executor read-only de metadata", () => {
    const t = getDirectorIaTool("get_folio_documents");
    assert.equal(t.executor, "loadFolioDocumentsMetadataForChat");
    assert.equal(t.readOnly, true);
    assert.equal(t.status, "available_on_demand");
    assert.equal(isDirectorIaToolExecutable("get_folio_documents"), true);
    const reg = validateDirectorIaToolRegistry();
    assert.equal(reg.ok, true, reg.errors && reg.errors.join(", "));
  });
});

describe("M2 documents metadata loader", () => {
  it("metadata por folio id", async () => {
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      ...injectOpts([baseFolio()], [docRow()], { question: "listar documentos del folio 123" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.folio_id, 123);
    assert.equal(payload.count, 1);
    assert.equal(payload.documents[0].document_id, 10);
    assert.equal(payload.documents[0].tipo, "COTIZACION");
    assert.equal(payload.source, SOURCE);
    assert.equal(payload.semantic_class, FOLIO_DOCUMENTS_SEMANTIC_CLASS);
    assertSafeProjection(payload.documents[0]);
    assertNoStorageLeak(payload);
  });

  it("metadata por numero_folio", async () => {
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      ...injectOpts(
        [folioByNumero()],
        [docRow({ folio_id: 456, numero_folio: "F-202601-002", id: 22, file_name: "poliza.pdf", tipo: "POLIZA" })],
        { question: "qué documentos tiene el folio F-202601-002" }
      ),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.folio_id, 456);
    assert.equal(payload.numero_folio, "F-202601-002");
    assert.equal(payload.documents[0].tipo, "POLIZA");
    assert.equal(payload.documents[0].file_name, "poliza.pdf");
    assertSafeProjection(payload.documents[0]);
  });

  it("múltiples documentos preservan tipo, status, file_name y subido_en", async () => {
    const rows = [
      docRow({ id: 1, tipo: "COTIZACION", status: "PENDIENTE", file_name: "a.pdf", subido_en: "2026-01-01T00:00:00.000Z" }),
      docRow({ id: 2, tipo: "FACTURA", status: "APROBADO", file_name: "b.pdf", subido_en: "2026-01-02T00:00:00.000Z" }),
      docRow({ id: 3, tipo: "POLIZA", status: "RECHAZADO", file_name: "c.pdf", subido_en: "2026-01-03T00:00:00.000Z" }),
    ];
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      ...injectOpts([baseFolio()], rows, { question: "listar documentos del folio 123" }),
    });
    assert.equal(payload.count, 3);
    assert.deepEqual(
      payload.documents.map((d) => d.tipo),
      ["COTIZACION", "FACTURA", "POLIZA"]
    );
    assert.deepEqual(
      payload.documents.map((d) => d.status),
      ["PENDIENTE", "APROBADO", "RECHAZADO"]
    );
    assert.deepEqual(
      payload.documents.map((d) => d.file_name),
      ["a.pdf", "b.pdf", "c.pdf"]
    );
    assert.deepEqual(
      payload.documents.map((d) => d.subido_en),
      ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z", "2026-01-03T00:00:00.000Z"]
    );
    payload.documents.forEach(assertSafeProjection);
    assertNoStorageLeak(payload);
  });

  it("cero documentos no afirma faltantes", async () => {
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      ...injectOpts([baseFolio()], [], { question: "listar documentos del folio 123" }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 0);
    assert.deepEqual(payload.documents, []);
    const result = buildFolioDocumentsMetadataChatResult(payload, { planta_id: 1 });
    assert.match(result.answer, /no hay registros documentales encontrados/i);
    assert.match(result.answer, /Estos son los registros documentales que existen para este folio/);
    assert.doesNotMatch(result.answer, /\bfaltan documentos\b/i);
    assert.doesNotMatch(result.answer, /\bfalta tal documento\b/i);
    assert.doesNotMatch(result.answer, /documentaci[oó]n (in)?completa/i);
  });

  it("nulls se preservan y no inventan metadata", async () => {
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      ...injectOpts(
        [baseFolio()],
        [docRow({ tipo: null, status: "  ", file_name: null, subido_en: null })],
        { question: "listar documentos del folio 123" }
      ),
    });
    const doc = payload.documents[0];
    assert.equal(doc.tipo, null);
    assert.equal(doc.status, null);
    assert.equal(doc.file_name, null);
    assert.equal(doc.subido_en, null);
    const result = buildFolioDocumentsMetadataChatResult(payload, { planta_id: 1 });
    assert.match(result.answer, /tipo no registrado/);
    assert.match(result.answer, /status no registrado/);
    assert.match(result.answer, /nombre no registrado/);
  });

  it("projectDocument omite s3_key, URL y bytes aunque el row crudo los traiga", () => {
    const projected = projectDocument(docRow());
    assertSafeProjection(projected);
    assertNoStorageLeak(projected);
    assert.equal(projected.document_id, 10);
    assert.equal(projected.file_name, "cotizacion.pdf");
  });

  it("folio inexistente es 404 y no consulta metadata", async () => {
    const opts = injectOpts([], [docRow()], { question: "listar documentos del folio 999" });
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), opts);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 404);
    assert.equal(payload.code, DATA_NOT_FOUND);
    assert.equal(opts._calls().documentCalls, 0);
  });

  it("cross-planta es 403 y no consulta metadata", async () => {
    const opts = injectOpts([baseFolio({ planta_id: 2 })], [docRow()], {
      question: "listar documentos del folio 123",
    });
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), opts);
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(opts._calls().documentCalls, 0);
  });

  it("planta no autorizada es 403 fail-closed", async () => {
    let folioCalled = false;
    let docsCalled = false;
    const payload = await loadFolioDocumentsMetadataForChat(
      null,
      2,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "listar documentos del folio 123",
          getFolioById: async () => {
            folioCalled = true;
            return baseFolio({ planta_id: 2 });
          },
          listDocumentsMetadataForFolio: async () => {
            docsCalled = true;
            return { rows: [], truncated: false, limit: 50 };
          },
        }),
      }
    );
    assert.equal(payload.status, 403);
    assert.equal(folioCalled, false);
    assert.equal(docsCalled, false);
  });

  it("plantas_permitidas deja pasar GA en planta autorizada", async () => {
    const payload = await loadFolioDocumentsMetadataForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      { ...injectOpts([baseFolio()], [docRow()], { question: "listar documentos del folio 123" }) }
    );
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 1);
  });

  it("GA no ve folio de otra planta aunque consulte su planta autorizada", async () => {
    const opts = injectOpts([baseFolio({ planta_id: 9 })], [docRow()], {
      question: "listar documentos del folio 123",
    });
    const payload = await loadFolioDocumentsMetadataForChat(
      null,
      1,
      { dashboardAuth: { role: "GA", plantas_permitidas: [1] } },
      opts
    );
    assert.equal(payload.status, 403);
    assert.equal(opts._calls().documentCalls, 0);
  });

  it("GV no llega a folio ni metadata", async () => {
    let folioCalled = false;
    let docsCalled = false;
    const payload = await loadFolioDocumentsMetadataForChat(
      null,
      1,
      { dashboardAuth: { role: "GV", plantas_permitidas: [1] } },
      {
        ...injectOpts([], [], {
          question: "listar documentos del folio 123",
          getFolioById: async () => {
            folioCalled = true;
            return baseFolio();
          },
          listDocumentsMetadataForFolio: async () => {
            docsCalled = true;
            return { rows: [docRow()], truncated: false, limit: 50 };
          },
        }),
      }
    );
    assert.equal(payload.status, 403);
    assert.equal(payload.code, SOURCE_RESTRICTED);
    assert.equal(folioCalled, false);
    assert.equal(docsCalled, false);
  });

  it("consulta metadata solo después de resolver y autorizar", async () => {
    const order = [];
    const payload = await loadFolioDocumentsMetadataForChat(null, 1, zpReq(), {
      resolveEquivalentIds: (id) => [Number(id)],
      getFolioById: async () => {
        order.push("folio");
        return baseFolio();
      },
      getFolioByNumero: async () => null,
      listDocumentsMetadataForFolio: async () => {
        order.push("metadata");
        return { rows: [docRow()], truncated: false, limit: 50 };
      },
      question: "listar documentos del folio 123",
    });
    assert.equal(payload.ok, true);
    assert.deepEqual(order, ["folio", "metadata"]);
  });
});

describe("M2 documents metadata no storage / no HTTP / no writes", () => {
  it("el módulo no escribe, no llama HTTP y no toca almacenamiento", () => {
    assert.doesNotMatch(DOCS_SRC, /\b(INSERT|UPDATE|DELETE)\b/);
    assert.doesNotMatch(DOCS_SRC, /\bfetch\s*\(/);
    assert.doesNotMatch(DOCS_SRC, /axios\./);
    assert.doesNotMatch(DOCS_SRC, /getSignedDownloadUrl/);
    assert.doesNotMatch(DOCS_SRC, /getBufferFromS3/);
    assert.doesNotMatch(DOCS_SRC, /@aws-sdk/);
    assert.doesNotMatch(DOCS_SRC, /\/media/);
    assert.doesNotMatch(DOCS_SRC, /\/cotizacion/);
    assert.doesNotMatch(DOCS_SRC, /\/documento/);
    assert.doesNotMatch(DOCS_SRC, /maybeAdvanceFolioToComprobaciones/);
    assert.doesNotMatch(DOCS_SRC, /require\(["']\.\/server["']\)/);
    assert.doesNotMatch(DOCS_SRC, /director-ia-real-cycle/);
    assert.match(DOCS_SRC, /SELECT fa\.id, fa\.folio_id, fa\.numero_folio, fa\.tipo, fa\.status, fa\.file_name, fa\.subido_en/);
    assert.doesNotMatch(DOCS_SRC, /fa\.s3_key/);
    assert.doesNotMatch(DOCS_SRC, /fa\.url/);
    assert.doesNotMatch(DOCS_SRC, /fa\.sha256/);
  });

  it("el chat cablea folio_documents in-process y no construye URL", () => {
    assert.match(CHAT_SRC, /intent === "folio_documents"/);
    assert.match(CHAT_SRC, /loadFolioDocumentsMetadataForChat/);
    assert.doesNotMatch(CHAT_SRC, /getSignedDownloadUrl/);
    assert.doesNotMatch(CHAT_SRC, /getBufferFromS3/);
    assert.doesNotMatch(CHAT_SRC, /\/api\/folios\/:id\/media/);
    assert.doesNotMatch(CHAT_SRC, /maybeAdvanceFolioToComprobaciones/);
  });
});

describe("M2 documents metadata chat end-to-end in-process", () => {
  let askDirectorIa;
  let configureDirectorIaChat;

  before(() => {
    process.env.ENABLE_DIRECTOR_IA = "true";
    ({ askDirectorIa, configureDirectorIaChat } = require("../lib/director-ia-chat"));
  });

  function poolWith(folioRows, documentRows) {
    const rows = folioRows || [baseFolio()];
    const docs = documentRows || [docRow()];
    return {
      connect: async () => ({
        query: async (sql, params) => {
          if (/FROM public\.plantas/.test(sql)) {
            return { rows: [{ id: 1, nombre: "Puebla", clave: "E7" }] };
          }
          if (/FROM public\.folios/.test(sql) && /f\.id = \$1/.test(sql)) {
            return { rows: rows.filter((r) => Number(r.id) === Number(params[0])) };
          }
          if (/FROM public\.folios/.test(sql) && /numero_folio = \$1/.test(sql)) {
            return { rows: rows.filter((r) => r.numero_folio === params[0]) };
          }
          if (/FROM public\.folio_archivos/.test(sql)) {
            return { rows: docs };
          }
          return { rows: [] };
        },
        release() {},
      }),
    };
  }

  it("listar documentos llega al executor y no a SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "listar documentos del folio 123"
    );
    assert.equal(result.ok, true);
    assert.notEqual(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.mode, "folio_documents_metadata");
    assert.equal(result.context_meta.openai_called, false);
    assert.equal(result.context_meta.semantic_class, FOLIO_DOCUMENTS_SEMANTIC_CLASS);
    assert.ok(result.folio_documents);
    assert.equal(result.folio_documents.folio_id, 123);
    assert.equal(result.folio_documents.count, 1);
    assert.equal(result.folio_documents.documents[0].tipo, "COTIZACION");
    assertSafeProjection(result.folio_documents.documents[0]);
    assertNoStorageLeak(result);
    assert.match(result.answer, /Estos son los registros documentales que existen para este folio/);
    assert.doesNotMatch(result.answer, /todavía no está integrado/i);
    assert.doesNotMatch(result.answer, /\bfaltan documentos\b/i);
  });

  it("qué documentos tiene por numero_folio no cae a M3 ni AR", async () => {
    configureDirectorIaChat({
      pool: poolWith(
        [folioByNumero()],
        [docRow({ folio_id: 456, numero_folio: "F-202601-002", tipo: "FACTURA", file_name: "f.pdf" })]
      ),
    });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "qué documentos tiene el folio F-202601-002"
    );
    assert.equal(result.context_meta.mode, "folio_documents_metadata");
    assert.notEqual(result.context_meta.mode, "dashboard_kpis");
    assert.notEqual(result.context_meta.mode, "duplicate_folios");
    assert.equal(result.folio_documents.numero_folio, "F-202601-002");
    assert.equal(result.folio_documents.documents[0].tipo, "FACTURA");
    assert.equal(result.context_meta.openai_called, false);
  });

  it("pregunta faltan documentos sigue SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "¿Qué documentos le faltan?"
    );
    assert.equal(result.limitation && result.limitation.code, SOURCE_NOT_INTEGRATED);
    assert.equal(result.context_meta.requested_domain, "documentos");
    assert.equal(result.folio_documents, undefined);
  });

  it("PDF y contenido siguen SOURCE_NOT_INTEGRATED", async () => {
    configureDirectorIaChat({ pool: poolWith() });
    const pdf = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "muéstrame el PDF del folio 123"
    );
    assert.equal(pdf.limitation && pdf.limitation.code, SOURCE_NOT_INTEGRATED);
    const contenido = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "contenido del documento del folio 123"
    );
    assert.equal(contenido.limitation && contenido.limitation.code, SOURCE_NOT_INTEGRATED);
  });

  it("cero docs en chat no afirma faltantes", async () => {
    configureDirectorIaChat({ pool: poolWith([baseFolio()], []) });
    const result = await askDirectorIa(
      { body: {}, dashboardAuth: { role: "ZP" } },
      1,
      "listar documentos del folio 123"
    );
    assert.equal(result.folio_documents.count, 0);
    assert.match(result.answer, /no hay registros documentales encontrados/i);
    assert.doesNotMatch(result.answer, /\bfaltan documentos\b/i);
    assertNoStorageLeak(result);
  });
});
