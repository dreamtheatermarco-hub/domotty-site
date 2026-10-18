-- Domotty · tabelle per il sito (modulo contatti e newsletter)
-- Eseguire una volta nel SQL Editor di Supabase.

create extension if not exists pgcrypto;

-- Richieste dal modulo "Contattaci"
create table if not exists public.contact_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  tipo        text not null,
  nome        text not null,
  email       text not null,
  azienda     text,
  telefono    text,
  messaggio   text,
  privacy_ack boolean not null default false,
  status      text not null default 'nuova' check (status in ('nuova','in_lavorazione','chiusa')),
  email_sent  boolean not null default false
);
create index if not exists contact_requests_created_idx on public.contact_requests (created_at desc);
create index if not exists contact_requests_email_idx on public.contact_requests (lower(email));

-- Iscritti alla newsletter (doppia conferma)
create table if not exists public.newsletter_subscribers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  status           text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  confirm_token    text unique,
  unsubscribe_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at       timestamptz not null default now(),
  confirm_sent_at  timestamptz,
  confirmed_at     timestamptz,
  unsubscribed_at  timestamptz
);
create unique index if not exists newsletter_email_uidx on public.newsletter_subscribers (lower(email));

-- Sicurezza: RLS attiva e nessuna policy pubblica.
-- Dal sito si scrive SOLO passando dalle Edge Functions (che usano la service role).
alter table public.contact_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;
revoke all on public.contact_requests from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;

-- Pulizia automatica secondo l'informativa:
-- richieste più vecchie di 24 mesi, iscrizioni mai confermate dopo 30 giorni.
create or replace function public.domotty_retention_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.contact_requests where created_at < now() - interval '24 months';
  delete from public.newsletter_subscribers where status = 'pending' and created_at < now() - interval '30 days';
$$;
revoke all on function public.domotty_retention_cleanup() from public, anon, authenticated;

-- Pianifica la pulizia ogni notte alle 03:15 (richiede l'estensione pg_cron:
-- Database > Extensions > pg_cron. Se non la attivi, puoi saltare queste righe).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('domotty-retention', '15 3 * * *', 'select public.domotty_retention_cleanup()');
  end if;
end $$;
