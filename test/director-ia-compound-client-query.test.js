"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { detectDirectorIaIntent } = require("../lib/director-ia-planner");
const {
  extractEntityHint,
  extractLeadingYHintCandidates,
  resolveConversationTurn,
  resolveUniqueEntityFromHints,
} = require("../lib/director-ia-conversation-state");
const {
  isClientProfileQuestion,
  extractEmbeddedClientHintCandidates,
  loadClientProfileForChat,
  resolveClientProfileSlots,
  defaultThreeMonths,
} = require("../lib/director-ia-client-profile");

const ROOT = path.join(__dirname, "..");
const RUNTIME_FILES = [
  "lib/director-ia-conversation-state.js",
  "lib/director-ia-client-profile.js",
  "lib/director-ia-chat.js",
  "lib/director-ia-planner.js",
];

const NOW = new Date("2026-09-01T10:00:00-06:00");
const EXPLICIT_MONTHS = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
];

const Q = Object.freeze({
  B1: "Dame las compras de Y GRUPO MOVE.",
  B2: "Dame los kg comprados de Y GRUPO MOVE.",
  B3: "Dame las compras de TORTILLERIA ERICK.",
  B4: "Dame los kg comprados de TORTILLERIA ERICK.",
  C1: "Dame las compras de Y GRUPO MOVE desde enero a la fecha.",
  C2: "Dame los kg comprados de Y GRUPO MOVE desde enero a la fecha.",
  C3: "Dame los kg comprados y el descuento por cada mes de Y GRUPO MOVE desde enero a la fecha.",
  C4: "Dame las compras de TORTILLERIA ERICK desde enero a la fecha.",
  C5: "Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.",
  D1: "Dame las compras del cliente Y GRUPO MOVE desde enero a la fecha.",
  D2: "Dame las compras del cliente TORTILLERIA ERICK desde enero a la fecha.",
  E1: "Dame los kg comprados de GRUPO MOVE EMPRESARIAL desde enero a la fecha.",
  SABEMOS_MOVE: "¿Qué sabemos de Y GRUPO MOVE?",
  LEADING_MOVE: "Y GRUPO MOVE",
  Y_ARTURO: "¿Y Arturo?",
  SABEMOS_Y_ARTURO: "¿Qué sabemos de Y Arturo?",
  NO_CLIENT_KG: "Dame los kg comprados desde enero a la fecha.",
  PLANTA: "Dame las compras de la planta desde enero a la fecha.",
  NO_CLIENT: "Dame las compras.",
  STRUCTURAL: "Dame las compras de Y DELTA NORTE.",
  MISSING: "Dame las compras de ACME SUR INDUSTRIAL.",
  PACIFICO: "Dame las compras de COMERCIAL DEL PACIFICO.",
  MOLINOS: "Dame los kg comprados de MOLINOS DE ACAPULCO desde enero a la fecha.",
  PLANT_ACAPULCO: "Dame las compras de Acapulco.",
  PLANT_PUEBLA: "Dame las compras de Puebla.",
  SINGLE_ARTURO: "Dame las compras de Arturo.",
});

function catalogSales() {
  return [
    { month: "2026-01", cliente_norm: "Y GRUPO MOVE", canal: "Casa", subcanal: "", kg: 20 },
    { month: "2026-08", cliente_norm: "Y GRUPO MOVE", canal: "Casa", subcanal: "", kg: 80 },
    { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 40 },
    { month: "2026-08", cliente_norm: "TORTILLERIA", canal: "Casa", subcanal: "", kg: 15 },
    { month: "2026-08", cliente_norm: "GRUPO MOVE EMPRESARIAL", canal: "Comisionista", subcanal: "", kg: 100 },
    { month: "2026-08", cliente_norm: "GRUPO", canal: "Casa", subcanal: "", kg: 9 },
    { month: "2026-08", cliente_norm: "Y Arturo", canal: "Casa", subcanal: "", kg: 70 },
    { month: "2026-08", cliente_norm: "Arturo Lopez", canal: "Casa", subcanal: "", kg: 35 },
    { month: "2026-08", cliente_norm: "Y DELTA NORTE", canal: "Casa", subcanal: "", kg: 55 },
    { month: "2026-08", cliente_norm: "COMERCIAL DEL PACIFICO", canal: "Casa", subcanal: "", kg: 44 },
    { month: "2026-01", cliente_norm: "MOLINOS DE ACAPULCO", canal: "Casa", subcanal: "", kg: 18 },
    { month: "2026-08", cliente_norm: "MOLINOS DE ACAPULCO", canal: "Casa", subcanal: "", kg: 33 },
  ];
}

