export const CYCLE_PATH: "/api/director-ia/cycle";
export const CHAT_PATH: "/api/director-ia/chat";
export const TRANSPORT: {
  idle: "idle";
  loading: "loading";
  completed: "completed";
  transport_error: "transport_error";
};
export const FORBIDDEN_REQUEST_KEYS: readonly string[];
export const EMPTY_FORBIDDEN_PHRASES: readonly string[];

export type DirectorIaCycleRequestInput = {
  planta_id?: number | string;
  year?: number | string;
  month?: number | string;
  [key: string]: unknown;
};

export type DirectorIaCycleInterpreted = {
  transportState: "idle" | "loading" | "completed" | "transport_error";
  httpStatus: number;
  outcomeKind: string | null;
  headline: string;
  detail: string | null;
  trace_id: string | null;
  enabled?: boolean;
  authFailure: boolean;
  authorizationFailure: boolean;
  acquisition_status: string | null;
  ies_status: string | null;
  reasoning_status: string | null;
  knowledge_coverage: Record<string, unknown> | null;
  source_health: Array<{ execution_status?: string; tool_id?: string }> | null;
  code: string | null;
  channel_output: {
    channel: string | null;
    content_blocks: Array<{
      sequence?: number;
      block_kind?: string;
      semantic_type?: string;
      content_class?: string;
      statement_or_reference?: string;
    }>;
  } | null;
};

export function buildDirectorIaCycleRequestBody(input: DirectorIaCycleRequestInput): {
  planta_id?: number;
  year?: number;
  month?: number;
};

export function interpretDirectorIaCycleResponse(
  httpStatus: number,
  json: unknown
): DirectorIaCycleInterpreted;

export function executeDirectorIaCycleRequest(options: {
  token: string;
  input: DirectorIaCycleRequestInput;
  fetchImpl: typeof fetch;
  apiUrl?: string;
}): Promise<DirectorIaCycleInterpreted>;

export function createDirectorIaCycleUiSession(): {
  getSnapshot(): {
    transportState: string;
    inFlight: boolean;
    interpreted: DirectorIaCycleInterpreted | null;
  };
  canSubmit(): boolean;
  beginRequest(): boolean;
  finishRequest(result: DirectorIaCycleInterpreted | null): void;
};

export function pickSafeChannelOutput(raw: unknown): DirectorIaCycleInterpreted["channel_output"];
export function outcomeHeadline(kind: string | null): string;
export function outcomeDetail(kind: string | null): string | null;
export function classifyOutcome(body: Record<string, unknown>): string | null;
export default {
  CYCLE_PATH: string;
  CHAT_PATH: string;
  TRANSPORT: {
    idle: "idle";
    loading: "loading";
    completed: "completed";
    transport_error: "transport_error";
  };
  FORBIDDEN_REQUEST_KEYS: readonly string[];
  EMPTY_FORBIDDEN_PHRASES: readonly string[];
  buildDirectorIaCycleRequestBody: typeof buildDirectorIaCycleRequestBody;
  interpretDirectorIaCycleResponse: typeof interpretDirectorIaCycleResponse;
  executeDirectorIaCycleRequest: typeof executeDirectorIaCycleRequest;
  createDirectorIaCycleUiSession: typeof createDirectorIaCycleUiSession;
  pickSafeChannelOutput: typeof pickSafeChannelOutput;
  outcomeHeadline: typeof outcomeHeadline;
  outcomeDetail: typeof outcomeDetail;
  classifyOutcome: typeof classifyOutcome;
};
