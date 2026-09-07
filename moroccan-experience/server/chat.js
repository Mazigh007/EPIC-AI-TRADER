'use strict';

/**
 * The in-site AI travel assistant.
 *
 * Design: a deterministic retrieval + slot-filling agent that answers strictly
 * from this site's own data (journeys, live pricing engine, departure dates,
 * policies), so it never invents a price or a policy. When an LLM endpoint is
 * configured (OPENAI_API_KEY / LLM_API_BASE) the same knowledge base is handed
 * to the model as a bounded system prompt and its answer is validated against
 * the sources before being returned; if validation or the call fails, the
 * deterministic answer is used instead. It can also drive the UI: it returns an
 * action that pre-fills the booking form.
 */

const config = require('./config');
const pricing = require('./pricing');
const { journeys } = require('./content/journeys');
const { faqs, feelingsCopy } = require('./content/pages');
const { bookingConditions, privacyPolicy } = require('./content/legal');

const STOP = new Set(
  'a an the and or but if while is are was were be been being to of in on at by for with without about into over after before you your yours me my i we us our it its this that these those do does did done can could would should will shall may might must not no yes so as than then there here what when where which who whom whose how why i’m’'.split(
    /\s+/
  )
);

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9$' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (s) =>
  norm(s)
    .split(' ')
    .filter((t) => t.length > 2 && !STOP.has(t));

function scoreText(haystack, needleTokens) {
  if (!needleTokens.length) return 0;
  const hay = norm(haystack);
  let score = 0;
  for (const t of needleTokens) {
    if (hay.includes(t)) score += t.length > 5 ? 2.2 : 1.6;
  }
  const unique = new Set(needleTokens);
  return score / Math.sqrt(unique.size || 1);
}

/* --------------------------------------------------------------- knowledge */

function knowledgeBase() {
  const items = [];
  for (const j of journeys) {
    items.push({
      kind: 'journey',
      id: j.slug,
      title: j.title,
      text: [j.title, j.lead, j.summary, j.highlights.join('. '), j.itinerary.map((d) => d.title + ' ' + d.text).join('. ')].join(' '),
      meta: j,
    });
  }
  for (const f of faqs) items.push({ kind: 'faq', id: f.q, title: f.q, text: f.q + '. ' + f.a });
  for (const s of bookingConditions.sections) items.push({ kind: 'policy', id: s.id, title: s.heading, text: s.heading + '. ' + (s.paragraphs || []).join(' ') + ' ' + (s.list || []).join(' ') });
  for (const s of privacyPolicy.sections) items.push({ kind: 'privacy', id: s.id, title: s.heading, text: s.heading + '. ' + (s.paragraphs || []).join(' ') });
  for (const [k, v] of Object.entries(feelingsCopy)) items.push({ kind: 'feeling', id: k, title: k, text: v });
  return items;
}

let KB = null;
function kb() {
  if (!KB) KB = knowledgeBase();
  return KB;
}

function search(query, limit = 4) {
  const t = tokens(query);
  if (!t.length) return [];
  return kb()
    .map((item) => ({ item, s: scoreText(item.text, t) + scoreText(item.title, t) * 0.8 }))
    .filter((r) => r.s > 0.9)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => ({ ...r.item, score: Number(r.s.toFixed(2)) }));
}

/* ------------------------------------------------------------ entity parse */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const AUDIENCE_WORDS = {
  women: ['women', 'woman', 'female', 'ladies', "women's", 'girls', 'sisters'],
  students: ['student', 'students', 'university', 'college', 'school', 'cohort', 'academic', 'faculty', 'youth'],
  seniors: ['senior', 'seniors', 'retired', 'retirement', 'over 60', '60+', '65', '70', 'older', 'parents aged'],
};

