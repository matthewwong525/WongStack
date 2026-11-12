/** A caller Access has authenticated, and whose assertion was verified. `id`: email for a person, the service
 *  token's Client ID for a machine. */
export interface AccessIdentity { id: string; kind: "user" | "service"; claims: AccessClaims }
export interface AccessClaims {
  aud: string | string[]; iss: string; exp: number; iat?: number; nbf?: number; sub?: string; email?: string; common_name?: string;
  [key: string]: unknown;
}
export interface AccessEnv {
  /** "<your-team-name>.cloudflareaccess.com": a public identifier, not a secret. */
  CF_ACCESS_TEAM_DOMAIN?: string;
  /** The application's Audience (AUD) tag: a public identifier, not a secret. */
  CF_ACCESS_AUD?: string;
  /** "off" while the account has no Zero Trust login yet: honored only when both identifiers above are blank. */
  WORKSPACE_LOGIN?: string;
  /** Local development only. Read from env, never from the request. */
  SKIP_AUTH?: string | boolean;
  WONG_ENVIRONMENT?: string;
}
export type Caller = { email: string; subject: string } | { machine: string } | null;
export declare const hasSignIn: (env: AccessEnv) => boolean;
export declare function getAccessIdentity(request: Request, env: AccessEnv): Promise<AccessIdentity | null>;
export declare function personOf(identity: AccessIdentity | null): string | null;
export declare const machineOf: (identity: AccessIdentity | null) => string | null;
export declare function callerOf(identity: AccessIdentity | null): Caller;
export declare const signIn: (env: AccessEnv) => (request: Request) => Promise<Caller>;
