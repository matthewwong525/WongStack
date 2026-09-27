// GET /api/health: the app is up.
export function health(): Response {
  return Response.json({ ok: true });
}
