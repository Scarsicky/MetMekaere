import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';

import { formatCents } from '@/lib/money';
import { absoluteUrl } from '@/lib/seo';
import { formatDateNL } from '@/lib/utils';
import type { GeneralSettings, Order } from '@/types';

/**
 * E-mail versturen via SMTP.
 *
 * Bewust SMTP en geen partij-specifieke API: elke mailprovider kan dat, dus je
 * zit nergens aan vast. Is er geen SMTP ingesteld, dan wordt de mail in het
 * log gezet in plaats van verstuurd — de bestelling loopt daar niet op vast.
 * Een order die wel betaald is maar waarvan de mail niet aankomt, is hersteld
 * zodra de instellingen kloppen; een order die niet doorgaat omdat de
 * mailserver hapert, is dat niet.
 */

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transporterCache: Transporter | null = null;

function transporter(): Transporter {
  if (!transporterCache) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = port === 465;

    transporterCache = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is meteen versleuteld; 587 begint open en gaat via STARTTLS over.
      secure,
      /*
       * Bij 587 eisen we die STARTTLS-stap ook echt op. Zonder dit zou
       * nodemailer, als de server de upgrade niet aanbiedt, alsnog verbinding
       * maken — en dan gaan het wachtwoord en de adresgegevens van klanten
       * leesbaar over de lijn. Liever een mail die niet weggaat dan een mail
       * die onversleuteld weggaat.
       */
      requireTLS: !secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporterCache;
}

