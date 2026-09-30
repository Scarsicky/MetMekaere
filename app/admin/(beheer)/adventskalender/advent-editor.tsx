'use client';

import { useState } from 'react';

import { saveAdventDaysAction } from '@/app/admin/actions/content';
import { MiniField, MiniInput } from '@/components/admin/list-editor';
import { SaveForm } from '@/components/admin/save-form';
import { AdminCard } from '@/components/admin/ui';
import type { AdventActivity } from '@/types';

const EMOJI = ['🎄','⭐','❄️','🎁','🕯️','🍪','☕','🎶','🧑‍🎄','🦌','🌟','👪','📷','🧣','🧤','🛷','🥰','✨','🎀','💪'];

interface Draft {
  day: number;
  title: string;
  body: string;
  location: string;
  time: string;
  endTime: string;
  cost: string;
  emoji: string;
}

/**
 * De 24 dagen van de adventskalender.
 *
 * Alle dagen staan onder elkaar, ingeklapt, met de ingevulde dagen herkenbaar.
 * Zo zie je in één oogopslag welke dagen nog leeg zijn — dat is meestal de
 * vraag die je hebt als je hieraan werkt.
 */
export function AdventEditor({ activities }: { activities: AdventActivity[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    activities.map((activity) => ({
      day: activity.day,
      title: activity.title,
      body: activity.body,
      location: activity.location,
      time: activity.time,
      endTime: activity.endTime,
      cost: activity.costEUR ? String(activity.costEUR).replace('.', ',') : '',
      emoji: activity.emoji,
    })),
  );

  const filled = drafts.filter((d) => d.title.trim()).length;

  function update(day: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  return (
    <SaveForm action={saveAdventDaysAction} saveLabel="Kalender opslaan" dirtyHint={`${filled} van de 24 dagen ingevuld`}>
      <input type="hidden" name="days" value={JSON.stringify(drafts)} />

      <AdminCard className="border-sage-300 bg-sage-50">
        <p className="text-sand-800">
          Deze kalender deelt zijn gegevens met de bestaande adventskalender-app. Wat je hier
          aanpast, zie je daar ook — en andersom.
        </p>
      </AdminCard>

      <ul className="flex flex-col gap-2">
        {drafts.map((draft) => {
          const isFilled = Boolean(draft.title.trim());

          return (
            <li key={draft.day}>
              <details
                className={
                  isFilled
                    ? 'rounded-xl border border-sage-300 bg-white'
                    : 'rounded-xl border border-dashed border-sand-400 bg-white/60'
                }
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sand-200 font-display font-bold tabular">
                    {draft.day}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-semibold text-sand-900">
                      {draft.emoji ? `${draft.emoji} ` : ''}
                      {draft.title || <span className="font-normal text-sand-500">Nog leeg</span>}
                    </span>
                    {draft.location || draft.time ? (
                      <span className="block truncate text-sm text-sand-600">
                        {[draft.location, draft.time].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                  <span aria-hidden className="text-sand-500">
                    ▾
                  </span>
                </summary>

                <div className="flex flex-col gap-3 border-t border-sand-200 px-4 py-4">
                  <MiniField label="Titel">
                    <MiniInput
                      value={draft.title}
                      onChange={(title) => update(draft.day, { title })}
                      placeholder="Koffie-uurtje in het dorpshuis"
                    />
                  </MiniField>

                  <MiniField label="Omschrijving">
                    <textarea
                      value={draft.body}
                      onChange={(e) => update(draft.day, { body: e.target.value })}
                      rows={3}
                      className="rounded-lg border border-sand-300 px-3 py-2 text-sm leading-relaxed focus:border-brand-400 focus:outline-none"
                      placeholder="Wat gaan we doen, en voor wie is het?"
                    />
                  </MiniField>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniField label="Waar">
                      <MiniInput
                        value={draft.location}
                        onChange={(location) => update(draft.day, { location })}
                        placeholder="Het dorpshuis"
                      />
                    </MiniField>

                    <MiniField label="Kosten in euro" hint="Leeg of 0 = gratis.">
                      <MiniInput
                        value={draft.cost}
                        inputMode="decimal"
                        onChange={(cost) => update(draft.day, { cost })}
                        placeholder="2,50"
                      />
                    </MiniField>

                    <MiniField label="Begintijd">
                      <MiniInput
                        value={draft.time}
                        type="time"
                        onChange={(time) => update(draft.day, { time })}
                      />
                    </MiniField>

                    <MiniField label="Eindtijd">
                      <MiniInput
                        value={draft.endTime}
                        type="time"
                        onChange={(endTime) => update(draft.day, { endTime })}
                      />
                    </MiniField>
                  </div>

                  <div>
                    <p className="mb-2 font-display text-sm font-semibold text-sand-800">Icoontje</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => update(draft.day, { emoji: '' })}
                        className={
                          draft.emoji === ''
                            ? 'rounded-lg border-2 border-brand-700 px-2.5 py-1 text-sm'
                            : 'rounded-lg border border-sand-300 px-2.5 py-1 text-sm hover:bg-sand-100'
                        }
                      >
                        geen
                      </button>
                      {EMOJI.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => update(draft.day, { emoji })}
                          aria-label={`Icoontje ${emoji}`}
                          className={
                            draft.emoji === emoji
                              ? 'rounded-lg border-2 border-brand-700 px-2 py-1 text-lg'
                              : 'rounded-lg border border-sand-300 px-2 py-1 text-lg hover:bg-sand-100'
                          }
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </SaveForm>
  );
}