function extractSlots(text, prev = {}) {
  const t = norm(text);
  const slots = { ...prev };

  // travellers / group size
  let m = t.match(/(\d{1,2})\s*(?:people|persons?|pax|travellers?|travellers?|guests?|of us|students|women|adults|seniors)/);
  if (m) slots.travellers = clampNum(+m[1], 1, 44);
  m = t.match(/(?:group|party)(?:\s+of)?\s+(\d{1,2})/);
  if (m) slots.travellers = clampNum(+m[1], 1, 44);
  const partyWord = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20, thirty: 30 };
  m = t.match(/(?:for|and|plus)\s+(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|thirty)\b|(?:the |just )?(?:us )?(two|three|four|five) of us\b|\b(solo|alone|just me|couple|the two of us)\b/);
  if (m) {
    if (m[3]) slots.travellers = /solo|alone|just me/.test(m[3]) ? 1 : 2;
    else slots.travellers = partyWord[m[1] || m[2]] || null;
  }

  // nights
  m = t.match(/(\d{1,2})\s*(?:nights?|days?)/);
  if (m) slots.nights = clampNum(+m[1], 3, 21);

  // month / season
  MONTHS.forEach((mo, i) => {
    if (t.includes(mo)) slots.month = i + 1;
  });
  if (/\bspring\b/.test(t)) slots.month = slots.month || 4;
  if (/\bsummer\b/.test(t)) slots.month = slots.month || 7;
  if (/\bautumn\b|\bfall\b/.test(t)) slots.month = slots.month || 10;
  if (/\bwinter\b/.test(t)) slots.month = slots.month || 12;

  // budget
  m = t.match(/(?:budget|spend|around|about|under|less than)\s*\$?\s?(\d{3,6})/);
  if (m) slots.budget = +m[1];

  // audience
  for (const [key, words] of Object.entries(AUDIENCE_WORDS)) {
    if (words.some((w) => new RegExp(`(^| )${w}( |$|s\\b)`).test(t))) slots.audience = key;
  }

  // parents / older relatives phrasing
  if (/(mother|father|mum|mom|dad|parent|grandmother|grandfather|nana|papa)\b/.test(t) && /\b(5[5-9]|[6-9][0-9])\b/.test(t)) slots.audience = 'seniors';
  if (/\bin (?:their|our) (?:60s|70s|80s)\b|\bretirement age\b|\baccessib|wheelchair|walking frame|slow pace\b/.test(t)) slots.audience = slots.audience || 'seniors';

  // journey by title words or slug
  let best = null;
  let bestScore = 0;
  for (const j of journeys) {
    const s = scoreText([j.title, j.slug.replace(/-/g, ' '), j.summary].join(' '), tokens(text));
    if (s > bestScore) {
      bestScore = s;
      best = j.slug;
    }
  }
  if (best && bestScore > 2.2) slots.journey = best;

  // feeling
  for (const f of config.feelings) {
    if (t.includes(f.label.toLowerCase()) || t.includes(f.key)) slots.feeling = f.key;
  }
  if (/\bquiet|alone time|unhurried|slow\b/.test(t)) slots.feeling = slots.feeling || 'solitude';
  if (/\bhike|trek|walk|climb|summit\b/.test(t)) slots.feeling = slots.feeling || 'adventure';
  if (/\bfood|cook|eat|tagine|market\b/.test(t)) slots.feeling = slots.feeling || 'taste';

  // intent signals
  if (/\bbook|reserve|secure|hold|deposit|pay\b/.test(t)) slots.wantsToBook = true;
  if (/\bwhatsapp|call|phone|speak|human|person|agent|designer|talk to\b/.test(t)) slots.wantsHuman = true;

  return slots;
}

const clampNum = (n, a, b) => Math.min(Math.max(n, a), b);

/* --------------------------------------------------------------- answering */

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function link(label, href) {
  return `[${label}](${href})`;
}

