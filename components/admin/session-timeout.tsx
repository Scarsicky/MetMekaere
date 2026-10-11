'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  ACTIVITY_PING_MS,
  IDLE_CHECK_MS,
  IDLE_TIMEOUT_MS,
} from '@/lib/admin/session-policy';

/**
 * Logt het beheer uit wanneer het te lang stil blijft.
 *
 * De server is de baas: die weigert een sessie waar te lang niets van is
 * gehoord. Dit stuk doet twee dingen daaromheen.
 *
 *  1. Tijdens het werken af en toe laten weten dat je er nog bent, zodat je
 *     niet midden in een lange tekst wordt afgekapt. Hooguit eens per paar
 *     minuten, en alleen bij echte handelingen — muisbewegingen tellen niet
 *     mee, anders houdt een kat op het toetsenbord de sessie open.
 *  2. Zelf de tijd bijhouden en je weghalen zodra de grens voorbij is. Zonder
 *     dat zou je op een scherm blijven zitten dat er nog goed uitziet, maar
 *     waar niets meer werkt — en dat merk je dan pas als je op opslaan drukt.
 */
export function SessionTimeout() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(0);
  const endingSession = useRef(false);

  useEffect(() => {
    async function endSession(reason: 'inactief' | 'verlopen') {
      if (endingSession.current) return;
      endingSession.current = true;

      try {
        await fetch('/api/admin/session', { method: 'DELETE' });
      } catch {
        // Niet kunnen uitloggen mag het doorsturen niet tegenhouden.
      }
      router.replace(`/admin/login?reden=${reason}`);
      router.refresh();
    }

    async function ping() {
      lastPing.current = Date.now();
      try {
        const response = await fetch('/api/admin/activity', { method: 'POST' });
        if (response.status === 401) await endSession('verlopen');
      } catch {
        // Even geen verbinding: volgende keer weer. De server bewaakt de grens.
      }
    }

    function onActivity() {
      lastActivity.current = Date.now();
      if (Date.now() - lastPing.current >= ACTIVITY_PING_MS) void ping();
    }

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'focus'];
    for (const event of events) window.addEventListener(event, onActivity);

    function onVisible() {
      // Terugkomen op het tabblad telt als activiteit, maar alleen als de
      // grens nog niet voorbij is — anders zou wegklikken en later terugkomen
      // de sessie eindeloos verlengen.
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT_MS) {
        void endSession('inactief');
        return;
      }
      onActivity();
    }
    document.addEventListener('visibilitychange', onVisible);

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity.current > IDLE_TIMEOUT_MS) void endSession('inactief');
    }, IDLE_CHECK_MS);

    return () => {
      for (const event of events) window.removeEventListener(event, onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
