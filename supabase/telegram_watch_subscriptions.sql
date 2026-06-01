create table if not exists public.telegram_watch_subscriptions (
  id bigserial primary key,
  telegram_user_id bigint not null,
  chat_id bigint not null,
  market_id bigint not null,
  alert_on_expiry boolean not null default true,
  alert_on_resolution boolean not null default true,
  alert_on_finalization boolean not null default true,
  last_status text,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (telegram_user_id, chat_id, market_id)
);

create index if not exists telegram_watch_subscriptions_market_id_idx
  on public.telegram_watch_subscriptions (market_id);
