export type SignIn = { state: "missing"; origin: string } |
  { state: "expired" | "near" | "valid"; origin: string; days: number; token: string; subject: string; email: string | null };
export declare const WARN_DAYS: number;
export declare function tokenClaims(token: string): Record<string, unknown> | null;
export declare function signIn(origin: string, now?: number): SignIn;
export declare function headers(origin: string, read?: (origin: string) => SignIn): Record<string, string> | null;
export declare const signInHelp: (origin: string) => string;
