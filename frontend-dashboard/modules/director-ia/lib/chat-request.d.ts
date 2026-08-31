export function parseUploadDayYmd(raw: unknown): string | null;

export function resolveDirectorIaUploadDayFromSearch(
  search: string | URLSearchParams | { upload_day?: string; uploadDay?: string } | null | undefined
): string | null;

export function buildDirectorIaChatBody(input: {
  planta_id?: number | string;
  question?: string;
  history?: Array<{ role?: string; content?: string }>;
  upload_day?: string | null;
  uploadDay?: string | null;
  planta_nombre?: string | null;
  search?: string | URLSearchParams | { upload_day?: string } | null;
  conversation_state?: Record<string, unknown> | null;
}): {
  planta_id?: number | string;
  question: string;
  planta_nombre?: string;
  upload_day?: string;
  history?: Array<{ role?: string; content?: string }>;
  conversation_state?: Record<string, unknown>;
};
