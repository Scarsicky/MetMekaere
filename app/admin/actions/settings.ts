'use server';

import { adminError, adminOk, type AdminActionState } from '@/lib/admin/action-state';
import { requireAdmin } from '@/lib/admin/auth';
import { revalidateEverything, revalidateSettings } from '@/lib/admin/revalidate';
import { adminDb } from '@/lib/firebase/admin';
import { parseMoneyToCents } from '@/lib/money';
import { isValidEmail, slugify } from '@/lib/utils';

/** De instellingen van de site, de shop, de kalender en de community. */

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

/** 'Label | https://…' per regel. */
function parseLinks(raw: string): { label: string; href: string }[] {
  return raw
    .split('\n')
    .map((line) => {
      const [label, href] = line.split('|').map((part) => part.trim());
      return { label: label ?? '', href: href ?? '' };
    })
    .filter((item) => item.label && /^https?:\/\//.test(item.href));
}

/** 'NL | Nederland' per regel. */
function parseCountries(raw: string): { code: string; label: string }[] {
  return raw
    .split('\n')
    .map((line) => {
      const [code, label] = line.split('|').map((part) => part.trim());
      return { code: (code ?? '').toUpperCase(), label: label ?? '' };
    })
    .filter((item) => /^[A-Z]{2}$/.test(item.code) && item.label);
}

/** 'thema | Thema' per regel. */
function parseFacets(raw: string): { key: string; label: string }[] {
  return raw
    .split('\n')
    .map((line) => {
      const [key, label] = line.split('|').map((part) => part.trim());
      return { key: slugify(key ?? ''), label: label ?? key ?? '' };
    })
    .filter((item) => item.key && item.label);
}

export async function saveGeneralSettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const email = text(formData, 'email');
  if (!isValidEmail(email)) {
    return adminError('Het e-mailadres klopt niet.', { email: 'Vul een geldig e-mailadres in.' });
  }

  await adminDb()
    .collection('settings')
    .doc('general')
    .set(
      {
        siteName: text(formData, 'siteName') || 'Met Mekaere',
        tagline: text(formData, 'tagline'),
        description: text(formData, 'description'),
        email,
        phone: text(formData, 'phone') || null,
        kvk: text(formData, 'kvk') || null,
        vatNumber: text(formData, 'vatNumber') || null,
        address: {
          street: text(formData, 'street') || null,
          houseNumber: text(formData, 'houseNumber') || null,
          postalCode: text(formData, 'postalCode') || null,
          city: text(formData, 'city') || null,
          country: text(formData, 'country') || 'NL',
        },
        socials: parseLinks(text(formData, 'socials')),
        signature: text(formData, 'signature') || null,
      },
      { merge: true },
    );

  // Deze gegevens staan in de footer, in e-mails en in de gestructureerde
  // data — dus overal verversen.
  revalidateEverything();
  return adminOk('Bedrijfsgegevens opgeslagen.');
}

export async function saveShopSettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const notificationEmail = text(formData, 'orderNotificationEmail');
  if (!isValidEmail(notificationEmail)) {
    return adminError('Het adres voor ordermeldingen klopt niet.', {
      orderNotificationEmail: 'Vul een geldig e-mailadres in.',
    });
  }

  const countries = parseCountries(text(formData, 'shippingCountries'));
  if (countries.length === 0) {
    return adminError('Er moet minstens één land zijn waar je naartoe verstuurt.', {
      shippingCountries: 'Bijvoorbeeld: NL | Nederland',
    });
  }

  await adminDb()
    .collection('settings')
    .doc('shop')
    .set(
      {
        currency: 'EUR',
        shippingCountries: countries,
        facets: parseFacets(text(formData, 'facets')),
        orderNotificationEmail: notificationEmail,
        checkoutNote: text(formData, 'checkoutNote') || null,
        tierNote: text(formData, 'tierNote') || null,
        closed: checkbox(formData, 'closed'),
        closedMessage: text(formData, 'closedMessage') || null,
      },
      { merge: true },
    );

  revalidateSettings();
  return adminOk(
    checkbox(formData, 'closed')
      ? 'Opgeslagen. Let op: de shop staat nu dicht.'
      : 'Shopinstellingen opgeslagen.',
  );
}

export async function saveAdventSettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const from = text(formData, 'visibleFrom');
  const until = text(formData, 'visibleUntil');
  const pattern = /^\d{2}-\d{2}$/;

  if (!pattern.test(from) || !pattern.test(until)) {
    return adminError('De datums moeten als MM-DD worden ingevuld, bijvoorbeeld 11-15.', {
      visibleFrom: pattern.test(from) ? '' : 'Bijvoorbeeld 11-15 voor 15 november.',
      visibleUntil: pattern.test(until) ? '' : 'Bijvoorbeeld 01-07 voor 7 januari.',
    });
  }

  await adminDb()
    .collection('settings')
    .doc('advent')
    .set(
      {
        enabled: checkbox(formData, 'enabled'),
        year: Number(text(formData, 'year')) || new Date().getFullYear(),
        visibleFrom: from,
        visibleUntil: until,
        title: text(formData, 'title') || 'Dorpse Adventskalender',
        subtitle: text(formData, 'subtitle'),
        offSeasonMessage: text(formData, 'offSeasonMessage'),
      },
      { merge: true },
    );

  revalidateSettings();
  return adminOk('Instellingen van de adventskalender opgeslagen.');
}

export async function saveCommunitySettingsAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();

  const price = parseMoneyToCents(text(formData, 'membershipPrice'));
  if (price === null || price < 0) {
    return adminError('De contributie is niet gelukt om te lezen.', {
      membershipPrice: 'Vul een bedrag in, bijvoorbeeld 24,00.',
    });
  }

  await adminDb()
    .collection('settings')
    .doc('community')
    .set(
      {
        membershipEnabled: checkbox(formData, 'membershipEnabled'),
        membershipPriceCents: price,
        membershipProductSlug: text(formData, 'membershipProductSlug') || null,
        waitlistEnabled: checkbox(formData, 'waitlistEnabled'),
      },
      { merge: true },
    );

  revalidateSettings();
  return adminOk('Community-instellingen opgeslagen.');
}
