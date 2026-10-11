ALTER TABLE public.shortener_configs
  DROP CONSTRAINT IF EXISTS shortener_configs_provider_check;

ALTER TABLE public.shortener_configs
  ADD CONSTRAINT shortener_configs_provider_check
  CHECK (provider = ANY (ARRAY['vuotlink'::text, 'ontops'::text]));

INSERT INTO public.shortener_configs (provider, enabled, base_url, api_token, sort_order)
VALUES ('ontops', false, 'https://api-management.ontops.link/api/public/create-short-link', NULL, 1)
ON CONFLICT (provider) DO UPDATE
SET enabled = false,
    base_url = EXCLUDED.base_url,
    sort_order = 1,
    updated_at = now();

UPDATE public.shortener_configs
SET sort_order = 2, updated_at = now()
WHERE provider = 'vuotlink';