function recommend(slots) {
  let pool = journeys.slice();
  if (slots.audience) pool = pool.filter((j) => j.audience === slots.audience || j.type !== 'group');
  if (slots.audience && (slots.travellers || 0) >= 10) pool = journeys.filter((j) => j.audience === slots.audience && j.type === 'group');
  if (slots.feeling) pool = pool.filter((j) => j.feelings.includes(slots.feeling) || pool.length < 2);
  if (slots.nights) pool = pool.filter((j) => Math.abs(j.nights - slots.nights) <= 3 || pool.length < 2);
  if (!pool.length) pool = journeys.slice();
  return pool.slice(0, 3);
}

function quoteFor(journey, slots) {
  const isGroup = journey.type === 'group';
  const travellers = clampNum(slots.travellers || (isGroup ? 12 : 2), isGroup ? 10 : 1, isGroup ? 30 : journey.maxTravellers || 12);
  const nights = clampNum(slots.nights || journey.nights, journey.minNights || 3, journey.maxNights || 21);
  const q = pricing.quote(journey, { travellers, nights, month: slots.month || null, insurance: false, roomMode: 'shared' });
  return { q, travellers, nights };
}

const PHONE = config.contact.phoneDisplay;
const WA = `https://wa.me/${config.contact.whatsappNumber}`;

function greeting() {
  return {
    text: `Marhba — I'm the Moroccan Experience assistant. I can price a journey in seconds, explain the 25% deposit, check group sizes for a women-only, student or senior departure, or hand you to a human designer on ${PHONE}.
Try: “30 students for 9 nights in March, what does it cost?”`,
    chips: ['Price a luxury 7-day tour', 'Women-only group, October', 'How does the deposit work?'],
  };
}

