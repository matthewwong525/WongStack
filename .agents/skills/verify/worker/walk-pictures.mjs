// A walk's kept screenshots, served by the app's production Worker at /_walk/ behind its login.
// app/worker/index.ts hands this the memory bucket alone, after the identity check, and every key is
// built from a whole-path match, so no request reaches an object outside walks/: a transcript stays
// out of reach. wiki/development/staging-walkthrough.md

export const WALK_PREFIX = '/_walk/';

// <sha>/<run>/<journey>/<file>.png: a commit, a UTC stamp, then two plain lowercase names.
const NAME = '[a-z0-9][a-z0-9._-]*';
const PICTURE = new RegExp(`^/_walk/([0-9a-f]{7,40})/(\\d{8}T\\d{6}Z)/(${NAME})/(${NAME}\\.png)$`);
const MAX_PICTURE_BYTES = 10 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// A stored file is served from the app's own origin, so these stop it acting as a page.
const PICTURE_HEADERS = {
  'Content-Type': 'image/png',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'",
  'Cache-Control': 'private, max-age=31536000, immutable',
};

const answer = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const missing = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
const isPng = bytes => PNG_SIGNATURE.every((byte, at) => bytes[at] === byte);

async function keep(bucket, key, request) {
  const tooLarge = () => answer(413, { error: 'too_large' });
  if (Number(request.headers.get('Content-Length')) > MAX_PICTURE_BYTES) return tooLarge();
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_PICTURE_BYTES) return tooLarge();
  if (!isPng(new Uint8Array(body))) return answer(415, { error: 'not_png' });
  // A kept picture is evidence: the condition fails on an existing key, and put then answers null.
  const stored = await bucket.put(key, body, { onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: 'image/png' } });
  return stored ? answer(201, { kept: true }) : answer(409, { error: 'exists' });
}

async function show(bucket, key) {
  const found = await bucket.get(key);
  return found ? new Response(found.body, { headers: PICTURE_HEADERS }) : missing();
}

// `identity` is the entry file's verified Access caller, or null on a site with no login yet.
export async function handleWalkPictures(request, bucket, identity) {
  const parts = PICTURE.exec(new URL(request.url).pathname);
  if (!parts) return missing();
  const key = `walks/${parts.slice(1).join('/')}`;
  const put = request.method === 'PUT';
  if (!identity) return put ? answer(404, { error: 'no_login' }) : missing();
  if (!bucket) return answer(404, { error: 'no_bucket' });
  if (request.method === 'GET') return show(bucket, key);
  if (!put) return answer(405, { error: 'method' });
  return identity.kind === 'service' ? keep(bucket, key, request) : answer(403, { error: 'not_the_walk' });
}
