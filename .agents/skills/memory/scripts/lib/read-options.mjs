// Supported read inputs. The direct CLI also uses their option names/types.
const text = { type: 'string', maxLength: 4000 };
const label = { type: 'string', minLength: 1, maxLength: 200 };
export const READ_INPUTS = {
  search: { terms: text, tag: label, type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference', 'thread'] },
    slug: label, since: label, until: label, author: label, branch: label, change: label,
    state: { type: 'string', enum: ['active', 'shipped', 'conversation'] }, all: { type: 'boolean' }, limit: { type: 'integer', minimum: 1, maximum: 100 } },
  show: { slug: label, all: { type: 'boolean' } },
};
export const READ_OPTIONS = Object.fromEntries(Object.entries(READ_INPUTS.search).filter(([name]) => name !== 'terms').map(([name, schema]) =>
  [name, { type: schema.type === 'boolean' ? 'boolean' : 'string' }]));

export function readArguments(command, input) {
  if (!Object.hasOwn(READ_INPUTS, command) || !input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid memory operation input');
  const fields = READ_INPUTS[command];
  if (command === 'show' && !Object.hasOwn(input, 'slug')) throw new Error('Memory topic is required');
  const args = [];
  for (const [name, value] of Object.entries(input)) {
    const schema = fields[name];
    if (!schema || typeof value !== (schema.type === 'integer' ? 'number' : schema.type) ||
      (schema.type === 'integer' && (!Number.isInteger(value) || value < schema.minimum || value > schema.maximum)) ||
      (schema.type === 'string' && (value.length > (schema.maxLength || 200) || value.length < (schema.minLength || 0))) ||
      (schema.enum && !schema.enum.includes(value))) throw new Error('Invalid memory operation input');
    if (name === 'terms' || (command === 'show' && name === 'slug')) continue;
    if (typeof value === 'boolean') { if (value) args.push(`--${name}`); }
    else args.push(`--${name}`, String(value));
  }
  args.push('--');
  if (command === 'search' && input.terms) args.push(input.terms);
  if (command === 'show') args.push(input.slug);
  return args;
}
