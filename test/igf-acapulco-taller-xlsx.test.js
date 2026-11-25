'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseWorkbook } = require('../lib/igf-acapulco-taller-xlsx');
const { createUpload } = require('../lib/igf-acapulco-taller-upload');

async function fixture(e10, mutate = () => {}) {
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet('REPORTE TALLER  ');
  const p = w.addWorksheet('PARQUE VEHICULAR');
  const company = e10 ? 'HIDROGAS ACAPULCO' : 'GAS URIBE DE ACAPULCO';
  s.getCell(e10 ? 'B5' : 'B4').value = 'EMPRESA: ' + company;
  s.getCell(e10 ? 'I5' : 'I4').value = 'FECHA: 24 NOVIEMBRE 2026';
  p.getCell('B2').value = 'EMPRESA: ' + company;
  p.getCell('C7').value = e10 ? 'Hidrogas' : 'Gas Uribe';
  p.getCell('D7').value = 'Pipa';
  p.getCell('E7').value = 'A';
  p.getCell('F7').value = 101;
  for (const [row, section] of [[6, 'MENOR'], [12, 'MAYOR']]) {
    s.mergeCells('A' + row + ':A' + (row + 2));
    s.mergeCells('B' + row + ':R' + row);
    s.getCell('A' + row).value = 'TALLER ' + section;
    s.getCell('B' + row).value = 'REPORTE DE UNIDADES EN TALLER';
    for (const [col, title] of [['B', 'NUM DE AT'], ['E', 'CAPACIDAD'], ['G', 'FALLA PRESENTADA'], ['I', 'REQUERIMIENTO']]) {
      s.getCell(col + (row + 1)).value = title;
    }
    s.getCell('I' + (row + 3)).value = 'TOTAL TALLER ' + section + ':';
  }
  s.getCell('B14').value = 101;
  for (const [cell, result] of Object.entries({ C14: 'MARCA', D14: 2018, E14: 4500, J14: 123.45, R14: 0 })) {
    s.getCell(cell).value = { formula: '1+2', result };
  }
  await mutate(s, p, w);
  return Buffer.from(await w.xlsx.writeBuffer());
}

test('reads typed cached formula results in both E9 and E10, never evaluates formula', async () => {
  for (const e10 of [false, true]) {
    const parsed = await parseWorkbook(await fixture(e10, s => {
      s.getCell('Q14').value = { formula: '1+2', result: 45, shareType: 'shared', ref: 'Q14:R14' };
      s.getCell('R14').value = { sharedFormula: 'Q14', result: 0 };
    }));
    const { eco, brand, model, capacityL, repairCost, aid } = parsed.records[0];
    assert.deepEqual([eco, brand, model, capacityL, repairCost, aid], ['AT-101', 'MARCA', 2018, 4500, 123.45, 0]);
    assert.equal(parsed.verifiedLayout, e10 ? 'E10-v1' : 'E9-v1');
  }
});

test('rejects formulas without valid cached scalar results in allowed fields', async () => {
  for (const value of [
    { formula: '1+2' },
    { formula: '1/0', result: { error: '#DIV/0!' } },
    { formula: '1+2', result: true },
    { formula: '1+2', result: '123.45' },
  ]) {
    const buf = await fixture(false, s => { s.getCell('J14').value = value; });
    await assert.rejects(parseWorkbook(buf), { code: 'NON_LITERAL_WORKSHOP_CELL' });
  }
});

test('identity, date, structure and unit keys remain literal', async () => {
  for (const address of ['A12', 'B4', 'I4', 'E13', 'B14', 'I15', 'F7']) {
    const buf = await fixture(false, (s, p) => {
      const cell = (address === 'F7' ? p : s).getCell(address);
      cell.value = { formula: '1+2', result: cell.value };
    });
    await assert.rejects(parseWorkbook(buf), { code: 'NON_LITERAL_WORKSHOP_CELL' });
  }
});

test('external links still fail the XLSX guard before accepting cached values', async () => {
  const buf = await fixture(false, s => {
    s.getCell('G14').value = { text: 'enlace', hyperlink: 'https://example.invalid/' };
  });
  await assert.rejects(parseWorkbook(buf), { code: 'INVALID_XLSX' });
});

test('upload preview accepts untouched bytes with cached formulas and does not write', async () => {
  let writes = 0;
  const pool = {
    query: async () => ({ rows: [{}] }),
    connect() { writes++; throw new Error('unexpected write'); },
  };
  const upload = createUpload({ pool, businessDate: () => '2026-11-25' });
  for (const e10 of [false, true]) {
    const result = await upload.preview(101, { xlsx: (await fixture(e10)).toString('base64') });
    assert.equal(result.date, '2026-11-24');
    assert.equal(result.rowCount, 1);
    assert.equal(result.units[0].eco, 'AT-101');
  }
  assert.equal(writes, 0);
});
