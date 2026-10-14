# Met Mekaere

De website van Met Mekaere: een webshop met kaarten, de pagina's over de Community,
Fluffy Dialect en Doen en Beleven, en de Dorpse Adventskalender die in december
vanzelf verschijnt.

---

## Wat je moet weten voordat je iets aanpast

Twee regels waar de hele shop op rust. Wijk er niet van af, ook niet "even snel":

1. **Geld is altijd een geheel aantal centen.** Nooit `3.50`, altijd `350`. Het type
   heet `Cents`. Zo kunnen er geen afrondingsfouten in prijzen sluipen.
2. **De browser stuurt nooit een bedrag mee.** Prijzen, kortingen, verzendkosten
   en voorraad worden uitsluitend op de server berekend, in
   [`lib/shop/pricing.ts`](lib/shop/pricing.ts). De browser zegt hoogstens
   "product X, drie stuks". Bij elke stap — ook bij het afrekenen — rekent de
   server alles opnieuw door.

De rekenkern heeft eigen tests: `npm test`. Verander je iets aan prijzen of
staffels, draai die dan.

### Welke browsers dit draait

Next.js 16 stelt een ondergrens: **Chrome 111+, Edge 111+, Firefox 111+ en
Safari 16.4+**. Dat is geen richtlijn maar een harde grens — de code bevat
syntax die oudere browsers niet eens kunnen lézen.

Dat valt op een vervelende manier uit, want Safari zit vast aan de macOS-versie.
Een Mac die niet verder kan dan Safari 15 kan het beheer dus niet gebruiken,
terwijl Chrome op diezelfde Mac het wel doet — die brengt zijn eigen motor mee.

Het beeld bij een te oude browser: de pagina laadt, maar er gebeurt niets meer
bij klikken. Inloggen stuurt je zonder melding terug naar het inlogscherm, want
dan verstuurt de browser het formulier op de ouderwetse manier en draait onze
eigen foutafhandeling ook niet. In de console van de browser staat dan een
syntaxfout. Zoek in dat geval niet in onze code — kijk eerst welke browserversie
het is.

---

## Aan de slag

```bash
npm install
cp .env.example .env.local     # en vul aan
npm run emulators              # in een apart venster: Firebase lokaal
npm run seed                   # startinhoud in de emulator zetten
npm run admin:grant -- jouw@email.nl --wachtwoord EenGoedWachtwoord
npm run dev
```

De site draait dan op http://localhost:3000 en het beheer op
http://localhost:3000/admin.

Zolang er geen Mollie-sleutel is, krijg je lokaal een **nagebootste betaalpagina**
waarmee je het hele bestelproces kunt doorlopen — inclusief het afboeken van
voorraad en de bevestigingsmail. In productie is dat uitgeschakeld.

### De commando's

| Commando | Wat het doet |
| --- | --- |
| `npm run dev` | De site lokaal draaien |
| `npm run emulators` | Firestore, Auth en Storage lokaal |
| `npm run seed` | Startinhoud plaatsen (`-- --force` overschrijft bestaande) |
| `npm run admin:grant -- <email>` | Iemand beheerrechten geven (`--intrekken` haalt ze weg) |
| `npm run mail:test` | Controleert de mailserver (`-- jij@adres.nl` stuurt een testmail) |
| `npm test` | De tests van de rekenkern |
| `npm run typecheck` | TypeScript controleren |
| `npm run build` | Productiebuild |

---

## Hoe het in elkaar zit

```
app/
  (site)/          De publieke site — header, footer, alle gewone pagina's
  admin/           Het beheer. Alles onder (beheer)/ zit achter een inlog
  api/             Winkelwagen-telling, Mollie-webhook, uploads, admin-sessie
components/        Bouwstenen, per gebied gegroepeerd
lib/
  shop/pricing.ts  De rekenkern: staffel, kortingen, verzendkosten, btw
  shop/cart.ts     De winkelwagen (staat op de server, niet in de browser)
  shop/orders.ts   Orders, voorraad afboeken, idempotentie
  data/            Firestore lezen, met cache en vergevingsgezinde controle
  cms/             De startinhoud én de terugval als Firestore leeg is
types/             Het domeinmodel
```

