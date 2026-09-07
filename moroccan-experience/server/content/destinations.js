'use strict';

/** Destination pages — small, real, opinionated. */
const destinations = [
  {
    slug: 'marrakech',
    name: 'Marrakech',
    region: 'The red city & the Haouz plain',
    image: '/assets/img/marrakech-medina.jpg',
    bestTime: 'March to May, September to November',
    intro:
      'Marrakech is a city that asks something of you. It is loud at eleven at night and silent at seven in the morning, and the difference between those two hours is the whole trip. We keep guests in the Kasbah and Mouassine quarters, where the streets thin out and a riad door closes like a bank vault.',
    facts: [
      'Founded 1062 by the Almoravids; the Koutoubia minaret became the model for the Giralda in Seville.',
      'The medina is a UNESCO World Heritage site with roughly 9,000 listed buildings, most of them still lived in.',
      'Jemaa el-Fnaa is not a market: it is a nightly performance space, which is why its food stalls are licensed as an event.',
    ],
    whyUs: [
      'We walk the souk at 07:00 or 17:30 — the only two hours worth being in it',
      'Riads of six to fourteen rooms, never a hotel with a lobby queue',
      'A named conservator for anyone who wants to understand zellige rather than photograph it',
    ],
    journeys: ['morocco-in-full-private-grand-tour', 'starlight-sahara-private-luxury', 'marrakech-atlas-foothills'],
  },
  {
    slug: 'high-atlas',
    name: 'The High Atlas',
    region: 'Imlil, Ourika, Azzaden & Toubkal',
    image: '/assets/img/atlas-hike.jpg',
    bestTime: 'April to June, September to October',
    intro:
      'An hour from the airport you are in a different country: walnut terraces, mule tracks, villages with one shop and infinite time. We walk it rather than drive it, with a mule train and a cook, because the mountains are where Moroccan hospitality is least performative.',
    facts: [
      'Toubkal, at 4,167m, is the highest peak in North Africa and can be trekked without technical climbing.',
      'Amazigh (Berber) identity dominates here; many guests are surprised to find Arabic is a second language in the valleys.',
      'Argan trees grow only in south-west Morocco — roughly 700,000 hectares, UNESCO-listed as a biosphere reserve.',
    ],
    whyUs: [
      'Lodges owned and staffed by the families of the valley, not investment groups',
      'Mules instead of vehicles on four of eight days on our luxury trail',
      'A physiotherapist on call in Imlil and a doctor briefed before you arrive',
    ],
    journeys: ['high-atlas-private-lodge-trail', 'sisters-of-the-medina-and-dunes', 'university-field-lab-morocco'],
  },
  {
    slug: 'merzouga',
    name: 'The Sahara — Erg Chebbi & Chigaga',
    region: 'Tafilalt desert',
    image: '/assets/img/hero-home.jpg',
    bestTime: 'October to April; December and January for cold, clear, starlit nights',
    intro:
      'Two deserts, not one. Erg Chebbi near Merzouga is the famous one: 150-metre dunes, and camps that share a car park. Erg Chigaga is four hours further and empty — which is why we take people there, by 4x4 or camel, and why we have camp staff who have watched the same ridge for eleven years.',
    facts: [
      'Erg Chebbi dunes reach about 150m; the sand is fine enough that wind rewrites the ridge every night.',
      'Night temperatures drop from 30°C to near freezing between October and March — pack accordingly, we send a list.',
      'Nomadic Aït Atta herders still move camels through the erg; our camp team is drawn from these families.',
    ],
    whyUs: [
      'Our private camp moves location to follow the moon and avoid other guests entirely',
      'Solar power and pack-in, pack-out waste; no generator after 22:00, ever',
      'An astronomer, a Dobsonian telescope, and a real bed with a private terrace',
    ],
    journeys: ['starlight-sahara-private-luxury', 'dades-to-dunes-private-self-drive', 'desert-wellness-retreat-for-women'],
  },
  {
    slug: 'fes',
    name: 'Fes',
    region: 'Fes el-Bali & the Andalusian quarter',
    image: '/assets/img/fes-tannery.jpg',
    bestTime: 'March to May, October to November',
    intro:
      'The largest car-free urban area on earth, and the reason we hire guides who were born in the quarter they walk you through. Fes rewards curiosity: behind every unmarked door is a fountain, a madrasa, or a workshop that has made the same thing for five generations.',
    facts: [
      'Al-Qarawiyyin, founded in 859, is among the oldest continuously operating universities in the world.',
      'The Chouara tanneries work with saffron, henna, indigo and poppy — natural dyes, still hand-mixed.',
      'Fes medina has around 9,500 alleys; a phone map is genuinely useless in 40% of them.',
    ],
    whyUs: [
      'Two full nights minimum, because one night in Fes is a postcard and two is a city',
      'Workshop access where you can sit and make, at teaching rates for the masters',
      'Luggage porters on retainer — you never haul a case over cobbles',
    ],
    journeys: ['grand-imperial-luxury-circuit', 'imperial-cities-private-discovery', 'the-craft-residency'],
  },
  {
    slug: 'essaouira',
    name: 'Essaouira & the Windward Coast',
    region: 'Atlantic Morocco',
    image: '/assets/img/essaouira-coast.jpg',
    bestTime: 'April to October; June to September for surf',
    intro:
      'A walled port town of traders and musicians, where the Atlantic keeps the summer at 25°C and the wind keeps the sand off your lunch. Our default answer to “we want Morocco but not the heat”.',
    facts: [
      'Essaouira’s ramparts were built by an English engineer for Sultan Mohammed ben Abdallah in the 1760s.',
      'The town is a UNESCO site and a working port: you eat what the boats landed, often on the same street.',
      'Gnaoua music has its world festival here each June, drawing performers from Mali and Senegal.',
    ],
    whyUs: [
      'Private sloop sails out of the port at 09:00, to beaches with no road access',
      'Thuya-wood atelier visits with the families supplying the royal palaces',
      'Beach houses with staff, rather than resort blocks',
    ],
    journeys: ['atlantic-riads-private-sailing', 'slow-morocco-seniors-grand-journey', 'morocco-in-full-private-grand-tour'],
  },
  {
    slug: 'dades-valley',
    name: 'Dadès, Todra & the Valley of a Thousand Kasbahs',
    region: 'Southeastern Atlas',
    image: '/assets/img/kasbah-sunset.jpg',
    bestTime: 'March to May, September to November; May for the roses',
    intro:
      'The road south is the point: ochre fortresses, rose terraces, gorges 300 metres deep, and light that changes every twenty minutes. We time it so you arrive at Ait Ben Haddou when the film crews have gone home.',
    facts: [
      'Kasbahs are rammed earth and mud brick — rebuilt every generation, which is why some have 200-year-old beams.',
      'The Dades gorge walls are 500-million-year-old Ordovician limestone, folded and uplifted.',
      'The roses of Kelaat M’Gouna are distilled into attar within hours of picking, in May only.',
    ],
    whyUs: [
      'One long hour at each kasbah instead of a photo stop',
      'Berber family dinners cooked with the grandmothers of the valley, paid as chefs',
      'Two properties with pools facing the gorges, both booked by name and not by category',
    ],
    journeys: ['dades-to-dunes-private-self-drive', 'morocco-in-full-private-grand-tour', 'slow-morocco-seniors-grand-journey'],
  },
  {
    slug: 'chefchaouen',
    name: 'Chefchaouen & the Rif',
    region: 'Northern Morocco',
    image: '/assets/img/chefchaouen-blue.jpg',
    bestTime: 'April to October',
    intro:
      'The blue town is a cliché for a reason, and still better in person at 07:30 when the day-trip minibuses are asleep. Add two nights and you can walk to the Spanish mosque at dawn, then be back for breakfast.',
    facts: [
      'The blue wash dates from the arrival of Jewish refugees in the 15th century and continues as an annual communal duty.',
      'The Rif is Morocco’s kif country; the economy is complicated and we do not arrange anything illegal.',
      'Talassemtane National Park, an hour away, has the God’s Bridge rock arch and trout in the river.',
    ],
    whyUs: [
      'We stay two nights where others stop for lunch, which is the difference between a photo and a town',
      'Guides from the Rif who speak Tarifit as well as Arabic',
      'Mule paths into Talassemtane with a picnic, and no other walkers',
    ],
    journeys: ['grand-imperial-luxury-circuit', 'imperial-cities-private-discovery'],
  },
  {
    slug: 'rabat',
    name: 'Rabat, Salé & the Bou Regreg',
    region: 'The capital',
    image: '/assets/img/chefchaouen-blue.jpg',
    bestTime: 'All year; spring and autumn are perfect',
    intro:
      'Morocco’s capital is the one city that is calm, green, and almost empty of tourists — and it holds two of the country’s best museums plus the necropolis that made archaeologists fall in love with this coast.',
    facts: [
      'The Chellah necropolis is a Roman, Marinid and French-colonial layer cake set in a walled garden of storks.',
      'Rabat’s Andalusian gardens were created to house musicians expelled from Spain in the 17th century.',
      'The new Grand Theatre and the royal stables museum have made this a design pilgrimage as much as a historical one.',
    ],
    whyUs: [
      'Museum access with curators, including the archaeological reserve you cannot otherwise enter',
      'The Bou Regreg by private sailboat at sunset',
      'An hour of driving between airport and city, not three',
    ],
    journeys: ['grand-imperial-luxury-circuit', 'imperial-cities-private-discovery'],
  },
  {
    slug: 'casablanca',
    name: 'Casablanca',
    region: 'Atlantic plain',
    image: '/assets/img/essaouira-coast.jpg',
    bestTime: 'Any month; it is a working city, not a season',
    intro:
      'Everyone flies through it; few understand that the twentieth-century city is one of the world’s great Art Deco archives and that Hassan II is the only mosque in the Muslim world a non-Muslim may enter. Two hours here is well spent.',
    facts: [
      'Hassan II Mosque, completed 1993, has a retractable roof and a minaret 210m tall, and sits partly over the ocean.',
      'Casablanca’s central district has more uninterrupted Art Deco than most European cities.',
      'The old medina and the Habous quarter supply the city with crafts that the tour buses skip.',
    ],
    whyUs: [
      'A two-hour “deco and ocean” walk on arrivals day, no cost if you ask',
      'Entry to the mosque interior at golden hour, the only time the Atlantic light comes through the roof',
      'Our preferred table for seafood in the old port, booked under your name',
    ],
    journeys: ['grand-imperial-luxury-circuit'],
  },
];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthAdvice = [
  { m: 1, label: 'Desert and Atlas', note: 'Snow on the high passes, flawless desert nights. City breaks at their cheapest.' },
  { m: 2, label: 'Almond blossom', note: 'The Anti-Atlas goes white and pink. Fes in February is soft light and no queues.' },
  { m: 3, label: 'Best all-round', note: 'Everything open, everything green, and the souk at its most pleasant.' },
  { m: 4, label: 'Wildflowers', note: 'Atlantic coast at its best, High Atlas walking season begins.' },
  { m: 5, label: 'Roses', note: 'Kelaat M’Gouna harvest. Book the Dadès six months ahead.' },
  { m: 6, label: 'Coast first', note: 'Essaouira and Imsouane; the desert turns hot after lunch.' },
  { m: 7, label: 'Mountains or ocean', note: 'Marrakech hits 38°C. We reroute every July itinerary.' },
  { m: 8, label: 'Family month', note: 'Beach and altitude; riads hold family rates.' },
  { m: 9, label: 'Second spring', note: 'Warm sea, cool evenings, harvest in the argan valleys.' },
  { m: 10, label: 'Peak quality', note: 'The month most of our repeat guests ask for.' },
  { m: 11, label: 'Desert season opens', note: 'Long shadows, low crowds, best value of the shoulder.' },
  { m: 12, label: 'Christmas in the medina', note: 'Cold, clear, festive; our camps run at full capacity.' },
];

module.exports = { destinations, months, monthAdvice };
