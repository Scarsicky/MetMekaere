import { describe, expect, it } from 'vitest';

import { targetSize } from '@/lib/admin/shrink-image';

/**
 * De aanleiding: foto's gingen ongewijzigd de opslag in, en omdat App Hosting
 * de beeldoptimalisatie van Next uitzet, haalde elke bezoeker het origineel
 * binnen — tot 5 MB per plaatje.
 */

describe('nieuwe afmetingen bij het verkleinen', () => {
  it('laat een foto die al klein genoeg is met rust', () => {
    expect(targetSize(1200, 1500)).toBeNull();
    expect(targetSize(1600, 1200)).toBeNull();
  });

  it('vergroot nooit', () => {
    // Anders wordt een klein logo een groter én onscherper bestand.
    expect(targetSize(300, 300)).toBeNull();
    expect(targetSize(64, 64)).toBeNull();
  });

  it('schaalt op de langste zijde, staand of liggend', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('houdt de verhouding aan', () => {
    const result = targetSize(4032, 3024)!;
    expect(result.width / result.height).toBeCloseTo(4032 / 3024, 2);
  });

  it('rekent een extreem brede foto netjes om', () => {
    // Een panorama mag niet in een deling door nul of een hoogte van 0 eindigen.
    const result = targetSize(8000, 500)!;
    expect(result.width).toBe(1600);
    expect(result.height).toBe(100);
  });
});
