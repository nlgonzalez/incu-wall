# Guía de prueba — Tablero de mensajes

PRD: [`PRD.md`](./PRD.md) · Plan: [`PLAN.md`](./PLAN.md)

## Cómo levantarlo

### Opción A — contra Supabase local (igual que los tests)

```bash
pnpm install
pnpm db:start                       # Docker; aplica supabase/migrations
eval "$(supabase status -o env | grep -E '^(API_URL|SECRET_KEY|PUBLISHABLE_KEY)=')"
NEXT_PUBLIC_SUPABASE_URL=$API_URL SUPABASE_SECRET_KEY=$SECRET_KEY \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY ALLOW_LOCAL_IMAGE_IP=1 pnpm dev
```

Abrir http://localhost:3000.

### Opción B — contra el proyecto Supabase cloud

1. Completar `.env` según `.env.example`. `SUPABASE_SECRET_KEY` sale de Project Settings →
   API Keys → secret key).
2. Migración ya aplicada al proyecto cloud (2026-10-02, vía pooler IPv4 `aws-0-eu-west-1`). Para futuras migraciones:
   `supabase db push --db-url "postgresql://postgres.<project-ref>:<SUPABASEPASSWORD>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"` (la conexión directa requiere IPv6)
3. `pnpm build && pnpm start` (o `pnpm dev`).

> El `.next/` actual quedó compilado por los E2E apuntando a Supabase local. Volvé a correr
> `pnpm build` antes de usar el build contra el cloud.

Opcional: `BOARD_CREATION_PASSWORD=...` hace que la home pida una contraseña para crear tableros.

## Escenarios a probar

### Organizador
1. En `/` crear un tablero con título, homenajeado, bienvenida y portada → aparecen el link
   público y el de administración con botón **Copiar** (RF-01, RF-02).
2. Abrir el link de administración: estado, link público, cambio de portada y lista de mensajes.
3. **Ocultar** un mensaje → desaparece del muro público; **Restaurar** → vuelve (AC-6).
4. **Borrar** un mensaje (pide confirmación) → desaparece también del panel.
5. **Cerrar tablero** → en el muro no está "Dejar un mensaje", aparece "Este tablero ya no recibe
   mensajes" y los mensajes siguen visibles; los autores ya no ven Editar/Borrar (AC-7).
   **Reabrir** lo revierte.

### Participante (idealmente desde el celular)
1. Abrir el link público → muro (o "Sé la primera persona…" si está vacío).
2. **Dejar un mensaje**: nombre + texto y/o foto → **Ver cómo queda** → **Publicar** (RF-04).
3. Probar una foto **HEIC desde un iPhone** (AC-4) y medir que tarde < 10 s en 4G.
4. Validaciones: sin nombre, sin texto ni foto, más de 1.000 caracteres (contador en vivo).
5. En el mismo navegador aparecen **Editar** / **Borrar** en el propio mensaje; desde otro
   navegador o en modo incógnito no aparecen (RF-06).
6. Tocar una foto → lightbox con ←/→ (teclado y botones), **Descargar** y Esc para cerrar (RF-10).

### Acceso y privacidad
1. Cambiar un carácter del `boardId` en la URL → 404 genérico (AC-2, RF-13).
2. Panel con `key` incorrecta o sin `key` → mismo 404.
3. DevTools → Network: las páginas de tablero responden `Referrer-Policy: no-referrer` y
   `X-Robots-Tag: noindex, nofollow, noarchive`, y tienen `<meta name="robots" content="noindex, nofollow…">` (AC-8).
4. Descargar una foto publicada y revisarla con una herramienta de EXIF: sin GPS ni metadatos (AC-5).

### Checklist manual pendiente
- [ ] iPhone real: foto HEIC publicada y visible (AC-4), < 10 s en 4G.
- [ ] Lighthouse mobile del muro con 50 mensajes con foto: LCP < 2,5 s.
- [ ] Navegación solo con teclado por home, muro, diálogo, lightbox y panel.

