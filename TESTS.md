# Wat er met de hand getest is

Deze lijst gaat over dingen die een mens moet doen. De rekenkern en de losse
beslisregels hebben hun eigen tests (`npm test`); die staan hier niet in.

Bijgewerkt: 25 oktober 2026 — de site staat live op metmekaere.nl.

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

- [x] Kortingscodes, ook de gevallen die fout moeten gaan: verlopen, maximum
      bereikt, onder het minimumbedrag, en een code die niet bestaat
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

- [x] **Een echte betaling met de live-sleutel** (24 oktober 2026). De betaling
      kwam door en de bestelling stond goed in het overzicht.
- [ ] Datzelfde nog eens vanaf een telefoon, met de iDEAL-app erbij. Het
      wisselen naar de bankapp en weer terug is het enige stuk dat nergens
      anders uit blijkt.
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

### Nieuwsbrief

- [x] **Een adres dat al in Laposta staat** (25 oktober 2026). Bleef eerst op
      *In afwachting* staan omdat de code naar 'already exists' zocht terwijl
      Laposta 'Email address exists' zegt. Na de reparatie kwam het adres goed
      te staan.
- [x] **De knop *Alsnog doorzetten*** (25 oktober 2026). Zette het vastgelopen
      adres in één klik recht, en verdween daarna vanzelf — want er viel niets
      meer op te lossen.

      Die knop was er eerst níet, en dat was leerzaam. 'Nog op te lossen' was
      gelijkgesteld aan 'heeft geen Laposta-id', en juist dit adres hád er een:
      die persoon had zich eerder al eens met goed gevolg ingeschreven. Te
      herkennen aan een regel die zichzelf tegensprak — *In afwachting* met
      *In Laposta* eronder. Sindsdien kijken het scherm en de herstelronde naar
      dezelfde regel (`needsSync`).

### Beveiliging

- [x] **Firestore-regels worden afgedwongen.** Van buitenaf geprobeerd te lezen
      uit `orders`, `newsletter`, `products`, `admins`, `carts` en
      `discountCodes` — alle zes geweigerd. Alleen `activities` is leesbaar, en
      dat hoort zo.
- [x] **Inloggen met Google**, met behoud van de bestaande beheerrechten — het
      ging om hetzelfde e-mailadres, dus Google werd aan dat account gekoppeld.
- [x] **Inloggen met een wachtwoord is eruit** (25 oktober 2026). Beide
      beheerders komen via Google binnen, en de wachtwoordmanier staat ook in
      de Firebase-console uit. Pas daarmee is het af: zolang die ernaast stond,
      was een wachtwoord nog altijd genoeg om binnen te komen en leverde de
      tweede factor van Google niets op.

      Raakt Google ooit onbruikbaar, dan zet je in de console die manier weer
      aan; het inlogformulier ervoor staat in de geschiedenis van
      `app/admin/login/login-form.tsx`.

- [ ] **Inloggen met Google ná de nieuwe vensterregel** (26 oktober 2026). De
      site zegt nu tegen de browser dat andere vensters niet bij dit venster
      mogen (`Cross-Origin-Opener-Policy`). Dat is met opzet de variant die
      popups heelhoudt, want inloggen gebeurt in zo'n venster — maar dit is
      precies het soort instelling waarvan je het pas merkt als je het
      probeert. Eén keer in- en uitloggen is genoeg.

- [x] **Er staat werkelijk een back-up** (25 oktober 2026, nagekeken met
      `firebase firestore:backups:list`). Het dagelijkse schema doet wat het
      belooft — een schema is tenslotte nog geen back-up.

### Na de livegang (24 oktober 2026, van buitenaf nagemeten)

- [x] Alle 33 adressen uit de sitemap geven een 200
- [x] `http` verwijst door naar `https`, `www` en `metmekaere.web.app` naar het
      hoofdadres
- [x] Certificaat van Google Trust Services, geldig tot 22 januari 2027
- [x] Alle vijf beveiligingsheaders aanwezig, inclusief HSTS
- [x] Een pagina op concept en een onbekend adres geven allebei een 404
- [x] Het beheer stuurt door naar het inlogscherm en staat op noindex
- [x] Firestore blijft van buitenaf dicht

- [x] **De service worker van de oude adventskalender.** Die gaf witte
      schermen bij bezoekers die de kalender ooit openden. Bevestigd met twee
      registraties in een echte browser, opgeruimd op beide adressen, en daarna
      laadde alles in één keer goed.

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
