"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  extractEntityHint,
  extractLeadingYHintCandidates,
  resolveConversationTurn,
  resolveUniqueEntity,
  resolveUniqueEntityFromHints,
} = require("../lib/director-ia-conversation-state");
const { detectDirectorIaIntent } = require("../lib/director-ia-planner");
const { loadClientProfileForChat } = require("../lib/director-ia-client-profile");

const ROOT = path.join(__dirname, "..");
const RUNTIME_FILES = [
  "lib/director-ia-conversation-state.js",
  "lib/director-ia-client-profile.js",
  "lib/director-ia-chat.js",
];

function leadingYLoadFields(question) {
  const parsed = extractLeadingYHintCandidates(question);
  return {
    question,
    entity_hint: extractEntityHint(question),
    entity_hint_candidates: parsed ? [parsed.canonical, parsed.conversational] : undefined,
    leading_y_requires_canonical: Boolean(parsed && parsed.requires_canonical_evidence),
  };
}

function profileBase(salesRows) {
  return {
    now: new Date("2026-09-01T10:00:00-06:00"),
    resolvePlanta: async () => ({ id: 1, nombre: "Acapulco", clave: "E3" }),
    resolvePlantCodes: async () => ({ not_found: false, uniqueCodes: ["E3"], plantCode: "E3" }),
    queryMonthlySales: async () => ({ rows: salesRows }),
    queryMonthlyDiscount: async () => ({ rows: [] }),
    queryActionsByKeys: async () => [],
    queryHistorialForActions: async () => new Map(),
    loadRecentCommentsByClienteNombres: async () => new Map(),
    queryCommentsByKeys: async () => [],
  };
}

async function loadProfile(question, salesRows, extra = {}) {
  return loadClientProfileForChat({ connect: async () => ({ release() {} }) }, 1, { dashboardAuth: { role: "ZP" } }, {
    ...profileBase(salesRows),
    ...leadingYLoadFields(question),
    ...extra,
  });
}

