-- BDZ App Versions — chạy trong Supabase SQL Editor

create table if not exists public.app_versions (
  id bigserial primary key,
  app_id text not null default 'default',
  version text not null,
  enabled boolean not null default true,
  is_latest boolean not null default false,
  force_update boolean not null default false,
  download_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_id, version)
);

create index if not exists idx_app_versions_app on public.app_versions (app_id);
alter table public.app_versions enable row level security;
drop policy if exists app_versions_deny_all on public.app_versions;
create policy app_versions_deny_all on public.app_versions for all using (false) with check (false);

create or replace function public.bdz_check_version(p_version text, p_app_id text default 'default')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_app text := coalesce(nullif(trim(p_app_id), ''), 'default');
  v_ver text := trim(p_version);
  v_row record;
  v_latest record;
  v_force boolean := false;
begin
  if v_ver is null or v_ver = '' then
    return json_build_object('ok', false, 'allowed', false, 'message', 'Thiếu version.', 'latest', null, 'force_update', true, 'download_url', null);
  end if;

  select * into v_latest from public.app_versions
  where app_id = v_app and enabled = true
  order by is_latest desc, id desc limit 1;

  select * into v_row from public.app_versions
  where app_id = v_app and version = v_ver limit 1;

  if v_row is null or v_row.enabled is not true then
    return json_build_object(
      'ok', true, 'allowed', false,
      'message', 'Vui lòng cập nhật phiên bản mới nhất.',
      'latest', coalesce(v_latest.version, null),
      'force_update', true,
      'download_url', coalesce(v_latest.download_url, null),
      'note', coalesce(v_latest.note, null)
    );
  end if;

  select exists(
    select 1 from public.app_versions
    where app_id = v_app and enabled = true and force_update = true and id > v_row.id
  ) into v_force;

  if v_force then
    return json_build_object(
      'ok', true, 'allowed', false,
      'message', 'Vui lòng cập nhật phiên bản mới nhất.',
      'latest', coalesce(v_latest.version, null),
      'force_update', true,
      'download_url', coalesce(v_latest.download_url, null),
      'note', coalesce(v_latest.note, null)
    );
  end if;

  return json_build_object(
    'ok', true, 'allowed', true,
    'message', 'Version hợp lệ.',
    'latest', coalesce(v_latest.version, v_row.version),
    'force_update', false,
    'download_url', coalesce(v_latest.download_url, null),
    'note', coalesce(v_row.note, null)
  );
end;
$$;

grant execute on function public.bdz_check_version(text, text) to anon, authenticated, service_role;

create or replace function public.bdz_admin_versions(
  p_token text,
  p_action text default 'list',
  p_payload jsonb default '{}'::jsonb
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_app text;
  v_row record;
begin
  if p_token is null or length(p_token) < 8 then
    return json_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  if p_action = 'list' then
    return json_build_object('ok', true, 'rows', coalesce((
      select json_agg(x order by x.id desc) from (
        select id, app_id, version, enabled, is_latest, force_update, download_url, note, created_at, updated_at
        from public.app_versions order by id desc
      ) x
    ), '[]'::json));
  end if;

  if p_action = 'create' then
    v_app := coalesce(nullif(trim(p_payload->>'app_id'), ''), 'default');
    insert into public.app_versions (app_id, version, enabled, is_latest, force_update, download_url, note)
    values (
      v_app, trim(p_payload->>'version'),
      coalesce((p_payload->>'enabled')::boolean, true),
      coalesce((p_payload->>'is_latest')::boolean, false),
      coalesce((p_payload->>'force_update')::boolean, false),
      nullif(trim(p_payload->>'download_url'), ''),
      nullif(trim(p_payload->>'note'), '')
    ) returning * into v_row;
    if v_row.is_latest then
      update public.app_versions set is_latest = false where app_id = v_row.app_id and id <> v_row.id;
    end if;
    return json_build_object('ok', true, 'row', row_to_json(v_row));
  end if;

  if p_action = 'update' then
    v_id := (p_payload->>'id')::bigint;
    update public.app_versions set
      version = coalesce(nullif(trim(p_payload->>'version'), ''), version),
      app_id = coalesce(nullif(trim(p_payload->>'app_id'), ''), app_id),
      enabled = coalesce((p_payload->>'enabled')::boolean, enabled),
      is_latest = coalesce((p_payload->>'is_latest')::boolean, is_latest),
      force_update = coalesce((p_payload->>'force_update')::boolean, force_update),
      download_url = case when p_payload ? 'download_url' then nullif(trim(p_payload->>'download_url'), '') else download_url end,
      note = case when p_payload ? 'note' then nullif(trim(p_payload->>'note'), '') else note end,
      updated_at = now()
    where id = v_id returning * into v_row;
    if v_row is null then return json_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
    if v_row.is_latest then
      update public.app_versions set is_latest = false where app_id = v_row.app_id and id <> v_row.id;
    end if;
    return json_build_object('ok', true, 'row', row_to_json(v_row));
  end if;

  if p_action = 'delete' then
    delete from public.app_versions where id = (p_payload->>'id')::bigint;
    return json_build_object('ok', true);
  end if;

  return json_build_object('ok', false, 'error', 'UNKNOWN_ACTION');
end;
$$;

grant execute on function public.bdz_admin_versions(text, text, jsonb) to anon, authenticated, service_role;
