-- Replace the previous Vuotlink provider with Anonlink. Do not store credentials in source control.
ALTER TABLE public.shortener_configs
  DROP CONSTRAINT IF EXISTS shortener_configs_provider_check;

UPDATE public.shortener_configs
SET provider = 'anonlink',
    enabled = true,
    base_url = 'https://anonlink.io/api',
    api_token = NULL,
    sort_order = 1,
    updated_at = now()
WHERE provider = 'vuotlink';

ALTER TABLE public.shortener_configs
  ADD CONSTRAINT shortener_configs_provider_check
  CHECK (provider = 'anonlink'::text);
