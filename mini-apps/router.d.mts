// Types for the app Worker's import of the mini-app route.
export interface MiniAppEnv {
	DB?: unknown;
}
export interface MiniAppApi {
	fetch(request: Request, env: MiniAppEnv, ctx: unknown): Response | Promise<Response>;
}
export type MiniAppRoutes = Record<string, MiniAppApi>;
export const MINI_PREFIX: string;
export function handleMiniApp(
	request: Request,
	env: { DB?: unknown; ASSETS: { fetch(request: Request): Promise<Response> } },
	ctx: unknown,
	routes: MiniAppRoutes,
): Response | Promise<Response>;
