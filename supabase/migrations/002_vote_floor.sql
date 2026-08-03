-- Add score floor + vote RPC; stop open client updates on comments.

alter table public.comments
  add column if not exists score_floor int not null default 0;

-- Normalize existing scores; lock current public score as floor.
update public.comments
set
  upvotes = greatest(0, upvotes - downvotes),
  downvotes = 0,
  score_floor = greatest(0, upvotes - downvotes);

-- Fix floor after upvotes rewrite (previous SET used old upvotes in score_floor expr order)
update public.comments
set score_floor = upvotes
where score_floor > upvotes or score_floor < 0;

do $$
begin
  alter table public.comments
    add constraint comments_upvotes_gte_floor check (upvotes >= score_floor);
exception
  when duplicate_object then null;
end $$;

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
      update public.comments
      set upvotes = new_score
      where id = p_id
      returning * into c;
    else
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
