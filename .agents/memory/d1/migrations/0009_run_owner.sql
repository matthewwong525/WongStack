-- A background run's record belongs to the sign-in that sent it: the Worker stores its Access subject, NULL for a
-- schedule or an old key. Each person's digest and consolidation clock read only their own runs.
ALTER TABLE runs ADD COLUMN owner_subject TEXT;
-- A run saved before this came from anyone, so it gets an owner no sign-in has: NULL would hand them all to every
-- schedule, and a forged one could put its consolidation off for good.
UPDATE runs SET owner_subject = 'legacy:unowned' WHERE owner_subject IS NULL;
CREATE INDEX runs_owner ON runs (owner_subject, id);
