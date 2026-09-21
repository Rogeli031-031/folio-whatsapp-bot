export const FLETE_SAVE_ERROR: "No se pudo guardar la tarifa.";
export const FLETE_RELOAD_ERROR: "Tarifa guardada, pero no se pudo actualizar la vista.";

export function commitFleteTarifaWrite(opts: {
  next: number | null;
  confirmed: number | null;
  write: (tarifa: number | null) => Promise<unknown>;
  reload: () => Promise<unknown>;
  onError: (message: string | null) => void;
}): Promise<{
  ok: boolean;
  persisted: boolean;
  reloadOk: boolean;
  restore: number | null;
}>;
