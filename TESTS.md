# Wat er met de hand getest is

Deze lijst gaat over dingen die een mens moet doen. De rekenkern en de losse
beslisregels hebben hun eigen tests (`npm test`); die staan hier niet in.

Bijgewerkt: 21 oktober 2026.

---

## Gedaan

### Beheer en toegang

- [x] Inloggen op het beheer
- [x] Beheerrechten via de custom claim, via een `admins`-document, en een
      account zónder beide (wordt geweigerd)
- [x] Bedrijfsgegevens invullen bij *Instellingen*
- [x] Algemene voorwaarden en privacyverklaring nagelezen
- [x] **Een product vanaf nul opbouwen** — foto's, prijs, categorie, voorraad

### Mail

- [x] Testmail versturen en ontvangen
- [x] Komt in de inbox, niet in spam (Gmail; 10/10 bij mail-tester)

### Bestellen en betalen

- [x] Volledige bestelling met iDEAL via Mollie — voorraad gaat eraf, de
      winkelwagen loopt leeg, de bevestiging komt aan
- [x] Mislukt, verlopen en geannuleerd bij Mollie — de order krijgt de juiste
      status (je komt níet terug in de shop; dat hoort zo, zie README)
- [x] Terug naar de shop zonder te betalen — order komt op *geannuleerd*
- [x] Bestelling op *verzonden* zetten, inclusief mail met Track & Trace
- [x] Verzonden → geannuleerd (hier kwam de dubbele bestelbevestiging aan het
      licht; gerepareerd en opnieuw getest)
- [x] **Opties op een bestelling** — en ze blijven buiten het staffelvoordeel
- [x] **Een product met twee keuzegroepen**, van kiezen tot in de
      bevestigingsmail. Het kiezen ging eerder mis; hersteld 19 oktober.
- [x] **Uitverkocht terwijl het al in de winkelwagen zit** — met de juiste
      melding
- [x] **Bestellen en betalen vanaf een telefoon** — met de betaalsimulatie van
      Mollie. De terugkeer naar de shop gaat goed en de status in het beheer
      klopt. Met de échte iDEAL-app kan dit pas als de live-sleutel erin staat.

### Prijzen en verzending

- [x] Kortingscodes
- [x] Staffelvoordeel, ook opgeteld over verschillende producten heen
- [x] Verzendmethodes en -kosten op de echte tarieven, inclusief gewichtsgrenzen

### Site

- [x] Categoriepagina's (gaven eerst een serverfout; gerepareerd)
- [x] Een prijswijziging is snel zichtbaar in een vers venster
- [x] Menu op een telefoon (opende eerst niet; gerepareerd)
- [x] Een pagina op *concept* verdwijnt uit het menu, uit de footer én uit de
      sitemap, en geeft een 404

- [x] **Betaald → terugbetaald**, inclusief het terugzetten van de voorraad
- [x] **De shop sluiten** met de schakelaar bij *Instellingen*. In winkelwagen
      leggen kan dan ook niet meer, dus een klant kan niet per ongeluk alsnog
      bestellen.

### Nieuwsbrief

- [x] Inschrijven via de footer
- [x] Adres komt door in Laposta, en het beheer laat zien dát het doorkwam

### Beheer in de browser

- [x] **Inloggen in Safari**, na het bijwerken naar 16.4 of nieuwer. Daaronder
      lukt het niet en is er in onze code niets aan te doen; zie de README.
- [x] **Automatisch uitloggen** na dertig minuten stilte
- [x] **Een product met een liggend ontwerp** — de instelling *Vorm van de
      foto's*

---

## Nog te doen

### Belangrijk voor de opening

- [ ] **Afrekenen met de échte iDEAL-app op een telefoon.** Kan pas na het
      omzetten naar de live-sleutel. Het wisselen naar de bankapp en weer terug
      is het enige stuk dat de simulatie niet nabootst.
- [ ] **Kortingscodes expres fout laten gaan**: verlopen, maximum bereikt,
      onder het minimumbedrag, en een code die niet bestaat. Alle vier horen
      een begrijpelijke melding te geven.
### Foto's

- [x] **Worden bij het uploaden verkleind** naar maximaal 1600 punten.
      Nagemeten op de hele webshop: 46 MB werd 18,7 MB.
- [x] **Een foto weghalen gaat pas door bij Opslaan.** Wegklikken zonder
      opslaan laat hem staan — dat ging eerder mis en gaf een kapotte
      afbeelding op de site.
- [ ] **Opslaan als WebP.** Safari kon dat niet en sloeg stilletjes PNG op;
      sinds 21 oktober kiest de code JPEG waar dat veilig is. In een browser
      die WebP wél kan, zou het nog een stuk kleiner moeten worden. Let op de
      regel die meldt in welk formaat het is opgeslagen.
- [ ] **Beeldkwaliteit op 1600 punten.** Een ontwerp met dunne lijnen of
      kleine letters is de zwaarste proef.
- [ ] **Een activiteit verwijderen neemt haar foto's mee.** Bij een product
      niet, en dat hoort zo: dat wordt gearchiveerd omdat het in bestellingen
      voorkomt.

### Beveiliging

- [x] **Firestore-regels worden afgedwongen.** Van buitenaf geprobeerd te lezen
      uit `orders`, `newsletter`, `products`, `admins`, `carts` en
      `discountCodes` — alle zes geweigerd. Alleen `activities` is leesbaar, en
      dat hoort zo.
- [x] **Inloggen met Google**, met behoud van de bestaande beheerrechten — het
      ging om hetzelfde e-mailadres, dus Google werd aan dat account gekoppeld.
- [ ] **Het tweede beheeraccount via Google.** Zolang dat niet werkt, blijft
      inloggen met een wachtwoord nodig. Pas als beide accounts via Google
      binnenkomen kan die manier eruit — en dan is er pas echt overal een
      tweede factor.

- [ ] **Controleren dat er werkelijk een back-up staat.** Er is een dagelijks
      schema (31 dagen bewaartijd), maar een schema is nog geen back-up. Een
      dag later nakijken met `firebase firestore:backups:list`.

### Rustig aan

- [ ] De vijf andere secties op een telefoon, plus een niet-bestaande URL
- [ ] **De waarschuwingsmail bij te weinig voorraad.** Lastig met opzet uit te
      lokken: er moeten twee mensen tegelijk het laatste exemplaar afrekenen.
      Zou ik laten rusten tot het een keer vanzelf gebeurt.

---

## Niet van toepassing

- **De adventskalender.** Gaat dit jaar niet door; de hoofdschakelaar staat uit
  (oktober 2026). Hij is daarmee uit het menu en uit de sitemap verdwenen. De
  pagina zelf blijft bestaan zodat oude links blijven werken — let er dan wel
  op dat de *tekst buiten het seizoen* bij **Instellingen** klopt, want die
  belooft standaard dat hij in december terugkomt.

  Wordt dit weer opgepakt, dan hoort er alsnog een droogloop bij: de kalender
  deelt de collectie `activities` met de oude app.

---

Wat er aan techniek nog ligt — en wat bewuste keuzes zijn — staat in
[TECHDEBT.md](TECHDEBT.md).
