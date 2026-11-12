export declare class AccessError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status?: number);
}
export declare const reply: (body: object, status?: number) => Response;
export declare const now: () => string;
export declare function boundedBytes(body: ReadableStream<Uint8Array>, max: number, limitError: () => Error): Promise<Uint8Array>;
export declare function boundedJson(message: Request | Response, limit: number): Promise<unknown>;
export declare class Unreadable extends Error {
  constructor(what?: string);
}
