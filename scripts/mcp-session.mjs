// One MCP session through the app's direct use of a key: the JSON-RPC client every MCP helper shares. The server
// is never connected to a chat. wiki/stack/company-api.md#use-an-mcp-server-through-the-app

export const MCP_VERSION = '2025-06-18';
/** The most pages of tools a session reads, so a server that never stops paging can't loop the helper. */
const PAGES = 20;

/** Server-sent events, plain JSON text, or an already parsed value: the JSON-RPC answer to `id`. */
export function rpcAnswer(body, id) {
  const messages = [];
  if (typeof body !== 'string') messages.push(body);
  else try { messages.push(JSON.parse(body)); } catch {
    for (const line of body.split(/\r?\n/)) {
      if (line.startsWith('data:')) try { messages.push(JSON.parse(line.slice(5))); } catch { /* not a message */ }
    }
  }
  return messages.flat().find(message => message && message.id === id) ?? null;
}

const failure = value => value?.error?.message || value?.error?.code || 'the app refused the call';

/** `send(input)` for `mcpSession` through `call(id, input)`: `<key>.read` first, and `<key>.change` only when the
 *  app answers that it is not a look-up, which is safe because a refused look-up reaches nothing. */
export function directSend(call, key) {
  return async input => {
    let value = await call(`${key}.read`, input);
    if (value?.error?.code === 'not_a_lookup') value = await call(`${key}.change`, input);
    if (value?.error) throw new Error(`${key}: ${failure(value)}`);
    return value;
  };
}

/** The session on `path`: `initialize` and the `initialized` notice once, then `tools/list` and `tools/call`, the
 *  session id carried from each answer to the next call. `send` answers as the direct-use action does. */
export function mcpSession({ send, path, name, client = 'wongstack' }) {
  let session = null, nextId = 1, ready = null;

  async function rpc(method, params, { notify = false } = {}) {
    const id = notify ? undefined : nextId++;
    const message = { jsonrpc: '2.0', ...(id && { id }), method, ...(params && { params }) };
    const answer = await send({ method: 'POST', path, body: message, ...(session && { session }) });
    session = answer.session ?? session;
    if (answer.status >= 400) throw new Error(`${name} refused ${method} (HTTP ${answer.status})${typeof answer.body === 'string' && answer.body ? `: ${answer.body.slice(0, 500)}` : ''}`);
    if (notify) return null;
    const reply = rpcAnswer(answer.body, id);
    if (!reply) throw new Error(`${name} gave no answer to ${method}`);
    if (reply.error) throw new Error(`${name}: ${reply.error.message ?? JSON.stringify(reply.error)}`);
    return reply.result;
  }
  const initialize = () => (ready ??= (async () => {
    await rpc('initialize', { protocolVersion: MCP_VERSION, capabilities: {}, clientInfo: { name: client, version: '1' } });
    await rpc('notifications/initialized', undefined, { notify: true });
  })());

  return {
    /** The server's tools: name, description and the arguments each takes, every page of them up to `PAGES`. */
    async tools() {
      await initialize();
      const tools = [];
      let cursor;
      for (let page = 0; page < PAGES; page++) {
        const result = await rpc('tools/list', cursor === undefined ? undefined : { cursor });
        tools.push(...(result?.tools ?? []));
        cursor = result?.nextCursor;
        if (typeof cursor !== 'string' || !cursor) return tools;
      }
      throw new Error(`${name} lists more than ${PAGES} pages of tools`);
    },
    async tool(tool, args = {}) {
      await initialize();
      return rpc('tools/call', { name: tool, arguments: args });
    },
    get session() { return session; },
  };
}

/** A tool's text answer; one marked `isError` becomes an error, in the service's own words. */
export function toolText(result, name) {
  const text = (result?.content ?? []).filter(part => part?.type === 'text').map(part => part.text).join('\n');
  if (result?.isError) throw new Error(`${name}: ${text || 'the tool failed'}`);
  return text;
}
