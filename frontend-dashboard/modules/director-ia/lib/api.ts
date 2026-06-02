import { apiFetch } from "@/lib/api";

export type DirectorIaContextSources = {
  igf: boolean;
  arr: boolean;
  dicf: boolean;
  action_register: boolean;
};

export type DirectorIaContextResponse =
  | { enabled: false }
  | {
      enabled: true;
      timestamp: string;
      sources: DirectorIaContextSources;
    };

/** GET /api/director-ia/context (solo lectura, fase 1). */
export function fetchDirectorIaContext(token: string): Promise<DirectorIaContextResponse> {
  return apiFetch<DirectorIaContextResponse>("/api/director-ia/context", {
    token,
    cache: "no-store",
  });
}
