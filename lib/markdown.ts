import { marked } from 'marked';

/**
 * Markdown uit het CMS naar HTML.
 *
 * De teksten komen van de beheerder, niet van bezoekers, dus dit is geen
 * verdediging tegen een vijandige auteur. Het is wel een vangnet: gepaste
 * tekst uit Word, een gekopieerd stukje HTML of een verkeerd geplakte link
 * mag geen script laten lopen. Daarom halen we gevaarlijke elementen,
 * `on...`-attributen en `javascript:`-links eruit.
 */

marked.setOptions({
  gfm: true,
  breaks: true,
});

const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*>/gi;
const EVENT_ATTRS = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URLS = /\s(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi;

function sanitize(html: string): string {
  return html.replace(DANGEROUS_TAGS, '').replace(EVENT_ATTRS, '').replace(JS_URLS, ' $1="#"');
}

/**
 * Zet externe links open in een nieuw tabblad, met `rel` erbij. Interne links
 * blijven gewoon in hetzelfde tabblad.
 */
function markExternalLinks(html: string): string {
  return html.replace(/<a\s+href="(https?:\/\/[^"]+)"/gi, '<a href="$1" target="_blank" rel="noreferrer noopener"');
}

export function renderMarkdown(md: string): string {
  if (!md?.trim()) return '';
  const html = marked.parse(md, { async: false }) as string;
  return markExternalLinks(sanitize(html));
}
