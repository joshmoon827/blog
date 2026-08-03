-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Blog guest comments + Realtime + vote floor

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null,
  parent_id uuid references public.comments (id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 4000),
  upvotes int not null default 0 check (upvotes >= 0),
  downvotes int not null default 0 check (downvotes >= 0),
  -- Others' raised score: author may lower only down to this floor.
  score_floor int not null default 0 check (score_floor >= 0),
  created_at timestamptz not null default now(),
  check (upvotes >= score_floor)
);

create index if not exists comments_article_slug_created_at_idx
  on public.comments (article_slug, created_at);

alter table public.comments enable row level security;

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all"
  on public.comments for select
  using (true);

drop policy if exists "comments_insert_guest" on public.comments;
create policy "comments_insert_guest"
  on public.comments for insert
  with check (
    char_length(trim(author)) between 1 and 40
    and char_length(trim(body)) between 1 and 4000
  );

-- Votes go through vote_comment() RPC (no direct client updates)
drop policy if exists "comments_update_votes" on public.comments;

create or replace function public.vote_comment(
  p_id uuid,
  p_direction text,
  p_voter text default ''
)
returns public.comments
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.comments;
  v_name text := trim(coalesce(p_voter, ''));
  is_author boolean;
  new_score int;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'invalid direction';
  end if;

  select * into c from public.comments where id = p_id for update;
  if not found then
    raise exception 'comment not found';
  end if;

  is_author := (v_name <> '' and v_name = c.author);

  if p_direction = 'up' then
    new_score := c.upvotes + 1;
    if is_author then
      -- Author can raise above floor; floor stays so they can undo later.
      update public.comments
      set upvotes = new_score
      where id = p_id
      returning * into c;
    else
      -- Others lock the new score as the floor.
      update public.comments
      set upvotes = new_score, score_floor = new_score
      where id = p_id
      returning * into c;
    end if;
  else
    if not is_author then
      raise exception 'only the author can lower votes';
    end if;
    if c.upvotes <= c.score_floor then
      raise exception 'cannot lower below locked score';
    end if;
    update public.comments
    set upvotes = upvotes - 1
    where id = p_id
    returning * into c;
  end if;

  return c;
end;
$$;

revoke all on function public.vote_comment(uuid, text, text) from public;
grant execute on function public.vote_comment(uuid, text, text) to anon, authenticated;

-- Realtime (ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception
  when duplicate_object then null;
end $$;
