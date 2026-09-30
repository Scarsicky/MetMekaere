import type { Block, CmsPage } from '@/types';

/**
 * De startinhoud van de site.
 *
 * Dit bestand doet twee dingen tegelijk, met opzet:
 *  1. het is wat `npm run seed` naar Firestore schrijft;
 *  2. het is waar een pagina op terugvalt als Firestore (nog) leeg is.
 *
 * Zo staat de tekst op één plek, werkt de site meteen na het uitchecken, en
 * is alles wat hier staat daarna gewoon in de admin te bewerken. Wat de admin
 * wijzigt komt in Firestore te staan en wint vanaf dat moment.
 */

const homeBlocks: Block[] = [
  {
    type: 'hero',
    title: 'Veur wat meer aandacht veur mekaere',
    subtitle: 'Samen verbinden',
    body:
      'We kunnen elkaar de hele dag bereiken. Een appje is zo gestuurd, een duimpje zo gegeven. ' +
      'En toch geloof ik dat we juist behoefte hebben aan iets wat niet snel en vluchtig is.\n\n' +
      'Een kaart die onverwacht op de mat valt. Een gesprek met iemand die je anders misschien nooit ' +
      'had gesproken. Samen iets maken, eten, luisteren of beleven.',
    align: 'center',
    ctas: [
      { label: 'Naar de webshop', href: '/webshop', variant: 'primary' },
      { label: 'Wat is Met Mekaere?', href: '/over', variant: 'secondary' },
    ],
  },
  {
    type: 'cards',
    title: 'Wat je hier vindt',
    columns: 4,
    items: [
      {
        title: 'Webshop',
        icon: '💌',
        body: 'Kaarten om te sturen en kleine dingen om weg te geven. Hoe meer je er stuurt, hoe voordeliger.',
        href: '/webshop',
      },
      {
        title: 'Fluffy Dialect',
        icon: '🗣️',
        body: 'De mooiste woorden van hier, verzameld en uitgelegd. Sommige staan op een kaart.',
        href: '/fluffy-dialect',
      },
      {
        title: 'Community',
        icon: '🤝',
        body: 'Een paar keer per jaar iets bijzonders doen, met mensen die je anders niet zou ontmoeten.',
        href: '/community',
      },
      {
        title: 'Doen en Beleven',
        icon: '📍',
        body: 'Wat er te doen is dichtbij huis. Soms creatief, soms buiten, soms gewoon lekker gek.',
        href: '/doen-en-beleven',
      },
    ],
  },
  {
    type: 'products',
    source: 'featured',
    title: 'Om te sturen',
    intro: 'Echte post op de mat doet iets wat een appje niet doet.',
    limit: 4,
    cta: { label: 'Alle kaarten', href: '/webshop' },
  },
  {
    type: 'quote',
    text:
      'Als iemand door een kaartje even aan een ander denkt, dan gebeurt precies wat ik ermee hoopte te bereiken.',
  },
  { type: 'dialect', title: 'Woorden van hier', limit: 3 },
  { type: 'activities', title: 'Te doen en te beleven', limit: 3 },
  {
    type: 'cta',
    title: 'Zin om af en toe iets bijzonders te doen?',
    body:
      'De Met Mekaere Community is voor iedereen die nieuwe mensen wil ontmoeten en houdt van dingen ' +
      'die je niet zomaar in je agenda zet.',
    button: { label: 'Over de Community', href: '/community' },
    tone: 'brand',
  },
];

