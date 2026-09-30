'use client';

import { useState } from 'react';

import { AddonEditor } from '@/components/admin/addon-editor';
import { AttributeEditor } from '@/components/admin/attribute-editor';
import { ImageManager } from '@/components/admin/image-manager';
import { ActionButton, SaveForm } from '@/components/admin/save-form';
import { AdminCard } from '@/components/admin/ui';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import {
  deleteProductAction,
  duplicateProductAction,
  saveProductAction,
} from '@/app/admin/actions/products';
import { centsToInput } from '@/lib/money';
import { slugify } from '@/lib/utils';
import type { Category, Product, TierRule } from '@/types';

/**
 * Het bewerkscherm van één product.
 *
 * De volgorde volgt hoe je erover nadenkt: eerst wat het is, dan hoe het
 * eruitziet, dan wat het kost, en pas daarna de dingen die je één keer instelt.
 * Alles staat op één pagina met één opslaanknop — geen tabbladen waarin je
 * wijzigingen kwijtraakt.
 */
export function ProductForm({
  product,
  categories,
  tierRules,
  facets,
}: {
  product: Product | null;
  categories: Category[];
  tierRules: TierRule[];
  facets: { key: string; label: string }[];
}) {
  const isNew = product === null;
  const [title, setTitle] = useState(product?.title ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [stockTracked, setStockTracked] = useState(product?.stock.tracked ?? true);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  return (
    <SaveForm
      action={saveProductAction}
      saveLabel={isNew ? 'Product aanmaken' : 'Opslaan'}
      dirtyHint={
        isNew ? 'Nog niet opgeslagen.' : `Laatst gewijzigd ${new Date(product.updatedAt).toLocaleDateString('nl-NL')}`
      }
      extraActions={
        !isNew ? (
          <>
            <ActionButton
              action={duplicateProductAction}
              label="Dupliceren"
              pendingLabel="Kopiëren…"
              fields={{ id: product.id }}
            />
            <ActionButton
              action={deleteProductAction}
              label="Archiveren"
              pendingLabel="Archiveren…"
              variant="danger"
              confirm="Dit product uit de webshop halen? Bestaande bestellingen blijven gewoon leesbaar."
              fields={{ id: product.id }}
            />
          </>
        ) : null
      }
    >
      {!isNew ? <input type="hidden" name="id" value={product.id} /> : null}

      {/* Wat is het */}
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
            hint={`De pagina komt op /product/${effectiveSlug || '…'}. Verander dit niet meer als de pagina al gedeeld is.`}
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

          <Field label="Ondertitel" htmlFor="subtitle" hint="Klein regeltje onder de naam.">
            <Input id="subtitle" name="subtitle" defaultValue={product?.subtitle ?? ''} />
          </Field>

          <Field
            label="Korte omschrijving"
            htmlFor="shortDescription"
            hint="Deze zin staat op de productkaart in de webshop. Houd het bij één regel."
          >
            <Textarea
              id="shortDescription"
              name="shortDescription"
              rows={2}
              defaultValue={product?.shortDescription ?? ''}
            />
          </Field>

          <Field
            label="Volledige tekst"
            htmlFor="description"
            hint="Op de productpagina zelf. Een lege regel maakt een nieuwe alinea. Met **sterretjes** maak je iets vet, met een streepje aan het begin van de regel een opsomming."
          >
            <Textarea
              id="description"
              name="description"
              rows={10}
              defaultValue={product?.description ?? ''}
              className="font-mono text-sm"
            />
          </Field>
        </div>
      </AdminCard>

      {/* Foto's */}
      <AdminCard title="Foto’s">
        <ImageManager
          name="images"
          folder={effectiveSlug || 'producten'}
          initial={product?.images ?? []}
          hint="De eerste foto is de foto die overal in de lijsten wordt getoond. Sleep hem naar voren met de pijltjes."
        />
      </AdminCard>

      {/* Prijs */}
      <AdminCard title="Prijs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prijs" htmlFor="price" required hint="Inclusief btw, bijvoorbeeld 3,50.">
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              defaultValue={product ? centsToInput(product.priceCents) : ''}
              required
            />
          </Field>

          <Field
            label="Was-prijs"
            htmlFor="compareAtPrice"
            hint="Alleen invullen bij een aanbieding. Moet hoger zijn dan de prijs."
          >
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              inputMode="decimal"
              defaultValue={product?.compareAtPriceCents ? centsToInput(product.compareAtPriceCents) : ''}
            />
          </Field>

          <Field label="Btw" htmlFor="vatRate">
            <Select id="vatRate" name="vatRate" defaultValue={String(product?.vatRate ?? 0.21)}>
              <option value="0.21">21% — het meeste</option>
              <option value="0.09">9% — o.a. boeken</option>
              <option value="0">0% — vrijgesteld</option>
            </Select>
          </Field>

          <Field
            label="Staffelvoordeel"
            htmlFor="tierGroup"
            hint="Producten in dezelfde groep tellen hun aantallen bij elkaar op."
          >
            <Select id="tierGroup" name="tierGroup" defaultValue={product?.tierGroup ?? ''}>
              <option value="">Geen staffelvoordeel</option>
              {tierRules.map((rule) => (
                <option key={rule.group} value={rule.group}>
                  {rule.name} ({rule.group})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </AdminCard>

      {/* Voorraad en verzenden */}
      <AdminCard title="Voorraad en verzenden">
        <div className="flex flex-col gap-4">
          <Checkbox
            name="stockTracked"
            label="Voorraad bijhouden"
            description="Uit als je het altijd kunt leveren, bijvoorbeeld omdat je bijdrukt."
            checked={stockTracked}
            onChange={(e) => setStockTracked(e.target.checked)}
          />

          {stockTracked ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Aantal op voorraad" htmlFor="stockQuantity">
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  inputMode="numeric"
                  defaultValue={String(product?.stock.quantity ?? 0)}
                />
              </Field>

              <Field
                label="Waarschuwen vanaf"
                htmlFor="lowStockThreshold"
                hint="Op het overzicht zie je dan dat het bijna op is."
              >
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  inputMode="numeric"
                  defaultValue={String(product?.stock.lowStockThreshold ?? 3)}
                />
              </Field>

              <Checkbox
                name="allowBackorder"
                label="Doorverkopen als de voorraad op is"
                description="De klant kan blijven bestellen; jij zorgt dat het alsnog komt."
                defaultChecked={product?.stock.allowBackorder ?? false}
                className="sm:col-span-2"
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Gewicht in gram"
              htmlFor="weightGrams"
              hint="Bepaalt of iets nog door de brievenbus past."
            >
              <Input
                id="weightGrams"
                name="weightGrams"
                inputMode="numeric"
                defaultValue={String(product?.weightGrams ?? 0)}
              />
            </Field>

            <Field label="Hoe het verstuurd wordt" htmlFor="shippingClass">
              <Select
                id="shippingClass"
                name="shippingClass"
                defaultValue={product?.shippingClass ?? 'letterbox'}
              >
                <option value="letterbox">Past door de brievenbus</option>
                <option value="parcel">Als pakket</option>
                <option value="pickup_only">Alleen ophalen</option>
                <option value="digital">Digitaal, geen verzending</option>
              </Select>
            </Field>
          </div>
        </div>
      </AdminCard>

      {/* Keuzes */}
      <AdminCard
        title="Keuzes bij dit product"
        description="Extra’s die de klant erbij kan kiezen."
      >
        <AddonEditor name="addons" initial={product?.addons ?? []} />
      </AdminCard>

      {/* Indeling en filters */}
      <AdminCard title="Indeling en filters">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categorie" htmlFor="categorySlug">
              <Select
                id="categorySlug"
                name="categorySlug"
                defaultValue={product?.categorySlug ?? categories[0]?.slug ?? ''}
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Trefwoorden" htmlFor="tags" hint="Gescheiden door komma’s.">
              <Input id="tags" name="tags" defaultValue={product?.tags.join(', ') ?? ''} />
            </Field>
          </div>

          <div>
            <p className="mb-2 font-display text-sm font-semibold text-sand-800">Kenmerken</p>
            <AttributeEditor
              name="attributes"
              initial={product?.attributes ?? {}}
              suggestions={facets}
            />
          </div>
        </div>
      </AdminCard>

      {/* Vindbaarheid */}
      <AdminCard
        title="Vindbaarheid in Google"
        description="Laat je dit leeg, dan gebruiken we de naam en de korte omschrijving."
      >
        <div className="flex flex-col gap-4">
          <Field label="Titel in Google" htmlFor="seoTitle" hint="Ongeveer 60 tekens.">
            <Input id="seoTitle" name="seoTitle" defaultValue={product?.seo?.title ?? ''} />
          </Field>
          <Field
            label="Omschrijving in Google"
            htmlFor="seoDescription"
            hint="Ongeveer 155 tekens. Dit is het zinnetje onder de link."
          >
            <Textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              defaultValue={product?.seo?.description ?? ''}
            />
          </Field>
        </div>
      </AdminCard>

      {/* Zichtbaarheid */}
      <AdminCard title="Zichtbaarheid">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={product?.status ?? 'draft'}>
              <option value="draft">Concept — nog niet zichtbaar</option>
              <option value="active">In de webshop</option>
              <option value="archived">Archief — uit de webshop</option>
            </Select>
          </Field>

          <Field label="Volgorde" htmlFor="sortOrder" hint="Lager getal staat vooraan.">
            <Input
              id="sortOrder"
              name="sortOrder"
              inputMode="numeric"
              defaultValue={String(product?.sortOrder ?? 0)}
            />
          </Field>

          <Checkbox
            name="featured"
            label="Uitgelicht op de homepagina"
            defaultChecked={product?.featured ?? false}
            className="sm:col-span-2"
          />
        </div>
      </AdminCard>
    </SaveForm>
  );
}
