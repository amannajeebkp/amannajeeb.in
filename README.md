# NJ's Home — amannajeeb.in

Aman Najeeb's interactive card-deck portfolio: a from-scratch React recreation
inspired by hey.milo.gg (not affiliated). Typewriter slide deck, draggable
sticker board with sounds and speech bubbles, pan/zoom canvas, and a small
admin panel to edit everything live.

## Stack

- Vite + React 18 + TypeScript, Tailwind v4, framer-motion, @use-gesture
- Vercel serverless functions in `api/` (Node runtime)
- Upstash Redis (REST) as the content store

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (API routes need `vercel dev`)
npm run build      # typecheck + production build
```

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable                   | Required | What it does                                                        |
| -------------------------- | -------- | ------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | yes      | Upstash REST endpoint                                                |
| `UPSTASH_REDIS_REST_TOKEN` | yes      | Upstash REST token                                                   |
| `ADMIN_PASSWORD`           | yes      | Password for `/admin` and `?edit` mode. Never shipped to the browser |
| `RESEND_API_KEY`           | no       | If set with `CONTACT_TO`, contact-form messages are emailed to you   |
| `CONTACT_TO`               | no       | Address that receives contact-form emails                            |
| `CONTACT_FROM`             | no       | Sender for those emails (default `onboarding@resend.dev`)            |

Contact-form messages are always stored in Redis and visible under
**Admin → Inbox**, even without Resend.

## Editing content

- **`/admin`** — slides, hot takes, stickers, site settings (WhatsApp, LinkedIn,
  email, Calendly, meetup link), inbox. Every save is written to the cloud so
  visitors see it immediately.
- **`/?edit`** — place stickers directly on the live board (PC and Mobile
  layouts), replace images, add a message bubble / sound / link per sticker.
  Click **Save All Edits** to publish.

Leave the Calendly URL empty if you don't use Calendly; the Calendly sticker and
"Book a time" buttons then open the email form instead.

## API

| Route                        | Method     | Auth | Purpose                                 |
| ---------------------------- | ---------- | ---- | --------------------------------------- |
| `/api/content?key=…`         | GET / POST | POST | slides, hot_takes, settings, stickers   |
| `/api/stickers-data`         | GET / POST | POST | sticker layout (legacy alias)           |
| `/api/upload-sticker`        | POST / DEL | yes  | custom sticker images (stored in Redis) |
| `/api/sticker-image?id=`     | GET        | —    | serves a custom sticker image           |
| `/api/aura`                  | GET / POST | —    | the "+1 aura" counter                   |
| `/api/send`                  | POST       | —    | contact form                            |
| `/api/messages`              | GET        | yes  | contact-form inbox                      |
| `/api/track`                 | POST       | —    | lightweight event counters              |
| `/api/admin-login`           | POST       | yes  | verifies the admin password             |

"Auth" = request header `x-admin-auth: <ADMIN_PASSWORD>`.

## Project layout

```
api/                 serverless functions (shared helpers in api/_lib.ts)
public/stickers/     bundled sticker art        public/audio/  sound clips
src/App.tsx          canvas, deck, pan/zoom, ?edit toolbar
src/components/      SlideDeck, StickerLayer, Sticker, modals, intro
src/admin/           /admin panel + store.ts (local draft + cloud sync)
src/data/            bundled JSON fallbacks + loader.ts (draft → cloud → bundled)
```
