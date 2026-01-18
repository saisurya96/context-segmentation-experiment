-- Initial schema for Stage Zero baseline
create extension if not exists "pgcrypto";

create table if not exists public.models (
  id text primary key,
  display_name text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_id text not null references public.models(id),
  created_at timestamp with time zone not null default now(),
  unique (user_id, model_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'error')),
  content text not null,
  created_at timestamp with time zone not null default now()
);

alter table public.models enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "models_select_all"
  on public.models for select
  to public
  using (true);

create policy "conversations_crud_own"
  on public.conversations for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "messages_crud_own"
  on public.messages for all
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.user_id = auth.uid()
    )
  );

insert into public.models (id, display_name)
values
  ('mistralai/mistral-small-24b-instruct-2501', 'Mistral Small 24B Instruct'),
  ('deepseek/deepseek-chat-v3.1', 'DeepSeek Chat v3.1'),
  ('openai/gpt-4o', 'OpenAI GPT-4o')
on conflict (id) do nothing;