function profileBase(salesRows) {
  return {
    now: NOW,
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

function turnFor(question, echoedState = null) {
  return resolveConversationTurn({
    question,
    history: [],
    plantaId: 1,
    echoedState,
    detectIntent: detectDirectorIaIntent,
  });
}

async function loadFromQuestion(question, salesRows, extra = {}) {
  const turn = turnFor(question, extra.echoedState || null);
  return loadClientProfileForChat({ connect: async () => ({ release() {} }) }, 1, { dashboardAuth: { role: "ZP" } }, {
    ...profileBase(salesRows),
    question,
    entity_hint: turn.entity_hint,
    entity_hint_candidates: turn.entity_hint_candidates,
    leading_y_requires_canonical: turn.leading_y_requires_canonical,
    embedded_client_requires_canonical: turn.embedded_client_requires_canonical,
    ...extra,
  });
}

function assertDefaultThreeMonths(assembled) {
  const expected = defaultThreeMonths(NOW).map((m) => m.yyyymm);
  assert.equal(assembled.period.source, "default");
  assert.deepEqual(assembled.period.months, expected);
  assert.deepEqual(expected, ["2026-07", "2026-08", "2026-09"]);
}

function assertExplicitEneroFecha(assembled) {
  assert.equal(assembled.period.source, "explicit");
  assert.deepEqual(assembled.period.months, EXPLICIT_MONTHS);
  assert.deepEqual(assembled.period.requested_range, { start: "2026-01", end: "2026-09" });
  assert.equal(assembled.period.query_start, "2026-01-01");
  assert.equal(assembled.period.query_end, "2026-09-30");
}

function assertResolvedClient(assembled, name) {
  assert.equal(assembled.ok, true);
  assert.equal(Boolean(assembled.needs_clarification), false);
  assert.equal(assembled.identity.cliente_norm, name);
}

describe("compound client query — Slice B semantic (no period)", () => {
  it("B1: compras de Y GRUPO MOVE entra a client_profile con default 3M", async () => {
    assert.equal(isClientProfileQuestion(Q.B1), true);
    assert.equal(detectDirectorIaIntent(Q.B1).intent, "client_profile");
    assert.equal(extractEntityHint(Q.B1), null);
    assert.equal(extractLeadingYHintCandidates(Q.B1), null);
    const parsed = extractEmbeddedClientHintCandidates(Q.B1);
    assert.equal(parsed.longest, "Y GRUPO MOVE");
    const turn = turnFor(Q.B1);
    assert.equal(turn.detected_intent, "client_profile");
    assert.equal(turn.entity_hint, "Y GRUPO MOVE");
    assert.ok(turn.entity_hint_candidates.includes("Y GRUPO MOVE"));
    assert.equal(turn.embedded_client_requires_canonical, true);
    assert.equal(turn.leading_y_requires_canonical, false);
    const assembled = await loadFromQuestion(Q.B1, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertDefaultThreeMonths(assembled);
  });

  it("B2: kg comprados de Y GRUPO MOVE entra a client_profile con default 3M", async () => {
    assert.equal(detectDirectorIaIntent(Q.B2).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.B2, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertDefaultThreeMonths(assembled);
  });

  it("B3: compras de TORTILLERIA ERICK entra a client_profile con default 3M", async () => {
    assert.equal(detectDirectorIaIntent(Q.B3).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.B3, catalogSales());
    assertResolvedClient(assembled, "TORTILLERIA ERICK");
    assert.notEqual(assembled.identity.cliente_norm, "TORTILLERIA");
    assertDefaultThreeMonths(assembled);
  });

  it("B4: kg comprados de TORTILLERIA ERICK entra a client_profile con default 3M", async () => {
    assert.equal(detectDirectorIaIntent(Q.B4).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.B4, catalogSales());
    assertResolvedClient(assembled, "TORTILLERIA ERICK");
    assertDefaultThreeMonths(assembled);
  });
});

describe("compound client query — Slice A identity (explicit period)", () => {
  it("C1: compras de Y GRUPO MOVE desde enero a la fecha", async () => {
    assert.equal(detectDirectorIaIntent(Q.C1).intent, "client_profile");
    assert.equal(extractEntityHint(Q.C1), null);
    const turn = turnFor(Q.C1);
    assert.equal(turn.entity_hint, "Y GRUPO MOVE");
    assert.equal(turn.embedded_client_requires_canonical, true);
    const assembled = await loadFromQuestion(Q.C1, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assert.notEqual(assembled.identity.cliente_norm, "GRUPO");
    assertExplicitEneroFecha(assembled);
  });

  it("C2: kg comprados de Y GRUPO MOVE desde enero a la fecha", async () => {
    const assembled = await loadFromQuestion(Q.C2, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertExplicitEneroFecha(assembled);
  });

  it("C3: kg y descuento por mes de Y GRUPO MOVE desde enero a la fecha", async () => {
    assert.equal(detectDirectorIaIntent(Q.C3).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.C3, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertExplicitEneroFecha(assembled);
  });

  it("C4: compras de TORTILLERIA ERICK desde enero a la fecha", async () => {
    const assembled = await loadFromQuestion(Q.C4, catalogSales());
    assertResolvedClient(assembled, "TORTILLERIA ERICK");
    assert.notEqual(assembled.identity.cliente_norm, "TORTILLERIA");
    assertExplicitEneroFecha(assembled);
  });

  it("C5: kg y descuento por mes de TORTILLERIA ERICK desde enero a la fecha", async () => {
    const assembled = await loadFromQuestion(Q.C5, catalogSales());
    assertResolvedClient(assembled, "TORTILLERIA ERICK");
    assertExplicitEneroFecha(assembled);
  });

  it("D1: anchor cliente Y GRUPO MOVE no pierde el nombre", async () => {
    assert.equal(extractEntityHint(Q.D1), null);
    const turn = turnFor(Q.D1);
    assert.equal(turn.entity_hint, "Y GRUPO MOVE");
    const assembled = await loadFromQuestion(Q.D1, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertExplicitEneroFecha(assembled);
  });

  it("D2: cliente TORTILLERIA ERICK no se recorta a TORTILLERIA", async () => {
    assert.equal(extractEntityHint(Q.D2), "TORTILLERIA");
    const turn = turnFor(Q.D2);
    assert.equal(turn.entity_hint, "TORTILLERIA ERICK");
    assert.ok(turn.entity_hint_candidates.includes("TORTILLERIA ERICK"));
    assert.equal(turn.entity_hint_candidates.includes("TORTILLERIA"), false);
    assert.equal(turn.embedded_client_requires_canonical, true);
    const assembled = await loadFromQuestion(Q.D2, catalogSales());
    assertResolvedClient(assembled, "TORTILLERIA ERICK");
    assert.notEqual(assembled.identity.cliente_norm, "TORTILLERIA");
    assertExplicitEneroFecha(assembled);
  });

  it("E1: GRUPO MOVE EMPRESARIAL multi-token no-Y", async () => {
    assert.equal(extractEntityHint(Q.E1), null);
    const assembled = await loadFromQuestion(Q.E1, catalogSales());
    assertResolvedClient(assembled, "GRUPO MOVE EMPRESARIAL");
    assert.notEqual(assembled.identity.cliente_norm, "GRUPO");
    assert.notEqual(assembled.identity.cliente_norm, "GRUPO MOVE");
    assertExplicitEneroFecha(assembled);
  });
});

describe("compound client query — leading-Y / Arturo controls", () => {
  it("¿Qué sabemos de Y GRUPO MOVE? conserva identidad y default 3M", async () => {
    assert.equal(extractEntityHint(Q.SABEMOS_MOVE), "Y GRUPO MOVE");
    assert.equal(extractLeadingYHintCandidates(Q.SABEMOS_MOVE), null);
    const assembled = await loadFromQuestion(Q.SABEMOS_MOVE, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assertDefaultThreeMonths(assembled);
  });

  it("leading-Y Y GRUPO MOVE sigue resolviendo canónico", async () => {
    const parsed = extractLeadingYHintCandidates(Q.LEADING_MOVE);
    assert.equal(parsed.canonical, "Y GRUPO MOVE");
    assert.equal(parsed.requires_canonical_evidence, true);
    const turn = turnFor(Q.LEADING_MOVE);
    assert.equal(turn.leading_y_requires_canonical, true);
    assert.equal(turn.embedded_client_requires_canonical, false);
    const assembled = await loadFromQuestion(Q.LEADING_MOVE, catalogSales());
    assertResolvedClient(assembled, "Y GRUPO MOVE");
  });

  it("¿Y Arturo? sigue siendo Arturo y no Y Arturo", async () => {
    assert.equal(extractEntityHint(Q.Y_ARTURO), "Arturo");
    const parsed = extractLeadingYHintCandidates(Q.Y_ARTURO);
    assert.equal(parsed.conversational, "Arturo");
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
    const assembled = await loadFromQuestion(Q.Y_ARTURO, catalogSales());
    assert.notEqual(assembled.identity && assembled.identity.cliente_norm, "Y Arturo");
    assert.ok(
      assembled.identity &&
        (assembled.identity.cliente_norm === "Arturo" || assembled.identity.cliente_norm === "Arturo Lopez")
    );
  });

  it("¿Qué sabemos de Y Arturo? resuelve Y Arturo", async () => {
    assert.equal(extractEntityHint(Q.SABEMOS_Y_ARTURO), "Y Arturo");
    const assembled = await loadFromQuestion(Q.SABEMOS_Y_ARTURO, catalogSales());
    assertResolvedClient(assembled, "Y Arturo");
  });
});

describe("compound client query — periods, precedence, fail-closed", () => {
  it("enero a la fecha del parser histórico no cambia", () => {
    const slots = resolveClientProfileSlots(Q.C1, {}, NOW);
    assert.equal(slots.period_source, "explicit");
    assert.deepEqual(
      slots.months.map((m) => m.yyyymm),
      EXPLICIT_MONTHS
    );
    assert.equal(slots.query_start, "2026-01-01");
    assert.equal(slots.query_end, "2026-09-30");
  });

  it("explicit client > inherited client", async () => {
    const assembled = await loadFromQuestion(Q.B1, catalogSales(), {
      cliente_norm: "ARTURO",
      display_name: "ARTURO",
    });
    assertResolvedClient(assembled, "Y GRUPO MOVE");
    assert.notEqual(assembled.identity.cliente_norm, "ARTURO");
  });

  it("explicit period > inherited/default", async () => {
    const assembled = await loadFromQuestion(Q.C1, catalogSales(), {
      active_period_months: ["2026-06", "2026-07", "2026-08"],
    });
    assertExplicitEneroFecha(assembled);
  });

  it("fail-closed: cliente inexistente no usa prefix/substring/fuzzy", async () => {
    const assembled = await loadFromQuestion(Q.MISSING, [
      { month: "2026-08", cliente_norm: "ACME SUR INDUSTRIAL S A", canal: "Casa", subcanal: "", kg: 90 },
      { month: "2026-08", cliente_norm: "ACME", canal: "Casa", subcanal: "", kg: 11 },
    ]);
    assert.equal(assembled.ok, true);
    assert.equal(assembled.needs_clarification, true);
    assert.equal(assembled.clarification.status, "not_found");
    assert.equal(assembled.identity, undefined);
  });

  it("fail-closed: D2 no acepta TORTILLERIA aunque exista fila exacta del recorte", async () => {
    const assembled = await loadFromQuestion(Q.D2, [
      { month: "2026-08", cliente_norm: "TORTILLERIA", canal: "Casa", subcanal: "", kg: 40 },
      { month: "2026-08", cliente_norm: "ERICK", canal: "Casa", subcanal: "", kg: 10 },
    ]);
    assert.equal(assembled.needs_clarification, true);
    assert.equal(assembled.clarification.status, "not_found");
    assert.equal(assembled.identity, undefined);
  });

  it("exact duplicate → ambiguous", async () => {
    const assembled = await loadFromQuestion(Q.B3, [
      { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Casa", subcanal: "", kg: 10 },
      { month: "2026-08", cliente_norm: "TORTILLERIA ERICK", canal: "Comisionista", subcanal: "", kg: 12 },
    ]);
    assert.equal(assembled.needs_clarification, true);
    assert.equal(assembled.clarification.status, "ambiguous");
  });

  it("no convierte compras/kg sin cliente ni compras de la planta", () => {
    assert.equal(isClientProfileQuestion(Q.NO_CLIENT), false);
    assert.equal(detectDirectorIaIntent(Q.NO_CLIENT).intent, "unknown");
    assert.equal(extractEmbeddedClientHintCandidates(Q.NO_CLIENT), null);
    assert.equal(isClientProfileQuestion(Q.NO_CLIENT_KG), false);
    assert.equal(detectDirectorIaIntent(Q.NO_CLIENT_KG).intent, "unknown");
    assert.equal(extractEmbeddedClientHintCandidates(Q.NO_CLIENT_KG), null);
    assert.equal(isClientProfileQuestion(Q.PLANTA), false);
    assert.equal(detectDirectorIaIntent(Q.PLANTA).intent, "unknown");
    assert.equal(extractEmbeddedClientHintCandidates(Q.PLANTA), null);
    assert.equal(turnFor(Q.PLANTA).entity_hint, null);
  });

  it("control estructural multi-token no hardcodeado", async () => {
    const parsed = extractEmbeddedClientHintCandidates(Q.STRUCTURAL);
    assert.equal(parsed.longest, "Y DELTA NORTE");
    const assembled = await loadFromQuestion(Q.STRUCTURAL, catalogSales());
    assertResolvedClient(assembled, "Y DELTA NORTE");
    assertDefaultThreeMonths(assembled);
  });

  it("conectores internos: COMERCIAL DEL PACIFICO con default 3M", async () => {
    const parsed = extractEmbeddedClientHintCandidates(Q.PACIFICO);
    assert.equal(parsed.longest, "COMERCIAL DEL PACIFICO");
    assert.equal(parsed.spans.includes("COMERCIAL"), false);
    assert.equal(detectDirectorIaIntent(Q.PACIFICO).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.PACIFICO, catalogSales());
    assertResolvedClient(assembled, "COMERCIAL DEL PACIFICO");
    assert.notEqual(assembled.identity.cliente_norm, "COMERCIAL");
    assertDefaultThreeMonths(assembled);
  });

  it("conectores internos: MOLINOS DE ACAPULCO conserva nombre y periodo explícito", async () => {
    const parsed = extractEmbeddedClientHintCandidates(Q.MOLINOS);
    assert.equal(parsed.longest, "MOLINOS DE ACAPULCO");
    assert.equal(turnFor(Q.MOLINOS).entity_hint_candidates.includes("ACAPULCO"), false);
    const assembled = await loadFromQuestion(Q.MOLINOS, catalogSales());
    assertResolvedClient(assembled, "MOLINOS DE ACAPULCO");
    assert.notEqual(assembled.identity.cliente_norm, "ACAPULCO");
    assert.notEqual(assembled.identity.cliente_norm, "MOLINOS");
    assertExplicitEneroFecha(assembled);
  });

  it("Slice B no abre por proper noun de planta (Acapulco / Puebla)", () => {
    assert.equal(extractEmbeddedClientHintCandidates(Q.PLANT_ACAPULCO).longest, "Acapulco");
    assert.equal(isClientProfileQuestion(Q.PLANT_ACAPULCO), false);
    assert.equal(detectDirectorIaIntent(Q.PLANT_ACAPULCO).intent, "unknown");
    assert.equal(isClientProfileQuestion(Q.PLANT_PUEBLA), false);
    assert.equal(detectDirectorIaIntent(Q.PLANT_PUEBLA).intent, "unknown");
  });

  it("Slice B sigue aceptando cliente de un solo token", async () => {
    assert.equal(isClientProfileQuestion(Q.SINGLE_ARTURO), true);
    assert.equal(detectDirectorIaIntent(Q.SINGLE_ARTURO).intent, "client_profile");
    const assembled = await loadFromQuestion(Q.SINGLE_ARTURO, [
      { month: "2026-08", cliente_norm: "Arturo", canal: "Casa", subcanal: "", kg: 22 },
    ]);
    assertResolvedClient(assembled, "Arturo");
    assertDefaultThreeMonths(assembled);
  });

  it("sentence-boundary: desde/fecha no se tragan como parte del nombre", () => {
    const parsed = extractEmbeddedClientHintCandidates(Q.C1);
    assert.equal(parsed.longest, "Y GRUPO MOVE");
    assert.equal(/desde|enero|fecha/i.test(parsed.longest), false);
  });
});

describe("compound client query — no hardcode en runtime", () => {
  it("los módulos de runtime no contienen literales de los clientes de acceptance", () => {
    for (const rel of RUNTIME_FILES) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.equal(src.includes("Y GRUPO MOVE"), false, rel);
      assert.equal(src.includes("TORTILLERIA ERICK"), false, rel);
      assert.equal(src.includes("GRUPO MOVE EMPRESARIAL"), false, rel);
      assert.equal(src.includes("COMERCIAL DEL PACIFICO"), false, rel);
      assert.equal(src.includes("MOLINOS DE ACAPULCO"), false, rel);
      assert.equal(src.includes("Acapulco"), false, rel);
    }
  });
});
