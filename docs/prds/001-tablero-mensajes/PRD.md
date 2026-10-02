# PRD — Tablero de mensajes (despedida de Marcos)

> Fuente: `PRD-tablero-mensajes-Marcos.pdf` (2026-10-02, @Nicolas). Este documento lo
> reestructura en el formato del flujo incu/dev y fija el alcance acordado: **Must + Should**.

## Status
In Progress

## Problem
Marcos deja Incu y el equipo quiere regalarle un tablero donde cada persona le deje un
mensaje, una foto o ambas cosas. Hoy no hay una herramienta interna para esto: juntar
mensajes por Slack/WhatsApp queda disperso y Marcos no se lleva un único lugar que pueda
conservar. El tablero se comparte por un link privado: quien tiene la URL puede verlo y
escribir, sin crear cuenta.

## Goals
- Cualquier miembro del equipo deja su mensaje en **menos de 2 minutos desde el celular**.
- Marcos recibe **un único link** con todos los mensajes y fotos, que conserva después de irse.
- El tablero es **reutilizable** (despedidas, cumpleaños, aniversarios): cada tablero con su
  propio ID.

## Non-goals
Fuera del MVP (según PDF):
- Login de usuarios (SSO, Google, magic link).
- Listado público de tableros.
- Reacciones y comentarios entre mensajes.
- Video, audio, GIFs animados.
- Exportar a PDF o libro impreso.
- Notificaciones por mail o Slack.
- Multi-idioma; plantillas visuales múltiples.
- Filtro automático de moderación.

Diferidos a una fase posterior (prioridad **Could**, fuera de este alcance):
- RF-09 Modo revelación (`revealAt`). La columna `reveal_at` se crea igual en el esquema
  para no requerir migración después, pero no tiene UI ni lógica.
- RF-11 Descarga de todas las fotos en ZIP.
- RF-12 Vista de presentación a pantalla completa.

## User stories
- Como **organizador**, quiero crear un tablero con título, homenajeado, bienvenida y portada,
  y recibir un link público y uno de administración, para compartirlo y moderarlo sin cuentas.
- Como **organizador**, quiero ocultar, restaurar o borrar mensajes y cerrar/reabrir el
  tablero, para curar el muro antes de entregarlo.
- Como **participante**, quiero abrir el link, ver el muro y dejar mi mensaje con una foto
  desde el celular, previsualizándolo antes de publicar.
- Como **participante**, quiero editar o borrar mi propio mensaje desde el mismo dispositivo
  mientras el tablero esté abierto.
- Como **Marcos**, quiero ver el muro completo, abrir cada foto en grande y descargarla.

## Roles y acceso (capability URLs)
| Rol | Link | Puede |
|---|---|---|
| Organizador | `/b/{boardId}/admin?key={adminKey}` | Moderar mensajes, cerrar o reabrir |
| Participante | `/b/{boardId}` | Ver, publicar, editar/borrar el propio |
| Marcos | `/b/{boardId}` | Ver el muro y descargar fotos |

- `boardId`: nanoid de 21 caracteres (alfabeto URL-safe, ~126 bits), en columna `slug` única,
  separada del `id` UUID interno. Nunca se expone un ID secuencial.
- `adminKey`: 32 bytes aleatorios en base64url. En la base solo su hash SHA-256; el valor en
  claro se muestra **una única vez** al crear.
- `editToken` por mensaje: mismo esquema que `adminKey`; hash en la base, valor en
  `localStorage` del autor.
- Riesgo aceptado: quien reciba el link reenviado puede escribir; se mitiga con moderación y
  cierre del tablero.

