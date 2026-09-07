'use strict';

/**
 * Legal documents. Original drafting for this brand, structured as sections so
 * the pages, the printable PDF view and the chat agent can all read the same
 * source of truth. Nothing here is legal advice — a licensed Moroccan and
 * English solicitor should review before going live.
 */

const updated = '1 September 2026';

const bookingConditions = {
  slug: 'booking-conditions',
  title: 'Booking Conditions',
  subtitle: 'What happens when you book, what you pay, and what happens if plans change.',
  updated,
  intro:
    'These Booking Conditions apply to every itinerary sold by Moroccan Experience Voyages SARL, whether booked through this website, by email, by telephone or through a partner. They are the contract between you and us. Please read the deposit, payment and cancellation sections with particular care — they are the parts travellers most often ask us about afterwards.',
  sections: [
    {
      id: 'booking-process',
      heading: '1. How a booking becomes confirmed',
      paragraphs: [
        'Submitting an enquiry or a booking form is not, on its own, a confirmed booking. Nothing is held with suppliers until you have paid the deposit.',
        'On submission we price your request against live supplier rates and reply with a written itinerary and a single total price. That quotation is held for seven days, and any rooms or camps we can hold without charge we hold for you during that period.',
        'When you accept the quotation and pay the deposit, we issue a Booking Confirmation with a reference number, the final price, your dates and an Air Travel Organiser’s Protection-equivalent supplier payment schedule. The contract comes into existence at that moment and in that document.',
      ],
      list: [
        'Enquiry — free, no obligation, answered within one working day.',
        'Written quotation — priced line by line, held for 7 days.',
        'Deposit payment — 25% of the trip total, taken by card through Stripe or by bank transfer.',
        'Booking Confirmation — issued within 24 hours of cleared funds.',
        'Balance — 75%, due 60 days before departure, paid by the same method or by transfer.',
      ],
    },
    {
      id: 'deposits',
      heading: '2. Deposit and balance',
      paragraphs: [
        'A deposit of 25% of the trip total is payable when you accept a quotation. The deposit is non-refundable, but it is fully transferable: it can be moved to a new date, a different itinerary, or another named traveller, subject to supplier availability and any change fee the supplier charges us.',
        'The remaining 75% balance falls due 60 days before your departure date. If you book within 60 days of travel, the full trip total is payable at booking.',
        'We accept Visa, Mastercard, American Express, Apple Pay and Google Pay through Stripe. There is no card or booking fee added to the price you are quoted. Larger parties and student groups may request an instalment plan; we will agree it in writing.',
      ],
      table: {
        caption: 'Payment timeline',
        head: ['When', 'What is due', 'Amount'],
        rows: [
          ['On accepting a quotation', 'Deposit', '25% of trip total'],
          ['60 days before departure', 'Balance', '75% of trip total'],
          ['Booked within 60 days of departure', 'Deposit and balance together', '100% of trip total'],
          ['After departure', 'Nothing', '—'],
        ],
      },
    },
    {
      id: 'prices',
      heading: '3. Prices, what is included and what is not',
      paragraphs: [
        'Published prices are per person in US dollars, based on two travellers sharing a double or twin room, and are quoted inclusive of Moroccan VAT and local tourism taxes. They exclude international flights unless a journey description states otherwise.',
        'Our headline bands, restated here because they are the figures travellers quote back to us: luxury journeys from $6,000 per person for seven nights; private tours from $3,200 per person for seven nights; bespoke journeys quoted individually with an indicative starting point of $4,500 per person; and group departures for 10 to 30 travellers from $2,000 to $4,000 per person for a seven-night journey.',
        'Indicative starting prices on this website are calculated from the day rates in force at the time of publication and from a standard room configuration. The exact figure for your dates, party size and hotel selection always comes from your written quotation, and it is that figure that governs.',
        'We review our prices twice a year. After we issue a quotation, the price is fixed for that quotation’s validity period, except where a change you request, a new government tax, or a fuel or exchange-rate movement exceeding 2.5% requires an adjustment. We will tell you in writing within 48 hours of becoming aware of it, and you may accept or cancel with a full refund of everything paid to us.',
        'Anything bought locally — extra nights, a hammam you add on day four, a rug you cannot live without — is settled locally or, if you prefer, added to your account with 24 hours’ notice.',
      ],
    },
    {
      id: 'changes-by-you',
      heading: '4. Changes you request',
      paragraphs: [
        'You may change dates, itinerary or travellers at any time. Until 60 days before departure we charge no administration fee of our own; we pass on only what our suppliers charge, and we show you their written confirmation.',
        'Inside 60 days, changes are treated as a cancellation of the affected elements followed by a rebooking, so the cancellation charges below apply to what is dropped.',
        'Changing names on a booking is free of charge up to 45 days before departure for group bookings, and at any time for individual bookings provided travel documentation has not yet been issued. Passports must be valid for at least six months from the date you return.',
      ],
    },
    {
      id: 'cancellations',
      heading: '5. Cancellation by you',
      paragraphs: [
        'Cancellation must be notified in writing to bookings@moroccan-experience.com. The date we receive it is the date that counts. The charges below are calculated as a percentage of the trip total, and the non-refundable deposit is the first amount forfeited.',
        'Supplier commitments vary. Some camps, guides and small riads take full payment 90 or 120 days ahead regardless of this schedule; where that applies to your itinerary we will say so in the quotation and in the cancellation notice, and the actual loss may differ from the table.',
        'This is exactly why travel insurance with cancellation cover is not optional in our view. We will not process a booking without confirming you hold a policy, and we will send the certificate reference to your file.',
      ],
      table: {
        caption: 'Cancellation charges (percentage of trip total)',
        head: ['Notice given before departure', 'Charge', 'You lose'],
        rows: [
          ['90 days or more', '25%', 'The deposit only'],
          ['60 to 89 days', '50%', 'Deposit plus 25% of the balance'],
          ['30 to 59 days', '75%', 'The deposit and half the balance'],
          ['14 to 29 days', '90%', 'All but 10% of the trip total'],
          ['13 days or less, or no-show', '100%', 'Nothing is refundable'],
        ],
      },
    },
    {
      id: 'cancellations-by-us',
      heading: '6. Cancellation or change by us',
      paragraphs: [
        'We cancel journeys only rarely, and never because too few people booked. If we cannot run a departure for that reason, we will offer an alternative date, an equivalent itinerary, or a full refund of everything you have paid us, at your choice.',
        'If circumstances outside our reasonable control — extreme weather, border closure, civil disturbance, an airline cancelling the route, a public-health measure — force a change, we will relocate, reschedule or substitute services of equivalent or better standard wherever we can, and any cost we incur will be shared fairly and evidenced. Where a supplier refunds us, we refund you. We cannot refund money a supplier has genuinely kept, and we will show you their written confirmation of that.',
        'If you curtail a trip because you choose to leave early, we cannot refund services you do not use, because most of them have already been paid.',
      ],
    },
    {
      id: 'group-bookings',
      heading: '7. Additional terms for group bookings (10 to 30 travellers)',
      paragraphs: [
        'Group departures require a minimum of 10 travellers. The band published on each group journey — $2,000 to $4,000 per person for seven days — assumes 10 to 30 travellers sharing twin rooms; per-person price falls as the party grows, because coach, guide and leader costs spread further.',
        'One leader place travels free of charge for every ten full-paying travellers. Leader places are named up to 45 days before departure.',
        'Provisional names may be replaced by final names free of charge up to 45 days before departure. After that, changes are subject to supplier fees.',
        'The deposit for a group is 25% of the whole group total, payable in one transaction or, on request, by a series of transfers from contributing travellers against the same reference.',
        'For student, university and youth groups, the group leader or the institution accepts responsibility for conduct, curfew and safeguarding arrangements set out in the pre-departure pack.',
        'Single-sex group departures (women-only journeys) are reserved for travellers who identify as women. Where we identify a booking made in bad faith we may cancel it and refund it in full, because the trust of the other travellers is part of what they have bought.',
      ],
    },
    {
      id: 'your-responsibilities',
      heading: '8. Your responsibilities',
      paragraphs: [
        'You must tell us, at booking, about any medical condition, mobility requirement, dietary need, accessibility need or allergen that could affect the itinerary, the accommodation or the meals. We will pass it to suppliers and confirm what can be arranged; some requests cannot always be met in remote areas, and we will say so before you pay.',
        'You must hold a passport valid for six months beyond your return date, and obtain any visa required for your nationality. We provide an invitation letter and a documentation pack free of charge to anyone who has paid a deposit.',
        'You must take out and maintain travel insurance with medical, repatriation and cancellation cover for the full trip total, and carry evidence of it while travelling.',
        'You are responsible for behaving lawfully and respectfully, for following the reasonable instructions of the guide and driver, and for the acts of anyone travelling on your booking.',
      ],
    },
    {
      id: 'health-safety',
      heading: '9. Health, safety and on-trip support',
      paragraphs: [
        'Every journey is supported by a 24-hour line answered from Marrakech in English, French, Arabic and Spanish. The number is on your documents and in your app or booking confirmation.',
        'Guides are licensed by the Moroccan Ministry of Tourism, insured and trained in first aid; our mountain journeys additionally use qualified mountain leaders. Vehicles are inspected annually and drivers are re-trained every two years in defensive driving and desert recovery.',
        'We assess each route quarterly for safety, and we will change an itinerary rather than take a risk with you. Our advice on the FCDO and Moroccan authorities’ guidance is passed to you in writing before departure and during travel.',
      ],
    },
    {
      id: 'document-packs',
      heading: '10. Documents, arrival and what happens on the day',
      paragraphs: [
        'Twenty-one days before departure you receive your document pack: day-by-day plan, hotel and camp confirmations, guide names and photographs, driver and vehicle details, restaurant reservations, the packing list, and a printable emergency card.',
        'Our guides meet you inside the arrivals hall with a name board — not outside, not in the crowd. Airport pick-ups are timed to your flight, which we monitor; if you are delayed, the driver waits at no charge for up to 90 minutes on international arrivals.',
        'If anything on the trip is not as described, tell your guide immediately, then us in writing within 24 hours. We can usually fix a problem on the day; we cannot fix one you did not raise, and remedies are reduced if you give us no chance to act.',
      ],
    },
    {
      id: 'complaints',
      heading: '11. Complaints and how we respond',
      paragraphs: [
        'Complain to complaints@moroccan-experience.com with your booking reference. We acknowledge within one working day and give a substantive written response within 14 days.',
        'If we have not resolved it after 28 days, you may refer the matter to an alternative dispute resolution provider; we are members of a licensed Moroccan tour-operator association whose mediation scheme is available to you at no cost, and you also have the right to use the EU Online Dispute Resolution platform if you are an EU resident.',
        'Nothing in this section limits your statutory consumer rights.',
      ],
    },
    {
      id: 'force-majeure',
      heading: '12. Force majeure and limitation of liability',
      paragraphs: [
        'We act as agent for airlines, hotels, camps and local operators, whose services we arrange but do not provide. Where a supplier is at fault, we will pursue your claim with them and pass on every euro, dirham and dollar we recover, but we are not liable for a supplier’s failure beyond that.',
        'Our own liability for any claim arising out of a booking is limited to the trip total you have paid us, except for death or personal injury caused by our negligence, or fraud, where the law does not allow a limit.',
        'We are not liable for indirect losses — missed connections, lost earnings, a cancelled wedding photo shoot — caused by events outside our reasonable control.',
      ],
    },
    {
      id: 'law',
      heading: '13. Governing law',
      paragraphs: [
        'These conditions are governed by Moroccan law and, for travellers resident outside Morocco, are also enforceable in the courts of England and Wales. Any dispute will first be attempted in good-faith mediation.',
        'If one clause is found unenforceable, the rest of the conditions continue in force.',
      ],
    },
  ],
};

