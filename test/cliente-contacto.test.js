"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getClienteContacto,
  upsertClienteContacto,
  normNombre,
  validateContactoFields,
} = require("../lib/cliente-contacto");

function fakeClient(selectRow, returningRow) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql: String(sql), params: params || [] });
      if (/CREATE SCHEMA|CREATE TABLE|CREATE UNIQUE INDEX/i.test(sql)) return { rows: [] };
      if (/SELECT[\s\S]*FROM arr\.cliente_contactos/i.test(sql)) {
        return { rows: selectRow ? [selectRow] : [] };
      }
      if (/INSERT INTO arr\.cliente_contactos/i.test(sql)) {
        return { rows: [returningRow || { id: 1 }] };
      }
      return { rows: [] };
    },
  };
}

describe("cliente-contacto", () => {
  it("normaliza el nombre del cliente para la llave", () => {
    assert.equal(normNombre("  MARIANE   RIVAS "), "mariane rivas");
  });

  it("rechaza correo inválido y acepta vacío", () => {
    assert.equal(validateContactoFields({ correo: "malo" }).error, "Correo inválido");
    assert.equal(validateContactoFields({ correo: "" }).error, undefined);
    assert.equal(validateContactoFields({ correo: "a@b.com" }).correo, "a@b.com");
  });

  it("GET sin fila devuelve contacto vacío", async () => {
    const client = fakeClient(null);
    const out = await getClienteContacto(client, { planta_id: 1, cliente_nombre: "MARIANE RIVAS" });
    assert.equal(out.error, undefined);
    assert.equal(out.contacto.nombre_contacto, "");
    assert.equal(out.contacto.telefono, "");
    assert.equal(out.contacto.correo, "");
    const select = client.calls.find((c) => /SELECT[\s\S]*FROM arr\.cliente_contactos/i.test(c.sql));
    assert.ok(select);
    assert.equal(select.params[0], 1);
    assert.equal(select.params[1], "mariane rivas");
  });

  it("GET exige planta y cliente", async () => {
    const client = fakeClient(null);
    assert.equal((await getClienteContacto(client, { cliente_nombre: "X" })).error, "planta_id requerido");
    assert.equal((await getClienteContacto(client, { planta_id: 1 })).error, "cliente_nombre requerido");
  });

  it("upsert persiste las tres variables", async () => {
    const client = fakeClient(null, {
      id: 9,
      planta_id: 1,
      cliente_nombre: "MARIANE RIVAS",
      canal: "CASA",
      subcanal: "PORTATIL",
      nombre_contacto: "Ana Pérez",
      telefono: "2221112233",
      correo: "ana@cliente.com",
      updated_by_usuario_id: 4,
      updated_at: "2026-09-11T12:00:00Z",
    });
    const out = await upsertClienteContacto(client, {
      planta_id: 1,
      cliente_nombre: "MARIANE RIVAS",
      canal: "CASA",
      subcanal: "PORTATIL",
      nombre_contacto: "Ana Pérez",
      telefono: "2221112233",
      correo: "ana@cliente.com",
      updated_by_usuario_id: 4,
    });
    assert.equal(out.error, undefined);
    assert.equal(out.contacto.nombre_contacto, "Ana Pérez");
    assert.equal(out.contacto.telefono, "2221112233");
    assert.equal(out.contacto.correo, "ana@cliente.com");
    const ins = client.calls.find((c) => /INSERT INTO arr\.cliente_contactos/i.test(c.sql));
    assert.ok(ins);
    assert.match(ins.sql, /ON CONFLICT \(planta_id, cliente_nombre_norm\)/i);
    assert.equal(ins.params[2], "mariane rivas");
    assert.equal(ins.params[5], "Ana Pérez");
    assert.equal(ins.params[6], "2221112233");
    assert.equal(ins.params[7], "ana@cliente.com");
  });

  it("upsert no guarda correo inválido", async () => {
    const client = fakeClient(null);
    const out = await upsertClienteContacto(client, {
      planta_id: 1,
      cliente_nombre: "X",
      correo: "sin-arroba",
    });
    assert.equal(out.error, "Correo inválido");
    assert.equal(
      client.calls.some((c) => /INSERT INTO arr\.cliente_contactos/i.test(c.sql)),
      false
    );
  });
});
