create table if not exists public.market_comments (
  id uuid primary key default gen_random_uuid(),
  market_id bigint not null,
  parent_id uuid references public.market_comments(id) on delete cascade,
  author_hash text not null,
  body text not null check (char_length(body) between 1 and 360),
  likes integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);

alter table public.market_comments
  add column if not exists parent_id uuid references public.market_comments(id) on delete cascade;

create index if not exists market_comments_market_created_idx
  on public.market_comments (market_id, created_at desc);

create index if not exists market_comments_parent_created_idx
  on public.market_comments (parent_id, created_at asc);

create table if not exists public.market_comment_likes (
  comment_id uuid not null references public.market_comments(id) on delete cascade,
  market_id bigint not null,
  author_hash text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, author_hash)
);

create index if not exists market_comment_likes_market_author_idx
  on public.market_comment_likes (market_id, author_hash);

create or replace function public.increment_market_comment_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.market_comments
  set likes = likes + 1
  where id = new.comment_id;

  return new;
end;
$$;

drop trigger if exists market_comment_likes_increment on public.market_comment_likes;
create trigger market_comment_likes_increment
  after insert on public.market_comment_likes
  for each row
  execute function public.increment_market_comment_likes();

alter table public.market_comments enable row level security;
alter table public.market_comment_likes enable row level security;

drop policy if exists "Public comments are readable" on public.market_comments;
create policy "Public comments are readable"
  on public.market_comments
  for select
  to anon
  using (true);

drop policy if exists "Anonymous users can create market comments" on public.market_comments;
create policy "Anonymous users can create market comments"
  on public.market_comments
  for insert
  to anon
  with check (true);

drop policy if exists "Public comment likes are readable" on public.market_comment_likes;
create policy "Public comment likes are readable"
  on public.market_comment_likes
  for select
  to anon
  using (true);

drop policy if exists "Anonymous users can like comments once" on public.market_comment_likes;
create policy "Anonymous users can like comments once"
  on public.market_comment_likes
  for insert
  to anon
  with check (true);

grant select, insert on public.market_comments to anon;
grant select, insert on public.market_comment_likes to anon;