const overBlocks: Block[] = [
  {
    type: 'hero',
    title: 'Gewoon wat meer aandacht voor mekaere',
    align: 'center',
    body:
      'We kunnen elkaar de hele dag bereiken. Een appje is zo gestuurd, een duimpje zo gegeven. ' +
      'En toch geloof ik dat we juist behoefte hebben aan iets wat niet snel en vluchtig is.',
  },
  {
    type: 'text',
    body:
      'Een kaart die onverwacht op de mat valt. Een gesprek met iemand die je anders misschien nooit ' +
      'had gesproken. Samen iets maken, eten, luisteren of beleven.\n\n' +
      'Niet ingewikkeld. Gewoon wat meer aandacht voor mekaere.\n\n' +
      'Vanuit die gedachte ontstond Met Mekaere.',
  },
  {
    type: 'text',
    title: 'Het begon in 2025',
    body:
      'Met Mekaere begon in 2025 met de Dorpse Adventskalender. Het idee was simpel: de decembermaand ' +
      'vullen met kleine, lokale activiteiten waar mensen elkaar konden ontmoeten. En dat lukte.\n\n' +
      'Ondernemers, verenigingen, organisaties en inwoners uit de dorpen deden mee en samen vulden we ' +
      'de kalender met allerlei verschillende activiteiten. Van samen iets maken tot muziek, bewegen, ' +
      'koffiedrinken en gewoon even ergens binnenlopen.\n\n' +
      'Voor mij liet die eerste kalender precies zien waar Met Mekaere over gaat: er gebeurt ontzettend ' +
      'veel moois dichtbij huis. Soms is er alleen iemand nodig die de lijntjes bij elkaar brengt.\n\n' +
      'En daar wilde ik meer mee doen.',
  },
  {
    type: 'text',
    title: 'Van kaarten tot samen iets beleven',
    body:
      'Ik hou van dingen die persoonlijk zijn. Van echte post op de mat. Van onze streektaal. Van lokale ' +
      'verhalen. En vooral van ideeën waardoor mensen elkaar op een onverwachte manier tegenkomen.\n\n' +
      'Daarom groeit Met Mekaere verder.\n\n' +
      'Met kaarten die je naar iemand kunt sturen. Met aandacht voor het dialect van hier. Met ' +
      'activiteiten waar je misschien alleen binnenkomt, maar niet alleen weer naar buiten hoeft te gaan. ' +
      'En straks met de Met Mekaere Community: voor iedereen die zin heeft om af en toe iets bijzonders ' +
      'te doen en nieuwe mensen te ontmoeten.',
  },
  {
    type: 'quote',
    text:
      'Als iemand door een kaartje even aan een ander denkt, twee mensen tijdens een activiteit met ' +
      'elkaar aan de praat raken of iemand besluit ergens naartoe te gaan waar diegene normaal niet zo ' +
      'snel alleen binnen zou stappen, dan gebeurt precies wat ik ermee hoopte te bereiken.',
    author: 'Met Mekaere · Veur wat meer aandacht veur mekaere',
  },
  {
    type: 'text',
    body:
      'Met Mekaere hoeft niet groot of ingewikkeld te zijn.\n\n' +
      'Heb je een idee, wil je meedoen met een activiteit of wil je gewoon even sparren? Laat het weten.',
  },
  {
    type: 'cta',
    title: 'Iets te vertellen of te vragen?',
    body: 'Ik hoor het graag. Een mailtje is genoeg.',
    button: { label: 'Neem contact op', href: '/contact' },
    tone: 'sage',
  },
];

