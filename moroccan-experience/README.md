# Moroccan Experience — storefront, booking engine & AI assistant

A complete, production-shaped travel-operator site for **Moroccan Experience**, a Morocco-only
tailor-made tour operator. Server-rendered pages, a real pricing engine, a **Stripe** checkout for a
**25% deposit**, booking conditions / privacy policy / legal terms / sitemap, an **AI travel
assistant** with phone + WhatsApp hand-off, and a **back-to-top** control.

```
moroccan-experience/
├── server/
│   ├── index.js            Express app: routes, APIs, webhook, sitemap.xml, robots.txt
│   ├── config.js            brand, contact details, commercial terms (single source of truth)
│   ├── pricing.js           the ONLY place a number becomes money (pure, unit-tested)
│   ├── stripe.js            Stripe Checkout + webhook verification, with a safe demo mode
│   ├── store.js             booking persistence (atomic JSON, swap for Postgres easily)
│   ├── chat.js              AI assistant: retrieval + slot filling, optional LLM, guardrails
│   ├── render.js            layout, header/footer, dock, chat shell, image resolution
│   ├── content/             journeys, destinations, legal documents, marketing copy
│   └── views/               home, journeys, journey detail, groups, bespoke, book, legal…
├── public/assets/           css, js, imagery (no build step, no framework)
├── tests/                   27 tests: pricing rules, every route, the booking lifecycle
└── scripts/audit.js         content + wiring audit (`npm run audit:content`)
```

## Run it

```bash
cd moroccan-experience
npm install
npm start          # http://localhost:3000  (binds 0.0.0.0)
npm run dev        # auto-restart on change
npm test           # pricing + API/lifecycle tests
npm run audit:content
```

No build step: every page is rendered on the server from `server/content/*`, so the HTML a
crawler sees is the HTML a visitor sees.

## Prices, exactly as advertised

All of this is enforced by `server/pricing.js` and asserted by `npm test`:

| Product | Price | Notes |
| --- | --- | --- |
| **Luxury tours** | **from $6,000 per person / 7 days** | day rate `$6000/7`, tiered per journey; the engine floors luxury so nothing can undercut the headline |
| **Private tours** | from $3,200 pp / 7 days | private car, driver and licensed guide throughout |
| **Bespoke tours** | from $4,500 pp (indicative) | quoted line by line; zero design fee |
| **Group tours (10–30)** | **$2,000–$4,000 pp / 7 days** | $4,000 at 10 travellers, −$100 per extra traveller, floor $2,000 at 30; scales with nights |
| Group audiences | women-only · students/universities · seniors 60+ | one leader place free per ten full-paying travellers |

Commercial terms live in `config.commercial` and are printed wherever they matter:

- **Deposit 25%** of the trip total at booking, non-refundable but transferable
- **Balance 75%** due **60 days** before departure (book inside 60 days → full amount at booking)
- Cancellation ladder: 25% ≥90 days · 50% 60–89 · 75% 30–59 · 90% 14–29 · 100% ≤13 days
- No planning fee, no booking fee, no card surcharge

## Stripe (deposit payment)

1. `cp .env.example .env`
2. Set `STRIPE_SECRET_KEY` (`sk_test_…` to start) and `PUBLIC_URL`.
3. `npm start`, then in another terminal:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` and put the printed
   `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
4. Book a trip → the form redirects to Stripe's **hosted Checkout** showing only the deposit line
   ("25% deposit — <journey>") with the trip total, balance and date in the description.
5. `checkout.session.completed` moves the booking to `deposit_paid`; `checkout.session.expired`
   marks it expired. The webhook is verified with a raw body, mounted before the JSON parser.

**Security notes:** the amount charged is always recomputed on the server from the itinerary —
the browser sends inputs (party size, nights, month, extras), never a price. Card data never
touches this app: Stripe's hosted page collects it, we store only a session/payment intent id.
`GET /api/admin/bookings` requires `ADMIN_TOKEN` via `x-admin-token`.

**Without a key** the app runs in a clearly-labelled **DEMO mode**: a local confirmation page
completes the same state transitions and collects no card data at all. The demo route is hard-disabled
as soon as `STRIPE_SECRET_KEY` is present, so a deposit can never be "paid" without Stripe.

## The AI assistant (chat · phone · WhatsApp)

Bottom-right dock: **back-to-top** (with a scroll-progress ring), **WhatsApp**, **phone**, **chat**.

`server/chat.js` answers from this site's own data — 14 itineraries, the pricing engine, departure
dates, and the legal documents — with slot tracking across turns (party size, nights, month,
audience, feeling) and one useful action: it can hand the traveller a prefilled booking form.

- Group sizes, women-only/student/senior eligibility, deposit, cancellation and pricing questions
  come back with real numbers from the engine.
- It quotes only numbers it can find in its own sources; a validation pass rejects LLM output that
  invents a figure.
- Optional: set `OPENAI_API_KEY` (or `LLM_API_BASE`/`LLM_MODEL`) and the same knowledge base is
  passed to a model with a bounded system prompt; any failure falls back to the deterministic
  answer, so the widget works with no key and no network.
- Transcript lives in `localStorage`, with a visible "don't use my messages for training" opt-out.
- The header of the panel and the dock both surface `SITE_PHONE` and the WhatsApp deep link.

## Booking lifecycle

```
quote  ──▶  pending_payment  ──▶  deposit_paid  ──▶  (manual) balance_paid
   │              │
   └─ emailed quotation, nothing held   └─ expired ⇒ quote_expired
```

`/book/:slug` is a five-step form (journey & dates → travellers → experiences → details → pay) with a
live indicative quote, consent checkboxes for the Booking Conditions and Privacy Policy, per-journey
extras, insurance, and group rules enforced server-side. Confirmation and `/my-booking?ref=…`
show the reference, deposit status and balance due date. Records are appended to `data/bookings.json`.

## Legal pages

Written for this brand, not copied: **Booking Conditions** (13 sections incl. deposits, the
cancellation ladder, group terms, health & safety, complaints, liability), **Privacy Policy**
(11 sections incl. lawful basis, cookie table, transfers, the AI assistant and WhatsApp, retention,
rights) and **Legal Terms** (13 sections incl. indicative pricing, Stripe, IP, reviews, the AI
assistant, disclaimers). `/sitemap` (HTML), `/sitemap.xml` and `/robots.txt` are generated from the
route table, with `noindex` on transactional pages.

## Before launch, replace the placeholders

| Where | What |
| --- | --- |
| `.env` → `SITE_PHONE`, `SITE_WHATSAPP`, `SITE_EMAIL` | the demo numbers `+212 524 29 00 00` / `+212 661 23 45 67` |
| `server/config.js` | company name, licence `IM01070033`, VAT/ICE, office addresses, review counts |
| `server/content/legal.js` | have a solicitor review the three documents; add your insolvency protection/ATOL-equivalent wording |
| `public/assets/img/` | 10 photographs are AI-generated stand-ins; swap for licensed imagery. `render.js → IMG_ALIASES` maps four not-yet-shot slots to existing photos, and stops applying the moment a real file lands at that path |
| testimonials, press lines, awards | illustrative sample content, not real endorsements |

## Notes on the brief

*Layout inspiration* — full-bleed hero, "start with a feeling" finder, editorial journey cards with
per-person pricing, month-by-month "where to go when", press/awards strip, dark group band — with
**all copy, itineraries, imagery, pricing rules and legal text written from scratch for this brand**.
No text, image or asset from any other operator is reproduced.
