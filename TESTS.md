# Wat er met de hand getest is

Deze lijst gaat over dingen die een mens moet doen. De rekenkern en de losse
beslisregels hebben hun eigen tests (`npm test`); die staan hier niet in.

Bijgewerkt: 11 oktober 2026.

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
- [x] **Uitverkocht terwijl het al in de winkelwagen zit** — met de juiste
      melding

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

### Nieuwsbrief

- [x] Inschrijven via de footer
- [x] Adres komt door in Laposta, en het beheer laat zien dát het doorkwam

---

## Nog te doen

### Belangrijk voor de opening

- [ ] **Afrekenen op een echte telefoon**, met de echte iDEAL-app. De betaling
      is Mollie's werk, maar het formulier op een klein scherm en de terugkeer
      ná het wisselen naar de bankapp zijn van ons.
- [ ] **Betaald → terugbetaald.** Verzonden → geannuleerd is gedaan, deze nog
      niet. Let op dat de voorraad terugkomt.
- [ ] **Kortingscodes expres fout laten gaan**: verlopen, maximum bereikt,
      onder het minimumbedrag, en een code die niet bestaat. Alle vier horen
      een begrijpelijke melding te geven.

### Nieuw en nog niet beproefd

- [ ] **Een product met een liggend ontwerp** — de instelling *Vorm van de
      foto's* bij *Foto's*
- [ ] **Automatisch uitloggen**: dertig minuten niets doen in het beheer
- [ ] **De waarschuwingsmail bij te weinig voorraad.** Lastig met opzet uit te
      lokken: er moeten twee mensen tegelijk het laatste exemplaar afrekenen.

### Rustig aan

- [ ] De shop sluiten met de schakelaar bij *Instellingen*
- [ ] De vijf andere secties op een telefoon, plus een niet-bestaande URL
- [ ] **De adventskalender.** Deelt de collectie `activities` met de oude app.
      Een droogloop vóór december is aangenamer dan een verrassing op de eerste.

---

Wat er aan techniek nog ligt — en wat bewuste keuzes zijn — staat in
[TECHDEBT.md](TECHDEBT.md).