describe("leading Y client hint — conversation-state", () => {
  it("¿Y Arturo? sigue siendo follow-up Arturo", () => {
    assert.equal(extractEntityHint("¿Y Arturo?"), "Arturo");
    const parsed = extractLeadingYHintCandidates("¿Y Arturo?");
    assert.equal(parsed.conversational, "Arturo");
    assert.equal(parsed.canonical, "Y Arturo");
    assert.equal(parsed.requires_canonical_evidence, false);
    const unique = resolveUniqueEntityFromHints(
      [parsed.canonical, parsed.conversational],
      [
        { display: "Arturo Lopez", cliente_keys: ["a1"] },
        { display: "NullCo", cliente_keys: ["n1"] },
      ],
      { requires_canonical_evidence: false }
    );
    assert.equal(unique.status, "unique");
    assert.equal(unique.entity.display, "Arturo Lopez");
    assert.equal(resolveUniqueEntity("Arturo", [{ display: "Arturo Lopez", cliente_keys: ["a1"] }]).status, "unique");
  });

  it("¿Y Arturo? no elige Y Arturo aunque exista un exact hit más largo", () => {
    const parsed = extractLeadingYHintCandidates("¿Y Arturo?");
    assert.equal(parsed.requires_canonical_evidence, false);
    const collision = resolveUniqueEntityFromHints(
      [parsed.canonical, parsed.conversational],
      [
        { display: "Y Arturo", cliente_keys: ["y1"] },
        { display: "Arturo Lopez", cliente_keys: ["a1"] },
      ],
      { requires_canonical_evidence: false }
    );
    assert.equal(collision.status, "unique");
    assert.equal(collision.entity.display, "Arturo Lopez");
    assert.notEqual(collision.entity.display, "Y Arturo");
  });

  it("¿Qué sabemos de Y GRUPO MOVE? conserva la identidad en extracción", () => {
    assert.equal(extractEntityHint("¿Qué sabemos de Y GRUPO MOVE?"), "Y GRUPO MOVE");
    assert.equal(extractLeadingYHintCandidates("¿Qué sabemos de Y GRUPO MOVE?"), null);
  });

  it("Y GRUPO MOVE y ¿Y GRUPO MOVE? generan candidato canónico sin decidir por regex", () => {
    for (const q of ["Y GRUPO MOVE", "¿Y GRUPO MOVE?"]) {
      const parsed = extractLeadingYHintCandidates(q);
      assert.equal(parsed.canonical, "Y GRUPO MOVE");
      assert.equal(parsed.conversational, "GRUPO");
      assert.equal(parsed.requires_canonical_evidence, true);
      const turn = resolveConversationTurn({
        question: q,
        history: [],
        plantaId: 1,
        echoedState: null,
        detectIntent: detectDirectorIaIntent,
      });
      assert.ok(turn.entity_hint_candidates.includes("Y GRUPO MOVE"));
      assert.equal(turn.leading_y_requires_canonical, true);
    }
  });

  it("control estructural: el mismo mecanismo aplica a Y DELTA NORTE", () => {
    const parsed = extractLeadingYHintCandidates("¿Y DELTA NORTE?");
    assert.equal(parsed.canonical, "Y DELTA NORTE");
    assert.equal(parsed.conversational, "DELTA");
    assert.equal(parsed.requires_canonical_evidence, true);
    const unique = resolveUniqueEntityFromHints(
      [parsed.canonical, parsed.conversational],
      [
        { display: "Y DELTA NORTE", cliente_keys: ["d1"] },
        { display: "DELTA SUR", cliente_keys: ["d2"] },
      ],
      { requires_canonical_evidence: true }
    );
    assert.equal(unique.status, "unique");
    assert.equal(unique.entity.display, "Y DELTA NORTE");
  });

  it("fail-closed: sin evidencia canónica no usa el primer token ni fuzzy", () => {
    const parsed = extractLeadingYHintCandidates("Y ACME SUR");
    const none = resolveUniqueEntityFromHints(
      [parsed.canonical, parsed.conversational],
      [
        { display: "ACME SUR INDUSTRIAL", cliente_keys: ["a1"] },
        { display: "GRUPO ALFA", cliente_keys: ["g1"] },
      ],
      { requires_canonical_evidence: true }
    );
    assert.equal(none.status, "none");
  });

  it("fail-closed: dos identidades exactas iguales quedan ambiguous", () => {
    const parsed = extractLeadingYHintCandidates("Y ACME SUR");
    const amb = resolveUniqueEntityFromHints(
      [parsed.canonical, parsed.conversational],
      [
        { display: "Y ACME SUR", cliente_keys: ["a1"] },
        { display: "Y ACME SUR", cliente_keys: ["a2"] },
      ],
      { requires_canonical_evidence: true }
    );
    assert.equal(amb.status, "ambiguous");
    assert.equal(amb.matches.length, 2);
  });
});

