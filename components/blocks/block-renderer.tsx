import Image from 'next/image';
import Link from 'next/link';

import { DialectCard } from '@/components/dialect-card';
import { HappeningCard } from '@/components/happening-card';
import { NewsletterForm } from '@/components/newsletter-form';
import { ProductGrid } from '@/components/shop/product-card';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Container, Section, SectionHeading } from '@/components/ui/section';
import { Prose } from '@/components/ui/prose';
import { getActiveProducts, getTierRules } from '@/lib/data/catalog';
import { getDialectEntries, getHappenings } from '@/lib/data/content';
import { cn } from '@/lib/utils';
import type { Block } from '@/types';

/**
 * Rendert de blokken van een CMS-pagina.
 *
 * Elk bloktype is een klein, zelfstandig stuk pagina. De admin zet ze in
 * willekeurige volgorde achter elkaar; de afwisseling van achtergrondkleuren
 * gebeurt hier automatisch, zodat een pagina altijd ritme houdt zonder dat
 * iemand over vormgeving hoeft na te denken.
 */
export async function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} index={index} />
      ))}
    </>
  );
}

/**
 * Kiest een achtergrond die afwisselt met de vorige band. Blokken die zelf al
 * een kleur meebrengen (hero, cta) slaan dit over.
 */
function alternatingTone(index: number): 'plain' | 'white' {
  return index % 2 === 0 ? 'plain' : 'white';
}

