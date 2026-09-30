'use client';

import { type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Het kader van de lijstschermen (categorieën, staffels, codes, tarieven).
 *
 * Elke regel is een kaartje met zijn eigen velden, een knop om hem te
 * verplaatsen en een knop om hem weg te halen. De volgorde van de kaartjes is
 * ook de volgorde op de website, dus die moet je met de hand kunnen zetten.
 */
export function ListEditor<T>({
  items,
  setItems,
  makeNew,
  addLabel,
  emptyText,
  renderItem,
  itemKey,
  reorderable = true,
}: {
  items: T[];
  setItems: (next: T[]) => void;
  makeNew: () => T;
  addLabel: string;
  emptyText: string;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  itemKey: (item: T, index: number) => string;
  reorderable?: boolean;
}) {
  function update(index: number, patch: Partial<T>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-400 px-4 py-8 text-center text-sand-600">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item, index) => (
            <li key={itemKey(item, index)} className="rounded-2xl border border-sand-300 bg-white p-5">
              {renderItem(item, index, (patch) => update(index, patch))}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-sand-200 pt-3">
                {reorderable ? (
                  <div className="flex gap-1.5">
                    <MoveButton label="Naar boven" onClick={() => move(index, -1)} disabled={index === 0}>
                      ↑
                    </MoveButton>
                    <MoveButton
                      label="Naar beneden"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                    >
                      ↓
                    </MoveButton>
                  </div>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  className="text-sm text-brand-700 underline underline-offset-2"
                >
                  Verwijderen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button type="button" variant="secondary" onClick={() => setItems([...items, makeNew()])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

function MoveButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border border-sand-300 text-sand-800',
        'transition-colors hover:bg-sand-100 disabled:opacity-40',
      )}
    >
      {children}
    </button>
  );
}

/** Klein tekstveld met label, voor binnen een lijstkaartje. */
export function MiniField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm', className)}>
      <span className="font-display font-semibold text-sand-800">{label}</span>
      {children}
      {hint ? <span className="text-xs text-sand-600">{hint}</span> : null}
    </label>
  );
}

export function MiniInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-sand-300 px-3 py-2 focus:border-brand-400 focus:outline-none"
      {...rest}
    />
  );
}

export function MiniSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-sand-300 bg-white px-3 py-2 focus:border-brand-400 focus:outline-none"
    >
      {children}
    </select>
  );
}

export function MiniCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-sand-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4.5 accent-brand-700"
      />
      {label}
    </label>
  );
}