## Functional requirements
| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Crear un tablero con título, nombre del homenajeado, mensaje de bienvenida y foto de portada opcional | Must |
| RF-02 | Al crear, generar un `boardId` público y un `adminKey` secreto, y mostrar ambos links con botón de copiar | Must |
| RF-03 | Ver el muro en `/b/{boardId}`, ordenado por fecha de publicación (más antiguo primero); los mensajes ocultos no se muestran | Must |
| RF-04 | Publicar un mensaje con nombre (obligatorio, 1–60 caracteres), texto (hasta 1.000) y foto opcional; texto o foto deben estar presentes; previsualización antes de publicar | Must |
| RF-05 | Una foto por mensaje (JPG, PNG, HEIC, WebP, hasta 10 MB); el cliente la comprime a máx. 2.000 px de lado (calidad 0,8), convierte HEIC a JPEG y elimina EXIF antes de subir | Must |
| RF-06 | El autor puede editar o borrar su mensaje desde el mismo navegador mediante un `editToken` en `localStorage`, mientras el tablero esté abierto | Should |
| RF-07 | Panel de administración: listar mensajes (incluidos ocultos), ocultar, restaurar y borrar | Must |
| RF-08 | Cerrar el tablero a nuevos mensajes (y reabrirlo); con el tablero cerrado el muro sigue visible, el formulario no se muestra y el servidor rechaza crear/editar/borrar mensajes de participantes | Must |
| RF-10 | Ver una foto en grande (lightbox) y descargarla | Should |
| RF-13 | Un `boardId` inexistente (o un `adminKey` inválido) responde 404 sin revelar si el tablero existe | Must |

## Non-functional requirements
- **Seguridad**
  - El navegador nunca habla con las tablas: toda lectura/escritura pasa por Server Components,
    Server Actions o Route Handlers que usan la service role key (solo servidor) y validan slug,
    tokens y estado del tablero con `zod`.
  - RLS activado en `boards` y `messages`, **sin políticas** para `anon`/`authenticated`.
  - Comparación de hashes en tiempo constante.
  - Páginas de tablero con `robots: noindex, nofollow` y header `Referrer-Policy: no-referrer`.
  - Sin rate limiting en el MVP (decisión 2026-10-02; escala chica, riesgo aceptado).
  - Creación de tableros abierta; si `BOARD_CREATION_PASSWORD` está definida, la home la exige
    (comparación en tiempo constante).
  - Validación de tipo y tamaño de archivo en el servidor (no solo en el cliente).
  - Bucket privado `board-media`; URLs firmadas de lectura con vencimiento de 1 hora al
    renderizar; subidas con URL firmada de subida (`createSignedUploadUrl`) para evitar el
    límite de 4,5 MB por request de Vercel.
- **Mobile**: mobile-first; publicar con foto en 4G en < 10 s.
- **Performance**: muro con 50 mensajes con foto, LCP < 2,5 s; `next/image`, lazy loading,
  tamaños responsive; ancho/alto de la foto guardados para reservar espacio (sin layout shift).
- **Accesibilidad**: contraste AA, navegación por teclado (incl. lightbox), `alt` con el nombre
  del autor en cada foto.
- **Privacidad**: sin analytics de terceros en páginas de tablero; borrado a pedido del
  organizador (borrar mensajes) o de Marcos.
- **Escala**: decenas de tableros y cientos de mensajes; plan gratuito de Supabase (1 GB).
- **Disponibilidad**: Vercel, sin SLA formal.

## Data model changes
Repo greenfield: no existe `docs/database-schema.md`; este PRD define el esquema inicial
(se versiona en `supabase/migrations/`).

```sql
create table boards (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,          -- boardId (nanoid 21)
  title           text not null,
  recipient_name  text not null,
  welcome_message text,
  cover_path      text,                          -- ruta en Storage
  admin_key_hash  text not null,
  status          text not null default 'open' check (status in ('open','closed')),
  reveal_at       timestamptz,                   -- reservado para RF-09 (diferido)
  created_at      timestamptz not null default now()
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid not null references boards(id) on delete cascade,
  author_name     text not null check (char_length(author_name) between 1 and 60),
  body            text check (char_length(body) <= 1000),
  photo_path      text,
  photo_width     int,
  photo_height    int,
  edit_token_hash text not null,
  is_hidden       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint has_content check (body is not null or photo_path is not null)
);

create index messages_board_created_idx on messages (board_id, created_at);
alter table boards   enable row level security;
alter table messages enable row level security;
```

