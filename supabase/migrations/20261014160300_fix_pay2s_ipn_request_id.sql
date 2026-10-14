-- Pay2S IPN requestId may be Pay2S's internal request ID, not the merchant create requestId.
-- Keep the callback request ID separately and correlate payments by signed orderId, partner and amount.
alter table public.pay2s_orders
  add column if not exists pay2s_ipn_request_id text;

create or replace function public.bdz_pay2s_settle(
  p_order_id text,
  p_request_id text,
  p_partner_code text,
  p_amount bigint,
  p_result_code integer,
  p_trans_id text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_order public.pay2s_orders%rowtype;
  v_settings public.pay2s_settings%rowtype;
  v_key_code text;
  v_key_id bigint;
  v_new_status text;
begin
  select * into v_order
  from public.pay2s_orders
  where order_id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'ORDER_NOT_FOUND');
  end if;

  select * into v_settings from public.pay2s_settings where id = true;

  -- The IPN signature is verified by pay2s-ipn before this RPC is called.
  -- Pay2S documents that IPN requestId can be its own internal ID, so do not
  -- require it to equal the merchant's request_id used when creating the link.
  if p_partner_code is distinct from v_settings.partner_code
     or p_amount is distinct from v_order.amount then
    return jsonb_build_object('ok', false, 'error', 'PAYMENT_MISMATCH');
  end if;

  if v_order.status = 'PAID' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'status', 'PAID');
  end if;

  if p_result_code = 0 then
    v_key_code := upper(encode(extensions.gen_random_bytes(12), 'hex'));
    insert into public.app_keys(
      key_code, key_fingerprint, status, duration_hours, expires_at,
      max_devices, check_count, max_checks, created_by_admin_id
    ) values (
      v_key_code, public.bdz_hash(v_key_code), 'ACTIVE',
      v_order.duration_hours, now() + make_interval(hours => v_order.duration_hours),
      v_order.max_devices, 0, 0, null
    ) returning id into v_key_id;

    update public.pay2s_orders set
      status = 'PAID',
      pay2s_ipn_request_id = nullif(p_request_id, ''),
      pay2s_trans_id = coalesce(nullif(p_trans_id,''), pay2s_trans_id),
      result_code = p_result_code,
      result_message = left(coalesce(p_message,''), 300),
      key_id = v_key_id,
      paid_at = now()
    where id = v_order.id;

    return jsonb_build_object('ok', true, 'duplicate', false, 'status', 'PAID');
  end if;

  v_new_status := case when p_result_code = 9000 then 'PENDING' else 'FAILED' end;
  update public.pay2s_orders set
    status = v_new_status,
    pay2s_ipn_request_id = nullif(p_request_id, ''),
    pay2s_trans_id = coalesce(nullif(p_trans_id,''), pay2s_trans_id),
    result_code = p_result_code,
    result_message = left(coalesce(p_message,''), 300)
  where id = v_order.id;

  return jsonb_build_object('ok', true, 'status', v_new_status);
end;
$function$;