### Waarom de winkelwagen op de server staat

De browser krijgt alleen een willekeurig id in een httpOnly-cookie. De inhoud
staat in Firestore. Daardoor kan niemand een prijs, korting of voorraad
meesturen — en klopt het bedrag bij het afrekenen gegarandeerd met wat er in de
database staat.

### Hoe het staffelvoordeel werkt

Producten met dezelfde `tierGroup` tellen hun aantallen **bij elkaar op**. Drie
van de ene kaart plus vier van de andere zijn samen zeven kaarten, en krijgen
dus allebei het tarief dat vanaf vijf stuks geldt. Instellen doe je bij
*Beheer → Staffelvoordeel*; koppelen bij het product zelf.

Add-ons (envelop, postzegel) krijgen géén staffelkorting: dat zijn extra's tegen
kostprijs.

### Caching

Firestore-lezingen worden gecached met labels (`lib/data/cache.ts`). Sla je iets
op in de admin, dan wordt precies het betrokken label ververst — zie
`lib/admin/revalidate.ts`.

**Maar dat is niet de hele keten.** Er liggen drie caches achter elkaar, en
`revalidateTag` raakt alleen de eerste:

| Waar | Wat het bewaart | Hoe lang |
| --- | --- | --- |
| Onze eigen cache | het Firestore-antwoord | tot `revalidateTag`, anders 60 s |
| Het CDN van App Hosting | de hele pagina | `s-maxage`, nu 60 s |
| De browser van de bezoeker | de hele pagina | zolang `stale-while-revalidate` toestaat |

Dat een wijziging niet meteen zichtbaar was, kwam door de onderste twee. Next
zet standaard `stale-while-revalidate` op een jáár, en dat geldt ook voor de
browser van de bezoeker: wie al eens langs was geweest, bleef de oude pagina
zien tot hij zijn browsegegevens wiste. Daarom staat `expireTime` nu in
`next.config.ts`, en staan de bewaartijden in `lib/data/cache.ts` op een minuut.

