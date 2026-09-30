'use client';

import { useEffect, useRef, useState } from 'react';

import { formatCents } from '@/lib/money';
import { cn, truncate } from '@/lib/utils';
import type { AdventActivity } from '@/types';

/**
 * De adventskalender.
 *
 * Overgenomen uit de bestaande advent-app, met dezelfde opzet: 24 vakjes plus
 * twee feestdagen, de dag van vandaag uitgelicht, en een venster met de
 * details. Alle vakjes zijn het hele seizoen aanklikbaar — dat was in de
 * oorspronkelijke kalender ook zo, en het werkt: mensen kijken graag vooruit.
 */

const FINISH_DAYS = [
  { label: '25 december', note: 'Eerste kerstdag' },
  { label: '26 december', note: 'Tweede kerstdag' },
];

export function AdventCalendar({
  activities,
  today,
}: {
  activities: AdventActivity[];
  /** De dag van december van vandaag, of null buiten december. */
  today: number | null;
}) {
  const [selected, setSelected] = useState<AdventActivity | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {activities.map((activity) => {
          const isToday = today === activity.day;
          const hasContent = Boolean(activity.title.trim());

          return (
            <li key={activity.day}>
              <button
                type="button"
                onClick={() => setSelected(activity)}
                aria-label={`${activity.day} december${hasContent ? `: ${activity.title}` : ', nog niet ingevuld'}`}
                className={cn(
                  'flex h-full min-h-36 w-full flex-col overflow-hidden rounded-2xl border text-left transition-shadow',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
                  isToday
                    ? 'border-brand-700 bg-sage-200 shadow-lift'
                    : 'border-sand-300 bg-white shadow-soft hover:shadow-lift',
                )}
              >
                <span
                  className={cn(
                    'block px-3 py-2 text-center font-display font-bold',
                    isToday ? 'bg-brand-700 text-sand-50' : 'bg-sage-200 text-sand-900',
                  )}
                >
                  {activity.day} december
                  {isToday ? <span className="ml-1.5 font-normal">· vandaag</span> : null}
                </span>

                <span className="flex flex-1 flex-col justify-center gap-1 px-3 py-4 text-center">
                  {activity.emoji ? (
                    <span aria-hidden className="text-2xl">
                      {activity.emoji}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'font-display leading-snug',
                      hasContent ? 'font-semibold text-sand-900' : 'text-sand-500 italic',
                    )}
                  >
                    {hasContent ? truncate(activity.title, 60) : 'Nog even geduld'}
                  </span>
                  {activity.time ? (
                    <span className="text-sm text-sand-600 tabular">{activity.time}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}

        {FINISH_DAYS.map((day) => (
          <li key={day.label}>
            <div className="flex h-full min-h-36 flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 px-3 py-4 text-center text-sand-50">
              <span aria-hidden className="text-2xl">
                🎄
              </span>
              <span className="font-display text-lg font-bold">{day.label}</span>
              <span className="text-sm text-brand-100">{day.note}</span>
            </div>
          </li>
        ))}
      </ul>

      <DayDialog activity={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/** Het detailvenster. Gebruikt het echte `<dialog>`, dus Escape en focus werken vanzelf. */
function DayDialog({
  activity,
  onClose,
}: {
  activity: AdventActivity | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (activity && !dialog.open) dialog.showModal();
    if (!activity && dialog.open) dialog.close();

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [activity, onClose]);

  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        // Klikken naast de kaart sluit het venster.
        if (event.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-lg rounded-2xl border-0 bg-transparent p-0 backdrop:bg-sand-900/45 backdrop:backdrop-blur-sm"
    >
      {activity ? (
        <div className="rounded-2xl bg-white p-6 shadow-lift">
          <p className="font-display text-sm font-bold tracking-wide text-brand-700 uppercase">
            {activity.day} december
          </p>

          <h2 className="mt-1.5 text-2xl leading-tight">
            {activity.emoji ? <span className="mr-2">{activity.emoji}</span> : null}
            {activity.title || 'Nog even geduld'}
          </h2>

          {activity.body ? (
            <p className="mt-3 leading-relaxed whitespace-pre-line text-sand-800">{activity.body}</p>
          ) : (
            <p className="mt-3 text-sand-600">
              Deze dag is nog niet ingevuld. Kom binnenkort nog eens kijken.
            </p>
          )}

          {activity.location || activity.time || activity.costEUR > 0 ? (
            <ul className="mt-5 flex flex-col gap-2 border-t border-sand-200 pt-4 text-sand-700">
              {activity.location ? (
                <li className="flex items-center gap-2.5">
                  <span aria-hidden>📍</span>
                  {activity.location}
                </li>
              ) : null}
              {activity.time ? (
                <li className="flex items-center gap-2.5">
                  <span aria-hidden>🕒</span>
                  <span className="tabular">
                    {activity.time}
                    {activity.endTime ? `–${activity.endTime}` : ''}
                  </span>
                </li>
              ) : null}
              {activity.costEUR > 0 ? (
                <li className="flex items-center gap-2.5">
                  <span aria-hidden>💶</span>
                  <span className="tabular">{formatCents(Math.round(activity.costEUR * 100))}</span>
                </li>
              ) : null}
            </ul>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="min-h-11 rounded-full bg-brand-700 px-5 font-display font-semibold text-sand-50 transition-colors hover:bg-brand-800"
            >
              Sluiten
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
