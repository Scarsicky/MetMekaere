# Wat er nog ligt

Drie soorten punten, bewust uit elkaar gehouden. Ze vragen om verschillende
actie en ze verouderen verschillend.

- **Vóór de opening** — moet af voordat de shop echt opengaat.
- **Techniek-schuld** — werkt nu, maar moet een keer netter.
- **Bewuste keuzes** — geen schuld. Er staat bij wanneer je ze opnieuw moet
  bekijken; zolang dat niet gebeurt, laat je ze met rust.

---

## Vóór de opening

> **De verhuizing is gedaan (24 oktober 2026).** Het domein staat op
> `metmekaere.nl` met een eigen certificaat, `NEXT_PUBLIC_SITE_URL` is
> omgezet — waarmee robots.txt en de noindex vanzelf uitschakelden — en de
> Mollie-sleutel is vervangen door een `live_`-sleutel. Die laatste is actief
> sinds de uitrol die erop volgde; een nieuw geheim wordt namelijk pas bij een
> uitrol opgepikt.
>
> Vertrouw voor de actuele stand niet op dit bestand maar op het beheerscherm
> *Opstarten*. Dat kijkt bij elke keer openen naar de werkelijke instellingen.

### Nieuwsbrief: twee dingen buiten de code

Laposta is aangesloten en beproefd (oktober 2026, lijst `ptm52s6q9q`): een
inschrijving komt door en het beheer laat per adres zien dát het doorkwam.

Wat nog ligt, en pas opspeelt bij je eerste echte mailing:

- De **verwerkersovereenkomst** met Laposta moet getekend zijn. Zonder weigert
  Laposta het versturen van campagnes.
- De **privacyverklaring** hoort te vermelden dat adressen naar Laposta gaan.

Verder is er geen manier om adressen die eerder zijn binnengekomen alsnog naar
Laposta te sturen; dat kan alleen door de inschrijving te herhalen. Zodra dat
een keer om iemand anders gaat dan jezelf, is een knop *Nu synchroniseren* in
het beheer de oplossing.

### Eigen inhoud

Gedaan (oktober 2026): bedrijfsgegevens, de juridische teksten nagelezen en
akkoord bevonden, de eigen producten met foto's, en de activiteiten bij
*Doen en Beleven*.

Wat nog loopt:

- Het dialect-woordenboek vullen. De pagina *Fluffy Dialect* staat op dit
  moment op concept en is daardoor nergens op de site te vinden — zet hem op
  gepubliceerd zodra de woorden erin staan.

> De algemene voorwaarden en de privacyverklaring in
> `lib/cms/default-content.ts` zijn een werkbare opzet, geen juridisch advies.
> Dat blijft zo, ook nu ze zijn nagelezen.

---

## Techniek-schuld

### Twee gematigde kwetsbaarheden in afhankelijkheden

`uuid` via `gaxios`, binnengekomen met `firebase-admin`. Niet los te trekken
zonder dat `firebase-admin` zijn eigen boom bijwerkt. De fout is alleen te
misbruiken als je zelf een buffer aan `uuid` meegeeft, en dat doet deze code
nergens.

*Aanleiding om terug te komen:* bij een update van `firebase-admin`. Controleer
met `npm audit`.

### Een vastgezette versie van `@grpc/grpc-js`

In `package.json` staat een `overrides` die de browserbibliotheek van Firebase
dwingt dezelfde `@grpc/grpc-js` te gebruiken als `firebase-admin` al had. Zonder
die regel bleef daar een versie met een bekend lek hangen.

Bereikbaar was dat lek niet — die code draait alleen in Node en wij gebruiken de
browserbibliotheek uitsluitend om in te loggen — maar een melding die je elke
keer moet wegredeneren is er een te veel.

*Aanleiding om terug te komen:* zodra `firebase` zelf een bijgewerkte versie
meeneemt. Dan kan de override weg.

### Snelheidsbegrenzer zit in het geheugen van één proces