async function BlockView({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    /* ---------------------------------------------------------------- */
    case 'hero': {
      const centered = block.align === 'center' || !block.image;

      return (
        <Section tone="plain" size="lg" className="relative overflow-hidden">
          {/* Zachte saliegroene gloed achter de kop. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-sage-200/50 blur-3xl"
          />
          <Container className="relative">
            <div
              className={cn(
                'grid items-center gap-10',
                !centered && 'md:grid-cols-[1.1fr_1fr] md:gap-14',
              )}
            >
              <div className={cn(centered && 'mx-auto max-w-3xl text-center')}>
                <h1 className="text-4xl leading-[1.08] text-balance md:text-5xl lg:text-[3.5rem]">
                  {block.title}
                </h1>
                {block.subtitle ? (
                  <p className="mt-4 font-display text-xl text-brand-700 md:text-2xl">{block.subtitle}</p>
                ) : null}
                {block.body ? (
                  <Prose
                    markdown={block.body}
                    size="lg"
                    className={cn('mt-5', centered && 'mx-auto')}
                  />
                ) : null}

                {block.ctas?.length ? (
                  <div
                    className={cn(
                      'mt-8 flex flex-wrap gap-3',
                      centered && 'justify-center',
                    )}
                  >
                    {block.ctas.map((cta) => (
                      <ButtonLink
                        key={cta.href}
                        href={cta.href}
                        variant={cta.variant ?? 'primary'}
                        size="lg"
                      >
                        {cta.label}
                      </ButtonLink>
                    ))}
                  </div>
                ) : null}
              </div>

              {block.image && !centered ? (
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-sand-300 bg-white shadow-lift">
                  <Image
                    src={block.image.url}
                    alt={block.image.alt}
                    fill
                    priority
                    sizes="(min-width: 768px) 32rem, 90vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'text':
      return (
        <Section tone={alternatingTone(index)}>
          <Container prose={block.narrow !== false}>
            {block.title ? <h2 className="mb-4 text-2xl md:text-3xl">{block.title}</h2> : null}
            <Prose markdown={block.body} size="lg" />
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'image':
      return (
        <Section tone={alternatingTone(index)} size="sm">
          <Container prose={!block.full}>
            <figure>
              <div className="relative overflow-hidden rounded-[1.5rem] border border-sand-300 bg-white shadow-soft">
                <Image
                  src={block.image.url}
                  alt={block.image.alt}
                  width={block.image.width ?? 1600}
                  height={block.image.height ?? 1000}
                  sizes={block.full ? '100vw' : '(min-width: 768px) 46rem, 90vw'}
                  className="h-auto w-full object-cover"
                />
              </div>
              {block.caption ? (
                <figcaption className="mt-3 text-center text-sm text-sand-600">{block.caption}</figcaption>
              ) : null}
            </figure>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'gallery':
      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            {block.title ? <SectionHeading title={block.title} className="mb-8" /> : null}
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {block.images.map((image) => (
                <li key={image.url} className="relative aspect-square overflow-hidden rounded-2xl border border-sand-300 bg-white">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 768px) 22rem, 45vw"
                    className="object-cover"
                  />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'cards': {
      const cols =
        block.columns === 2
          ? 'sm:grid-cols-2'
          : block.columns === 4
            ? 'sm:grid-cols-2 lg:grid-cols-4'
            : 'sm:grid-cols-2 lg:grid-cols-3';

      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            {block.title ? (
              <SectionHeading title={block.title} intro={block.intro} className="mb-10" />
            ) : null}
            <ul className={cn('grid gap-5', cols)}>
              {block.items.map((item) => {
                const inner = (
                  <>
                    {item.image ? (
                      <div className="relative mb-4 aspect-[3/2] overflow-hidden rounded-xl bg-sage-100">
                        <Image
                          src={item.image.url}
                          alt={item.image.alt}
                          fill
                          sizes="(min-width: 640px) 22rem, 90vw"
                          className="object-cover"
                        />
                      </div>
                    ) : item.icon ? (
                      <span aria-hidden className="mb-3 block text-3xl">
                        {item.icon}
                      </span>
                    ) : null}
                    <h3 className="font-display text-lg font-semibold text-sand-900">{item.title}</h3>
                    {item.body ? (
                      <p className="mt-2 leading-relaxed text-sand-700">{item.body}</p>
                    ) : null}
                  </>
                );

                return (
                  <li
                    key={item.title}
                    className={cn(
                      'relative rounded-2xl border border-sand-300 bg-white p-6 shadow-soft',
                      item.href && 'transition-shadow hover:shadow-lift',
                    )}
                  >
                    {item.href ? (
                      <>
                        {inner}
                        <Link href={item.href} className="absolute inset-0" aria-label={item.title} />
                      </>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'products': {
      const [all, tierRules] = await Promise.all([getActiveProducts(), getTierRules()]);
      const limit = block.limit ?? 4;

      let selection = all;
      if (block.source === 'featured') selection = all.filter((p) => p.featured);
      else if (block.source === 'category' && block.categorySlug) {
        selection = all.filter((p) => p.categorySlug === block.categorySlug);
      } else if (block.source === 'slugs' && block.slugs?.length) {
        const order = new Map(block.slugs.map((s, i) => [s, i]));
        selection = all
          .filter((p) => order.has(p.slug))
          .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
      }

      // Nog niets uitgelicht? Val terug op de eerste producten, zodat de
      // homepage niet leeg oogt zolang de shop nog wordt gevuld.
      if (!selection.length && block.source === 'featured') selection = all;
      if (!selection.length) return null;

      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              {block.title ? <SectionHeading title={block.title} intro={block.intro} /> : <span />}
              {block.cta ? (
                <ButtonLink href={block.cta.href} variant="secondary">
                  {block.cta.label}
                </ButtonLink>
              ) : null}
            </div>
            <ProductGrid products={selection.slice(0, limit)} tierRules={tierRules} />
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'cta': {
      const tone = block.tone ?? 'brand';
      return (
        <Section tone={tone === 'cream' ? 'cream' : tone === 'sage' ? 'sage' : 'brand'}>
          <Container>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className={cn('text-2xl md:text-3xl', tone === 'brand' && 'text-sand-50')}>
                  {block.title}
                </h2>
                {block.body ? (
                  <p
                    className={cn(
                      'mt-3 text-lg leading-relaxed',
                      tone === 'brand' ? 'text-sand-100' : 'text-sand-700',
                    )}
                  >
                    {block.body}
                  </p>
                ) : null}
              </div>
              <ButtonLink
                href={block.button.href}
                variant={tone === 'brand' ? 'secondary' : 'primary'}
                size="lg"
                className="shrink-0"
              >
                {block.button.label}
              </ButtonLink>
            </div>
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'quote':
      return (
        <Section tone="sage">
          <Container prose>
            <figure className="text-center">
              <blockquote className="font-display text-2xl leading-snug text-balance text-sage-900 md:text-3xl">
                “{block.text}”
              </blockquote>
              {block.author ? (
                <figcaption className="mt-5 font-display text-sm tracking-wider text-sage-700 uppercase">
                  {block.author}
                </figcaption>
              ) : null}
            </figure>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'faq':
      return (
        <Section tone={alternatingTone(index)}>
          <Container prose>
            {block.title ? <h2 className="mb-6 text-2xl md:text-3xl">{block.title}</h2> : null}
            <div className="flex flex-col gap-3">
              {block.items.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-sand-300 bg-white px-5 py-4 shadow-soft"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display font-semibold text-sand-900 marker:hidden">
                    {item.q}
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5 shrink-0 text-brand-700 transition-transform group-open:rotate-45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </summary>
                  <Prose markdown={item.a} className="mt-3" />
                </details>
              ))}
            </div>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'newsletter':
      return (
        <Section tone="cream">
          <Container prose className="text-center">
            <h2 className="text-2xl md:text-3xl">{block.title ?? 'Blijf op de hoogte'}</h2>
            {block.body ? <p className="mt-3 text-lg text-sand-700">{block.body}</p> : null}
            <NewsletterForm source="pagina" className="mt-6 text-left" />
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'activities': {
      const happenings = (await getHappenings()).slice(0, block.limit ?? 3);
      if (!happenings.length) return null;

      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading title={block.title ?? 'Te doen en te beleven'} intro={block.intro} />
              <ButtonLink href="/doen-en-beleven" variant="secondary">
                Alles bekijken
              </ButtonLink>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {happenings.map((happening) => (
                <li key={happening.id} className="flex">
                  <HappeningCard happening={happening} className="w-full" />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'dialect': {
      const entries = await getDialectEntries();
      const selection = entries.filter((e) => e.featured).concat(entries.filter((e) => !e.featured));
      const shown = selection.slice(0, block.limit ?? 6);
      if (!shown.length) return null;

      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading
                eyebrow="Fluffy Dialect"
                title={block.title ?? 'Woorden van hier'}
                intro={block.intro}
              />
              <ButtonLink href="/fluffy-dialect" variant="secondary">
                Meer woorden
              </ButtonLink>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((entry) => (
                <li key={entry.id} className="flex">
                  <DialectCard entry={entry} className="w-full" />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      );
    }

    /* ---------------------------------------------------------------- */
    case 'membership':
      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            <div className="mx-auto max-w-3xl overflow-hidden rounded-[1.75rem] border border-sand-300 bg-white shadow-lift">
              <div className="bg-brand-700 px-6 py-7 text-center text-sand-50 md:px-10">
                <h2 className="text-2xl md:text-3xl">{block.title}</h2>
                {block.priceLabel ? (
                  <p className="mt-2 font-display text-3xl font-bold md:text-4xl">{block.priceLabel}</p>
                ) : null}
              </div>

              <div className="px-6 py-7 md:px-10 md:py-9">
                {block.body ? <Prose markdown={block.body} /> : null}

                {block.perks.length ? (
                  <ul className="mt-6 flex flex-col gap-3">
                    {block.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-3">
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 size-5 shrink-0 text-sage-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          aria-hidden
                        >
                          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="leading-relaxed text-sand-800">{perk}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {block.button ? (
                  <ButtonLink href={block.button.href} size="lg" fullWidth className="mt-7">
                    {block.button.label}
                  </ButtonLink>
                ) : null}

                {block.footnote ? (
                  <p className="mt-4 text-center text-sm text-sand-600">{block.footnote}</p>
                ) : null}
              </div>
            </div>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'steps':
      return (
        <Section tone={alternatingTone(index)}>
          <Container>
            {block.title ? (
              <SectionHeading title={block.title} intro={block.intro} className="mb-10" />
            ) : null}
            <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {block.items.map((item, i) => (
                <li key={item.title} className="relative pl-14">
                  <span
                    aria-hidden
                    className="absolute top-0 left-0 inline-flex size-10 items-center justify-center rounded-full bg-sage-200 font-display text-lg font-bold text-sage-900"
                  >
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-sand-900">{item.title}</h3>
                  {item.body ? (
                    <p className="mt-1.5 leading-relaxed text-sand-700">{item.body}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Container>
        </Section>
      );

    /* ---------------------------------------------------------------- */
    case 'spacer':
      return (
        <div
          aria-hidden
          className={block.size === 'sm' ? 'h-6' : block.size === 'lg' ? 'h-20' : 'h-12'}
        />
      );

    default: {
      // Schema-uitbreiding zonder bijbehorende weergave: stilletjes overslaan.
      const exhaustive: never = block;
      void exhaustive;
      return null;
    }
  }
}

/** Losse export: handig om ergens een enkel thema-label te tonen. */
export { Badge };
