# Wat er met de hand getest is

Deze lijst gaat over dingen die een mens moet doen. De rekenkern en de losse
beslisregels hebben hun eigen tests (`npm test`); die staan hier niet in.

Bijgewerkt: 19 oktober 2026.

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
      (met één keuzegroep; met twéé groepen ging het mis, hersteld 19 oktober)
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
- [ ] **Een product met twee keuzegroepen bestellen.** Kiezen werkt weer, maar
      de hele weg — in de winkelwagen, op de bestelling, in de bevestigingsmail —
      is met twee groepen nog niet doorlopen.

### Nieuw en nog niet beproefd

- [ ] **Foto's worden bij het uploaden verkleind.** Terug naar maximaal 1600
      punten en opgeslagen als WebP. Let op de regel die meldt hoeveel het
      scheelde, en kijk of het beeld scherp genoeg blijft — een ontwerp met
      dunne lijnen of kleine letters is daarvoor de zwaarste proef.

### Rustig aan

- [ ] De vijf andere secties op een telefoon, plus een niet-bestaande URL
- [ ] **De adventskalender.** Deelt de collectie `activities` met de oude app.
      Een droogloop vóór december is aangenamer dan een verrassing op de eerste.
- [ ] **De waarschuwingsmail bij te weinig voorraad.** Lastig met opzet uit te
      lokken: er moeten twee mensen tegelijk het laatste exemplaar afrekenen.
      Zou ik laten rusten tot het een keer vanzelf gebeurt.

---

Wat er aan techniek nog ligt — en wat bewuste keuzes zijn — staat in
[TECHDEBT.md](TECHDEBT.md).
