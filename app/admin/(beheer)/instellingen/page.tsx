import {
  saveAdventSettingsAction,
  saveCommunitySettingsAction,
  saveGeneralSettingsAction,
  saveShopSettingsAction,
} from '@/app/admin/actions/settings';
import { SaveForm } from '@/components/admin/save-form';
import { AdminCard, AdminPage } from '@/components/admin/ui';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import {
  getAdventSettings,
  getCommunitySettings,
  getGeneralSettings,
  getShopSettings,
} from '@/lib/data/settings';
import { centsToInput } from '@/lib/money';

export const metadata = { title: 'Instellingen' };

export default async function AdminSettingsPage() {
  const [general, shop, advent, community] = await Promise.all([
    getGeneralSettings(),
    getShopSettings(),
    getAdventSettings(),
    getCommunitySettings(),
  ]);

  return (
    <AdminPage
      title="Instellingen"
      description="Dingen die je één keer goed zet. Elk blok heeft zijn eigen opslaanknop."
    >
      <div className="flex flex-col gap-12">
        {/* ---------------- Bedrijfsgegevens ---------------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Bedrijfsgegevens</h2>
          <SaveForm action={saveGeneralSettingsAction} saveLabel="Bedrijfsgegevens opslaan">
            <AdminCard>
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Naam" htmlFor="siteName" required>
                    <Input id="siteName" name="siteName" defaultValue={general.siteName} required />
                  </Field>
                  <Field label="E-mailadres" htmlFor="email" required hint="Zichtbaar op de site.">
                    <Input id="email" name="email" type="email" defaultValue={general.email} required />
                  </Field>
                </div>

                <Field label="Slogan" htmlFor="tagline" hint="Staat in de footer en onder de logo’s.">
                  <Input id="tagline" name="tagline" defaultValue={general.tagline} />
                </Field>

                <Field
                  label="Omschrijving van de site"
                  htmlFor="description"
                  hint="Wordt gebruikt door Google en bij het delen van de homepagina."
                >
                  <Textarea id="description" name="description" rows={3} defaultValue={general.description} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Telefoon" htmlFor="phone" optional>
                    <Input id="phone" name="phone" type="tel" defaultValue={general.phone ?? ''} />
                  </Field>
                  <Field label="KvK-nummer" htmlFor="kvk" optional>
                    <Input id="kvk" name="kvk" defaultValue={general.kvk ?? ''} />
                  </Field>
                  <Field label="Btw-nummer" htmlFor="vatNumber" optional>
                    <Input id="vatNumber" name="vatNumber" defaultValue={general.vatNumber ?? ''} />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_6rem_8rem_1fr]">
                  <Field label="Straat" htmlFor="street" optional>
                    <Input id="street" name="street" defaultValue={general.address?.street ?? ''} />
                  </Field>
                  <Field label="Nr." htmlFor="houseNumber" optional>
                    <Input id="houseNumber" name="houseNumber" defaultValue={general.address?.houseNumber ?? ''} />
                  </Field>
                  <Field label="Postcode" htmlFor="postalCode" optional>
                    <Input id="postalCode" name="postalCode" defaultValue={general.address?.postalCode ?? ''} />
                  </Field>
                  <Field label="Plaats" htmlFor="city" optional>
                    <Input id="city" name="city" defaultValue={general.address?.city ?? ''} />
                  </Field>
                </div>
                <input type="hidden" name="country" value={general.address?.country ?? 'NL'} />

                <Field
                  label="Sociale media"
                  htmlFor="socials"
                  optional
                  hint="Eén per regel, als: Instagram | https://instagram.com/metmekaere"
                >
                  <Textarea
                    id="socials"
                    name="socials"
                    rows={3}
                    className="font-mono text-sm"
                    defaultValue={general.socials.map((s) => `${s.label} | ${s.href}`).join('\n')}
                  />
                </Field>

                <Field
                  label="Ondertekening in e-mails"
                  htmlFor="signature"
                  optional
                  hint="Hoe je bestelbevestigingen afsluit."
                >
                  <Input id="signature" name="signature" defaultValue={general.signature ?? ''} placeholder="Groet, …" />
                </Field>
              </div>
            </AdminCard>
          </SaveForm>
        </section>

        {/* ---------------- Shop ---------------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Webshop</h2>
          <SaveForm action={saveShopSettingsAction} saveLabel="Shopinstellingen opslaan">
            <AdminCard>
              <div className="flex flex-col gap-4">
                <Field
                  label="Ordermeldingen naar"
                  htmlFor="orderNotificationEmail"
                  required
                  hint="Hier krijg je een mail zodra er een bestelling binnenkomt."
                >
                  <Input
                    id="orderNotificationEmail"
                    name="orderNotificationEmail"
                    type="email"
                    defaultValue={shop.orderNotificationEmail}
                    required
                  />
                </Field>

                <Field
                  label="Landen waar je naartoe verstuurt"
                  htmlFor="shippingCountries"
                  required
                  hint="Eén per regel, als: NL | Nederland. Het eerste land is de standaardkeuze."
                >
                  <Textarea
                    id="shippingCountries"
                    name="shippingCountries"
                    rows={3}
                    className="font-mono text-sm"
                    defaultValue={shop.shippingCountries.map((c) => `${c.code} | ${c.label}`).join('\n')}
                  />
                </Field>

                <Field
                  label="Filters in de webshop"
                  htmlFor="facets"
                  hint="Eén per regel, als: thema | Thema. Elk kenmerk dat je hier zet, verschijnt als filter zodra het bij een product staat."
                >
                  <Textarea
                    id="facets"
                    name="facets"
                    rows={3}
                    className="font-mono text-sm"
                    defaultValue={shop.facets.map((f) => `${f.key} | ${f.label}`).join('\n')}
                  />
                </Field>

                <Field
                  label="Tekst bij het afrekenen"
                  htmlFor="checkoutNote"
                  optional
                  hint="Bijvoorbeeld iets over de levertijd."
                >
                  <Textarea id="checkoutNote" name="checkoutNote" rows={2} defaultValue={shop.checkoutNote ?? ''} />
                </Field>

                <div className="rounded-xl border border-sand-300 bg-sand-50 p-4">
                  <Checkbox
                    name="closed"
                    label="Shop tijdelijk dicht"
                    description="Bezoekers kunnen dan wel kijken, maar niets bestellen. Handig tijdens een vakantie."
                    defaultChecked={shop.closed}
                  />
                  <div className="mt-3">
                    <Field label="Bericht bij een gesloten shop" htmlFor="closedMessage" optional>
                      <Input
                        id="closedMessage"
                        name="closedMessage"
                        defaultValue={shop.closedMessage ?? ''}
                        placeholder="We zijn er even niet — vanaf 5 januari kun je weer bestellen."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </AdminCard>
          </SaveForm>
        </section>

        {/* ---------------- Adventskalender ---------------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Adventskalender</h2>
          <SaveForm action={saveAdventSettingsAction} saveLabel="Kalenderinstellingen opslaan">
            <AdminCard description="De kalender verschijnt vanzelf in het menu binnen het seizoen, en verdwijnt daarna weer.">
              <div className="flex flex-col gap-4">
                <Checkbox
                  name="enabled"
                  label="Adventskalender gebruiken"
                  description="Zet dit uit als je hem dit jaar helemaal niet doet."
                  defaultChecked={advent.enabled}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Jaar" htmlFor="year">
                    <Input id="year" name="year" inputMode="numeric" defaultValue={String(advent.year)} />
                  </Field>
                  <Field label="Zichtbaar vanaf" htmlFor="visibleFrom" hint="MM-DD, bijv. 11-15">
                    <Input id="visibleFrom" name="visibleFrom" defaultValue={advent.visibleFrom} />
                  </Field>
                  <Field label="Zichtbaar tot en met" htmlFor="visibleUntil" hint="MM-DD, bijv. 01-07">
                    <Input id="visibleUntil" name="visibleUntil" defaultValue={advent.visibleUntil} />
                  </Field>
                </div>

                <Field label="Titel" htmlFor="title">
                  <Input id="title" name="title" defaultValue={advent.title} />
                </Field>

                <Field label="Ondertitel" htmlFor="subtitle">
                  <Input id="subtitle" name="subtitle" defaultValue={advent.subtitle} />
                </Field>

                <Field
                  label="Tekst buiten het seizoen"
                  htmlFor="offSeasonMessage"
                  hint="Wat bezoekers zien als ze de kalenderpagina in mei opzoeken."
                >
                  <Textarea
                    id="offSeasonMessage"
                    name="offSeasonMessage"
                    rows={2}
                    defaultValue={advent.offSeasonMessage}
                  />
                </Field>
              </div>
            </AdminCard>
          </SaveForm>
        </section>

        {/* ---------------- Community ---------------- */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Community</h2>
          <SaveForm action={saveCommunitySettingsAction} saveLabel="Community-instellingen opslaan">
            <AdminCard description="Zodra je het lidmaatschap aanzet, kunnen mensen zich via de webshop aanmelden.">
              <div className="flex flex-col gap-4">
                <Checkbox
                  name="membershipEnabled"
                  label="Lidmaatschap is te koop"
                  description="Laat dit uit tot je klaar bent om leden te ontvangen."
                  defaultChecked={community.membershipEnabled}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contributie per jaar" htmlFor="membershipPrice">
                    <Input
                      id="membershipPrice"
                      name="membershipPrice"
                      inputMode="decimal"
                      defaultValue={centsToInput(community.membershipPriceCents)}
                    />
                  </Field>

                  <Field
                    label="Gekoppeld product"
                    htmlFor="membershipProductSlug"
                    optional
                    hint="De webadres-naam van het product waarmee je het lidmaatschap verkoopt."
                  >
                    <Input
                      id="membershipProductSlug"
                      name="membershipProductSlug"
                      defaultValue={community.membershipProductSlug ?? ''}
                      placeholder="community-lidmaatschap"
                    />
                  </Field>
                </div>

                <Checkbox
                  name="waitlistEnabled"
                  label="Wachtlijst tonen zolang het lidmaatschap nog dicht is"
                  description="Bezoekers kunnen dan hun e-mailadres achterlaten."
                  defaultChecked={community.waitlistEnabled}
                />
              </div>
            </AdminCard>
          </SaveForm>
        </section>
      </div>
    </AdminPage>
  );
}
