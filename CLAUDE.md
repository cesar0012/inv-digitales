# Invitaciones Modernas — Generator (inv-digitales)

Read this before changing anything. It is the shared context for every Claude Code session in this repo.

## What this app is

The design engine and invitation host of Invitaciones Modernas, a SaaS for digital quinceañera and wedding invitations (Spanish first, English later). It owns: the certified module library, invitation creation, the editor, and the public invitation pages (`/i/:slug`).

It is one of three apps. Keep each one to its job:

| App | Owns | Does not own |
| --- | --- | --- |
| Laravel API (`api-invitaciones-modernas`) | Users, plans and limits, payments (Stripe), licenses, guests, RSVP, messaging (Twilio), expiration | Invitation design |
| Next.js dashboard (`frontend-invitaciones-modernas`) | Customer login, plans, checkout, guest and RSVP screens | Invitation design |
| **This generator** | Module library, creation, editor, published invitation pages | Users, plans, payments, guests |

The dashboard opens the editor with a one-time SSO code issued by Laravel (`/issue` → `/sso/consume`). Laravel reads generator data through `/api/service/users` with `API_SERVICE_TOKEN`.

Known duplication to remove over time: this app still keeps its own users, admins, plans and credits (`user_plans`, `plan_config`). Plan limits should come from Laravel; do not add new plan logic here.

## How an invitation is created (the 7-step flow)

1. **Event selection** — `GET /api/event-types`.
2. **Event knowledge ("RAG")** — `server/eventKnowledge/packs/<event>.json`: fields, repeatable people (parents, padrinos, damas, chambelanes), places, itinerary, gifts, the module plan (`modules[].when`) and copy for adapting generic modules. `_base.json` holds shared sections.
3. **Dynamic data** — the client form (`components/wizard/`) is generated from the pack; repeat groups have no fixed limit. Server validation: `validateEventData`.
4. **Module selection** — `server/composer/library.js` indexes `modulos-1/sets-fotos/set-*` as designs (DB rows `sf-<key>-<type>` in `knowledge_base_modules` override files; inactive rows remove a module). `library-config.json` blocks sets and sets event affinity.
5. **Graphics** — on create, `resolvePlaceholders` sends `memory_source="generated"` images to Nano Banana and `library` images to `/img/<event>`; then `compileAllImagesToBase64`.
6. **Content** — `server/composer/fill.js` writes data into module slots. It clones repeated units when there are more people than slots and renumbers `memory_key`.
7. **Composition** — `server/composer/compose.js` assembles one noindex HTML with editor metadata.

Routes are in `server/composeRoutes.js`. `/api/compose/preview` is free (no AI, no credit); `/api/compose/create` costs one generation credit (charged atomically, refunded on error). Places (`ubicaciones`) are capped at 4 because each one adds an AI background. Weddings and "otro" use AI images only (library photos show specific people).

The old free-text generator (`/api/generate-html`, `agentOrchestrator.js`) is still reachable with `?modo=clasico`. Do not extend it; new work goes into the composition flow.

## Rules that must not be broken

- **The AI never writes invitation structure.** No free-form HTML generation for customers. If a module type is missing from a design, skip it and report it.
- **Module contract.** Each module is one `<section>` with `data-gemini-id`, and editable elements carry `memory_type` (`text|background|image`), `memory_usage` (`custom|protected`), `memory_source` (`generated|library`) and `memory_key`. Metadata lives in `moduleMetadata` (`tags`, `descripcion` ≤ 250 chars, `tipo`). Do not rename these attributes.
- **No placeholders in published invitations.** "Nombre Apellido", "Fecha del evento", sample CLABE or `wa.me/521000…` links must never ship. `fill.js#scanPlaceholders` reports them; keep it green.
- **No licensed characters** (Disney, Marvel, Pokémon…). `set-47-cenicienta` is blocked; the theme map in `services/nanoBananaService.ts` still needs cleaning.
- **Personal data.** Guest lists include minors. Never log names, phones, emails, tokens or codes. Never put personal data in URLs.
- **Customer HTML is untrusted.** Serve invitation HTML only through `sendInvitationHtml` (CSP `sandbox`, noindex). Never serve it from `/storage`, never render it same-origin in the admin (use `openCatalogoFile`). Only starred catalog items are public; other historico files need an admin session.
- **Security helpers.** Use `server/security.js`: `isSafeFilename`/`resolveInside` for every path built from a request, `hashPassword`/`verifyPassword` for passwords, `safeEqual` for secrets, `rateLimit` for login-style routes.

## Commands

```bash
npm install                 # PUPPETEER_SKIP_DOWNLOAD=1 if no Chromium download is possible
npm run dev                 # Vite client + Express server
node test/compose.test.mjs  # composes every design for quinceañera and boda; must pass
npx vite build              # client build
npx tsc --noEmit            # 23 errors pre-exist (AdminModels, EditorSidebar…); do not add new ones
node scripts/check-unsafe-filenames.mjs server/storage   # before deploys: stored names the server now rejects
```

The composition test fails on any sample text left in a published module (`scanPlaceholders`), lost gift data, dead "Cómo llegar" buttons or duplicate `memory_key`. When a new set is added to the library, run it and extend the matchers in `fill.js` instead of loosening the test.

Environment variables are documented in `.env.example`. Required in production: `EDITOR_HMAC_SECRET`, `API_SERVICE_TOKEN`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` (first admin only). `TRUST_PROXY` defaults to 1 hop in production (Coolify/Traefik) so rate limits see real client IPs.

## Decisions pending with the owner (do not decide them in code)

Expiration after the event (documents say 1 week, 15 days or 1 month; Laravel does about 2 months then deletes), the Catalog plan's 100-guest limit, iterations per concept vs per invitation, pay-first vs design-first, reactivation durations, the free plan, domain layout (`digital.` vs `app./api./generador.`), Spanish-only launch.

## Working style

- UI copy is Spanish (Mexico). Code comments may be English or Spanish.
- Small commits with clear messages; run `node test/compose.test.mjs` before committing composer changes.
- `dist/` is committed but the Dockerfile rebuilds it; do not commit build output with feature changes.
