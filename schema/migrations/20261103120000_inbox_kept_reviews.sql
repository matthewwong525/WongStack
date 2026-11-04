-- A closed review page now stays for good (openspec/changes/keep-review-pages), so its body sits in front of every
-- column after it. These indexes answer each list, check-in and clean-up without reading a kept page. Additive only.
-- The Reviews list and its title search.
CREATE INDEX inbox_items_reviews ON inbox_items(installation_id, email, kind, created_at, closed_at, closes_at, hidden, id, title, workspace);
-- Open items, the closed-or-expired items whose taps settle, and the day-old items the clean-up removes.
CREATE INDEX inbox_items_open ON inbox_items(installation_id, email, closed_at, closes_at, kind, hidden, id);
-- Plan pages that older code emptied on close: the clean-up removes them a day later, as before.
CREATE INDEX inbox_items_emptied ON inbox_items(installation_id, email, closed_at) WHERE kind = 'plan' AND body = '';
