-- Create user_stats table
create table if not exists public.user_stats (
  user_id uuid references auth.users on delete cascade not null primary key,
  total_minutes_listened bigint default 0,
  songs_played bigint default 0,
  top_artist text,
  top_genre text,
  listening_streak int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_stats enable row level security;

-- Create policies
create policy "Users can view their own stats" on public.user_stats
  for select using (auth.uid() = user_id);

create policy "Users and Service Key can update stats" on public.user_stats
  for update using (auth.uid() = user_id);