function answerFor(message, slots) {
  const t = norm(message);
  const out = { text: '', chips: [], sources: [], action: null };

  // --- payment / deposit / cancellation policy -----------------------------
  if (/\b(deposit|pay|paid|payment|stripe|card|refund|cancel|cancell|invoice|balance|instalment|installment|fees?)\b/.test(t)) {
    const c = config.commercial;
    if (/cancel|refund/.test(t)) {
      const rows = c.cancellationSchedule
        .map((s) => `${s.to === null ? s.from + ' days or more' : s.to + ' to ' + s.from} before departure → ${s.charge}% of the trip total`)
        .join('\n');
      out.text = `Cancellation charges are a percentage of the trip total, and the ${c.depositPercent}% deposit is the first thing forfeited:\n\n${rows}\n\nIf you cancel ${c.balanceDueDaysBefore} days or more after paying the balance, we refund the difference inside 10 working days to the original card. Full terms: ${link(
        'Booking Conditions',
        '/booking-conditions'
      )} and ${link('Legal Terms', '/legal-terms')}.`;
      out.chips = ['Start a booking anyway', 'Do you recommend insurance?', 'What is not refundable?'];
      out.sources = ['policy:cancellations', 'policy:deposits'];
      return out;
    }
    if (/instal|install|plan|split/.test(t)) {
      out.text = `Standard terms: ${c.depositPercent}% deposit now, ${100 - c.depositPercent}% balance ${c.balanceDueDaysBefore} days before departure. Student and university groups can request a 12-month instalment plan, and any party may pay the deposit through one shared reference with a payment link per traveller — a designer sets that up. There is no card fee and no planning fee, ever.`;
      out.chips = ['Price my student group', 'Talk to a designer', 'Safeguarding paperwork'];
      out.sources = ['policy:deposits', 'policy:group-bookings'];
      return out;
    }
    out.text = `You pay a ${c.depositPercent}% deposit of the trip total to confirm — card, Apple Pay or Google Pay on Stripe's secure hosted checkout, or bank transfer. The remaining ${100 - c.depositPercent}% falls due ${c.balanceDueDaysBefore} days before departure. Booking inside ${c.balanceDueDaysBefore} days? The full amount is due at booking. No card details ever touch our servers: we get a token and a status. The deposit is non-refundable but transferable to another date, journey or traveller.`;
    out.chips = ['What does a luxury week cost?', 'Group pricing for 20', 'Start a booking'];
    out.sources = ['policy:deposits', 'policy:payment'];
    return out;
  }

  // --- prices --------------------------------------------------------------
  if (/\b(price|cost|how much|budget|cheap|expensive|quote|rate|per person)\b/.test(t) || slots.budget) {
    const picks = slots.journey ? [journeys.find((j) => j.slug === slots.journey)].filter(Boolean) : recommend(slots);
    const lines = picks.map((j) => {
      const { q, travellers, nights } = quoteFor(j, slots);
      return `• ${link(j.title, `/book/${j.slug}`)} — ${j.type}${j.audience ? ' for ' + j.audience : ''}, ${nights} nights, ${travellers} traveller${travellers === 1 ? '' : 's'}: **${fmt(q.perPersonTotal)} per person**, trip total ${fmt(q.total)}. Deposit today ${fmt(q.deposit)} (${config.commercial.depositPercent}%).`;
    });
    const whenNote = slots.month ? ' for ' + new Date(2026, slots.month - 1, 1).toLocaleString('en-US', { month: 'long' }) : '';
    const head = picks.length === 1 ? `Here is that one, priced on today's rates${whenNote}:` : `Indicative across the journeys that fit${whenNote}: your written quotation is what binds.`;
    out.text =
      `${head}\n\n${lines.join('\n')}\n\nHeadline bands: luxury from ${fmt(config.commercial.priceBands.luxury.from)} per person for 7 days; group departures ${fmt(
        config.commercial.priceBands.group.from
      )} to ${fmt(config.commercial.priceBands.group.to)} per person depending on party size (10–30); private from ${fmt(
        config.commercial.priceBands.private.from
      )}. International flights excluded, VAT and local taxes included.
Want the exact number? ${link('Open the booking form', '/book' + (picks[0] ? '/' + picks[0].slug : ''))} — it recalculates live and only ${config.commercial.depositPercent}% comes off today.`;
    out.chips = ['Lock that in', 'What is included?', 'Add insurance'];
    out.sources = picks.map((p) => 'journey:' + p.slug);
    if (picks[0]) out.action = { type: 'prefill_booking', journey: picks[0].slug, travellers: slots.travellers || null, nights: slots.nights || null, month: slots.month || null };
    return out;
  }

  // --- group eligibility ---------------------------------------------------
  if (slots.audience || /\b(women|woman|ladies|female|students?|university|universities|college|seniors?|retired|groups?|parties|solo|alone|chaperone|cohort)\b/.test(t)) {
    const audience = slots.audience;
    const pool = audience ? journeys.filter((j) => j.audience === audience && j.type === 'group') : journeys.filter((j) => j.type === 'group');
    const lines = pool
      .map((j) => {
        const { q, travellers } = quoteFor(j, { ...slots, travellers: slots.travellers || 12 });
        const sizes = j.groupSizes || [10, 30];
        return `• ${link(j.title, `/journeys/${j.slug}`)} — ${sizes[0]} to ${sizes[1]} travellers, ${j.nights} nights, ${fmt(q.perPersonTotal)}pp at ${travellers}. ${j.lead}`;
      })
      .join('\n');
    const c = config.commercial;
    out.text = `All group departures run with ${c.groupMinTravellers} to ${c.groupMaxTravellers} travellers, priced ${fmt(
      c.priceBands.group.to
    )} per person at ten and falling to ${fmt(c.priceBands.group.from)} at thirty for a seven-day journey — plus one leader free per ten full-paying travellers.\n\n${lines}\n\n${
      audience
        ? ''
        : 'Tell me who is travelling — women-only, a university cohort, or 60-plus — and I will narrow it to the right departure and the live per-person figure.'
    }`;
    out.chips = ['Women only', 'Student group', 'Seniors 60+', 'Price a group of 20'];
    out.sources = pool.map((p) => 'journey:' + p.slug);
    if (pool[0]) out.action = { type: 'prefill_booking', journey: pool[0].slug, travellers: slots.travellers || 12, nights: pool[0].nights };
    return out;
  }

  // --- itinerary / journey detail -----------------------------------------
  if (/\b(itinerary|day|route|where|visit|hotel|camp|riad|include|included|see|do|plan|schedule|guide|drive|weather|month)\b/.test(t)) {
    const j = (slots.journey && journeys.find((x) => x.slug === slots.journey)) || recommend(slots)[0];
    if (j) {
      const days = j.itinerary.slice(0, Math.min(4, j.itinerary.length)).map((d) => `Day ${d.day} — ${d.title}: ${d.text}`).join('\n');
      out.text = `${j.title} — ${j.nights} nights, ${j.pace}.\n\n${days}\n${j.itinerary.length > 4 ? `… and ${j.itinerary.length - 4} more days. ` : ''}
Includes: ${j.included[0]}; ${j.included[1] || 'all transfers in a private vehicle'}. Excludes: ${j.notIncluded[0].toLowerCase()}.
Best months: ${j.bestMonths.map((m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]).join(', ')}.${
        j.departures && j.departures.length ? ' Next departures: ' + j.departures.map((d) => d.date).join(', ') + '.' : ''
      }

Full itinerary and live pricing: ${link('open journey', '/journeys/' + j.slug)}.`;
      out.chips = ['Price this trip', 'What is excluded?', 'Change the itinerary'];
      out.sources = ['journey:' + j.slug];
      out.action = { type: 'prefill_booking', journey: j.slug, travellers: slots.travellers || null, nights: j.nights };
      return out;
    }
  }

  // --- contact / human ------------------------------------------------------
  if (slots.wantsHuman || /\b(whatsapp|phone|call|email|contact|human|speak|talk)\b/.test(t)) {
    out.text = `Three ways to reach a designer:
• Call ${PHONE} (Marrakech, Mon–Sat 08:00–20:00 CET; 24/7 while travelling)
• WhatsApp ${config.contact.whatsappDisplay}: [message us](${WA}?text=${encodeURIComponent('Hi — I have been chatting with your website assistant and would like to speak to a designer.')})
• Email ${config.contact.email}, answered inside one working day
${link('Or send the booking form', '/book')} and we will quote it properly.`;
    out.chips = ['Price my trip first', 'Opening hours', 'Office address'];
    return out;
  }

  if (/\b(visa|passport|entry|documents)\b/.test(t)) {
    out.text = `UK, EU, US, Canadian and Australian citizens need no visa for stays up to 90 days; your passport must be valid six months beyond your return date. If you do need one, we issue an invitation letter and documentation pack free once the deposit is paid. Full details: ${link('Booking Conditions §8', '/booking-conditions#your-responsibilities')}.`;
    out.chips = ['What happens on arrival?', 'Send me the pack', 'Book a trip'];
    return out;
  }

  if (/\b(safe|safety|security|solo woman|health|water|vaccine|doctor)\b/.test(t)) {
    out.text = `Our routes have run without incident for fifteen years and are assessed quarterly. Guides are Ministry-licensed, first-aid trained and salaried; vehicles are inspected annually. You get a 24-hour line answered in English, French, Arabic and Spanish, a named doctor on call in each city for senior and family departures, and we reroute rather than take a risk. Read ${link('health and safety, §9', '/booking-conditions#health-safety')}.`;
    out.chips = ['Do you reroute for weather?', 'Is tipping expected?', 'Talk to a designer'];
    return out;
  }

  if (/\b(pack|shoes|dress|modest|ramadan|alcohol|vegetarian|halal|allerg|gluten)\b/.test(t)) {
    out.text = `Practical: two long-sleeve layers for evenings and mosques, broken-in shoes for cobbles, a scarf for women visiting religious sites, and sunscreen at altitude. Alcohol is served in tourist riads and hotels but not in the medina. Vegetarian, vegan, halal and gluten-free are routine — tell us at booking and every kitchen on your route is briefed. Ramadan changes daytime rhythm; we design around it and it is beautiful if you know.`;
    out.chips = ['Send me the packing list', 'Best month to come?'];
    return out;
  }

  if (/\b(private|bespoke|custom|own itinerary|unique|off the beaten)\b/.test(t)) {
    const j = journeys.filter((x) => x.type === 'bespoke');
    out.text = `Private means you never share a car, table or guide with anyone — from ${fmt(
      config.commercial.priceBands.private.from
    )} pp for seven days. Bespoke means we build it from a blank page: ${j
      .map((x) => x.title)
      .join(' or ')} are two examples, from ${fmt(config.commercial.priceBands.bespoke.from)} pp indicative. Tell me the odd thing you want — a kiln, a wedding, a village, a recording session — and I will route it to a designer who has done it. ${link(
      'Bespoke page',
      '/bespoke'
    )}`;
    out.chips = ['Start a bespoke brief', 'What does bespoke cost?', 'Talk to a designer'];
    return out;
  }

  if (/\b(hi|hello|hey|salam|marhba|bonjour|hola|good morning|good evening)\b/.test(t) && t.length < 24) {
    return greeting();
  }

  // --- "we want to go …" browsing: recommend with real numbers ---------------
  if (/\b(trip|travel|journey|holiday|vacation|going|visit|recommend|suggest|idea|inspire|somewhere|someplace|place|show me|what can you do)\b/.test(t) && (slots.feeling || slots.month || slots.audience || slots.budget || slots.nights)) {
    const picks = recommend(slots);
    const lines = picks
      .map((j) => {
        const { q, travellers, nights } = quoteFor(j, slots);
        return `• ${link(j.title, '/journeys/' + j.slug)} — ${j.type}, ${nights} nights, ${travellers} traveller${travellers === 1 ? '' : 's'}: **${fmt(q.perPersonTotal)}pp**, deposit ${fmt(q.deposit)}. ${j.lead}`;
      })
      .join('\n');
    const whenLine = slots.month ? `In ${new Date(2026, slots.month - 1, 1).toLocaleString('en-US', { month: 'long' })} we would route you like this:` : 'Based on what you described:';
    out.text = `${whenLine}\n\n${lines}\n\nAny of these can be reshaped before you pay — tell me what to change, or ${link('open the booking form', '/book/' + picks[0].slug)} and a designer prices it properly.`;
    out.chips = ['Make it private for us', 'Shorter, 5 nights', 'Talk to a designer'];
    out.sources = picks.map((p2) => 'journey:' + p2.slug);
    out.action = { type: 'prefill_booking', journey: picks[0].slug, travellers: slots.travellers || null, nights: slots.nights || picks[0].nights, month: slots.month || null };
    return out;
  }

  // --- fallback: retrieval over everything ---------------------------------
  const hits = search(message, 3);
  if (hits.length) {
    const bullets = hits
      .map((h) => {
        const snippet = h.text.replace(/\[[^\]]+\]\([^)]+\)/g, '').slice(0, 260).trim();
        return `• ${h.title} — ${snippet}${snippet.length > 250 ? '…' : ''}`;
      })
      .join('\n');
    out.text = `From what we publish, this is the closest match:\n\n${bullets}\n\nIf that is not what you meant, ask me to price a trip, check a group size, or explain a policy — or ${link('call the desk', 'tel:' + config.contact.phoneHref.replace('tel:', ''))} on ${PHONE}.`;
    out.chips = ['Price a trip', 'Group sizes', 'Call the desk'];
    out.sources = hits.map((h) => `${h.kind}:${h.id}`);
    return out;
  }

  out.text = `I did not want to guess at that one. I can price any of our ${journeys.length} journeys in seconds, explain the ${config.commercial.depositPercent}% deposit and cancellation terms, or check whether a women-only, student or senior departure fits your party. If it is outside all of that, a human designer is faster: ${PHONE}, or ${link('WhatsApp', WA)}.`;
  out.chips = ['Show me all journeys', 'How much for 7 days?', 'Talk to a human'];
  return out;
}

