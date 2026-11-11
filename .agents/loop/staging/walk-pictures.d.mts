// Types for the app Worker's import of the picture route. It gets the memory bucket alone, never the
// env or the memory database, and answers 404 when the Worker binds no bucket or the site has no login.
export const WALK_PREFIX: string;
export interface WalkBucket {
  get(key: string): Promise<{ body: ReadableStream } | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options: { onlyIf: { etagDoesNotMatch: string }; httpMetadata: { contentType: string } },
  ): Promise<object | null>;
}
export function handleWalkPictures(
  request: Request,
  bucket: WalkBucket | undefined,
  identity: { kind: "user" | "service" } | null,
): Promise<Response>;
