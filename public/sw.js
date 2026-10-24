/*
 * Opruimer voor de service worker van de oude adventskalender.
 *
 * Die app draaide als PWA op ditzelfde webadres (vite-plugin-pwa, Workbox) en
 * registreerde een service worker op `/sw.js` met bereik `/`. Zo'n worker
 * blijft in de browser staan nadat de site is vervangen, en blijft verzoeken
 * onderscheppen. Hij serveert dan de oude, opgeslagen pagina — die verwijst
 * naar bestanden die niet meer bestaan, en het resultaat is een wit scherm.
 * Een harde verversing omzeilt hem, een gewone niet.
 *
 * Dit bestand doet niets anders dan zichzelf opruimen. De browser haalt het op
 * als vervanging van de oude worker, en dan:
 *
 *  1. neemt het direct over van zijn voorganger;
 *  2. gooit alle opgeslagen bestanden weg;
 *  3. schrijft zichzelf uit;
 *  4. herlaadt de openstaande tabbladen, zodat de bezoeker de nieuwe site
 *     ziet zonder dat hij iets hoeft te doen.
 *
 * Er is geen `fetch`-afhandeling: alles gaat gewoon naar het netwerk.
 *
 * Dit bestand mag blijven staan. De nieuwe site registreert zelf geen service
 * worker, dus voor iemand die de oude kalender nooit bezocht heeft gebeurt er
 * niets. Weghalen kan pas als je zeker weet dat niemand die oude registratie
 * nog heeft, en dat weet je nooit zeker.
 */

self.addEventListener('install', () => {
  // Niet wachten tot alle oude tabbladen dicht zijn.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch {
        // Niets kunnen opruimen mag het uitschrijven niet tegenhouden.
      }

      await self.registration.unregister();

      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        // Opnieuw laden, nu zonder worker ertussen.
        client.navigate(client.url);
      }
    })(),
  );
});