const communityBlocks: Block[] = [
  {
    type: 'hero',
    title: 'De Met Mekaere Community',
    subtitle: 'Voor wie zin heeft in meer écht contact',
    align: 'center',
    body:
      'Een lokale community voor mensen die zin hebben in meer écht contact. We organiseren een aantal ' +
      'keer per jaar een bijzondere activiteit. Soms creatief, soms cultureel, soms buiten, soms aan ' +
      'tafel en soms gewoon lekker gek.',
  },
  {
    type: 'cards',
    title: 'Waar het over kan gaan',
    intro: 'Vijf smaken, en af en toe iets waar je helemaal niet op rekent.',
    columns: 3,
    items: [
      { title: 'Maken & Leren', icon: '🧵', body: 'Samen iets maken, of iets nieuws leren van iemand uit de buurt.' },
      { title: 'Eten & Drinken', icon: '🍲', body: 'Aan tafel met mensen die je nog niet kende.' },
      { title: 'Muziek & Cultuur', icon: '🎶', body: 'Luisteren, kijken, meedoen — dichtbij huis.' },
      { title: 'Buiten & Natuur', icon: '🌿', body: 'Naar buiten, het seizoen achterna.' },
      { title: 'Gek & Onverwacht', icon: '✨', body: 'Iets waarvan je vooraf niet weet wat het wordt.' },
    ],
  },
  {
    type: 'membership',
    title: 'Lid worden',
    priceLabel: '€ 24 per jaar',
    body:
      'Met jouw lidmaatschap help je Met Mekaere mogelijk maken. De contributie gebruiken we voor alles ' +
      'wat nodig is om de community te laten draaien: van organisatie en communicatie tot locaties, ' +
      'materialen en kleine verrassingen.',
    perks: [
      'Ieder jaar meedoen aan vier Met Mekaere-activiteiten',
      'Als lid profiteer je van een speciaal ledentarief wanneer er een extra bijdrage wordt gevraagd',
      'Als eerste horen wat eraan komt',
      'En af en toe iets waar je helemaal niet op rekent',
    ],
    footnote: 'Want juist dát is Met Mekaere.',
  },
  {
    type: 'faq',
    title: 'Veelgestelde vragen',
    items: [
      {
        q: 'Wat kost het lidmaatschap?',
        a: 'Lid worden van de Met Mekaere Community kost **€ 24 per jaar**.',
      },
      {
        q: 'Zijn de activiteiten inbegrepen?',
        a:
          'Als lid kun je ieder jaar meedoen aan vier Met Mekaere-activiteiten. Soms is deelname ' +
          'inbegrepen, soms vragen we een extra bijdrage, bijvoorbeeld als er materialen, eten of een ' +
          'bijzondere locatie nodig zijn. Als lid profiteer je dan van een speciaal ledentarief.',
      },
      {
        q: 'Moet ik iemand kennen om mee te doen?',
        a:
          'Nee. Juist niet, eigenlijk. Veel mensen komen alleen binnen — en gaan niet alleen weer naar ' +
          'buiten. Dat is precies de bedoeling.',
      },
      {
        q: 'Waar gebeurt het allemaal?',
        a: 'In en rond de dorpen hier. Locaties verschillen per activiteit; je hoort ze vooraf.',
      },
    ],
  },
  {
    type: 'newsletter',
    title: 'De Community gaat binnenkort open',
    body:
      'Laat je e-mailadres achter, dan laat ik het weten zodra je lid kunt worden en wat de eerste ' +
      'activiteiten zijn.',
  },
];

const fluffyDialectBlocks: Block[] = [
  {
    type: 'hero',
    title: 'Fluffy Dialect',
    subtitle: 'De mooiste woorden van hier',
    align: 'center',
    body:
      'Sommige woorden laten zich niet vertalen. Ze klinken naar thuis, naar de buurvrouw, naar hoe het ' +
      'hier gezegd wordt. Die verzamelen we — en soms zetten we ze op een kaart.',
  },
  { type: 'dialect', title: 'Het woordenboek', limit: 60 },
  {
    type: 'products',
    source: 'category',
    categorySlug: 'dialect',
    title: 'Kaarten met een woord van hier',
    intro: 'Stuur iemand een woord dat alleen wij begrijpen.',
    limit: 4,
    cta: { label: 'Alles bekijken', href: '/webshop/dialect' },
  },
  {
    type: 'cta',
    title: 'Ken jij een woord dat hier niet mag ontbreken?',
    body: 'Stuur het door. Met de betekenis, en het liefst met een zin erbij zoals jij het zou zeggen.',
    button: { label: 'Woord doorgeven', href: '/contact' },
    tone: 'sage',
  },
];

