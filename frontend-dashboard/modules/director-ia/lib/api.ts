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

export type DirectorIaTemaDetailResponsable = {
  name: string;
  role_key: string | null;
  role_name: string | null;
};

export type DirectorIaTemaDetailOpenAction = {
  id: number;
  title: string;
  responsable: string | null;
  role_name: string | null;
  created_at: string | null;
  due_date: string | null;
  dias_abierta: number | null;
  dias_vencido: number;
  prioridad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
};

export type DirectorIaTemaDetail = {
  tema: string;
  open_count: number;
  overdue_count: number;
  responsables: DirectorIaTemaDetailResponsable[];
  open_actions: DirectorIaTemaDetailOpenAction[];
};

export type DirectorIaActionRegisterBlock =
  | {
      ok: true;
      summary: { open: number; closed: number; overdue: number };
      responsables: DirectorIaActionRegisterResponsable[];
      temas: DirectorIaActionRegisterTema[];
      top_overdue: DirectorIaTopOverdueAction[];
      invalid_overdue: DirectorIaInvalidOverdue;
      tema_details: DirectorIaTemaDetail[];
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

export type DirectorIaChatResponse =
  | { enabled: false }
  | {
      ok: true;
      answer: string;
      sources: string[];
      context_meta: { planta_id: number; timestamp: string };
    }
  | { ok: false; error: string };

/** POST /api/director-ia/chat — asistente ejecutivo (backend → OpenAI). */
export function fetchDirectorIaChat(
  token: string,
  plantaId: number,
  question: string
): Promise<DirectorIaChatResponse> {
  return apiFetch<DirectorIaChatResponse>("/api/director-ia/chat", {
    method: "POST",
    token,
    body: JSON.stringify({ planta_id: plantaId, question }),
    cache: "no-store",
  });
}
