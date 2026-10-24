begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  age integer check (age between 18 and 100),
  height_cm numeric(5,1) check (height_cm between 100 and 250),
  weight_kg numeric(5,1) check (weight_kg between 30 and 350),
  sex text check (sex in ('female','male')),
  activity text not null default 'light' check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text not null default 'maintain' check (goal in ('lose','maintain','gain')),
  target_weight_kg numeric(5,1) check (target_weight_kg between 30 and 350),
  updated_at timestamptz not null default now()
);

create table public.nutrition_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories numeric(7,2) not null default 2200 check (calories between 500 and 10000),
  protein numeric(7,2) not null default 140 check (protein between 0 and 1000),
  carbs numeric(7,2) not null default 260 check (carbs between 0 and 1000),
  fat numeric(7,2) not null default 67 check (fat between 0 and 1000),
  updated_at timestamptz not null default now()
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  brand text check (char_length(brand) <= 160),
  source text not null default 'custom' check (source = 'custom'),
  fdc_id integer check (fdc_id > 0),
  serving_size numeric(10,2) not null check (serving_size between 0.01 and 100000),
  serving_unit text not null check (serving_unit in ('serving','g','ml','oz','cup','piece','tbsp','tsp')),
  grams_per_serving numeric(14,6) check (grams_per_serving > 0),
  calories numeric(7,2) not null check (calories between 0 and 10000),
  protein numeric(7,2) not null check (protein between 0 and 1000),
  carbs numeric(7,2) not null check (carbs between 0 and 1000),
  fat numeric(7,2) not null check (fat between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_user_name_idx on public.foods(user_id, name);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  meal text not null check (meal in ('Breakfast','Lunch','Dinner','Snacks')),
  food_name text not null check (char_length(btrim(food_name)) between 1 and 500),
  food_id uuid references public.foods(id) on delete set null,
  fdc_id integer check (fdc_id > 0),
  quantity numeric(8,2) not null check (quantity between 0.01 and 1000),
  serving_label text not null check (char_length(btrim(serving_label)) between 1 and 300),
  -- All nutrients in kcal / grams for ONE selected serving; never joined back to foods.
  per_serving jsonb not null check (
    jsonb_typeof(per_serving) = 'object'
    and per_serving ?& array['calories','protein','carbs','fat']
    and jsonb_typeof(per_serving->'calories') = 'number'
    and jsonb_typeof(per_serving->'protein') = 'number'
    and jsonb_typeof(per_serving->'carbs') = 'number'
    and jsonb_typeof(per_serving->'fat') = 'number'
    and (per_serving->>'calories')::numeric between 0 and 10000000
    and (per_serving->>'protein')::numeric between 0 and 1000000
    and (per_serving->>'carbs')::numeric between 0 and 1000000
    and (per_serving->>'fat')::numeric between 0 and 1000000
  ),
  -- Consumed totals are snapshots too. Constraints keep quantity edits consistent.
  calories numeric(14,2) not null check (calories = round((per_serving->>'calories')::numeric * quantity, 2)),
  protein numeric(14,2) not null check (protein = round((per_serving->>'protein')::numeric * quantity, 2)),
  carbs numeric(14,2) not null check (carbs = round((per_serving->>'carbs')::numeric * quantity, 2)),
  fat numeric(14,2) not null check (fat = round((per_serving->>'fat')::numeric * quantity, 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_date_idx on public.food_logs(user_id, log_date, created_at);
create index food_logs_food_id_idx on public.food_logs(food_id) where food_id is not null;

alter table public.profiles enable row level security;
alter table public.nutrition_targets enable row level security;
alter table public.foods enable row level security;
alter table public.food_logs enable row level security;

create policy "Own profile" on public.profiles for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own targets" on public.nutrition_targets for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own foods" on public.foods for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own diary entries" on public.food_logs for all to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and (food_id is null or exists (select 1 from public.foods where foods.id = food_id and foods.user_id = (select auth.uid())))
);

revoke all on public.profiles, public.nutrition_targets, public.foods, public.food_logs from anon;
grant select, insert, update, delete on public.profiles, public.nutrition_targets, public.foods, public.food_logs to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger targets_updated before update on public.nutrition_targets for each row execute function public.touch_updated_at();
create trigger foods_updated before update on public.foods for each row execute function public.touch_updated_at();
create trigger logs_updated before update on public.food_logs for each row execute function public.touch_updated_at();

-- Atomic shared quota, not an unreliable per-Edge-instance memory counter.
create table public.food_search_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0)
);
alter table public.food_search_limits enable row level security;
revoke all on public.food_search_limits from anon, authenticated;

create function public.consume_food_search_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); bucket timestamptz := date_trunc('minute', now()); count_now integer;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  insert into public.food_search_limits(user_id, window_start, request_count) values (caller, bucket, 1)
  on conflict (user_id) do update set
    request_count = case when food_search_limits.window_start = bucket then least(food_search_limits.request_count + 1, 31) else 1 end,
    window_start = bucket
  returning request_count into count_now;
  return count_now <= 30;
end;
$$;
revoke all on function public.consume_food_search_quota() from public, anon;
grant execute on function public.consume_food_search_quota() to authenticated;

commit;
