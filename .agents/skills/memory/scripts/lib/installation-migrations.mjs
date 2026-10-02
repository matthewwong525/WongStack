// Trusted release manifest. Update only alongside reviewed forward SQL and its tests.
export const memoryMigrations = Object.freeze([
  Object.freeze({ version: 1, filename: '0001_memory.sql', sha256: '8f802d3ee55c4849b9ca1a9d334508e1f7266fe24566cbc55ed64cd9bed66fb7' }),
  Object.freeze({ version: 2, filename: '0002_keys.sql', sha256: '1b9f6d51700b53c859784b165ae03e7db4270b2e2ef880ee0bfbc86925554f7d' }),
  Object.freeze({ version: 3, filename: '0003_key_machines.sql', sha256: 'aa1f5c096a525ac9a27231bd8510c332915d4870e2685d0bcbd91f377931c7d7' }),
  Object.freeze({ version: 4, filename: '0004_readers.sql', sha256: 'e2622702ad6e58a2f6c4d14dfd4e0cd51cf057189cac73aa91085149f10b7bae' }),
  Object.freeze({ version: 5, filename: '0005_admin_accounts.sql', sha256: '831421e733bd9edda46358c52e14e535823e5034ac398783051f0be53c746116' }),
  Object.freeze({ version: 6, filename: '0006_stemmed_search.sql', sha256: '24ab2db08542f4a75b7d6a91823301b366ab15553f4dcbac96c06f23d749912f' }),
  Object.freeze({ version: 7, filename: '0007_installation_identity.sql', sha256: 'ee506ff330369ffb11f81154cc6592f82ab57df5f4f5be1c19e7a760392503ea' }),
  Object.freeze({ version: 8, filename: '0008_principal_ownership.sql', sha256: '85ed7cd41aebcea7765264497b585d07593cea520d616340dda89fc6cc5e67ac' }),
  Object.freeze({ version: 9, filename: '0009_identity_reviews.sql', sha256: 'ed63bce13653822cddbe2b0d0b6d7b8c68372e5dc0cdfe7084ccf838de69dfd4' }),
  Object.freeze({ version: 10, filename: '0010_installation_configuration.sql', sha256: 'd268082e1ae654aa497adf3b5e35b91f03f4fd400954036ffa080added368630' }),
]);
export const memorySchemaVersion = memoryMigrations.at(-1).version;