`lib/rate-limit.ts` telt per draaiend exemplaar. Met `maxInstances: 4` kan
iemand dus tot vier keer zoveel pogingen doen als bedoeld. Voor het afremmen van
een losgeslagen script is dat genoeg; tegen een gerichte aanval niet.

*Aanleiding om terug te komen:* als je last krijgt van misbruik, of als
`minInstances` omhoog gaat. Dan hoort dit in Firestore of een andere gedeelde
teller.

### `unstable_cache`

De datalaag gebruikt het klassieke cachemodel van Next. Dat werkt en is
gedocumenteerd, maar de naam zegt het al. Next 16 heeft een opvolger
(*Cache Components* met `use cache`), die we bewust nog niet gebruiken omdat hij
strenger is over waar cookies gelezen mogen worden — en de winkelwagen leest
cookies.

*Aanleiding om terug te komen:* als `unstable_cache` een verwijderingswaarschuwing
krijgt, of als Cache Components stabiel genoeg voelt. Zie `lib/data/cache.ts`.

### `experimental.serverActions.bodySizeLimit`

In `next.config.ts` staat één experimentele instelling, nodig omdat een pagina
met veel blokken de standaardlimiet van 1 MB kan naderen bij het opslaan.

*Aanleiding om terug te komen:* als die instelling stabiel wordt, of als het
opslaan van een pagina ooit stilletjes faalt.

### Een mislukte betaalstart laat een order achter

Afrekenen gaat in deze volgorde: eerst alles controleren, dan een ordernummer
uitgeven en de order wegschrijven, en dán de betaling bij Mollie aanvragen.
Struikelt die laatste stap — zoals op 24 oktober, toen Mollie het profiel nog
niet had vrijgegeven — dan blijft de order staan op *Wacht op betaling*.
Probeert de klant het daarna nog twee keer, dan staan er drie orders met drie
nummers voor één bestelling.

Zo'n order komt ook nooit meer uit die stand. Alle andere pendings lossen
zichzelf op: Mollie laat een openstaande betaling na een kwartier verlopen en
meldt dat via de webhook. Maar bij een mislukte start is er nooit een betaling
aan de order gehangen (`molliePaymentId` blijft `null`), en zonder betaling
komt er ook nooit bericht van Mollie. Niets haalt hem dus nog weg.

Datzelfde kenmerk is de aanknoping voor een oplossing. Van klein naar echt:

1. **Meteen eerlijk zijn.** De order bij een mislukte start afsluiten in plaats
   van hem op betaling laten wachten — op *geannuleerd*, of op een eigen stand
   als je dit verschil wil kunnen zien. Dan klopt het overzicht, maar de
   dubbele nummers blijven.
2. **De open order hergebruiken.** Bij een nieuwe poging met dezelfde
   winkelwagen de bestaande order overschrijven in plaats van een nieuwe te
   maken; de winkelwagen hangt al aan de order. Voorwaarde: alleen als die
   order nog op *pending* staat én er geen betaling aan hangt, want een order
   met een betaling mag je nooit overschrijven. Dit haalt zowel de dubbele
   orders als de gaten in de nummering weg.
3. **Opruimen in het beheer.** Een filter op *wacht op betaling, zonder
   betaling* en die in één keer kunnen afsluiten, voor wat er al staat.

Wat er nu staat is met de hand weg te werken: open de order, annuleer hem en
haal het vinkje *De klant een mailtje sturen* weg.

*Aanleiding om terug te komen:* zodra een échte klant hier tegenaan loopt, of
eerder als je het overzicht niet meer vertrouwt. Punt 1 is een handvol regels
in `app/actions/checkout.ts`; punt 2 hoort in `createPendingOrder` in
`lib/shop/orders.ts`.

### Geen geautomatiseerde test van het bestelproces

De rekenkern en de losse beslisregels hebben tests (72 stuks), maar het pad
*winkelwagen → afrekenen → betalen → voorraad afboeken* is met de hand getest,
niet geautomatiseerd. Bij een verbouwing van de checkout is dat het eerste wat
je mist.

Dat dit ontbreekt is al een keer duur geweest: het opnieuw versturen van een
bestelbevestiging na annuleren (september 2026) was met zo’n test meteen
opgevallen.

