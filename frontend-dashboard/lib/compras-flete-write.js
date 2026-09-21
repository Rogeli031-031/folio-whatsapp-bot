"use strict";

const FLETE_SAVE_ERROR = "No se pudo guardar la tarifa.";
const FLETE_RELOAD_ERROR = "Tarifa guardada, pero no se pudo actualizar la vista.";

async function commitFleteTarifaWrite(opts) {
  const write = opts && opts.write;
  const reload = opts && opts.reload;
  const onError = opts && opts.onError;
  const confirmed = opts && Object.prototype.hasOwnProperty.call(opts, "confirmed") ? opts.confirmed : null;
  const next = opts && Object.prototype.hasOwnProperty.call(opts, "next") ? opts.next : null;
  try {
    await write(next);
  } catch (_writeErr) {
    if (typeof onError === "function") onError(FLETE_SAVE_ERROR);
    return { ok: false, persisted: false, reloadOk: false, restore: confirmed };
  }
  try {
    await reload();
  } catch (_reloadErr) {
    if (typeof onError === "function") onError(FLETE_RELOAD_ERROR);
    return { ok: true, persisted: true, reloadOk: false, restore: next };
  }
  if (typeof onError === "function") onError(null);
  return { ok: true, persisted: true, reloadOk: true, restore: next };
}

module.exports = { FLETE_SAVE_ERROR, FLETE_RELOAD_ERROR, commitFleteTarifaWrite };
