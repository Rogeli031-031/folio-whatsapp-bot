import { apiFetch } from "@/lib/api";

export type DirectorIaContextSources = {
  igf: boolean;
  arr: boolean;
  dicf: boolean;
  action_register: boolean;
};

export type DirectorIaActionRegisterResponsable = {
  name: string;
  role_key: string | null;
  role_name: string | null;
  open_count: number;
  overdue_count: number;
};

export type DirectorIaActionRegisterTema = {
  name: string;
  open_count: number;
  closed_count: number;
  overdue_count: number;
  progress_percent: number;
};

export type DirectorIaTopOverdueAction = {
  id: number;
  titulo: string;
  tema: string;
  responsable: string | null;
  role_key: string | null;
  role_name: string | null;
  dias_vencido: number;
  prioridad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
};

export type DirectorIaExecutiveSummary = {
  risk_level: "ALTO" | "MEDIO" | "BAJO";
  findings: string[];
};

export type DirectorIaInvalidOverdueExample = {
  id: number;
  titulo: string;
  tema: string;
  responsable: string | null;
  due_date: string | null;
  reason: string;
};

export type DirectorIaInvalidOverdue = {
  count: number;
  examples: DirectorIaInvalidOverdueExample[];
};

export type DirectorIaActionRegisterBlock =
  | {
      ok: true;
      summary: { open: number; closed: number; overdue: number };
      responsables: DirectorIaActionRegisterResponsable[];
      temas: DirectorIaActionRegisterTema[];
      top_overdue: DirectorIaTopOverdueAction[];
      invalid_overdue: DirectorIaInvalidOverdue;
      executive_summary: DirectorIaExecutiveSummary;
    }
  | { ok: false; error: string };

export type DirectorIaContextResponse =
  | { enabled: false }
  | {
      enabled: true;
      timestamp: string;
      sources: DirectorIaContextSources;
      action_register: DirectorIaActionRegisterBlock;
    };

/** GET /api/director-ia/context (solo lectura). Requiere planta_id para Action Register. */
export function fetchDirectorIaContext(
  token: string,
  plantaId?: number | string
): Promise<DirectorIaContextResponse> {
  const qs =
    plantaId != null && String(plantaId).trim() !== ""
      ? `?planta_id=${encodeURIComponent(String(plantaId))}`
      : "";
  return apiFetch<DirectorIaContextResponse>(`/api/director-ia/context${qs}`, {
    token,
    cache: "no-store",
  });
}