Storage: bucket privado `board-media`, rutas `{boardId}/cover.jpg` y `{boardId}/{messageId}.jpg`.

## UI/UX notes
| Ruta | Tipo | Función |
|---|---|---|
| `/` | Página | Formulario para crear un tablero |
| `/b/[boardId]` | Server Component | Muro (mosaico con CSS columns) + botón "Dejar un mensaje" |
| `/b/[boardId]/admin?key=…` | Página | Panel de moderación; valida el hash del `adminKey` |
| `createBoard` | Server Action | Crea el tablero y devuelve los dos links |
| `requestUploadUrl` | Server Action | Valida tablero abierto y devuelve URL firmada de subida |
| `createMessage` / `updateMessage` / `deleteMessage` | Server Actions | Validan con zod, verifican `editToken`, escriben en Postgres |
| `moderateMessage` / `setBoardStatus` | Server Actions | Requieren `adminKey` válido |

Librerías: `@supabase/supabase-js`, `nanoid`, `zod`, `browser-image-compression`, `heic2any`
(cliente), Tailwind. Sin librería de mosaico.

## Acceptance criteria
- AC-1 Un tablero nuevo devuelve link público y link de administración, y el `adminKey` en
  claro no queda guardado en la base.
- AC-2 Un `boardId` alterado en un carácter responde 404.
- AC-3 La anon key de Supabase no puede leer ninguna fila de `boards` ni de `messages`.
- AC-4 Desde un iPhone se publica un mensaje con una foto HEIC y se ve correctamente en el muro.
- AC-5 La foto publicada no conserva metadatos de geolocalización.
- AC-6 Un mensaje oculto desde el panel desaparece del muro y se puede restaurar.
- AC-7 Con el tablero cerrado, el formulario no se muestra y la API rechaza nuevos mensajes.
- AC-8 Las páginas de tablero incluyen `noindex` y `Referrer-Policy: no-referrer`.
- AC-9 (RF-06) El autor edita/borra su mensaje desde el mismo navegador; otro navegador no puede.
- AC-10 (RF-10) Una foto se abre en lightbox y se descarga.

## Open questions
Del PDF (no bloquean la implementación del alcance Must + Should):
1. ¿Fecha de la despedida de Marcos? Define si se agregan los Could después.
2. ¿Marcos ve los mensajes a medida que llegan o es sorpresa (modo revelación, RF-09)?
3. ¿Pueden participar personas fuera de Incu (clientes, ex compañeros)? (No cambia el diseño
   técnico: el acceso es por link.)
4. ¿Subdominio propio (p. ej. `tablero.incu…`) o dominio de Vercel?
5. ¿Solo para Marcos o herramienta interna reutilizable desde el día uno? (El diseño ya
   soporta múltiples tableros; la home permite crear cualquiera.)

Resueltas en Gate 1 (2026-10-02):
6. **Supabase cloud**: variables en `.env` (ignorado por git). Falta `SUPABASE_SECRET_KEY`
   (la publishable key no alcanza: el servidor necesita saltear RLS). Las migraciones se
   aplican al proyecto cloud con confirmación explícita del usuario en ese paso.
7. **Creación de tableros**: abierta por ahora; password opcional por env
   (`BOARD_CREATION_PASSWORD`).
8. **Rate limiting**: no se implementa en el MVP (se aparta del PDF por decisión del usuario).
9. **Huérfanos en Storage**: aceptado; limpieza manual.

## Conflicts / dependencies
- Repo greenfield: no hay PRDs, docs ni código previos; sin conflictos.
- Dependencia externa: proyecto Supabase cloud (pregunta 6) y cuenta de Vercel para deploy.
- No se encontró configuración de `linkedRepos`; producto de un solo repo.
