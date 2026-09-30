/**
 * Het menu van het adminpaneel.
 *
 * De volgorde is die van het dagelijks gebruik: eerst wat er binnenkomt
 * (bestellingen), dan wat je verkoopt, dan wat je vertelt, en helemaal onderaan
 * de dingen die je één keer instelt.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  /** Korte uitleg, getoond op het overzichtsscherm. */
  description: string;
  icon: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'Verkoop',
    items: [
      {
        href: '/admin/bestellingen',
        label: 'Bestellingen',
        description: 'Wat er binnenkomt, wat betaald is en wat nog verstuurd moet worden.',
        icon: '📦',
      },
      {
        href: '/admin/producten',
        label: 'Producten',
        description: 'Teksten, foto’s, prijzen en voorraad van alles wat je verkoopt.',
        icon: '💌',
      },
      {
        href: '/admin/categorieen',
        label: 'Categorieën',
        description: 'De indeling van de webshop.',
        icon: '🗂️',
      },
      {
        href: '/admin/staffel',
        label: 'Staffelvoordeel',
        description: 'Vanaf hoeveel stuks het voordeliger wordt.',
        icon: '🪜',
      },
      {
        href: '/admin/kortingscodes',
        label: 'Kortingscodes',
        description: 'Codes aanmaken, aanzetten of stopzetten.',
        icon: '🎟️',
      },
      {
        href: '/admin/verzending',
        label: 'Verzendkosten',
        description: 'Tarieven per land, gewicht en ‘gratis vanaf’.',
        icon: '🚚',
      },
    ],
  },
  {
    title: 'Inhoud',
    items: [
      {
        href: '/admin/paginas',
        label: 'Pagina’s',
        description: 'De teksten en blokken van Home, Over, Community en de rest.',
        icon: '📝',
      },
      {
        href: '/admin/doen-en-beleven',
        label: 'Doen en Beleven',
        description: 'Activiteiten die je aankondigt.',
        icon: '📍',
      },
      {
        href: '/admin/fluffy-dialect',
        label: 'Fluffy Dialect',
        description: 'Woorden van hier, met hun betekenis.',
        icon: '🗣️',
      },
      {
        href: '/admin/adventskalender',
        label: 'Adventskalender',
        description: 'De 24 dagen van december.',
        icon: '🎄',
      },
    ],
  },
  {
    title: 'Instellingen',
    items: [
      {
        href: '/admin/nieuwsbrief',
        label: 'Nieuwsbrief',
        description: 'Wie zich hebben ingeschreven.',
        icon: '✉️',
      },
      {
        href: '/admin/opstarten',
        label: 'Opstarten',
        description: 'Startinhoud plaatsen en de koppelingen controleren.',
        icon: '🚀',
      },
      {
        href: '/admin/instellingen',
        label: 'Instellingen',
        description: 'Bedrijfsgegevens, shopinstellingen en de adventskalender.',
        icon: '⚙️',
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);
