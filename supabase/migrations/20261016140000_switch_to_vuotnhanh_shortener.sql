-- Switch shortener from Anonlink to VuotNhanh.
-- API token is set in the live database; do not commit secrets here.
ALTER TABLE public.shortener_configs
  DROP CONSTRAINT IF EXISTS shortener_configs_provider_check;

UPDATE public.shortener_configs
SET provider = 'vuotnhanh',
    enabled = true,
    base_url = 'https://vuotnhanh.com/api',
    sort_order = 1,
    updated_at = now()
WHERE provider IN ('anonlink', 'vuotlink');

ALTER TABLE public.shortener_configs
  ADD CONSTRAINT shortener_configs_provider_check
  CHECK (provider = ANY (ARRAY['vuotnhanh'::text, 'anonlink'::text, 'vuotlink'::text]));
