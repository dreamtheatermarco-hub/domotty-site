-- Domotty · Jana di prova: solo conteggi anonimi per i limiti (nessun testo delle conversazioni).
-- Eseguire una volta nel SQL Editor di Supabase.

create table if not exists public.jana_conversations (
  id          uuid primary key default gen_random_uuid(),
  day         date not null default (now() at time zone 'Europe/Rome')::date,
  client_hash text not null,               -- impronta anonima giornaliera, non l'indirizzo IP
  messages    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists jana_conversations_day_idx on public.jana_conversations (day, client_hash);

alter table public.jana_conversations enable row level security;
revoke all on public.jana_conversations from anon, authenticated;

-- Controlla i limiti e conta il messaggio, tutto in un'unica operazione.
create or replace function public.jana_use(p_conv uuid, p_hash text, p_max_msg int, p_max_day int, p_max_ip int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Europe/Rome')::date;
  r public.jana_conversations;
  n int;
begin
  perform pg_advisory_xact_lock(hashtext('jana_use'));
  if p_conv is not null then
    select * into r from public.jana_conversations where id = p_conv and day = d for update;
  end if;
  if r.id is null then
    select count(*) into n from public.jana_conversations where day = d;
    if n >= p_max_day then return jsonb_build_object('ok', false, 'reason', 'day'); end if;
    select count(*) into n from public.jana_conversations where day = d and client_hash = p_hash;
    if n >= p_max_ip then return jsonb_build_object('ok', false, 'reason', 'client'); end if;
    insert into public.jana_conversations (day, client_hash, messages) values (d, p_hash, 1) returning * into r;
    return jsonb_build_object('ok', true, 'conv', r.id, 'left', p_max_msg - 1);
  end if;
  if r.messages >= p_max_msg then
    return jsonb_build_object('ok', false, 'reason', 'conv', 'conv', r.id, 'left', 0);
  end if;
  update public.jana_conversations set messages = messages + 1 where id = r.id returning * into r;
  return jsonb_build_object('ok', true, 'conv', r.id, 'left', p_max_msg - r.messages);
end $$;
revoke all on function public.jana_use(uuid, text, int, int, int) from public, anon, authenticated;
grant execute on function public.jana_use(uuid, text, int, int, int) to service_role;

-- Pulizia: i conteggi più vecchi di 3 giorni vengono cancellati.
create or replace function public.jana_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.jana_conversations where created_at < now() - interval '3 days';
$$;
revoke all on function public.jana_cleanup() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('jana-cleanup', '25 3 * * *', 'select public.jana_cleanup()');
  end if;
end $$;
