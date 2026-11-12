/** A new pair: the public half (SPKI) seals, the private half (PKCS #8) opens; both in base64. */
export function makePair(): Promise<{ publicKey: string; privateKey: string }>;
/** `value` sealed with the public half, as the JSON text the app keeps. */
export function seal(value: string, publicKey: string): Promise<string>;
/** The value a sealed key holds, opened with the private half. */
export function open(sealed: string, privateKey: string): Promise<string>;
