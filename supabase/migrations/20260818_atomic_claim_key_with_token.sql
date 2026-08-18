create or replace function public.claim_key_with_token(p_token_hash text,p_client_hash text,p_duration_hours integer default 10,p_claimed_ip text default null) returns table(key_code text,product_id bigint,duration_hours integer,expires_at timestamptz,created_now boolean) language plpgsql security definer set search_path=public as $$
declare
  v_product_id bigint; v_used_at timestamptz; v_expires timestamptz; v_client text;
  k public.keys%rowtype; v_code text;
  v_hours integer:=greatest(1,least(720,coalesce(p_duration_hours,10)));
begin
  select product_id,used_at,expires_at,client_hash into v_product_id,v_used_at,v_expires,v_client
  from public.key_tokens where token_hash=p_token_hash for update;
  if not found or v_client<>p_client_hash or v_expires<=now() or v_used_at is not null then return; end if;

  select * into k from public.keys
  where product_id=v_product_id and status='ACTIVE' and expires_at is not null and expires_at>now() and claimed_at is null
  order by id for update skip locked limit 1;
  if found then
    update public.keys set claimed_at=now(),claimed_ip=p_claimed_ip where id=k.id returning * into k;
    update public.key_tokens set used_at=now() where token_hash=p_token_hash;
    return query select k.key_code,k.product_id,k.duration_hours,k.expires_at,false; return;
  end if;

  loop
    v_code:='BDZ-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    begin
      insert into public.keys(key_code,product_id,duration_hours,status,expires_at,claimed_at,claimed_ip)
      values(v_code,v_product_id,v_hours,'ACTIVE',now()+make_interval(hours=>v_hours),now(),p_claimed_ip)
      returning * into k;
      exit;
    exception when unique_violation then null;
    end;
  end loop;

  update public.key_tokens set used_at=now() where token_hash=p_token_hash;
  return query select k.key_code,k.product_id,k.duration_hours,k.expires_at,true;
end;
$$;
revoke all on function public.claim_key_with_token(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.claim_key_with_token(text,text,integer,text) to service_role;