/* ---------------------------------------------------------------- LLM mode */

function llmConfig() {
  const key = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  if (!key) return null;
  return {
    key,
    baseUrl: (process.env.LLM_API_BASE || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  };
}

function systemPrompt() {
  const facts = journeys
    .map((j) => {
      const { q } = quoteFor(j, { travellers: j.type === 'group' ? 12 : 2, nights: j.nights });
      return `- ${j.title} (${j.slug}) — ${j.type}${j.audience ? '/' + j.audience : ''}, ${j.nights} nights, indicative ${fmt(q.perPersonTotal)}pp, total ${fmt(q.total)}, deposit ${fmt(q.deposit)}. Highlights: ${j.highlights
        .slice(0, 3)
        .join('; ')}. Best months: ${j.bestMonths.join(',')}.`;
    })
    .join('\n');
  return `You are the online assistant for ${config.brand.name}, a Morocco-only tailor-made tour operator.
Answer only from the data below. Never invent a price, date, hotel or policy. Prices are indicative; the binding figure always comes from a written quotation. Keep answers under 120 words, plain English, no markdown headings, links allowed as [text](path). If unsure, say so and offer the phone desk (${PHONE}) or WhatsApp (${config.contact.whatsappDisplay}). Commercial terms: ${config.commercial.depositPercent}% deposit at booking, balance ${config.commercial.balanceDueDaysBefore} days before departure; groups of 10–30 travellers; luxury from ${fmt(
    config.commercial.priceBands.luxury.from
  )}pp/7 days; groups ${fmt(config.commercial.priceBands.group.from)}–${fmt(config.commercial.priceBands.group.to)}pp.
JOURNEYS:\n${facts}\nFAQS:\n${faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n')}`;
}

async function llmAnswer(message, history) {
  const cfg = llmConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.35,
        max_tokens: 420,
        messages: [
          { role: 'system', content: systemPrompt() },
          ...history.slice(-8).map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text || h.content || '' })),
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.warn('[chat] LLM unavailable, using deterministic answer:', err.message);
    return null;
  }
}

