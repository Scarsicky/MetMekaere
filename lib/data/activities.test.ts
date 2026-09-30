import { describe, expect, it } from 'vitest';

import { countFilledDays, isPlaceholderTitle } from '@/lib/data/activities';
import type { AdventActivity } from '@/types';

/**
 * De adventskalender deelt zijn gegevens met de oude advent-app. Die vulde
 * nieuwe dagen met een plaatshouder ('Dag 1', 'Dag 2', …), en die staan nog in
 * de database van het echte project. Zouden we die als echte titel behandelen,
 * dan meldt de kalender 24 ingevulde dagen terwijl er niets in staat.
 */

function day(overrides: Partial<AdventActivity> & { day: number }): AdventActivity {
  return {
    title: '',
    body: '',
    location: '',
    time: '',
    endTime: '',
    costEUR: 0,
    emoji: '',
    ...overrides,
  };
}

describe('plaatshouders uit de oude advent-app', () => {
  it('herkent de plaatshouder van de bijbehorende dag', () => {
    expect(isPlaceholderTitle('Dag 1', 1)).toBe(true);
    expect(isPlaceholderTitle('Dag 24', 24)).toBe(true);
    // De oude app schreef zonder spatie-variatie, maar we zijn soepel.
    expect(isPlaceholderTitle('dag 7', 7)).toBe(true);
    expect(isPlaceholderTitle('Dag7', 7)).toBe(true);
    expect(isPlaceholderTitle('  Dag 7  ', 7)).toBe(true);
  });

  it('laat een plaatshouder van een ándere dag met rust', () => {
    // Staat er 'Dag 3' bij dag 7, dan heeft iemand dat zelf getypt.
    expect(isPlaceholderTitle('Dag 3', 7)).toBe(false);
    expect(isPlaceholderTitle('Dag 12', 1)).toBe(false);
  });

  it('laat echte titels met rust', () => {
    expect(isPlaceholderTitle('Dag van de koffie', 1)).toBe(false);
    expect(isPlaceholderTitle('Koffie-uurtje', 1)).toBe(false);
    expect(isPlaceholderTitle('Dag 1 van de winter', 1)).toBe(false);
    expect(isPlaceholderTitle('', 1)).toBe(false);
  });
});

describe('tellen hoeveel dagen echt zijn ingevuld', () => {
  it('telt een lege kalender als nul', () => {
    const activities = Array.from({ length: 24 }, (_, i) => day({ day: i + 1 }));
    expect(countFilledDays(activities)).toBe(0);
  });

  it('telt alleen de dagen met een echte titel', () => {
    const activities = [
      day({ day: 1, title: 'Koffie-uurtje' }),
      day({ day: 2, title: '' }),
      day({ day: 3, title: 'Samen iets maken' }),
      day({ day: 4, title: '   ' }),
    ];
    expect(countFilledDays(activities)).toBe(2);
  });
});
