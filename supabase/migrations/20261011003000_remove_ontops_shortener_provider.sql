-- Revert Ontops integration and restore Vuotlink as the only shortener provider.
DELETE FROM public.shortener_configs WHERE provider = 'ontops';

ALTER TABLE public.shortener_configs
  DROP CONSTRAINT IF EXISTS shortener_configs_provider_check;

ALTER TABLE public.shortener_configs
  ADD CONSTRAINT shortener_configs_provider_check
  CHECK (provider = 'vuotlink'::text);

UPDATE public.shortener_configs
SET sort_order = 1, updated_at = now()
WHERE provider = 'vuotlink';