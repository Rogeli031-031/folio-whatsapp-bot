#!/usr/bin/env node
"use strict";

const assert = require("assert");
const m = require("../lib/seh-carpetas-legales");

assert.strictEqual(m.normalizeDocNo("0.1"), "0.1");
assert.strictEqual(m.normalizeDocNo("3.29"), "3.29");
assert.strictEqual(m.normalizeDocNo("bad"), null);

assert.strictEqual(m.normalizeEstatus("Vigente"), "vigente");
assert.strictEqual(m.normalizeEstatus("en trámite"), "en_tramite");
assert.strictEqual(m.normalizeEstatus("N/A"), "na");
assert.strictEqual(m.normalizeEstatus(""), null);
assert.strictEqual(m.normalizeEstatus("xyz"), undefined);

assert.strictEqual(m.parseVencimientoDate("2026-08-15"), "2026-08-15");
assert.strictEqual(m.parseVencimientoDate("08/15/2026"), "2026-08-15");
assert.strictEqual(m.parseVencimientoDate("15-08-2026"), "2026-08-15");
assert.strictEqual(m.parseVencimientoDate(""), null);

const mapped = m.mapRow({
  planta_id: 1,
  doc_no: "0.1",
  estatus: "vigente",
  comentario: "ok",
  vencimiento: "2026-08-15",
  vencimiento_na: false,
  file_name: "a.pdf",
  content_type: "application/pdf",
  file_size_bytes: 10,
});
assert.strictEqual(mapped.has_archivo, true);
assert.strictEqual(mapped.estatus, "vigente");

console.log("OK seh-carpetas-legales helpers");
