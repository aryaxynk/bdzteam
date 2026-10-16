-- Clean shortener: only VuotNhanh remains.
ALTER TABLE public.shortener_configs
  DROP CONSTRAINT IF EXISTS shortener_configs_provider_check;

DELETE FROM public.shortener_configs WHERE provider <> 'vuotnhanh';

UPDATE public.shortener_configs
SET enabled = true,
    base_url = 'https://vuotnhanh.com/api',
    sort_order = 1,
    updated_at = now()
WHERE provider = 'vuotnhanh';

ALTER TABLE public.shortener_configs
  ADD CONSTRAINT shortener_configs_provider_check
  CHECK (provider = 'vuotnhanh'::text);