*Aanleiding om terug te komen:* voordat je iets wezenlijks aan de checkout of
aan de orderafhandeling verandert.

---

## Bewuste keuzes

### Filters worden in het geheugen toegepast

`getActiveProducts()` haalt alle actieve producten op en filtert daarna in het
geheugen. Dat houdt de filters razendsnel en scheelt een reeks samengestelde
Firestore-indexen.

*Aanleiding om terug te komen:* rond de **1.000 producten**. Dan wordt het tijd
voor query's per categorie. Zie de toelichting boven in `lib/data/catalog.ts`.

### Voorraad gaat er pas af bij betaling

Niet bij het plaatsen van de order, want dan houdt elke afgebroken checkout
voorraad bezet. Het gevolg is dat er in theorie iets dubbel verkocht kan worden
tussen bestellen en betalen. Gebeurt dat, dan wordt de order zichtbaar
gemarkeerd in het beheer met hoeveel er tekort was.

*Aanleiding om terug te komen:* als dubbelverkoop in de praktijk voorkomt. Dan
is reserveren-bij-order met een vervaltijd de volgende stap.

### Het overzicht houdt één vorm, ook bij liggende foto's

Een product kan staand of liggend zijn. Op de productpagina krijgt de foto die
vorm ook echt, maar in het overzicht blijft elke tegel staand: een liggende foto
wordt daar passend getoond in plaats van bijgesneden.

Het alternatief — de tegel de vorm van het product laten volgen — is één regel,
maar dan staan titels en prijzen in een rij niet meer op één lijn. Afgewogen en
afgewezen (oktober 2026): dat oogt rommeliger dan een foto met wat lucht eromheen.

*Aanleiding om terug te komen:* niet. Dit is bekeken met echte producten erin en
zo besloten.

### Geen bezoekersstatistieken

Er wordt niets gemeten. Geen Google Analytics, geen cookies van derden, geen
scripts van buiten. Een Firebase-project krijgt standaard wel een
Analytics-eigenschap, maar die blijft leeg zolang de site de analytics-module
niet laadt — en dat doet hij niet.

Afgewogen en zo besloten (oktober 2026). Meten vraagt in Europa om een
toestemmingsvraag met een echte keuze, een vermelding in de privacyverklaring
en een verwerkersovereenkomst. Daar staat voor een dorpswebshop weinig tegenover:
bezoekersaantallen levert de hosting al, vindbaarheid leest Search Console, en
wat er verkocht wordt staat in de bestellingen zelf. Zonder meting is er ook
geen cookiebanner nodig, en dat is de rustigste eerste indruk.

*Aanleiding om terug te komen:* als je echt wilt weten wáár mensen in de
checkout afhaken. Kijk dan eerst naar een partij die zonder cookies werkt en in
Europa geen toestemming vraagt; pas daarna naar Google Analytics mét banner.

### Geen offline-modus

De oude adventskalender had een service worker. Op een webshop is dat riskant:
iemand krijgt dan een oude prijs of een uitverkocht product te zien. De site is
wél installeerbaar op de telefoon via het manifest.

*Aanleiding om terug te komen:* niet. Tenzij de kalender ooit weer een losse app
wordt.

### Terugbetalen gebeurt in Mollie, niet hier

Het beheer markeert een order als terugbetaald en zet de voorraad terug, maar
stort niets terug. Terugbetalen is onomkeerbaar en kost echt geld; één
verkeerde klik is er dan één te veel.

*Aanleiding om terug te komen:* niet, tenzij het aantal retouren dit echt
omslachtig maakt.

### `costEUR` in de adventskalender staat in euro's

Overal elders in de code is geld een geheel aantal centen. De collectie
`activities` is de uitzondering, omdat die gedeeld wordt met de bestaande
advent-app en dat schema daar zo is. Er wordt niets mee afgerekend; het wordt
alleen getoond.

*Aanleiding om terug te komen:* als de oude app uit gebruik gaat. Dan kan dit
veld gelijkgetrokken worden met de rest.
