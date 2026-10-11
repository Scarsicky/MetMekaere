import type { ImageOrientation } from '@/types';

/**
 * Hoe productfoto's worden getoond.
 *
 * Bewust zonder `server-only`: de productpagina doet dit op de server, maar de
 * galerij is een clientcomponent en moet er ook bij.
 *
 * De klassen staan hier voluit en niet samengesteld uit stukjes. Tailwind
 * leest de broncode om te bepalen welke CSS het bouwt; een naam die pas tijdens
 * het draaien ontstaat, zoals `aspect-[${x}]`, bestaat dan niet in de stylesheet.
 */
export const ASPECT_CLASS: Record<ImageOrientation, string> = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[5/4]',
};

/**
 * In het overzicht houdt elke tegel dezelfde vorm, anders wordt het raster
 * rommelig en staan de titels niet meer op één lijn. Een liggende foto wordt
 * daarom niet bijgesneden maar passend getoond, met wat lucht eromheen — dat
 * leest als een ingelijst ontwerp in plaats van als een fout.
 */
export const GRID_TILE_ASPECT = ASPECT_CLASS.portrait;

export function gridImageFit(orientation: ImageOrientation): string {
  return orientation === 'landscape' ? 'object-contain p-4' : 'object-cover';
}
