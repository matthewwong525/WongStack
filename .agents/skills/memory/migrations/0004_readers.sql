-- WongStack memory store, schema 4: reader keys. `memory.mjs join` gives a reader key to someone who can read a
-- private repo but not push to it. The route marks every fact a reader key writes as unshared, and teammates'
-- digests and searches show an unshared fact only to its author.
ALTER TABLE memory_keys ADD COLUMN reader INTEGER NOT NULL DEFAULT 0;
ALTER TABLE facts ADD COLUMN shared INTEGER NOT NULL DEFAULT 1;