## Resultados de validación automática (2026-10-02)

| Check | Resultado |
|---|---|
| `pnpm typecheck` | ✅ 0 errores |
| `pnpm lint` | ✅ 0 errores / 0 warnings |
| `pnpm test` (unit + integración, Supabase local) | ✅ 45/45 |
| `pnpm test:e2e` (Playwright, Pixel 7 + Desktop Chrome, build de producción) | ✅ 18/18 |
| `pnpm build` | ✅ |
| `pnpm audit` (sustituto provisorio, **no** reemplaza Snyk SCA) | ✅ sin vulnerabilidades conocidas |

### Trazabilidad requisito → test

| Req / AC | Tests |
|---|---|
| RF-01, RF-02, AC-1 | `integration/boards.test.ts` (hash, sin key en claro) · `e2e` crear tablero con portada |
| RF-03 | `integration/messages.test.ts` orden · `e2e` muro y orden |
| RF-04 | `unit/validation.test.ts` · `integration/messages.test.ts` · `e2e` validaciones y publicación |
| RF-05, AC-5 | `unit/jpeg.test.ts` · `integration` (EXIF rechazado, no-JPEG, > 10 MB, tipo) · `e2e` foto con GPS → descarga sin EXIF |
| AC-4 | `e2e` HEIC → 2000×1333 visible (Chromium) · manual iPhone pendiente |
| RF-06, AC-9 | `integration` token correcto/incorrecto/otro tablero · `e2e` mismo vs otro navegador |
| RF-07, AC-6 | `integration` moderación con/sin adminKey · `e2e` ocultar/restaurar |
| RF-08, AC-7 | `integration` cerrado rechaza crear/subir/editar/borrar · `e2e` formulario oculto, reabrir |
| RF-10 | `e2e` lightbox + descarga `Content-Disposition: attachment` |
| RF-13, AC-2 | `unit` formato · `integration` lookup · `e2e` 404 por slug alterado y key mala |
| AC-3 | `integration/rls.test.ts` (publishable key no lee tablas ni bucket) |
| AC-8 | `e2e` headers + meta robots/referrer |

## Escaneos de seguridad — NO ejecutados

| Escaneo | Estado | Motivo |
|---|---|---|
| Snyk Code (SAST) — `snyk_code_scan` | ❌ no corrió | El MCP de Snyk no está disponible en la sesión; el CLI `snyk` está instalado pero sin autenticar (`snyk auth` → `SNYK-0005 Authentication error`). |
| Snyk Open Source (SCA) — `snyk_sca_scan` | ❌ no corrió | Mismo motivo. |
| SonarQube — `bash run-sonar.sh` | ❌ no corrió | No existe `run-sonar.sh` en el repo ni `sonar-scanner` en el sistema. |

No se reportan como limpios. Para correrlos: `snyk auth` y después `snyk code test` y
`snyk test --all-projects`. Para SonarQube hace falta el servidor/token y un `run-sonar.sh`.

## Limitaciones conocidas / diferidos
- **Fuera de alcance (Could):** modo revelación (RF-09; la columna `reveal_at` existe), ZIP de
  fotos (RF-11) y modo presentación (RF-12).
- **Sin rate limiting** (decisión de Gate 1).
- **Fotos huérfanas:** si alguien sube una foto y no publica, el archivo queda en Storage
  (aceptado; limpieza manual).
- Las URLs firmadas vencen a la hora: con la página abierta más de 1 h, las fotos nuevas que se
  abran pueden fallar hasta recargar.
- Editar un mensaje permite cambiar nombre/texto y **quitar** la foto; para cambiar la foto hay que
  borrar y publicar de nuevo.
- El token de edición vive en `localStorage`: si el autor borra los datos del navegador, pierde
  la posibilidad de editar (el organizador puede moderar igual).
- En desktop el mosaico (CSS columns) ordena de arriba hacia abajo por columna.
