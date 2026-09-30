import Image from 'next/image';

import { AdventCalendar } from '@/components/advent/advent-calendar';
import { NewsletterForm } from '@/components/newsletter-form';
import { ButtonLink } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/section';
import { countFilledDays, getAdventActivities } from '@/lib/data/activities';
import { getAdventSettings, isAdventInSeason } from '@/lib/data/settings';
import { buildMetadata } from '@/lib/seo';

export async function generateMetadata() {
  const settings = await getAdventSettings();
  const inSeason = isAdventInSeason(settings);

  return buildMetadata({
    title: settings.title,
    description: inSeason
      ? `${settings.subtitle} Elke dag van december een activiteit om samen te doen, bij jou in de buurt.`
      : settings.offSeasonMessage,
    path: '/adventskalender',
    // Buiten het seizoen staat er weinig; dat hoeft niet in Google.
    noIndex: !inSeason,
  });
}

export default async function AdventPage() {
  const settings = await getAdventSettings();
  const inSeason = isAdventInSeason(settings);

  /* Buiten het seizoen blijft de pagina bestaan — oude links moeten werken —
     maar met een uitnodiging in plaats van een lege kalender. */
  if (!inSeason) {
    return (
      <Container prose className="py-16 text-center md:py-24">
        <Image src="/logo.png" alt="" width={512} height={512} className="mx-auto size-20" />
        <h1 className="mt-6 text-3xl md:text-4xl">{settings.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-sand-700">{settings.offSeasonMessage}</p>

        <div className="mt-8">
          <NewsletterForm source="adventskalender" className="text-left" />
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/doen-en-beleven" variant="secondary">
            Wat er nu te doen is
          </ButtonLink>
          <ButtonLink href="/webshop">Naar de webshop</ButtonLink>
        </div>
      </Container>
    );
  }

  const activities = await getAdventActivities();
  const filled = countFilledDays(activities);

  const now = new Date();
  const today = now.getMonth() === 11 ? now.getDate() : null;

  return (
    <>
      <Section tone="plain" size="md" className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-sage-200/50 blur-3xl"
        />
        <Container className="relative text-center">
          <Image src="/logo.png" alt="" width={512} height={512} className="mx-auto size-16 md:size-20" />
          <h1 className="mt-5 text-3xl leading-tight md:text-5xl">{settings.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-brand-700 md:text-xl">{settings.subtitle}</p>

          {filled === 0 ? (
            <p className="mx-auto mt-5 max-w-xl rounded-xl bg-ochre-100 px-4 py-3 text-sand-800">
              De kalender wordt nog gevuld. Kom binnenkort nog eens kijken — of laat je e-mailadres
              achter, dan laten we het weten.
            </p>
          ) : (
            <p className="mt-3 text-sand-600">
              {filled} van de 24 dagen zijn ingevuld. Tik op een dag om te zien wat er is.
            </p>
          )}
        </Container>
      </Section>

      <Container className="pb-14">
        <AdventCalendar activities={activities} today={today} />
      </Container>

      <Section tone="sage" size="md">
        <Container prose className="text-center">
          <h2 className="text-2xl md:text-3xl">Doe je mee?</h2>
          <p className="mt-3 text-lg leading-relaxed text-sage-900">
            Ondernemers, verenigingen, organisaties en inwoners vullen de kalender samen. Heb jij iets
            waar anderen bij kunnen aansluiten? Laat het weten, dan zetten we het erbij.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact">Meld je activiteit aan</ButtonLink>
            <ButtonLink href="/over" variant="secondary">
              Over Met Mekaere
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
