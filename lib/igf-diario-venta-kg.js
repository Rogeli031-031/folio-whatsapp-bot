"use strict";

function finiteChannel(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Suma canales ya resueltos.
 * Un canal ausente no aporta ni anula. Ambos ausentes siguen en null.
 * El 0 explícito es numérico y permanece en la suma.
 */
function sumPresentChannels(left, right) {
  const a = finiteChannel(left);
  const b = finiteChannel(right);
  if (a == null && b == null) return null;
  return (a == null ? 0 : a) + (b == null ? 0 : b);
}

function ventaKgFromCanalTons(casaTon, comTon) {
  const tons = sumPresentChannels(casaTon, comTon);
  return tons == null ? null : tons * 1000;
}

function ventaKgFormula(casaRef, comRef) {
  const casaNum = `ISNUMBER(${casaRef})`;
  const comNum = `ISNUMBER(${comRef})`;
  return `IF(OR(${casaNum},${comNum}),(IF(${casaNum},${casaRef},0)+IF(${comNum},${comRef},0))*1000,"")`;
}

module.exports = {
  finiteChannel,
  sumPresentChannels,
  ventaKgFromCanalTons,
  ventaKgFormula,
};
