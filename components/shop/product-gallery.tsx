'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { StoredImage } from '@/types';

/**
 * De foto's bij een product. Eén grote afbeelding met miniaturen eronder.
 * Bij één foto verdwijnen de miniaturen vanzelf.
 */
export function ProductGallery({ images, title }: { images: StoredImage[]; title: string }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] border border-sand-300 bg-sand-200">
        <Image src="/logo.png" alt="" width={512} height={512} className="size-40 opacity-25" />
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-sand-300 bg-white shadow-soft">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt || title}
          fill
          priority
          sizes="(min-width: 1024px) 34rem, 92vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2.5">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Foto ${index + 1} van ${images.length}`}
                aria-current={index === active ? 'true' : undefined}
                className={cn(
                  'relative size-20 overflow-hidden rounded-xl border-2 transition-colors',
                  index === active ? 'border-brand-700' : 'border-sand-300 hover:border-sand-400',
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="5rem"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
