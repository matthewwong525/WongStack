export function associateLogin(db: unknown, marker: string, identity: { kind: string; claims: { iss: string; sub?: string; email?: string } } | null): Promise<boolean>;
