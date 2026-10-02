# Implementation Plan — Tablero de mensajes (despedida de Marcos)

PRD: [`PRD.md`](./PRD.md) · Alcance: Must + Should (RF-01..08, RF-10, RF-13).

## Branch / worktree
Branch name: `feat/001-tablero-mensajes`
Isolation mode: current checkout branch (repo recién inicializado; `main`/`develop` se crean
con el primer commit vía `incu-way-prepare-pr`).

## Decisiones técnicas
- **Stack**: Next.js (última estable, App Router, TypeScript strict, `src/`), Tailwind, pnpm.
- **Acceso a datos**: todo pasa por módulos `server-only` en `src/server/*` que usan un cliente
  Supabase con `SUPABASE_SECRET_KEY`. Server Components leen; Server Actions escriben. El cliente
  nunca recibe la secret key ni consulta tablas.
- **Tokens** (`src/lib/tokens.ts`): `boardId` = `nanoid(21)`; `adminKey`/`editToken` =
  `randomBytes(32).toString('base64url')`; en la base solo `sha256` hex; comparación con
  `timingSafeEqual`.
- **Validación**: esquemas `zod` compartidos (`src/lib/validation.ts`) en cliente (UX) y
  servidor (autoridad). El slug se valida por formato antes de consultar (formato inválido → 404).
- **Fotos**:
  1. Cliente: si es HEIC → `heic2any` a JPEG; luego `browser-image-compression`
     (`maxWidthOrHeight: 2000`, `initialQuality: 0.8`, `fileType: image/jpeg`,
     `preserveExif: false`) → JPEG sin EXIF. Se calculan ancho/alto finales.
  2. `requestUploadUrl` (Server Action) valida tablero abierto, genera el `messageId` (UUID) y
     devuelve `createSignedUploadUrl('{boardId}/{messageId}.jpg')`.
  3. El navegador sube directo a Storage con el token firmado.
  4. `createMessage` recibe `messageId`; el servidor verifica que el objeto exista en la ruta
     esperada, que sea JPEG (magic bytes), ≤ 10 MB, y **rechaza si conserva un segmento EXIF**
     (defensa en profundidad para AC-5). Si falla, borra el objeto.
  - Bucket `board-media` privado con `file_size_limit = 10 MB` y
    `allowed_mime_types = {image/jpeg}` (todo llega convertido a JPEG).
  - Portada: se sube después de crear el tablero, autorizada con el `adminKey` recién emitido
    (`{boardId}/cover.jpg`).
- **Lectura de fotos**: al renderizar el muro, `createSignedUrls` (1 h) en lote; `next/image` con
  `remotePatterns` al host del proyecto, `sizes` responsive, `loading=lazy` salvo las primeras;
  `width/height` guardados para evitar layout shift. Descarga (RF-10) con URL firmada con
  `download`.
- **Edición propia (RF-06)**: `createMessage` devuelve `editToken` una sola vez; se guarda en
  `localStorage` (`incu-wall:edit:{messageId}`). Editar permite cambiar nombre y texto y quitar la
  foto (reemplazar foto = borrar y publicar de nuevo). Solo con tablero abierto.
- **Headers**: `next.config` agrega a `/b/:path*` `Referrer-Policy: no-referrer` y
  `X-Robots-Tag: noindex, nofollow`; las páginas de tablero exportan `robots` noindex/nofollow.
  Headers básicos globales: `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'`.
- **Password de creación**: si `BOARD_CREATION_PASSWORD` está definida, `createBoard` la exige
  (tiempo constante) y la home muestra el campo.
- **Entornos**: tests de integración y E2E corren contra **Supabase local** (`supabase start`,
  Docker disponible) para no ensuciar el proyecto cloud. El proyecto cloud se usa para la prueba
  manual y el deploy.

## Phases

### Phase A — Setup
- [ ] A1 Scaffold Next.js + TypeScript strict + Tailwind + ESLint con pnpm; scripts `typecheck`,
      `lint`, `test`, `test:e2e`, `build` (`package.json`, `tsconfig.json`)
- [ ] A2 Vitest (unit + integración) y Playwright configurados (`vitest.config.ts`,
      `playwright.config.ts`)
- [ ] A3 `supabase init`; validación de env con zod en `src/lib/env.ts` (`server-only`);
      cliente admin en `src/server/supabase.ts`

### Phase B — Base de datos y Storage
- [ ] B1 Migración `supabase/migrations/*_init.sql`: tablas `boards` y `messages`, índice,
      RLS activado sin políticas, bucket privado `board-media` con límites
- [ ] B2 Aplicar migración en Supabase local + test de integración AC-3 (la publishable/anon
      key no lee `boards` ni `messages`)
- [ ] B3 Aplicar migración al proyecto cloud (`supabase db push`) — **con tu confirmación en
      ese momento** y requiere `SUPABASE_SECRET_KEY` en `.env` para la prueba manual

### Phase C — Núcleo de servidor
- [ ] C1 `src/lib/tokens.ts` y `src/lib/validation.ts` + tests unitarios
- [ ] C2 `src/server/boards.ts`: crear, obtener por slug, verificar adminKey, set status/cover
- [ ] C3 `src/server/messages.ts`: listar (público/admin), crear, editar, borrar, moderar;
      reglas de tablero cerrado