const privacyPolicy = {
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  subtitle: 'What we collect when you plan a trip with us, why we need it, who sees it, and how to make it leave.',
  updated,
  intro:
    'We hold your data because a tailor-made trip is made of personal detail: your passport, your allergies, your mobility needs, the name of the person you are travelling with. That is a responsibility, not a by-product. We do not sell it, we do not build advertising profiles from it, and we keep only what the next paragraph says we need.',
  rightsIntro:
    'You can ask us at any time for a copy of your data, for it to be corrected, for it to be deleted, or for the processing to be restricted. Email privacy@moroccan-experience.com; we respond within 30 days and usually within three working days.',
  sections: [
    {
      id: 'controller',
      heading: '1. Who is responsible',
      paragraphs: [
        'The data controller is Moroccan Experience Voyages SARL, registered in Marrakech, Morocco Ministry of Tourism licence IM01070033, with a UK correspondence address at 1st Floor, 18 Redchurch Street, London E2 7DP.',
        'Our data protection lead can be reached at privacy@moroccan-experience.com. For travellers in the EEA, UK or Switzerland, processing is carried out under the GDPR and the relevant national data-protection law; for travellers in Morocco it is additionally governed by Law 09-08 on the protection of natural persons with regard to the processing of personal data, supervised by the CNDP.',
      ],
    },
    {
      id: 'collect',
      heading: '2. What we collect',
      table: {
        head: ['Category', 'Examples', 'Why we need it'],
        rows: [
          ['Contact and account data', 'Name, email, phone, country of residence, preferred language', 'To answer you, quote, and send documents'],
          ['Trip data', 'Dates, party size, ages, itinerary choices, special requests', 'To design and deliver the journey'],
          ['Traveller documentation', 'Full name as in passport, date of birth, nationality, passport number and expiry, sometimes a photograph for visa or domestic flights', 'Supplier and government requirements; we cannot book without it'],
          ['Health and dietary information', 'Allergens, medication, mobility and access needs', 'Safety, and to make sure the right rooms are held — treated as special category data with your explicit consent'],
          ['Payment data', 'Name on card, billing address, the last four digits, and Stripe’s transaction reference', 'To take and refund the deposit'],
          ['Technical data', 'IP address, device and browser, pages viewed, referring site, and consent choices', 'Security, and to see which journeys are actually being read'],
          ['Communications', 'Emails, WhatsApp threads, chat transcripts and call recordings where you agreed to them', 'Continuity: so whoever answers knows your trip'],
        ],
      },
      paragraphs: [
        'We never collect card numbers, expiry dates or security codes. Payment is taken on Stripe’s hosted checkout, and what returns to us is a token, a reference and a status.',
        'We do not use your passport number for anything except the booking it was given for, and we delete the number itself 60 days after you return home, keeping only the confirmation that the booking was made.',
      ],
    },
    {
      id: 'lawful-basis',
      heading: '3. Lawful basis for processing',
      table: {
        head: ['Purpose', 'Lawful basis', 'Retention'],
        rows: [
          ['Answering an enquiry and preparing a quotation', 'Contract steps, at your request', '24 months from last contact'],
          ['Delivering your trip', 'Performance of the booking contract', '7 years'],
          ['Health and access requirements', 'Explicit consent, and substantial public-interest safety reasons', 'Duration of the trip, then summarised'],
          ['Taking payment', 'Contract and legal obligation', 'Transaction records 7 years'],
          ['Invoices, tax and anti-money-laundering checks', 'Legal obligation', '10 years'],
          ['Newsletter and offers', 'Consent, revocable in one click', 'Until you unsubscribe, then deleted in 30 days'],
          ['Improving the site, security and fraud prevention', 'Legitimate interest, balanced against your rights', '14 months for analytics, 24 months for security logs'],
        ],
      },
    },
    {
      id: 'sharing',
      heading: '4. Who we share it with',
      paragraphs: [
        'We share the minimum each supplier needs: a hotel receives names, dates, room type and allergies; an airline receives name and passport details; a guide receives your party list and the health notes they must act on. Nothing more, and never a marketing file.',
        'Our processors are: Stripe Payments Europe Ltd for card processing and payouts; our hosting and email providers in the EU; a cloud telephone and WhatsApp Business provider for communications records; and an analytics service with IP anonymisation enabled and no advertising features.',
        'We will disclose data to a public authority where Moroccan, UK or EU law requires it, and we will tell you unless we are prohibited from doing so.',
        'We do not sell personal data, and we do not share it with advertisers or data brokers.',
      ],
    },
    {
      id: 'transfers',
      heading: '5. International transfers',
      paragraphs: [
        'Your booking file is stored on servers in the European Union. Because your trip is delivered in Morocco, some data necessarily travels to Moroccan suppliers, who operate under Law 09-08 and are contractually bound to use it only for your trip. Transfers to Morocco rely on the European Commission’s adequacy decision for Morocco where applicable, and otherwise on Standard Contractual Clauses with a UK Addendum, supported by a transfer risk assessment we will send you on request.',
      ],
    },
    {
      id: 'cookies',
      heading: '6. Cookies and how we use them',
      table: {
        head: ['Cookie / storage', 'Type', 'What it does'],
        rows: [
          ['mx_session', 'Strictly necessary', 'Keeps your booking form and quote alive between pages'],
          ['mx_booking', 'Strictly necessary', 'Remembers the journey, dates and party size you were quoting'],
          ['mx_consent', 'Strictly necessary', 'Stores your cookie choices so we never ask twice'],
          ['mx_analytics', 'Analytics (opt-in)', 'Counts page views and journey enquiries, with IP truncated, no cross-site tracking'],
          ['mx_chat_history', 'Functional, local only', 'Keeps the conversation with our AI assistant in your browser; nothing is written to our servers from it'],
        ],
      },
      paragraphs: [
        'Analytics and any future personalisation are off until you accept them. You can change your mind from the Cookie Preferences link in the footer at any time, and the choice takes effect on the next page load.',
      ],
    },
    {
      id: 'chat',
      heading: '7. The AI travel assistant, phone and WhatsApp',
      paragraphs: [
        'The assistant in the chat bubble is an AI model with access to our published itinerary and pricing information. It answers from that knowledge base; when it cannot, it says so and offers to pass you to a human designer.',
        'If you do not want your message used to improve the model, say “no training data” in the chat or tick the box in the widget header, and your conversation is answered and then discarded within 24 hours. Transcripts used for training have names, emails, phone numbers and passport references removed first.',
        'WhatsApp is a Meta service. Where you write to us there, our threads are subject to Meta’s privacy policy as well as ours, and we ask you not to send card or passport details there; we will move that conversation to a secure form if you do.',
        'Calls to our Marrakech desk may be recorded where you consent at the start of the call, so that a designer who was not on the phone can pick up your file.',
      ],
    },
    {
      id: 'security',
      heading: '8. Security',
      paragraphs: [
        'TLS 1.3 everywhere, encryption at rest for booking files, single-sign-on with hardware keys for staff, least-privilege access, mandatory two-factor authentication, quarterly access reviews, and an annual external penetration test of the booking and payment flows.',
        'Passport images are held in an access-controlled store, opened only by the designer working on that booking, and every open is logged. If we suffer a breach affecting your data we will notify the supervisory authority within 72 hours and tell you without delay where there is a risk to you.',
      ],
    },
    {
      id: 'retention',
      heading: '9. Retention',
      paragraphs: [
        'Enquiries we never converted are deleted after 24 months. Completed bookings are kept for seven years for tax and liability purposes, with passport numbers removed after your return. Newsletter data is deleted within 30 days of unsubscribing, plus 12 months of suppression records so we do not write to you again by mistake.',
        'Photographs taken by us on a trip are used only where you have consented, and are removed on request even after publication.',
      ],
    },
    {
      id: 'children',
      heading: '10. Children and student groups',
      paragraphs: [
        'We do not market to children. For family and student bookings we hold the details of under-18s that the suppliers legally require, with consent from an accompanying adult or the institution. Student group leaders receive a data-handling briefing before we send them a party list.',
      ],
    },
    {
      id: 'rights',
      heading: '11. Your rights',
      list: [
        'Access — a copy of what we hold, free, within 30 days.',
        'Rectification — correct anything wrong, including a spelling of a name that will not match a passport.',
        'Erasure — where we have no legal reason to keep it; we will tell you if we do and why.',
        'Restriction and objection — pause or contest processing while we check your case.',
        'Portability — a machine-readable export of your trip data.',
        'Withdraw consent — for marketing, cookies, recording or training data, at any time.',
        'Complain — to our data protection lead first, then to the CNDP in Morocco, the ICO in the UK, or your EU supervisory authority.',
      ],
    },
  ],
};

