-- Tablero de mensajes — esquema inicial (PRD docs/prds/001-tablero-mensajes)
--
-- Acceso: solo el servidor (secret/service role key). RLS activado y sin políticas para
-- anon/authenticated, y además sin privilegios de tabla para esos roles.

create table public.boards (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[A-Za-z0-9_-]{21}$'), -- boardId (nanoid 21)
  title           text not null check (char_length(title) between 1 and 100),
  recipient_name  text not null check (char_length(recipient_name) between 1 and 60),
  welcome_message text check (char_length(welcome_message) <= 1000),
  cover_path      text,                                  -- ruta en Storage
  admin_key_hash  text not null check (admin_key_hash ~ '^[0-9a-f]{64}$'),
  status          text not null default 'open' check (status in ('open', 'closed')),
  reveal_at       timestamptz,                           -- reservado para RF-09 (diferido)
  created_at      timestamptz not null default now()
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid not null references public.boards (id) on delete cascade,
  author_name     text not null check (char_length(author_name) between 1 and 60),
  body            text check (char_length(body) <= 1000),
  photo_path      text,
  photo_width     int check (photo_width between 1 and 10000),
  photo_height    int check (photo_height between 1 and 10000),
  edit_token_hash text not null check (edit_token_hash ~ '^[0-9a-f]{64}$'),
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint has_content check (body is not null or photo_path is not null)
);

create index messages_board_created_idx on public.messages (board_id, created_at);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function public.set_updated_at();

alter table public.boards   enable row level security;
alter table public.messages enable row level security;

-- Sin políticas: solo el servidor accede. Defensa extra: sin privilegios para roles públicos.
revoke all on table public.boards   from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated, public;

-- El servidor (secret key → service_role) necesita privilegios explícitos sobre las tablas.
grant select, insert, update, delete on table public.boards   to service_role;
grant select, insert, update, delete on table public.messages to service_role;

-- Storage: bucket privado. Todo llega convertido a JPEG desde el cliente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-media', 'board-media', false, 10485760, array['image/jpeg']);