- [ ] C4 `src/server/media.ts`: URL firmada de subida, verificación JPEG/EXIF/tamaño, URLs
      firmadas de lectura/descarga, borrado de objetos
- [ ] C5 Server Actions (`src/app/actions/*.ts`): `createBoard`, `setBoardCover`,
      `requestUploadUrl`, `createMessage`, `updateMessage`, `deleteMessage`,
      `moderateMessage`, `setBoardStatus` + tests de integración

### Phase D — UI
- [ ] D1 Home `/`: formulario de creación (título, homenajeado, bienvenida, portada, password
      opcional) y pantalla de resultado con los dos links y botón copiar (RF-01, RF-02)
- [ ] D2 Muro `/b/[boardId]`: header con portada, mosaico CSS columns, 404 (RF-03, RF-13),
      metadata noindex
- [ ] D3 Formulario de mensaje: nombre/texto/foto, pipeline de imagen en cliente,
      previsualización, publicar; oculto si el tablero está cerrado (RF-04, RF-05, RF-08)
- [ ] D4 Editar/borrar propio mensaje con `editToken` de `localStorage` (RF-06)
- [ ] D5 Lightbox accesible (teclado, foco, Esc/flechas) con descarga (RF-10)
- [ ] D6 Panel `/b/[boardId]/admin?key=…`: lista con ocultos, ocultar/restaurar/borrar,
      cerrar/reabrir, links (RF-07, RF-08)

### Phase E — Tests E2E y pulido
- [ ] E1 Fixtures (JPEG con GPS EXIF, HEIC generado con `sips`) y E2E Playwright de los AC
- [ ] E2 Pulido mobile-first y accesibilidad (contraste AA, foco visible, `alt` con autor)

### Phase F — Validación
- [ ] F1 `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build`
- [ ] F2 Escaneos Snyk Code + Snyk SCA + SonarQube; fix loop hasta limpio (si alguna
      herramienta no está disponible, se registra en `TESTING.md` y te pregunto)
- [ ] F3 `TESTING.md` con guía de prueba manual (incl. iPhone/HEIC y LCP con 50 mensajes)

## Test plan

Trazabilidad requisito → test:

| Req / AC | Unit | Integración (Supabase local) | E2E |
|---|---|---|---|
| RF-01 / RF-02 / AC-1 | schema de board | `createBoard` guarda hash, no la key en claro | crear tablero → se ven y copian ambos links |
| RF-03 | — | orden por `created_at` asc, sin ocultos | muro muestra mensajes en orden |
| RF-04 | límites nombre 60 / texto 1000 / texto-o-foto | `createMessage` rechaza inválidos | publicar con previsualización |
| RF-05 / AC-5 | detector EXIF/JPEG | rechaza objeto con EXIF / no JPEG / > 10 MB | foto con GPS → archivo publicado sin EXIF |
| AC-4 | — | — | subir HEIC → se ve en el muro (Chromium) + manual en iPhone |
| RF-06 / AC-9 | tokens/hash | token incorrecto rechazado; con tablero cerrado rechazado | editar/borrar en mismo contexto; otro contexto no ve controles |
| RF-07 / AC-6 | — | ocultar/restaurar/borrar requieren adminKey válido | ocultar → desaparece; restaurar → vuelve |
| RF-08 / AC-7 | — | crear/editar/borrar/subir rechazados con tablero cerrado | cerrado → no hay formulario; reabrir |
| RF-10 | — | URL de descarga firmada | lightbox abre, navega con teclado, descarga |
| RF-13 / AC-2 | validación formato slug | slug inexistente → null; adminKey inválido → null | slug alterado 1 carácter → 404; admin con key mala → 404 |
| AC-3 | — | anon/publishable key no lee ninguna fila | — |
| AC-8 | — | — | headers `Referrer-Policy` y `X-Robots-Tag` + meta robots |
| Password creación | comparación | `createBoard` con/sin password configurada | — |

**Manual validation checklist** (en `TESTING.md`):
- Publicar desde un iPhone real una foto HEIC (AC-4) en < 10 s por 4G.
- Verificar con una herramienta EXIF que la foto descargada no tiene GPS.
- Lighthouse mobile del muro con 50 mensajes con foto: LCP < 2,5 s.
- Navegación solo con teclado por home, muro, formulario, lightbox y panel.

## Rollback notes
- Código: el trabajo vive en `feat/001-tablero-mensajes`; revertir = no mergear o revertir el
  merge commit en `develop`.
- Base: es un esquema nuevo en un proyecto dedicado; rollback = `drop table messages, boards`
  y vaciar/borrar el bucket `board-media`. No hay datos previos que preservar.
- Deploy (fuera de este flujo, requiere tu cuenta de Vercel): volver al deployment anterior
  desde Vercel.

## Prerrequisitos pendientes del usuario
- Agregar `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → secret key) en `.env`.
  Bloquea solo B3 y la prueba manual; A–E avanzan con Supabase local.
