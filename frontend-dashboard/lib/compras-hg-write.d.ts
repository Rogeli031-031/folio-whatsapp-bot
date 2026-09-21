export const HG_SAVE_ERROR: "No se pudo guardar HG.";

export function commitHgWrite(opts: {
  next: number | null;
  confirmed: number | null;
  write: (hg: number | null) => Promise<unknown>;
  reload: () => Promise<unknown>;
  onError: (message: string | null) => void;
}): Promise<{ ok: boolean; restore: number | null }>;
