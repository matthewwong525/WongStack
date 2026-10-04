// Disposable command-line producer. Its outputs are observations, not assertions.
const input = JSON.parse(process.argv[2]);
const docs = input.area === 'notes' ? ['wiki/notes.md'] : [];
console.log(JSON.stringify({ area: input.area, docs }));