Een CDN-kopie laat zich niet vanuit de code wegwerpen — dat is
[gedocumenteerd gedrag van Next](https://nextjs.org/docs/app/guides/cdn-caching).
**Reken dus op maximaal een minuut** tussen opslaan en zichtbaar zijn. Het
beheer zelf laat alles wel direct zien: die pagina's worden nergens gecached.

Let op bij lokaal ontwikkelen: verander je data buiten de admin om (met een
script of rechtstreeks in de emulator), dan blijft de oude versie een minuut
staan. `rm -rf .next` lost dat op.

### De adventskalender

Deelt de Firestore-collectie `activities` met de bestaande advent-app: documenten
met id `1` t/m `24`. Het schema is ongewijzigd overgenomen — inclusief `costEUR`
in euro's in plaats van centen. **Verander dat schema niet zonder ook die app aan
te passen.**

De kalender verschijnt vanzelf in het menu binnen het ingestelde seizoen
(*Beheer → Instellingen*). Daarbuiten blijft de pagina bestaan met een
uitnodiging, zodat oude links blijven werken.

---
## Live zetten

`metmekaere.nl` staat op dit moment op **Firebase Hosting**, met de oude
adventskalender-app. De nieuwe site draait op **App Hosting**. Dat zijn twee
verschillende diensten, dus het domein moet straks verhuizen.

De volgorde hieronder is met opzet zo: de nieuwe site gaat eerst live op zijn
eigen adres, je test hem daar, en pas daarna gaat het domein om. Zo staat
metmekaere.nl geen moment uit de lucht.

### 1. Regels en indexen plaatsen

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Zet daarna in de Firestore-console een **TTL-beleid** op het veld `expiresAt`
van de collectie `carts`. Oude winkelwagens ruimen zichzelf dan op.

### 2. De twee geheimen klaarzetten

Alleen de Mollie-sleutel en het mailwachtwoord zijn echt geheim. De rest staat
gewoon in `apphosting.yaml`.

```bash
firebase apphosting:secrets:set mollie-api-key
firebase apphosting:secrets:set smtp-password
```

Je krijgt per commando een prompt waarin je de waarde plakt. Ze gaan rechtstreeks
naar Secret Manager en komen nergens in de broncode terecht.

### 3. Backend aanmaken

```bash
firebase apphosting:backends:create --project metmekaere
```

Kies `europe-west4` (Nederland) of `europe-west1`, koppel de GitHub-repository en
geef de backend de naam `metmekaere-web`. Elke push naar de hoofdtak wordt
daarna vanzelf gebouwd en uitgerold.

Geef de backend daarna toegang tot de geheimen:

```bash
firebase apphosting:secrets:grantaccess mollie-api-key --backend metmekaere-web
firebase apphosting:secrets:grantaccess smtp-password --backend metmekaere-web
```

De service account van de backend heeft ook rechten nodig op Firestore en
Storage: `roles/datastore.user` en `roles/storage.objectAdmin` op het project.

> **Een mislukte uitrol is stil.** Weigert App Hosting een uitrol, dan blijft
> de vorige versie gewoon draaien. De site geeft dan netjes een 200 en ziet er
> in orde uit, terwijl je wijziging nergens is. Dat `curl` een 200 teruggeeft
> bewijst dus niets; controleer of de *nieuwe* versie draait. Het snelst gaat
> dat via *Beheer → Opstarten*, dat benoemt wat de draaiende site werkelijk aan
> instellingen heeft.
>
> Een veelvoorkomende oorzaak is een geheim waar de backend niet bij mag — zie
> de uitleg bovenin `apphosting.yaml`.

### 4. Inrichten via de admin

Na de eerste uitrol krijg je een adres als
`https://metmekaere-web--metmekaere.europe-west4.hosted.app`. Daar ga je naar
`/admin`.

#### Jezelf beheerder maken

Alleen een account aanmaken is niet genoeg — anders zou iedereen die zich
registreert in het beheer kunnen. Er zijn twee manieren.

**Via de Firebase-console** (geen sleutelbestand nodig, dus meestal de
makkelijkste):

1. [Authentication → Users](https://console.firebase.google.com/project/metmekaere/authentication/users)
   → **Add user**, met je e-mailadres en een wachtwoord. Kopieer de **UID** die
   je daarna ziet staan.
2. [Firestore → Data](https://console.firebase.google.com/project/metmekaere/firestore/data)
   → maak de collectie `admins` aan (als hij er nog niet is) met een document
   waarvan het **document-id de UID uit stap 1 is**. Een veld `email` met je
   adres is handig maar niet verplicht.

Klaar. Inloggen kan meteen.

**Of met het script**, als je een service-account-sleutel op deze computer hebt
staan (`GOOGLE_APPLICATION_CREDENTIALS`). Zet dan eerst de emulator-regels in
`.env.local` uit, anders maak je het account in de emulator aan:

```bash
npm run admin:grant -- jouw@email.nl --wachtwoord EenGoedWachtwoord
```

#### De site vullen

Log in en ga naar **Opstarten**. Daar staat één knop die de startinhoud
plaatst — teksten, producten, verzendtarieven, de kalenderdagen. Op datzelfde
scherm staat of Mollie en de mail goed staan, en kun je een testmail sturen.

### 5. Uitproberen met een testbetaling

Zet `mollie-api-key` eerst op je **test**-sleutel (die begint met `test_`). Doe
een bestelling van begin tot eind en controleer:

- kom je op de betaalpagina van Mollie uit?
- staat de bestelling daarna op *Betaald* in het beheer?
- is de voorraad afgeboekt?
- kwam de bevestigingsmail aan?

#### Wat Mollie doet bij een mislukte betaling

Kies je op de betaalpagina een andere uitkomst dan ‘betaald’, dan blijf je bij
Mollie en kom je terug op het keuzescherm voor betaalmethodes. Dat is geen fout:
omdat wij Mollie Checkout gebruiken — de klant kiest zelf hoe hij betaalt —
geeft Mollie hem de kans het met een andere methode te proberen. Dat gebeurt in
productie net zo goed als in de testomgeving.

De terugkeerlink is dus niet waar je op moet sturen. Mollie zegt het zelf:

> Best wait until your webhook is called and fetch the status as usual. This is
> the most reliable way to keep your system in sync with Mollie.

Onze webhook (`/api/mollie/webhook`) doet dat, en haalt de status altijd zelf op
bij Mollie in plaats van te vertrouwen op wat er binnenkomt. Controleer bij het
testen dus niet of je teruggestuurd wordt, maar of de bestelling in het beheer
op de juiste status komt — filter op **Niet doorgegaan**.

Komt die status er niet, dan is de webhook het probleem. Op een bestelling staat
een knop **Betaalstatus ophalen** waarmee je het met de hand kunt afdwingen.

Klopt alles, vervang de sleutel dan door de live-sleutel:

```bash
firebase apphosting:secrets:set mollie-api-key
```

De site pikt de nieuwe waarde op bij de volgende uitrol.

### 6. Het domein verhuizen

Nu pas. In de Firebase-console → App Hosting → je backend → **Custom domain**
voeg je `metmekaere.nl` en `www.metmekaere.nl` toe. Je krijgt DNS-records die je
bij je domeinprovider zet.

Let op: `metmekaere.nl` wijst nu naar Firebase Hosting (`199.36.158.100`). Die
records vervang je. Haal daarvóór het domein uit Firebase Hosting, anders
claimen twee diensten hetzelfde adres.

DNS heeft tijd nodig — reken op een paar uur, soms een etmaal. In die periode
kunnen bezoekers nog de oude site zien; dat lost zichzelf op.

Zet tot slot `NEXT_PUBLIC_SITE_URL` in `apphosting.yaml` op `https://metmekaere.nl`
en rol nog één keer uit, zodat de sitemap en de deellinks kloppen.

### 7. De oude adventskalender

Die blijft gewoon bereikbaar op `metmekaere.web.app`. De nieuwe site heeft de
kalender ingebouwd en deelt dezelfde gegevens, dus je kunt de oude app laten
staan of later weghalen — beide werken.

## Nog na te lopen voordat de shop opengaat

Twee lijsten, elk met een ander doel:

- [TESTS.md](TESTS.md) — wat er met de hand getest is en wat nog niet.
- [TECHDEBT.md](TECHDEBT.md) — techniek-schuld en bewuste keuzes, met per punt
  de aanleiding om erop terug te komen.

Wat er op dit moment écht nog moet gebeuren voordat de shop opengaat:

- **De Mollie-sleutel** staat nog op `test_`. Er wordt dus geen geld
  afgeschreven. Het beheerscherm *Opstarten* bewaakt dit zelf.
- **Het webadres** staat nog op het tijdelijke App Hosting-adres. Daar hangen de
  terugkeerlink van Mollie, de webhook en de links in bestelmails aan.
- **Het dialect-woordenboek** is nog niet gevuld; die pagina staat daarom op
  concept en is nergens op de site te vinden.

---

## Keuzes die uitleg verdienen

**Waarom geen service worker voor offline gebruik?** De oude adventskalender had
die; daar kon het, want die inhoud verandert nauwelijks. Op een webshop is het
riskant: iemand krijgt dan een oude prijs of een uitverkocht product te zien. De
site is wel installeerbaar ("Zet op beginscherm") via het manifest.

**Waarom wordt voorraad pas afgeboekt bij betaling?** Anders houdt elke
afgebroken checkout voorraad bezet. Het gevolg is dat er in theorie iets dubbel
verkocht kan worden tussen bestellen en betalen. Gebeurt dat, dan wordt de order
zichtbaar gemarkeerd in het beheer, zodat je contact kunt opnemen.

**Waarom staat terugbetalen niet in het beheer?** Het markeren wel, het
daadwerkelijk terugstorten niet — dat doe je in Mollie. Terugbetalen is
onomkeerbaar en kost echt geld; één verkeerde klik is er dan één te veel.