const doenEnBelevenBlocks: Block[] = [
  {
    type: 'hero',
    title: 'Doen en Beleven',
    subtitle: 'Er gebeurt ontzettend veel moois dichtbij huis',
    align: 'center',
    body:
      'Soms is er alleen iemand nodig die de lijntjes bij elkaar brengt. Hier staat wat er te doen is: ' +
      'van samen iets maken tot muziek, bewegen, koffiedrinken en gewoon even ergens binnenlopen.',
  },
  { type: 'activities', title: 'Wat er te doen is', limit: 24 },
  {
    type: 'cta',
    title: 'Organiseer je zelf iets?',
    body:
      'Ondernemers, verenigingen, organisaties en inwoners doen mee. Heb jij iets waar anderen bij ' +
      'kunnen aansluiten? Laat het weten, dan zetten we het erbij.',
    button: { label: 'Meld je activiteit aan', href: '/contact' },
    tone: 'brand',
  },
];

const contactBlocks: Block[] = [
  {
    type: 'hero',
    title: 'Contact',
    align: 'center',
    body: 'Een vraag, een idee, een woord voor het dialect of zin om mee te doen? Ik hoor het graag.',
  },
  {
    type: 'text',
    body:
      'Mail naar **info@metmekaere.nl**. Ik lees alles zelf en probeer binnen een paar dagen te ' +
      'antwoorden.\n\n' +
      'Gaat het over een bestelling? Vermeld dan even je ordernummer, dan kan ik het snel opzoeken.',
  },
  { type: 'newsletter' },
];

/* ------------------------------------------------------------------ *
 * Praktische pagina's
 *
 * Deze teksten zijn een werkbaar begin, geen juridisch advies. Loop ze na
 * voordat de shop opengaat en vul de bedrijfsgegevens aan.
 * ------------------------------------------------------------------ */

const verzendenBlocks: Block[] = [
  { type: 'hero', title: 'Verzenden en retour', align: 'center' },
  {
    type: 'text',
    title: 'Verzendkosten',
    body:
      'Kaarten passen door de brievenbus. De verzendkosten worden automatisch berekend op basis van wat ' +
      'er in je winkelwagen zit; je ziet ze voordat je betaalt.\n\n' +
      '- **Brievenbuspost** — € 2,10, gratis vanaf € 35\n' +
      '- **Pakketpost** — € 4,95, gratis vanaf € 50\n' +
      '- **Ophalen** — gratis, na afspraak\n\n' +
      'Bestellingen gaan meestal binnen twee werkdagen op de post.',
  },
  {
    type: 'text',
    title: 'Retour',
    body:
      'Je hebt veertien dagen bedenktijd na ontvangst. Laat even weten dat je iets wilt terugsturen en ' +
      'stuur het ongebruikt terug; je krijgt het aankoopbedrag binnen veertien dagen terug. De kosten ' +
      'van het terugsturen zijn voor jou.\n\n' +
      'Is er iets beschadigd aangekomen? Stuur een foto, dan lossen we het op.',
  },
];

const voorwaardenBlocks: Block[] = [
  { type: 'hero', title: 'Algemene voorwaarden', align: 'center' },
  {
    type: 'text',
    body:
      '_Deze tekst is een eerste opzet. Loop hem na en vul de bedrijfsgegevens aan voordat de shop ' +
      'opengaat._\n\n' +
      '**1. Wie we zijn**\n' +
      'Met Mekaere, gevestigd in Nederland. Contact via info@metmekaere.nl.\n\n' +
      '**2. Prijzen**\n' +
      'Alle prijzen zijn in euro’s en inclusief btw. Verzendkosten worden apart getoond voordat je ' +
      'de bestelling afrondt.\n\n' +
      '**3. Bestellen en betalen**\n' +
      'Een bestelling komt tot stand zodra de betaling is gelukt. Betalen kan met iDEAL en de andere ' +
      'methoden die bij het afrekenen worden getoond.\n\n' +
      '**4. Levering**\n' +
      'We doen ons best om binnen twee werkdagen te verzenden. Genoemde levertijden zijn een indicatie.\n\n' +
      '**5. Herroepingsrecht**\n' +
      'Je hebt veertien dagen bedenktijd na ontvangst. Zie [Verzenden en retour](/verzenden-en-retour).\n\n' +
      '**6. Klachten**\n' +
      'Is er iets niet goed gegaan? Mail naar info@metmekaere.nl, dan zoeken we samen een oplossing.',
  },
];

