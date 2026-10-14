-- Visitor rate limit and supporting foreign-key indexes for Pay2S orders.
alter table public.pay2s_orders add column if not exists visitor_hash text;
create index if not exists pay2s_orders_visitor_created_idx
  on public.pay2s_orders(visitor_hash, created_at desc) where visitor_hash is not null;
create index if not exists pay2s_orders_key_id_idx
  on public.pay2s_orders(key_id) where key_id is not null;
create index if not exists pay2s_settings_updated_by_admin_id_idx
  on public.pay2s_settings(updated_by_admin_id) where updated_by_admin_id is not null;
