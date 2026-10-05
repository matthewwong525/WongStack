// Which model a routine runs on, with no network code and no import, so it runs in the Worker, in
// /routine's client, and in the script tests. Two ways in: a model picked from Cloudflare's own AI
// service, reached through this install's AI Gateway, or one pasted key for any service the assistant
// speaks to. wiki/stack/cloud-routines.md owns both.
//
// Names and ids are those of @earendil-works/pi-ai at this folder's pinned version. A provider is
// pi-ai's id for a service.

/** The provider that reaches a model through Cloudflare's AI Gateway. */
export const GATEWAY = 'cloudflare-ai-gateway';

/** The three models the first routine offers, the recommended one first. `/models` lists the rest. */
export const SHORTLIST = [
  { id: 'workers-ai/@cf/moonshotai/kimi-k2.7-code', name: 'Kimi K2.7 Code', recommended: true, billing: 'Billed by Cloudflare as Workers AI use.' },
  { id: 'workers-ai/@cf/zai-org/glm-5.3', name: 'GLM-5.3', recommended: false, billing: 'Billed by Cloudflare as Workers AI use.' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', recommended: false, billing: 'Needs credit loaded in your Cloudflare account.' },
];

/** The services a pasted key is recognised for: the name to show, and the model its routines start on. */
export const SERVICES = {
  anthropic: { name: 'Anthropic', model: 'claude-sonnet-5' },
  openrouter: { name: 'OpenRouter', model: 'moonshotai/kimi-k2.6' },
  openai: { name: 'OpenAI', model: 'gpt-5.5' },
  google: { name: 'Google', model: 'gemini-3.1-pro-preview' },
  groq: { name: 'Groq', model: 'openai/gpt-oss-120b' },
  xai: { name: 'xAI', model: 'grok-4.7' },
  zai: { name: 'Z.ai Coding Plan', model: 'glm-5.3' },
  deepseek: { name: 'DeepSeek', model: 'deepseek-v4-pro' },
  moonshotai: { name: 'Moonshot AI', model: 'kimi-k2.6' },
};

// A key's shape orders the services to try; the test request decides. First match wins.
const SHAPES = [
  [/^sk-ant-/, ['anthropic']],
  [/^sk-or-/, ['openrouter']],
  [/^sk-(proj|svcacct)-/, ['openai']],
  [/^AIza/, ['google']],
  [/^gsk_/, ['groq']],
  [/^xai-/, ['xai']],
  [/^[0-9a-f]{32}\.[A-Za-z0-9]+$/, ['zai']],
  [/^sk-/, ['openai', 'deepseek', 'moonshotai']],
];

// The environment name pi-ai reads each service's key from. A service absent here takes no pasted key:
// it signs in through a browser, or through another cloud's own credentials.
const KEY_ENV = {
  anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', google: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY', groq: 'GROQ_API_KEY',
  xai: 'XAI_API_KEY', zai: 'ZAI_API_KEY', 'zai-coding-cn': 'ZAI_CODING_CN_API_KEY', deepseek: 'DEEPSEEK_API_KEY', moonshotai: 'MOONSHOT_API_KEY',
  'moonshotai-cn': 'MOONSHOT_API_KEY', mistral: 'MISTRAL_API_KEY', cerebras: 'CEREBRAS_API_KEY', nvidia: 'NVIDIA_API_KEY', minimax: 'MINIMAX_API_KEY',
  'minimax-cn': 'MINIMAX_CN_API_KEY', huggingface: 'HF_TOKEN', fireworks: 'FIREWORKS_API_KEY', together: 'TOGETHER_API_KEY', baseten: 'BASETEN_API_KEY',
  opencode: 'OPENCODE_API_KEY', 'opencode-go': 'OPENCODE_API_KEY', 'kimi-coding': 'KIMI_API_KEY', meta: 'META_API_KEY', 'vercel-ai-gateway': 'AI_GATEWAY_API_KEY',
  'ant-ling': 'ANT_LING_API_KEY', 'qwen-token-plan': 'QWEN_TOKEN_PLAN_API_KEY', 'qwen-token-plan-cn': 'QWEN_TOKEN_PLAN_CN_API_KEY',
  'qwen-token-plan-individual': 'QWEN_TOKEN_PLAN_API_KEY', xiaomi: 'XIAOMI_API_KEY', 'xiaomi-token-plan-cn': 'XIAOMI_TOKEN_PLAN_CN_API_KEY',
  'xiaomi-token-plan-ams': 'XIAOMI_TOKEN_PLAN_AMS_API_KEY', 'xiaomi-token-plan-sgp': 'XIAOMI_TOKEN_PLAN_SGP_API_KEY',
};

/** Why a model or key request was refused before any test: `code` is `key`, `provider`, or `model`. */
export class ModelError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

/** The shortlist as it is shown, the recommended model first. */
export const shortlist = () => SHORTLIST.map((model) => ({ ...model }));

/** Every service a pasted key is recognised for, as `{ provider, name, model }`. */
export const services = () => Object.entries(SERVICES).map(([provider, { name, model }]) => ({ provider, name, model }));

/** The name to show for a provider: the service's own, or pi-ai's id. */
export const serviceName = (provider) => (provider === GATEWAY ? 'Cloudflare' : SERVICES[provider]?.name ?? provider);

/** The services a key's shape points to, most likely first; empty when the shape is not known. */
export function candidatesFor(key) {
  const text = String(key ?? '').trim();
  return [...(SHAPES.find(([shape]) => shape.test(text))?.[1] ?? [])];
}

/**
 * The environment name pi-ai reads `provider`'s key from, or null when it takes no pasted key. A
 * Claude subscription token goes under its own name, since Anthropic takes it as a bearer.
 */
export function keyEnv(provider, key = '') {
  if (provider === 'anthropic' && String(key).startsWith('sk-ant-oat')) return 'ANTHROPIC_OAUTH_TOKEN';
  return KEY_ENV[provider] ?? null;
}

/**
 * What to test a pasted key against, in order: `[{ provider, model }]`. The shape picks the services
 * unless `provider` names one; `model` replaces each service's own. Throws a ModelError when the key
 * is blank, its service can't be told, or a service outside the list comes with no model.
 */
export function keyPlan({ key, provider, model } = {}) {
  const text = String(key ?? '').trim();
  if (!text) throw new ModelError('key', 'No model key was given.');
  const wanted = String(provider ?? '').trim();
  if (wanted && !keyEnv(wanted, text)) throw new ModelError('provider', `"${wanted}" is not a service that takes a pasted key.`, { services: services() });
  const providers = wanted ? [wanted] : candidatesFor(text);
  if (!providers.length) throw new ModelError('provider', 'This key\'s service can\'t be told from its shape. Say which service it is for.', { services: services() });
  return providers.map((each) => {
    const chosen = String(model ?? '').trim() || SERVICES[each]?.model;
    if (!chosen) throw new ModelError('model', `"${each}" has no model set here. Say which model to use.`);
    return { provider: each, model: chosen };
  });
}

/**
 * The model in use, from what the list stores: `{ via: 'key' | 'cloudflare', provider, model }`, or
 * null when nothing is picked. The pasted key, when one is in use, comes first.
 */
export function chosen(stored) {
  if (stored?.use === 'key' && stored.key) return { via: 'key', provider: stored.key.provider, model: stored.key.model };
  if (stored?.cloudflare) return { via: 'cloudflare', provider: GATEWAY, model: stored.cloudflare };
  return null;
}

/** The three names pi-ai reads to reach a model through this install's AI Gateway. */
export const gatewayEnv = ({ token, account, gateway }) => ({ CLOUDFLARE_API_KEY: token, CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_GATEWAY_ID: gateway });

/**
 * The environment one model request needs, and nothing else: the gateway's three names for a
 * Cloudflare pick, or the pasted key under its service's own name. Null when `choice` can't run
 * with what is held.
 */
export function modelEnv(choice, { key, token, account, gateway } = {}) {
  if (choice?.via === 'cloudflare') return token && account && gateway ? gatewayEnv({ token, account, gateway }) : null;
  const name = choice?.via === 'key' ? keyEnv(choice.provider, key) : null;
  return name && key ? { [name]: key } : null;
}
