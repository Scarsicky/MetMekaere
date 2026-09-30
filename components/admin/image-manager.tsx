'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StoredImage } from '@/types';

/**
 * Foto's beheren: uploaden, op volgorde zetten, beschrijving invullen,
 * weghalen.
 *
 * Twee manieren om de lijst mee te krijgen:
 *  - geef `name` mee, dan gaat hij als JSON in een verborgen veld en slaat het
 *    omliggende formulier hem gewoon mee op;
 *  - geef `onChange` mee, dan houdt de aanroeper de lijst zelf bij. Dat is
 *    nodig binnen een blok van een pagina, want dat wordt als geheel opgeslagen.
 *
 * De eerste foto is de foto die overal in de lijsten wordt getoond; dat staat
 * er ook bij, want dat is niet vanzelf duidelijk.
 */
export function ImageManager({
  name,
  folder,
  initial,
  onChange,
  label = 'Foto’s',
  hint,
  max = 8,
}: {
  /** Naam van het verborgen veld met de JSON. Laat weg als je `onChange` gebruikt. */
  name?: string;
  /** Map in de opslag, bijvoorbeeld de slug van het product. */
  folder: string;
  initial: StoredImage[];
  /**
   * Wordt bij elke wijziging aangeroepen. Nodig wanneer de foto's ergens
   * anders in een groter geheel worden bewaard — bijvoorbeeld binnen een blok
   * van een pagina, dat zelf als JSON wordt opgeslagen.
   */
  onChange?: (images: StoredImage[]) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const [images, setImagesState] = useState<StoredImage[]>(initial);
  const [busy, setBusy] = useState(false);

  /**
   * Eén plek waar de lijst verandert, zodat `onChange` nooit wordt vergeten.
   * De nieuwe waarde wordt buiten de state-updater berekend: React mag tijdens
   * een updater geen andere component bijwerken.
   */
  function setImages(next: StoredImage[] | ((current: StoredImage[]) => StoredImage[])) {
    const value = typeof next === 'function' ? next(images) : next;
    setImagesState(value);
    onChange?.(value);
  }

  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);

    const room = max - images.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (chosen.length < files.length) {
      setError(`Er passen er nog ${room}. De rest is overgeslagen.`);
    }

    for (const file of chosen) {
      const data = new FormData();
      data.set('file', file);
      data.set('folder', folder || 'algemeen');

      try {
        const response = await fetch('/api/admin/upload', { method: 'POST', body: data });
        const result = (await response.json()) as
          | { ok: true; path: string; url: string }
          | { ok: false; error: string };

        if (!result.ok) {
          setError(result.error);
          continue;
        }
        setImages((current) => [
          ...current,
          { path: result.path, url: result.url, alt: '' },
        ]);
      } catch {
        setError('Uploaden lukte niet. Controleer je verbinding en probeer het nog eens.');
      }
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function move(index: number, delta: number) {
    setImages((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function remove(index: number) {
    const image = images[index];
    setImages((current) => current.filter((_, i) => i !== index));

    // Ook uit de opslag halen, zodat er geen losse bestanden blijven staan.
    if (image.path) {
      await fetch(`/api/admin/upload?path=${encodeURIComponent(image.path)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }

  function setAlt(index: number, alt: string) {
    setImages((current) => current.map((image, i) => (i === index ? { ...image, alt } : image)));
  }

  return (
    <div className="flex flex-col gap-4">
      {name ? <input type="hidden" name={name} value={JSON.stringify(images)} /> : null}

      <div>
        <p className="font-display text-sm font-semibold text-sand-800">{label}</p>
        {hint ? <p className="mt-1 text-sm text-sand-600">{hint}</p> : null}
      </div>

      {images.length ? (
        <ul className="flex flex-col gap-3">
          {images.map((image, index) => (
            <li
              key={image.path || image.url}
              className="flex gap-4 rounded-xl border border-sand-300 bg-white p-3"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-sand-200">
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="6rem"
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {index === 0 ? (
                  <p className="font-display text-xs font-bold tracking-wide text-sage-700 uppercase">
                    Hoofdfoto
                  </p>
                ) : null}

                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-sand-700">
                    Beschrijving <span className="text-sand-500">(voor wie de foto niet ziet)</span>
                  </span>
                  <input
                    type="text"
                    value={image.alt}
                    onChange={(e) => setAlt(index, e.target.value)}
                    placeholder="Bijvoorbeeld: kaart met de tekst 'veur mekaere'"
                    className="rounded-lg border border-sand-300 px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap gap-1.5">
                  <IconButton label="Naar voren" onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </IconButton>
                  <IconButton
                    label="Naar achteren"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                  >
                    ↓
                  </IconButton>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded-lg px-2.5 py-1 text-sm text-brand-700 transition-colors hover:bg-brand-50"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-sand-400 px-4 py-6 text-center text-sm text-sand-600">
          Nog geen foto’s. De eerste die je toevoegt wordt de hoofdfoto.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-sm font-medium text-brand-700">
          {error}
        </p>
      ) : null}

      <div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => upload(e.target.files)}
          className="sr-only"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy || images.length >= max}
        >
          {busy ? 'Bezig met uploaden…' : images.length ? 'Nog een foto toevoegen' : 'Foto toevoegen'}
        </Button>
        {images.length >= max ? (
          <span className="ml-3 text-sm text-sand-600">Maximaal {max} foto’s.</span>
        ) : null}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border border-sand-300 text-sand-800 transition-colors',
        'hover:bg-sand-100 disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}
