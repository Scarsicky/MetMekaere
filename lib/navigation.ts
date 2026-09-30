/**
 * De structuur van de site op één plek. Header, mobiel menu, footer en de
 * sitemap lezen hier allemaal uit, zodat een nieuwe pagina niet op vier
 * plekken hoeft te worden bijgewerkt.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Korte toelichting, gebruikt in het mobiele menu en de footer. */
  description?: string;
  /** Alleen tonen wanneer de adventskalender in het seizoen zit. */
  seasonal?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/webshop', label: 'Webshop', description: 'Kaarten en kleine cadeaus om te sturen' },
  { href: '/fluffy-dialect', label: 'Fluffy Dialect', description: 'De mooiste woorden van hier' },
  { href: '/community', label: 'Community', description: 'Vier keer per jaar iets bijzonders' },
  { href: '/doen-en-beleven', label: 'Doen en Beleven', description: 'Wat er te doen is in de buurt' },
  { href: '/over', label: 'Over', description: 'Waarom Met Mekaere bestaat' },
];

export const ADVENT_NAV: NavItem = {
  href: '/adventskalender',
  label: 'Adventskalender',
  description: 'Elke dag in december iets om samen te doen',
  seasonal: true,
};

/** Links onderaan de site die niet in het hoofdmenu horen. */
export const FOOTER_LINKS: NavItem[] = [
  { href: '/winkelwagen', label: 'Winkelwagen' },
  { href: '/verzenden-en-retour', label: 'Verzenden en retour' },
  { href: '/algemene-voorwaarden', label: 'Algemene voorwaarden' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Pagina's die de admin via het CMS beheert. De slug is het document-id in
 * `pages`. Alles wat hier staat krijgt automatisch een route.
 */
export const CMS_PAGE_SLUGS = [
  'home',
  'over',
  'community',
  'fluffy-dialect',
  'doen-en-beleven',
  'verzenden-en-retour',
  'algemene-voorwaarden',
  'privacy',
  'contact',
] as const;

export type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number];

/** Is `href` de huidige pagina (of een pagina eronder)? */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
