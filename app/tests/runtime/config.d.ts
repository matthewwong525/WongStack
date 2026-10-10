// The shared JSONC reader is JavaScript; runtime fixtures use its string-to-string parser.
declare module "*scripts/lib-wrangler-config.mjs" {
  export function stripJsonc(text: string): string;
}
