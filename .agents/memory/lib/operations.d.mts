type OperationSummary = {
  operationId: string;
  summary: string;
  effect: string;
  readiness: string;
  revision: string;
  source: string;
  transport: string;
  authentication: string;
  app: string;
};

export const MAX_SUMMARIES: number;
export function selectOperations<T extends OperationSummary & { description?: string }>(
  operations: T[],
  options?: { q?: string; app?: string; limit?: number; offset?: number },
): { total: number; offset: number; next: number | null; actions: Pick<T, keyof OperationSummary>[] };
export function refuseExternalReferences<T>(value: T): T;
export function parseOperationInput(text: string): unknown;
