-- Denarius — issue #16: Anthropic connector (model_price seed for Claude).
-- No schema changes: provider_connection/usage_daily/cost_daily already accept
-- provider = 'anthropic' (constraints created in the #15 migration).
--
-- List prices in USD per 1M tokens (standard tier, base input/output rates).
-- The Anthropic usage report returns dated model IDs, so rows use the full
-- versioned IDs. Cache reads/writes bill at different rates than base input;
-- derived cost treats all input tokens at the base rate — the provider's
-- cost_report stays the headline truth and reconciliation (#17) discloses
-- the drift. Append-only: corrections are new rows with a later
-- effective_date, never updates.

insert into public.model_price (provider, model, input_price_per_1m, output_price_per_1m, effective_date) values
  ('anthropic', 'claude-opus-4-5-20251101',   5.00, 25.00, '2026-01-01'),
  ('anthropic', 'claude-sonnet-4-5-20250929', 3.00, 15.00, '2026-01-01'),
  ('anthropic', 'claude-haiku-4-5-20251001',  1.00,  5.00, '2026-01-01'),
  ('anthropic', 'claude-opus-4-1-20250805',  15.00, 75.00, '2026-01-01'),
  ('anthropic', 'claude-opus-4-20250514',    15.00, 75.00, '2026-01-01'),
  ('anthropic', 'claude-sonnet-4-20250514',   3.00, 15.00, '2026-01-01'),
  ('anthropic', 'claude-3-7-sonnet-20250219', 3.00, 15.00, '2026-01-01'),
  ('anthropic', 'claude-3-5-haiku-20241022',  0.80,  4.00, '2026-01-01');