const privacyBlocks: Block[] = [
  { type: 'hero', title: 'Privacy', align: 'center' },
  {
    type: 'text',
    body:
      '_Deze tekst is een eerste opzet. Loop hem na voordat de shop opengaat._\n\n' +
      '**Wat we bewaren**\n' +
      'Bestel je iets, dan bewaren we je naam, adres, e-mailadres en wat je hebt besteld. Dat hebben we ' +
      'nodig om te kunnen leveren en voor de boekhouding.\n\n' +
      '**Nieuwsbrief**\n' +
      'Schrijf je je in voor de nieuwsbrief, dan bewaren we je e-mailadres en eventueel je naam. ' +
      'Uitschrijven kan met de link onderaan elke mail.\n\n' +
      '**Betalingen**\n' +
      'Betalingen lopen via Mollie. Wij zien je betaalgegevens niet; wij zien alleen of een betaling is ' +
      'gelukt.\n\n' +
      '**Wie het nog meer ziet**\n' +
      'Alleen partijen die nodig zijn om de bestelling te laten werken: de betaaldienst, de vervoerder ' +
      'en de partij die onze nieuwsbrief verstuurt.\n\n' +
      '**Jouw rechten**\n' +
      'Je mag altijd opvragen wat we van je hebben, het laten aanpassen of laten verwijderen. Mail naar ' +
      'info@metmekaere.nl.',
  },
];

/* ------------------------------------------------------------------ *
 * Bundeling
 * ------------------------------------------------------------------ */

function page(slug: string, title: string, description: string, blocks: Block[]): CmsPage {
  return {
    id: slug,
    slug,
    title,
    seo: { title, description },
    blocks,
    published: true,
    updatedAt: 0,
  };
}

export const DEFAULT_PAGES: Record<string, CmsPage> = {
  home: page(
    'home',
    'Met Mekaere',
    'Kaarten om te sturen, aandacht voor ons dialect en activiteiten waar je mensen tegenkomt die je anders misschien nooit had gesproken.',
    homeBlocks,
  ),
  over: page(
    'over',
    'Over Met Mekaere',
    'Hoe Met Mekaere begon met de Dorpse Adventskalender, en waarom het over aandacht voor elkaar gaat.',
    overBlocks,
  ),
  community: page(
    'community',
    'Community',
    'Een lokale community voor mensen die zin hebben in meer écht contact. Vier activiteiten per jaar, voor € 24.',
    communityBlocks,
  ),
  'fluffy-dialect': page(
    'fluffy-dialect',
    'Fluffy Dialect',
    'De mooiste woorden van hier, verzameld en uitgelegd. En kaarten met een woord dat alleen wij begrijpen.',
    fluffyDialectBlocks,
  ),
  'doen-en-beleven': page(
    'doen-en-beleven',
    'Doen en Beleven',
    'Wat er te doen is dichtbij huis: samen iets maken, muziek, bewegen, koffiedrinken of gewoon ergens binnenlopen.',
    doenEnBelevenBlocks,
  ),
  contact: page('contact', 'Contact', 'Een vraag, een idee of zin om mee te doen? Neem contact op met Met Mekaere.', contactBlocks),
  'verzenden-en-retour': page(
    'verzenden-en-retour',
    'Verzenden en retour',
    'Verzendkosten, levertijd en hoe je iets kunt terugsturen.',
    verzendenBlocks,
  ),
  'algemene-voorwaarden': page(
    'algemene-voorwaarden',
    'Algemene voorwaarden',
    'De voorwaarden waaronder je bij Met Mekaere bestelt.',
    voorwaardenBlocks,
  ),
  privacy: page('privacy', 'Privacy', 'Wat Met Mekaere met je gegevens doet, en wat je rechten zijn.', privacyBlocks),
};

export function defaultPage(slug: string): CmsPage | null {
  return DEFAULT_PAGES[slug] ?? null;
}
