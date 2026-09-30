import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HappeningCard } from '@/components/happening-card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import { Prose } from '@/components/ui/prose';
import { getHappeningBySlug, getHappenings } from '@/lib/data/content';
import { getGeneralSettings } from '@/lib/data/settings';
import {
  breadcrumbJsonLd,
  buildMetadata,
  eventJsonLd,
  jsonLdScript,
  metaDescription,
} from '@/lib/seo';
import { formatDayMonthNL } from '@/lib/utils';

export async function generateStaticParams() {
  const happenings = await getHappenings();
  return happenings.map((happening) => ({ slug: happening.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const happening = await getHappeningBySlug(slug);
  if (!happening) return {};

  return buildMetadata({
    title: happening.seo?.title ?? happening.title,
    description: happening.seo?.description ?? metaDescription(happening.summary || happening.body),
    path: `/doen-en-beleven/${happening.slug}`,
    image: happening.images[0]?.url,
    imageAlt: happening.images[0]?.alt,
    type: 'article',
  });
}

export default async function HappeningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [happening, general, all] = await Promise.all([
    getHappeningBySlug(slug),
    getGeneralSettings(),
    getHappenings(),
  ]);

  if (!happening) notFound();

  const past = Boolean(happening.date) && happening.date! < new Date().toISOString().slice(0, 10);
  const others = all.filter((h) => h.id !== happening.id).slice(0, 3);
  const image = happening.images[0];

  const trail = [
    { name: 'Home', href: '/' },
    { name: 'Doen en Beleven', href: '/doen-en-beleven' },
    { name: happening.title, href: `/doen-en-beleven/${happening.slug}` },
  ];

  const event = eventJsonLd(happening, general);

  return (
    <>
      <Container className="py-8 md:py-12">
        <nav aria-label="Kruimelpad" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-sand-600">
          <Link href="/" className="hover:text-brand-700">
            Home
          </Link>
          <span aria-hidden>·</span>
          <Link href="/doen-en-beleven" className="hover:text-brand-700">
            Doen en Beleven
          </Link>
          <span aria-hidden>·</span>
          <span className="text-sand-900">{happening.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge tone="sage">{happening.theme}</Badge>
              {happening.membersOnly ? <Badge tone="brand">Voor leden</Badge> : null}
              {past ? <Badge tone="muted">Is geweest</Badge> : null}
            </div>

            <h1 className="mt-3 text-3xl leading-tight md:text-4xl">{happening.title}</h1>

            {happening.summary ? (
              <p className="mt-4 text-lg leading-relaxed text-sand-700">{happening.summary}</p>
            ) : null}

            {image ? (
              <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-[1.5rem] border border-sand-300 bg-sage-100">
                <Image
                  src={image.url}
                  alt={image.alt || happening.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 48rem, 92vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            {happening.body ? <Prose markdown={happening.body} size="lg" className="mt-8" /> : null}

            {happening.images.length > 1 ? (
              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {happening.images.slice(1).map((extra) => (
                  <li
                    key={extra.url}
                    className="relative aspect-square overflow-hidden rounded-xl border border-sand-300"
                  >
                    <Image src={extra.url} alt={extra.alt} fill sizes="20rem" className="object-cover" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <div className="rounded-2xl border border-sand-300 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg font-semibold">Praktisch</h2>

              <dl className="mt-4 flex flex-col gap-3 text-sand-800">
                {happening.date ? (
                  <Detail icon="📅" label="Wanneer">
                    {formatDayMonthNL(happening.date)}
                    {happening.startTime ? (
                      <>
                        <br />
                        <span className="tabular">
                          {happening.startTime}
                          {happening.endTime ? `–${happening.endTime}` : ''}
                        </span>
                      </>
                    ) : null}
                  </Detail>
                ) : (
                  <Detail icon="📅" label="Wanneer">
                    Doorlopend
                  </Detail>
                )}

                {happening.location ? (
                  <Detail icon="📍" label="Waar">
                    {happening.location}
                  </Detail>
                ) : null}

                {happening.priceLabel ? (
                  <Detail icon="💶" label="Kosten">
                    {happening.priceLabel}
                  </Detail>
                ) : null}
              </dl>

              {happening.signupUrl && !past ? (
                <ButtonLink href={happening.signupUrl} fullWidth className="mt-6">
                  Aanmelden
                </ButtonLink>
              ) : null}

              {!happening.signupUrl && !past ? (
                <ButtonLink href="/contact" variant="secondary" fullWidth className="mt-6">
                  Vraag stellen
                </ButtonLink>
              ) : null}

              {happening.membersOnly ? (
                <p className="mt-4 text-sm text-sand-600">
                  Deze activiteit is voor leden van de{' '}
                  <Link href="/community" className="text-brand-700 underline underline-offset-2">
                    Met Mekaere Community
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </Container>

      {others.length ? (
        <Section tone="white">
          <Container>
            <SectionHeading title="Meer te doen" className="mb-8" />
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.id} className="flex">
                  <HappeningCard happening={other} className="w-full" />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {event ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(event)} />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(trail))}
      />
    </>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="text-lg">
        {icon}
      </span>
      <div>
        <dt className="text-sm text-sand-600">{label}</dt>
        <dd className="font-medium">{children}</dd>
      </div>
    </div>
  );
}
