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

/**
 * De CMS-slug achter een menulink, of `null` als die link geen CMS-pagina is
 * (zoals de webshop of de winkelwagen — die worden niet in het CMS beheerd).
 */
export function cmsSlugForHref(href: string): string | null {
  const slug = href === '/' ? 'home' : href.slice(1);
  return (CMS_PAGE_SLUGS as readonly string[]).includes(slug) ? slug : null;
}

/**
 * Laat links weg naar pagina's die op concept staan.
 *
 * Twee regels die bewust zo zijn:
 *
 *  - Onbekend telt als zichtbaar. Staat een slug niet in de index — omdat de
 *    pagina nog nooit is opgeslagen, of omdat Firestore even niet meewerkte —
 *    dan blijft de link gewoon staan. Een storing hoort het menu niet leeg te
 *    maken.
 *  - De homepagina blijft altijd staan. Zonder die link kom je nergens meer
 *    terug, en een homepagina op concept is eerder een vergissing dan een wens.
 */
export function isNavVisible(href: string, pageIndex: Record<string, boolean>): boolean {
  if (href === '/') return true;
  const slug = cmsSlugForHref(href);
  if (!slug) return true;
  return pageIndex[slug] !== false;
}

export function visibleNav(items: NavItem[], pageIndex: Record<string, boolean>): NavItem[] {
  return items.filter((item) => isNavVisible(item.href, pageIndex));
}

/** Is `href` de huidige pagina (of een pagina eronder)? */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