describe("leading Y client hint — client_profile resolver", () => {
  const moveSales = [
    { month: "2026-08", cliente_norm: "Y GRUPO MOVE", canal: "Casa", subcanal: "", kg: 80 },
    { month: "2026-08", cliente_norm: "GRUPO MOVE EMPRESARIAL", canal: "Comisionista", subcanal: "", kg: 100 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 10 },
  ];

  it("Y GRUPO MOVE resuelve la identidad canónica y no GRUPO", async () => {
    const assembled = await loadProfile("Y GRUPO MOVE", moveSales);
    assert.equal(assembled.ok, true);
    assert.equal(Boolean(assembled.needs_clarification), false);
    assert.equal(assembled.identity.cliente_norm, "Y GRUPO MOVE");
    assert.notEqual(assembled.identity.cliente_norm, "GRUPO");
    assert.notEqual(assembled.identity.cliente_norm, "GRUPO MOVE");
  });

  it("¿Y GRUPO MOVE? resuelve Y GRUPO MOVE cuando existe en catálogo", async () => {
    const assembled = await loadProfile("¿Y GRUPO MOVE?", moveSales, {
      cliente_norm: "TORTILLERIA ERICK",
      display_name: "TORTILLERIA ERICK",
    });
    assert.equal(assembled.identity.cliente_norm, "Y GRUPO MOVE");
  });

  it("¿Qué sabemos de Y GRUPO MOVE? sigue resolviendo la identidad completa", async () => {
    const assembled = await loadProfile("¿Qué sabemos de Y GRUPO MOVE?", moveSales);
    assert.equal(assembled.identity.cliente_norm, "Y GRUPO MOVE");
  });

  it("control estructural: Y DELTA NORTE no está hardcodeado", async () => {
    const assembled = await loadProfile("Y DELTA NORTE", [
      { month: "2026-08", cliente_norm: "Y DELTA NORTE", canal: "Casa", subcanal: "", kg: 40 },
      { month: "2026-08", cliente_norm: "DELTA SUR", canal: "Casa", subcanal: "", kg: 9 },
    ]);
    assert.equal(assembled.identity.cliente_norm, "Y DELTA NORTE");
  });

  it("fail-closed: sin fila canónica no inventa GRUPO ni un vecino fuzzy", async () => {
    const assembled = await loadProfile("Y GRUPO MOVE", [
      { month: "2026-08", cliente_norm: "GRUPO MOVE EMPRESARIAL", canal: "Comisionista", subcanal: "", kg: 100 },
      { month: "2026-08", cliente_norm: "GRUPO ALFA", canal: "Casa", subcanal: "", kg: 50 },
    ]);
    assert.equal(assembled.ok, true);
    assert.equal(assembled.needs_clarification, true);
    assert.equal(assembled.clarification.status, "not_found");
    assert.equal(assembled.clarification.hint, "Y GRUPO MOVE");
    assert.equal(assembled.identity, undefined);
  });

  it("¿Y Arturo? no resuelve Y Arturo frente a Arturo Lopez", async () => {
    const assembled = await loadProfile("¿Y Arturo?", [
      { month: "2026-08", cliente_norm: "Y Arturo", canal: "Casa", subcanal: "", kg: 80 },
      { month: "2026-08", cliente_norm: "Arturo Lopez", canal: "Casa", subcanal: "", kg: 40 },
    ]);
    assert.notEqual(assembled.identity && assembled.identity.cliente_norm, "Y Arturo");
    assert.ok(
      assembled.identity &&
        (assembled.identity.cliente_norm === "Arturo" || assembled.identity.cliente_norm === "Arturo Lopez")
    );
  });

  it("¿Qué sabemos de Y Arturo? resuelve la identidad canónica Y Arturo", async () => {
    assert.equal(extractEntityHint("¿Qué sabemos de Y Arturo?"), "Y Arturo");
    const assembled = await loadProfile("¿Qué sabemos de Y Arturo?", [
      { month: "2026-08", cliente_norm: "Y Arturo", canal: "Casa", subcanal: "", kg: 80 },
      { month: "2026-08", cliente_norm: "Arturo Lopez", canal: "Casa", subcanal: "", kg: 40 },
    ]);
    assert.equal(assembled.identity.cliente_norm, "Y Arturo");
  });

  it("fail-closed: dos filas exactas del mismo hint quedan ambiguous", async () => {
    const assembled = await loadProfile("Y ACME SUR", [
      { month: "2026-08", cliente_norm: "Y ACME SUR", canal: "Casa", subcanal: "", kg: 10 },
      { month: "2026-08", cliente_norm: "Y ACME SUR", canal: "Comisionista", subcanal: "", kg: 12 },
    ]);
    assert.equal(assembled.needs_clarification, true);
    assert.equal(assembled.clarification.status, "ambiguous");
  });
});

describe("leading Y client hint — no hardcode en runtime", () => {
  it("los módulos de runtime no contienen el literal Y GRUPO MOVE", () => {
    for (const rel of RUNTIME_FILES) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("Y GRUPO MOVE"), false, rel);
    }
  });
});
