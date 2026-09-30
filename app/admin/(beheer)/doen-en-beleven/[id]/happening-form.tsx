'use client';

import { useState } from 'react';

import { deleteHappeningAction, saveHappeningAction } from '@/app/admin/actions/content';
import { ImageManager } from '@/components/admin/image-manager';
import { ActionButton, SaveForm } from '@/components/admin/save-form';
import { AdminCard } from '@/components/admin/ui';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { slugify } from '@/lib/utils';
import { HAPPENING_THEMES, type Happening } from '@/types';

export function HappeningForm({ happening }: { happening: Happening | null }) {
  const isNew = happening === null;
  const [title, setTitle] = useState(happening?.title ?? '');
  const [slug, setSlug] = useState(happening?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(happening?.slug));

  const effectiveSlug = slugTouched ? slug : slugify(title);

  return (
    <SaveForm
      action={saveHappeningAction}
      saveLabel={isNew ? 'Activiteit aanmaken' : 'Opslaan'}
      extraActions={
        !isNew ? (
          <ActionButton
            action={deleteHappeningAction}
            label="Verwijderen"
            pendingLabel="Verwijderen…"
            variant="danger"
            confirm="Deze activiteit definitief verwijderen?"
            fields={{ id: happening.id }}
          />
        ) : null
      }
    >
      {!isNew ? <input type="hidden" name="id" value={happening.id} /> : null}

      <AdminCard title="Wat het is">
        <div className="flex flex-col gap-4">
          <Field label="Naam" htmlFor="title" required>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>

          <Field
            label="Webadres"
            htmlFor="slug"
            hint={`De pagina komt op /doen-en-beleven/${effectiveSlug || '…'}`}
          >
            <Input
              id="slug"
              name="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
          </Field>

          <Field
            label="Korte samenvatting"
            htmlFor="summary"
            hint="Twee regels, zichtbaar op de kaartjes in het overzicht."
          >
            <Textarea id="summary" name="summary" rows={2} defaultValue={happening?.summary ?? ''} />
          </Field>

          <Field
            label="Volledig verhaal"
            htmlFor="body"
            hint="Op de pagina zelf. Een lege regel maakt een nieuwe alinea."
          >
            <Textarea
              id="body"
              name="body"
              rows={8}
              className="font-mono text-sm"
              defaultValue={happening?.body ?? ''}
            />
          </Field>

          <Field label="Thema" htmlFor="theme">
            <Select id="theme" name="theme" defaultValue={happening?.theme ?? HAPPENING_THEMES[0]}>
              {HAPPENING_THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="Foto’s">
        <ImageManager
          name="images"
          folder={effectiveSlug || 'activiteiten'}
          initial={happening?.images ?? []}
          max={6}
        />
      </AdminCard>

      <AdminCard title="Wanneer en waar">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Datum" htmlFor="date" optional hint="Leeg = doorlopend.">
              <Input id="date" name="date" type="date" defaultValue={happening?.date ?? ''} />
            </Field>
            <Field label="Begintijd" htmlFor="startTime" optional>
              <Input id="startTime" name="startTime" type="time" defaultValue={happening?.startTime ?? ''} />
            </Field>
            <Field label="Eindtijd" htmlFor="endTime" optional>
              <Input id="endTime" name="endTime" type="time" defaultValue={happening?.endTime ?? ''} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Locatie" htmlFor="location" optional>
              <Input id="location" name="location" defaultValue={happening?.location ?? ''} />
            </Field>
            <Field label="Kosten" htmlFor="priceLabel" optional hint="Vrije tekst, bijv. ‘Gratis’.">
              <Input id="priceLabel" name="priceLabel" defaultValue={happening?.priceLabel ?? ''} />
            </Field>
          </div>

          <Field
            label="Aanmeldlink"
            htmlFor="signupUrl"
            optional
            hint="Een externe pagina waar mensen zich kunnen opgeven."
          >
            <Input id="signupUrl" name="signupUrl" type="url" defaultValue={happening?.signupUrl ?? ''} />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="Vindbaarheid in Google">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel in Google" htmlFor="seoTitle" optional>
            <Input id="seoTitle" name="seoTitle" defaultValue={happening?.seo?.title ?? ''} />
          </Field>
          <Field label="Omschrijving in Google" htmlFor="seoDescription" optional>
            <Textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              defaultValue={happening?.seo?.description ?? ''}
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard title="Zichtbaarheid">
        <div className="flex flex-col gap-4">
          <Checkbox
            name="published"
            label="Zichtbaar op de website"
            defaultChecked={happening?.status === 'published'}
          />
          <Checkbox
            name="featured"
            label="Uitgelicht"
            description="Staat vooraan bij de doorlopende activiteiten."
            defaultChecked={happening?.featured ?? false}
          />
          <Checkbox
            name="membersOnly"
            label="Alleen voor leden van de Community"
            defaultChecked={happening?.membersOnly ?? false}
          />
          <Field label="Volgorde" htmlFor="sortOrder" hint="Alleen voor activiteiten zonder datum.">
            <Input
              id="sortOrder"
              name="sortOrder"
              inputMode="numeric"
              defaultValue={String(happening?.sortOrder ?? 0)}
            />
          </Field>
        </div>
      </AdminCard>
    </SaveForm>
  );
}