const legalTerms = {
  slug: 'legal-terms',
  title: 'Legal Terms',
  subtitle: 'The terms of this website, the prices shown on it, and what you may and may not do with our material.',
  updated,
  intro:
    'These Legal Terms govern your use of moroccan-experience.com and the services we provide through it. They sit alongside the Booking Conditions, which govern the trip itself. If you are booking on behalf of an organisation, you confirm you have authority to bind it.',
  sections: [
    {
      id: 'about-us',
      heading: '1. Who we are',
      paragraphs: [
        'Moroccan Experience Voyages SARL, a Moroccan limited liability company, registered in Marrakech, holding tour-operator licence IM01070033 issued by the Moroccan Ministry of Tourism. VAT registration and financial details are printed on every invoice.',
        'Payments are processed by Stripe. We are not a bank and do not hold your card data at any point.',
      ],
    },
    {
      id: 'use-of-site',
      heading: '2. Using this site',
      paragraphs: [
        'You may use this website to plan and book a journey, to download a quotation and to read our material for your own non-commercial purposes.',
        'You may not scrape, bulk-download or mirror the itineraries, prices, photography or text; systematically extract the itinerary or supplier database; use our name, marks or photography in your own marketing without a written licence; or attempt to interfere with the booking or payment systems, including by submitting fraudulent bookings or testing card details.',
        'You must provide accurate information when you book, including the legal names of all travellers as they appear on their passports.',
      ],
    },
    {
      id: 'prices-availability',
      heading: '3. Prices, availability and indicative figures',
      paragraphs: [
        'Prices shown as “from” — including the headline bands of $6,000 per person for a seven-day luxury tour and $2,000 to $4,000 per person for group departures — are indicative starting points calculated on standard assumptions published with each journey. They are not a quotation and not an offer.',
        'The binding price for your trip is the one in your written quotation and Booking Confirmation. Because we buy room-by-room and season-by-season, two parties travelling the same route in different months can legitimately pay different amounts.',
        'Availability is not held by the website. A journey page showing an open departure date means we believe we can build it, not that inventory is reserved in your name — only the paid deposit does that.',
        'Taxes, service charges and any local tourist levy applicable at the time of travel are included in our quoted trip total; international airfare is not unless expressly stated.',
      ],
    },
    {
      id: 'payment',
      heading: '4. Payment through Stripe',
      paragraphs: [
        'When you proceed to payment, you are transferring to Stripe’s hosted checkout. Our deposit policy — 25% of the trip total at booking, with the balance 60 days before departure — is enforced there, and the amount charged is calculated on our servers from your itinerary, never from data supplied by your browser.',
        'Authorisation of the deposit is confirmation of your intention to contract; the contract itself forms when we issue the Booking Confirmation. Charges are in US dollars; your bank may apply its own currency conversion.',
        'If a deposit is declined, reversed or charged back without a genuine dispute, we may cancel provisional holds with suppliers. Refunds are made to the original payment method wherever the card is still valid, and are processed within 10 working days of the amount being agreed.',
      ],
    },
    {
      id: 'intellectual-property',
      heading: '5. Intellectual property',
      paragraphs: [
        'The itinerary designs, wording, photographs, videography, brand marks and the software behind the booking and quotation tools belong to us or are licensed to us. You receive a personal, non-exclusive, non-transferable licence to view the site and to print your own quotation and documents.',
        'Your own material — the requests, ideas and the photographs you upload to us — remains yours. By sending it to us you grant us permission to use it internally to build your trip, and to share it with the suppliers who deliver it.',
        'Where we publish a guest photograph, we credit it and ask first. Remove it from the site on request, at any time.',
      ],
    },
    {
      id: 'reviews',
      heading: '6. Reviews and testimonials',
      paragraphs: [
        'We only publish reviews from travellers we can match to a completed booking, and we ask them for written permission before publication. Reviews are published with the traveller’s first name and country, and are not edited beyond correcting obvious spelling.',
        'We do not pay for reviews, remove them for being critical, or allow suppliers to write them. If you believe a review breaches these standards, tell us and we will investigate within five working days.',
      ],
    },
    {
      id: 'ai-assistant',
      heading: '7. The AI travel assistant',
      paragraphs: [
        'Our chat assistant is an AI system with access to published itinerary, pricing, policy and destination information. It is designed to be useful, and to hand over to a human when it is not certain.',
        'It is not a source of legal, medical, visa or safety instruction. Figures it quotes are indicative and are superseded by your written quotation. You should confirm anything material with a designer.',
        'Do not submit sensitive personal data to the assistant. Use the booking form for that, and see the Privacy Policy for how we treat it.',
        'We do not accept liability for decisions taken in reliance on the assistant’s output where we have acted reasonably in providing it; that does not exclude liability for our own negligence in how the service operates.',
      ],
    },
    {
      id: 'third-parties',
      heading: '8. Third-party links and services',
      paragraphs: [
        'Pages here link to airlines, hotels, museums, visa portals and payment services. We do not control them, we are not responsible for their content or their terms, and a link is not an endorsement.',
        'Where we arrange an air ticket on your behalf we do so as your agent, in accordance with the carrier’s conditions of carriage, and you deal with the carrier for anything relating to the ticket.',
      ],
    },
    {
      id: 'responsibility',
      heading: '9. Disclaimers and liability',
      paragraphs: [
        'The website is provided on an “as is” basis. We use reasonable care to keep it accurate and available, but we do not warrant that it will be uninterrupted, error-free, or free of harmful components.',
        'Our liability in connection with a booking is limited as set out in the Booking Conditions. Nothing here excludes or limits liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for anything else that cannot lawfully be excluded.',
      ],
    },
    {
      id: 'responsibility-visitor',
      heading: '10. Your responsibilities to us',
      paragraphs: [
        'You agree to use the booking form honestly, to give accurate traveller information, to arrive with valid travel documents, and to be insured for the duration of the trip.',
        'You agree not to hold a supplier responsible for our failings or vice versa in any public statement that is not true — and to tell us about a problem before posting about it, because in almost every case it can be fixed in the hour.',
      ],
    },
    {
      id: 'data',
      heading: '11. Data protection',
      paragraphs: ['Our Privacy Policy sets out how we handle personal data, and forms part of these terms.'],
    },
    {
      id: 'changes',
      heading: '12. Changes to these terms',
      paragraphs: [
        'We may update these terms; the version published on the day you place your deposit is the version that applies to that booking, unless we notify you of a change you accept. Material changes to the Booking Conditions are notified to anyone with an existing booking before their next payment falls due.',
      ],
    },
    {
      id: 'severability',
      heading: '13. General',
      paragraphs: [
        'If any provision is unenforceable, the remainder continues. Our failure to insist on a term is not a waiver of it. These terms are governed by Moroccan law, and the courts of Morocco and of England and Wales have jurisdiction, at your option if you are resident outside Morocco. This page was last revised on ' + updated + '.',
      ],
    },
  ],
};

module.exports = { bookingConditions, privacyPolicy, legalTerms, updated };
