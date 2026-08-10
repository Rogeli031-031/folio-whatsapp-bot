#!/usr/bin/env node
"use strict";

const assert = require("assert");
const m = require("../lib/seh-equipos");

assert.strictEqual(m.sehParseVence("2026-09-09"), "2026-09-09");
assert.strictEqual(m.sehParseVence("09/09/2026"), "2026-09-09");
assert.strictEqual(m.sehParseVence("15/03/2026"), "2026-03-15");
assert.strictEqual(m.sehParseVence("3/1/2026"), "2026-01-03");
assert.strictEqual(m.sehParseVence("15-08-2026"), "2026-08-15");
assert.strictEqual(m.sehParseVence("13/40/2026"), null);
assert.strictEqual(m.sehParseVence(""), null);
assert.strictEqual(m.sehParseVence(null), null);

assert.strictEqual(m.sehNormalizeComponente("extintor"), "EXTINTOR");
assert.strictEqual(m.sehNormalizeComponente("VALVULA"), "VALVULA");
assert.strictEqual(m.sehNormalizeComponente("otro"), "");

assert.strictEqual(m.sehIsSci("SISTEMA CONTRA INCENDIO"), true);
assert.strictEqual(m.sehIsSci("PLANTA"), false);

const cleaned = m.sehCleanPutItems(
  [
    {
      categoria: "PLANTA",
      locacion: "Pasillo A",
      descripcion: "Extintor 1",
      componente: "EXTINTOR",
      vence: "09/09/2026",
      sort_order: 0,
    },
    {
      categoria: "PLANTA",
      locacion: "",
      descripcion: "",
      componente: "",
      vence: null,
      sort_order: 1,
    },
    {
      categoria: "SISTEMA CONTRA INCENDIO",
      nombre: "BOMBA 1",
      vence: "2026-12-01",
      sort_order: 0,
    },
  ],
  ["PLANTA", "SISTEMA CONTRA INCENDIO"]
);

assert.strictEqual(cleaned.length, 2);
assert.strictEqual(cleaned[0].descripcion, "Extintor 1");
assert.strictEqual(cleaned[0].componente, "EXTINTOR");
assert.strictEqual(cleaned[0].vence, "2026-09-09");
assert.strictEqual(cleaned[0].foto_base64, null);
assert.strictEqual(cleaned[1].nombre, "BOMBA 1");
assert.strictEqual(cleaned[1].vence, "2026-12-01");

const scopedOut = m.sehCleanPutItems(
  [
    {
      categoria: "PIPAS",
      locacion: "Pipa 1",
      componente: "VALVULA",
      vence: "2026-01-01",
      sort_order: 0,
    },
  ],
  ["PLANTA"]
);
assert.strictEqual(scopedOut.length, 0);

const withFoto = m.sehCleanPutItems([
  {
    categoria: "PLANTA",
    descripcion: "Extintor 2",
    componente: "EXTINTOR",
    vence: "2026-09-09",
    sort_order: 0,
    foto_base64: "aaaa",
    foto_file_name: "e.jpg",
    foto_content_type: "image/jpeg",
  },
]);
assert.strictEqual(withFoto.length, 1);
assert.strictEqual(withFoto[0].foto_base64, "aaaa");
assert.strictEqual(withFoto[0].foto_file_name, "e.jpg");

const cleared = m.sehCleanPutItems([
  {
    id: 42,
    categoria: "PLANTA",
    descripcion: "Extintor 1",
    componente: "EXTINTOR",
    vence: "2026-09-09",
    sort_order: 0,
    clear_foto: true,
  },
]);
assert.strictEqual(cleared.length, 1);
assert.strictEqual(cleared[0].clear_foto, true);
assert.strictEqual(cleared[0].foto_base64, null);
assert.strictEqual(cleared[0].id, 42);

const clearWinsOverBase64 = m.sehCleanPutItems([
  {
    categoria: "PLANTA",
    descripcion: "X",
    componente: "EXTINTOR",
    vence: "2026-01-01",
    sort_order: 0,
    clear_foto: true,
    foto_base64: "bbbb",
    foto_file_name: "n.jpg",
  },
]);
assert.strictEqual(clearWinsOverBase64[0].clear_foto, false);
assert.strictEqual(clearWinsOverBase64[0].foto_base64, "bbbb");
assert.strictEqual(clearWinsOverBase64[0].foto_file_name, "n.jpg");

console.log("OK seh-equipos helpers");
