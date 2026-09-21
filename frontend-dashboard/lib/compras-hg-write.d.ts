export const HG_SAVE_ERROR: "No se pudo guardar HG.";
export const HG_RELOAD_ERROR: "HG guardado, pero no se pudo actualizar la vista.";

export function commitHgWrite(opts: {
  next: number | null;
  confirmed: number | null;
  write: (hg: number | null) => Promise<unknown>;
  reload: () => Promise<unknown>;
  onError: (message: string | null) => void;
}): Promise<{
  ok: boolean;
  persisted: boolean;
  reloadOk: boolean;
  restore: number | null;
}>;
