export const HEALTH_PATH: "/health-director-ia";

export const HEALTH_UI: {
  loading: "loading";
  ready: "ready";
  disabled: "disabled";
  unavailable: "unavailable";
  transport_error: "transport_error";
};

export const HEALTH_COPY: {
  loading: "Comprobando disponibilidad técnica…";
  ready: "Servicio Director IA: listo (técnico)";
  disabled: "Director IA deshabilitado en el servidor";
  unavailable: "Servicio Director IA no disponible (técnico)";
  transport_error: "No se pudo consultar la disponibilidad técnica";
};

export type DirectorIaHealthUiState =
  | "loading"
  | "ready"
  | "disabled"
  | "unavailable"
  | "transport_error";

export type DirectorIaHealthResult = {
  state: Exclude<DirectorIaHealthUiState, "loading">;
  copy: string;
  enabled: boolean | null;
  ready: boolean | null;
  httpStatus: number | null;
};

export function directorIaHealthApiUrl(): string;
export function interpretDirectorIaHealthResponse(
  status: number,
  body: unknown
): DirectorIaHealthResult;
export function fetchDirectorIaHealth(
  fetchImpl?: typeof fetch
): Promise<DirectorIaHealthResult>;

declare const healthClientCore: {
  HEALTH_PATH: typeof HEALTH_PATH;
  HEALTH_UI: typeof HEALTH_UI;
  HEALTH_COPY: typeof HEALTH_COPY;
  directorIaHealthApiUrl: typeof directorIaHealthApiUrl;
  interpretDirectorIaHealthResponse: typeof interpretDirectorIaHealthResponse;
  fetchDirectorIaHealth: typeof fetchDirectorIaHealth;
};
export default healthClientCore;
