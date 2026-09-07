# EPIC-AI-TRADER

CRAFTING SELF TRADING AI AGENT

## In this repository: `moroccan-experience/`

A complete luxury travel-operator storefront — **Moroccan Experience** — with private, luxury,
bespoke and group (women-only / students / seniors, 10–30 travellers) journeys, a real pricing
engine, **Stripe** checkout taking a **25% deposit**, booking conditions, privacy policy, legal
terms, an HTML + XML sitemap, an on-site **AI travel assistant** with phone and WhatsApp hand-off,
and a back-to-top control.

```bash
cd moroccan-experience
npm install
npm start                 # http://localhost:3000
npm test                  # 27 tests: pricing rules, every route, the payment lifecycle
npm run audit:content     # content, links, images, CSS coverage, assistant answers
```

Runs with no external services. Add a `STRIPE_SECRET_KEY` to switch the deposit checkout from
labelled demo mode to live Stripe; details in `moroccan-experience/README.md`.
