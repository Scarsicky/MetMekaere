# Wat er nog ligt

Drie soorten punten, bewust uit elkaar gehouden. Ze vragen om verschillende
actie en ze verouderen verschillend.

- **Vóór de opening** — moet af voordat de shop echt opengaat.
- **Techniek-schuld** — werkt nu, maar moet een keer netter.
- **Bewuste keuzes** — geen schuld. Er staat bij wanneer je ze opnieuw moet
  bekijken; zolang dat niet gebeurt, laat je ze met rust.

---

## Vóór de opening

### Mollie: testsleutel vervangen door de live-sleutel

Nu staat er een `test_`-sleutel. Bestellingen lopen wel door het hele proces
maar er wordt geen geld afgeschreven.

```bash
firebase apphosting:secrets:set mollie-api-key
firebase apphosting:rollouts:create metmekaere-web -b site
```

> **Dit punt bewaakt zichzelf.** Het beheerscherm *Opstarten* controleert dit bij
> elke keer dat je het opent. Zolang de site op een tijdelijk adres draait is het
> een oranje melding; zodra hij op het eigen domein staat wordt het een rode,
> want dan kunnen bezoekers bestellen zonder te betalen. Je hoeft dus niet op
> deze lijst te vertrouwen.

### Nieuwsbrief koppelen

`NEWSLETTER_PROVIDER` staat op `none`. Inschrijvingen worden wél bewaard in
Firestore — je raakt niets kwijt — maar gaan nog niet door naar een mailinglijst.
Kies MailerLite of Laposta, zet de sleutel als geheim en pas `apphosting.yaml` aan.

### Juridische teksten nalopen

`lib/cms/default-content.ts` bevat een werkbare opzet voor de algemene
voorwaarden en de privacyverklaring. Het is geen juridisch advies. Lees ze na en
vul de bedrijfsgegevens aan bij *Instellingen*.

### Eigen inhoud

- Bedrijfsgegevens invullen: KvK, btw-nummer, adres.
- De voorbeeldproducten en -activiteiten aanpassen of weggooien.
- Productfoto's uploaden (zonder foto staat er een plaatshouder).
- Het dialect-woordenboek vullen. Er staat nu één woord in, `mekaere`, uit de
  naam zelf — de rest zijn jouw woorden.

---

## Techniek-schuld

### Twee gematigde kwetsbaarheden in afhankelijkheden

`uuid` via `gaxios`, binnengekomen met `firebase-admin`. Niet los te trekken
zonder dat `firebase-admin` zijn eigen boom bijwerkt. De fout is alleen te
misbruiken als je zelf een buffer aan `uuid` meegeeft, en dat doet deze code
nergens.

*Aanleiding om terug te komen:* bij een update van `firebase-admin`. Controleer
met `npm audit`.

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

### Geen geautomatiseerde test van het bestelproces

De rekenkern heeft 45 tests (`lib/shop/pricing.test.ts`), maar het pad
*winkelwagen → afrekenen → betalen → voorraad afboeken* is met de hand getest,
niet geautomatiseerd. Bij een verbouwing van de checkout is dat het eerste wat
je mist.

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