/** Guardrail: reject model output that quotes a number we never published. */
function passesNumberCheck(text) {
  if (!text) return false;
  const allowed = new Set();
  for (const j of journeys) {
    for (const s of [{}, { travellers: 10 }, { travellers: 30 }]) {
      try {
        const q = pricing.quote(j, { travellers: s.travellers || 2, nights: j.nights, month: null });
        [q.total, q.deposit, q.perPersonTotal, q.perPerson].forEach((v) => allowed.add(Math.round(v)));
      } catch (_) {}
    }
  }
  [config.commercial.priceBands.luxury.from, config.commercial.priceBands.private.from, config.commercial.priceBands.bespoke.from, config.commercial.priceBands.group.from, config.commercial.priceBands.group.to, 25, 75, 60, 90, 30, 50, 14, 13, 10, 24, 12, 21].forEach((v) => allowed.add(v));
  const nums = (text.match(/\$\s?[\d,]{3,}/g) || []).map((s) => +s.replace(/[^0-9]/g, ''));
  return nums.every((n) => allowed.has(n) || allowed.has(Math.round(n / 50) * 50));
}

async function respond({ message, history = [], slots: priorSlots = {} }) {
  const slots = extractSlots(message, priorSlots);
  const deterministic = answerFor(message, slots);

  const llm = await llmAnswer(message, history);
  if (llm && passesNumberCheck(llm)) {
    return { text: llm, chips: deterministic.chips, sources: deterministic.sources, action: deterministic.action, slots, engine: 'llm' };
  }
  return { ...deterministic, slots, engine: llm ? 'hybrid-fallback' : 'knowledge-base' };
}

module.exports = { respond, search, extractSlots, greeting, knowledgeBase, WA, PHONE };