/**
 * Controleert of de mailserver bereikbaar is en het wachtwoord klopt, zonder
 * een mail te versturen. Gebruikt door `npm run mail:test`.
 */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) {
    return { ok: false, error: 'SMTP_HOST, SMTP_USER of SMTP_PASSWORD ontbreekt.' };
  }
  try {
    await transporter().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

/** Een losse testmail, om te zien of alles werkt voordat de shop opengaat. */
export async function sendTestMail(to: string, general: GeneralSettings): Promise<MailResult> {
  return send({
    to,
    subject: 'Testmail van Met Mekaere',
    text:
      'Deze mail is verstuurd vanaf de website van Met Mekaere.\n\n' +
      'Zie je dit? Dan werkt de mailinstelling en krijgen klanten hun bestelbevestiging.',
    html: shell(
      general,
      'Testmail',
      `<h1 style="margin:0 0 8px;font-size:22px">Het werkt</h1>
       <p style="margin:0;color:#4a443c">
         Deze mail is verstuurd vanaf de website van Met Mekaere. Zie je dit, dan krijgen klanten
         hun bestelbevestiging ook.
       </p>`,
    ),
    general,
  });
}

function fromAddress(general: GeneralSettings): string {
  const address = process.env.SMTP_FROM || general.email;
  return `${general.siteName} <${address}>`;
}

export interface MailResult {
  sent: boolean;
  reason?: string;
}

async function send(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  general: GeneralSettings;
}): Promise<MailResult> {
  if (!smtpConfigured()) {
    console.warn(
      `[mail] geen SMTP ingesteld — mail "${options.subject}" aan ${options.to} is niet verstuurd.`,
    );
    return { sent: false, reason: 'SMTP niet ingesteld' };
  }

  try {
    await transporter().sendMail({
      from: fromAddress(options.general),
      to: options.to,
      replyTo: options.replyTo ?? options.general.email,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[mail] versturen van "${options.subject}" mislukte:`, error);
    return { sent: false, reason: String(error) };
  }
}

/* ------------------------------------------------------------------ *
 * Opmaak
 * ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addressLines(order: Order): string[] {
  const a = order.shipping;
  return [
    a.name,
    a.company ?? '',
    `${a.street} ${a.houseNumber}${a.houseNumberAddition ?? ''}`.trim(),
    `${a.postalCode} ${a.city}`,
    a.country === 'NL' ? '' : a.country,
  ].filter(Boolean);
}

function orderLinesText(order: Order): string {
  return order.lines
    .map((line) => {
      const addons = line.addons.length ? ` (${line.addons.map((a) => a.label).join(', ')})` : '';
      return `${line.qty}× ${line.title}${addons} — ${formatCents(line.lineTotalCents)}`;
    })
    .join('\n');
}

function orderLinesHtml(order: Order): string {
  return order.lines
    .map((line) => {
      const addons = line.addons.length
        ? `<br><span style="color:#6b6257;font-size:14px">${escapeHtml(line.addons.map((a) => a.label).join(', '))}</span>`
        : '';
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e6dfd4">
          <strong>${escapeHtml(line.title)}</strong>${addons}
          <br><span style="color:#6b6257;font-size:14px">${line.qty} × ${formatCents(line.tierUnitPriceCents)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e6dfd4;text-align:right;white-space:nowrap">
          ${formatCents(line.lineTotalCents)}
        </td>
      </tr>`;
    })
    .join('');
}

function totalsHtml(order: Order): string {
  const row = (label: string, value: string, bold = false) =>
    `<tr>
      <td style="padding:4px 0;${bold ? 'font-weight:700;font-size:17px' : 'color:#6b6257'}">${escapeHtml(label)}</td>
      <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:700;font-size:17px' : ''}">${value}</td>
    </tr>`;

  return [
    row('Subtotaal', formatCents(order.grossSubtotalCents)),
    order.tierDiscountCents > 0 ? row('Staffelvoordeel', `− ${formatCents(order.tierDiscountCents)}`) : '',
    order.discountCents > 0
      ? row(`Korting ${order.discountCode ?? ''}`.trim(), `− ${formatCents(order.discountCents)}`)
      : '',
    row(
      `Verzending · ${order.shippingMethod}`,
      order.shippingCents === 0 ? 'Gratis' : formatCents(order.shippingCents),
    ),
    row('Totaal', formatCents(order.totalCents), true),
  ].join('');
}

function shell(general: GeneralSettings, title: string, body: string): string {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#fbf8f3;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2a2521">
  <div style="max-width:560px;margin:0 auto;padding:24px 20px">
    <p style="margin:0 0 24px;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#6b6257">
      ${escapeHtml(general.siteName)}
    </p>
    <div style="background:#ffffff;border:1px solid #e6dfd4;border-radius:16px;padding:24px">
      ${body}
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#6b6257;text-align:center">
      ${escapeHtml(general.tagline)}<br>
      <a href="${absoluteUrl('/')}" style="color:#7f1d1d">metmekaere.nl</a>
    </p>
  </div>
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * De mails
 * ------------------------------------------------------------------ */

export async function sendOrderConfirmation(order: Order, general: GeneralSettings): Promise<MailResult> {
  const subject = `Bedankt voor je bestelling ${order.orderNumber}`;
  const address = addressLines(order);

  const text = [
    `Hoi ${order.customer.name.split(' ')[0]},`,
    '',
    'Bedankt voor je bestelling. Hieronder staat wat eraan komt.',
    '',
    `Bestelnummer: ${order.orderNumber}`,
    `Besteld op: ${formatDateNL(order.createdAt)}`,
    '',
    orderLinesText(order),
    '',
    `Subtotaal: ${formatCents(order.grossSubtotalCents)}`,
    order.tierDiscountCents > 0 ? `Staffelvoordeel: − ${formatCents(order.tierDiscountCents)}` : '',
    order.discountCents > 0 ? `Korting: − ${formatCents(order.discountCents)}` : '',
    `Verzending (${order.shippingMethod}): ${order.shippingCents === 0 ? 'gratis' : formatCents(order.shippingCents)}`,
    `Totaal: ${formatCents(order.totalCents)}`,
    '',
    'Bezorgadres:',
    ...address,
    '',
    'Heb je een vraag? Antwoord gewoon op deze mail.',
    '',
    general.signature ?? general.siteName,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = shell(
    general,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">Bedankt voor je bestelling</h1>
     <p style="margin:0 0 20px;color:#6b6257">
       Bestelnummer <strong style="color:#2a2521">${escapeHtml(order.orderNumber)}</strong> ·
       ${escapeHtml(formatDateNL(order.createdAt))}
     </p>
     <table style="width:100%;border-collapse:collapse">${orderLinesHtml(order)}</table>
     <table style="width:100%;border-collapse:collapse;margin-top:16px">${totalsHtml(order)}</table>
     <h2 style="margin:28px 0 8px;font-size:16px">Bezorgadres</h2>
     <p style="margin:0;color:#4a443c;line-height:1.6">${address.map(escapeHtml).join('<br>')}</p>
     <p style="margin:28px 0 0;color:#6b6257">Heb je een vraag? Antwoord gewoon op deze mail.</p>`,
  );

  return send({ to: order.customer.email, subject, text, html, general });
}

/** Melding aan de eigenaar dat er een bestelling binnen is. */
export async function sendOrderNotification(
  order: Order,
  general: GeneralSettings,
  to: string,
): Promise<MailResult> {
  const subject = `Nieuwe bestelling ${order.orderNumber} · ${formatCents(order.totalCents)}`;

  const text = [
    `${order.customer.name} <${order.customer.email}>`,
    order.customer.phone ?? '',
    '',
    orderLinesText(order),
    '',
    `Totaal: ${formatCents(order.totalCents)}`,
    `Verzending: ${order.shippingMethod}`,
    '',
    'Bezorgadres:',
    ...addressLines(order),
    order.notes ? `\nOpmerking van de klant:\n${order.notes}` : '',
    '',
    absoluteUrl(`/admin/bestellingen/${order.id}`),
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = shell(
    general,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">Nieuwe bestelling</h1>
     <p style="margin:0 0 20px;color:#6b6257">
       ${escapeHtml(order.orderNumber)} · ${escapeHtml(order.customer.name)} ·
       <a href="mailto:${escapeHtml(order.customer.email)}" style="color:#7f1d1d">${escapeHtml(order.customer.email)}</a>
     </p>
     <table style="width:100%;border-collapse:collapse">${orderLinesHtml(order)}</table>
     <table style="width:100%;border-collapse:collapse;margin-top:16px">${totalsHtml(order)}</table>
     <h2 style="margin:28px 0 8px;font-size:16px">Bezorgadres</h2>
     <p style="margin:0;color:#4a443c;line-height:1.6">${addressLines(order).map(escapeHtml).join('<br>')}</p>
     ${order.notes ? `<h2 style="margin:24px 0 8px;font-size:16px">Opmerking</h2><p style="margin:0;color:#4a443c">${escapeHtml(order.notes)}</p>` : ''}
     <p style="margin:28px 0 0">
       <a href="${absoluteUrl(`/admin/bestellingen/${order.id}`)}" style="color:#7f1d1d;font-weight:700">Open in de admin</a>
     </p>`,
  );

  return send({ to, subject, text, html, replyTo: order.customer.email, general });
}

export async function sendShippingNotice(order: Order, general: GeneralSettings): Promise<MailResult> {
  const subject = `Je bestelling ${order.orderNumber} is onderweg`;

  const text = [
    `Hoi ${order.customer.name.split(' ')[0]},`,
    '',
    'Je bestelling is verstuurd. Hij valt binnenkort op de mat.',
    order.trackingCode ? `\nTrack & Trace: ${order.trackingCode}` : '',
    '',
    general.signature ?? general.siteName,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = shell(
    general,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">Je bestelling is onderweg</h1>
     <p style="margin:0 0 16px;color:#4a443c">
       Bestelnummer ${escapeHtml(order.orderNumber)} is verstuurd en valt binnenkort op de mat.
     </p>
     ${order.trackingCode ? `<p style="margin:0;color:#4a443c">Track &amp; Trace: <strong>${escapeHtml(order.trackingCode)}</strong></p>` : ''}`,
  );

  return send({ to: order.customer.email, subject, text, html, general });
}

/**
 * Bericht dat een bestelling is ingetrokken.
 *
 * Bewust een eigen mail en niet de bestelbevestiging opnieuw: een klant die
 * hoort dat zijn bestelling niet doorgaat, moet dat ook lezen — en niet nog
 * eens 'bedankt voor je bestelling'.
 */
export async function sendCancellationNotice(
  order: Order,
  general: GeneralSettings,
  reason?: string,
): Promise<MailResult> {
  const subject = `Je bestelling ${order.orderNumber} is geannuleerd`;
  const refunded = order.status === 'refunded';

  const text = [
    `Hoi ${order.customer.name.split(' ')[0]},`,
    '',
    `Je bestelling ${order.orderNumber} is geannuleerd.`,
    reason ? `\n${reason}` : '',
    refunded
      ? '\nHet betaalde bedrag krijg je terug. Afhankelijk van je bank staat dat binnen een paar werkdagen op je rekening.'
      : '',
    '',
    `Klopt dit niet, of heb je een vraag? Antwoord gewoon op deze mail.`,
    '',
    general.signature ?? general.siteName,
  ]
    .filter((line) => line !== '')
    .join('\n');

  const html = shell(
    general,
    subject,
    `<h1 style="margin:0 0 8px;font-size:22px">Je bestelling is geannuleerd</h1>
     <p style="margin:0 0 16px;color:#4a443c">
       Bestelnummer <strong>${escapeHtml(order.orderNumber)}</strong> gaat niet door.
     </p>
     ${reason ? `<p style="margin:0 0 16px;color:#4a443c">${escapeHtml(reason)}</p>` : ''}
     ${
       refunded
         ? '<p style="margin:0 0 16px;color:#4a443c">Het betaalde bedrag krijg je terug. Afhankelijk van je bank staat dat binnen een paar werkdagen op je rekening.</p>'
         : ''
     }
     <p style="margin:0;color:#6b6257">Klopt dit niet, of heb je een vraag? Antwoord gewoon op deze mail.</p>`,
  );

  return send({ to: order.customer.email, subject, text, html, general });
}

export function isMailConfigured(): boolean {
  return smtpConfigured();
}
