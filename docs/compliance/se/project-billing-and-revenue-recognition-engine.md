# Project billing and revenue recognition engine

Detta dokument definierar projektfakturering, löpande/tim, fastpris, milstolpar, WIP, förutbetalda intäkter och intäktsföring för svenska bolag.

## Scope

### Ingår

- projektregister, projektavtal, rate cards, budget, intäktstyp och faktureringsmetod
- löpande fakturering av tid, material, utlägg och övriga billable events
- fastpris, milstolpsfakturering, förskott, abonnemangsliknande projektplaner och slutfakturor
- WIP, upplupna intäkter, förutbetalda intäkter och periodisk intäktsföring
- koppling mellan projekt, kundfaktura, resursunderlag och ledger

### Ingår inte

- detaljerade tid- och frånvaroregler; de ligger i HR/tid-domänerna
- övergripande årsredovisningsklassificering; den ligger i annual reporting

### Systemgränser

- Projektmotorn äger projektkontrakt, billable items, milestone events, revenue schedule och WIP snapshot.
- AR äger själva kundfakturan men projektmotorn bestämmer vilka projektunderlag som får faktureras och hur de påverkar intäkten.
- Ledgern bokar endast projektmotorns posting intents.

## Hårda regler

1. Fakturering och intäktsföring ska vara separata beslut. En faktura innebär inte automatiskt att all intäkt ska redovisas samma dag och omvänt.
2. Varje projektkontrakt ska ha en definierad faktureringsmodell och en definierad intäktsföringsmodell.
3. Samma tidsrad, materialrad eller milstolpe får inte faktureras två gånger.
4. WIP får inte skapas utan versionslåst underlag och cutoff-datum.
5. Negativ WIP eller negativ deferred revenue kräver granskningskö eller uttrycklig override.
6. Kredit av projektfaktura ska spegelvända både reskontra och projektets fakturerings- och intäktsstatistik.
7. Postade intäktsföringskörningar får inte skrivas över; korrigering sker med reversal eller ny diff-posting.

## Begrepp och entiteter

- **Billable item** — Godkänt underlag som får faktureras, till exempel tid, material eller utlägg.
- **Fastpris** — Avtal där fakturering och/eller intäkt inte direkt följer faktisk timsumma.
- **Milstolpe** — Kontraktsdefinierad händelse som kan trigga fakturering, intäktsföring eller båda.
- **WIP** — Värde av arbete utfört men ännu inte fakturerat eller slutligt intäktsfört enligt vald modell.
- **Upplupen intäkt** — Intäkt som redovisas före faktura och därför ligger som tillgång tills faktura kommer.
- **Förutbetald intäkt** — Fakturerat eller mottaget belopp som ännu inte ska intäktsföras fullt ut.

## State machines

### Projekt

- `draft -> active -> on_hold -> closed -> archived`

- Endast `active` projekt får generera nya billable items eller revenue runs.
- `closed` stoppar ny fakturering men påverkar inte historik.

### Billable item

- `draft -> approved -> invoiced -> credited -> written_off`

- `approved` kräver att underlaget låsts av ansvarig domän.
- `invoiced` länkas till specifik kundfakturarad.

### Revenue schedule

- `draft -> approved -> posted -> reversed`

- Samma projekt och period får bara ha en aktiv revenue run per modell och bok.
- Reversal ska länka till original och skapa ny version.

## Inputfält och valideringar

### Projekt och kontrakt

#### Fält

- project_id, kund, projektledare, start/slut, kontraktstyp, valuta, rate card, faktureringsmodell, intäktsföringsmodell, budget och dimensioner

#### Valideringar

- faktureringsmodell och intäktsföringsmodell måste vara definierade innan projektet aktiveras
- rate card ska vara giltigt per datum och resurstyp
- stängt projekt får inte ta emot nya billable items utan reopen

### Billable items och milestones

#### Fält

- källa, datum, resurs, kvantitet, enhetspris, mark-up, projekt, kund, momsprofil, godkännandespår
- milstolpe med trigger, procent eller belopp, uppfyllt datum, attest och avtalad faktureringslogik

#### Valideringar

- samma källrad får inte godkännas två gånger
- milstolpe får inte överstiga återstående kontraktsvärde utan ändringsorder
- valuta och kund måste matcha projektkontraktet

### WIP och deferred revenue

#### Fält

- period, utfört värde, fakturerat värde, tidigare redovisat värde, återstående kontraktsvärde, WIP-saldo, deferred revenue-saldo

#### Valideringar

- WIP-run ska bygga på versionslåst tid/material och definierad cutoff
- deferred revenue får inte släppas snabbare än leverans- eller milstolpemodellen tillåter
- negativt saldo ska gå till review om det inte förklaras av kredit eller reversal

## Beslutsträd/regler

### Löpande fakturering

- Godkända billable items faktureras till pris enligt gällande rate card och kundavtal.
- Tid, material och utlägg kan faktureras separat eller i samma samlingsfaktura om kund och valuta matchar.
- Om projektet använder `billing_equals_revenue` sker ingen separat WIP-posting före faktura.

### Fastpris och milstolpar

- Milstolpe kan trigga faktura, intäktsföring eller båda beroende på kontraktsprofil.
- Förskottsfaktura före prestation ska bokas som förutbetald intäkt tills prestationsvillkoret uppfyllts.
- Slutfaktura ska jämföra tidigare fakturerat och intäktsfört belopp mot totalkontraktet.

### WIP och intäktsföring

- Om kontraktet använder över-tid-intäktsföring ska utfört värde kunna bokas som upplupen intäkt före faktura.
- När senare faktura kommer ska tidigare upplupen intäkt reverseras eller kvittas i stället för att dubblera intäkten.
- Deferred revenue släpps periodiskt eller vid milstolpe enligt kontraktets regelpaket.
- Kredit av faktura ska också minska eller omklassificera intäktsföringsplanen när så krävs.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Löpande fakturering T&M | M | 1210/1220/1230 Kundfordringar | 3420 Projektintäkter eller 3450/3460 för särskilda radtyper, utgående moms | Följer ordinarie AR-fakturalogik men med projektkälla. |
| Förskottsfaktura före prestation | M | 1210/1220/1230 Kundfordringar | 2860 Förutbetalda projektintäkter, utgående moms | Intäkt släpps senare via revenue run. |
| Periodisk release av deferred revenue | M | 2860 Förutbetalda projektintäkter | 3410/3430/3420 Projektintäkter | Ingen ny kundfordran uppstår. |
| Upplupen intäkt före faktura | M | 1540 Upplupna intäkter eller annat definierat WIP-konto | 3410/3420/3430 Projektintäkter | Används när intäkt redovisas över tid före faktura. |
| Senare kundfaktura som kvittar tidigare upplupen intäkt | M | 1210/1220/1230 Kundfordringar | 1540 Upplupna intäkter, utgående moms | Förhindrar dubbel intäkt. |
| Kredit av projektfaktura | M | Projektintäktskonto och utgående moms | 1210/1220/1230 Kundfordringar | Om separat deferred/WIP-effekt krävs skapas kompletterande revenue reversal. |

## Fel- och granskningsköer

- **rate_missing** — Projekt eller resurs saknar giltig rate card.
- **billable_duplicate** — Samma underlag försöker faktureras igen.
- **negative_wip_review** — WIP eller deferred revenue blir negativ utan tydlig förklaring.
- **milestone_conflict** — Milstolpe saknar bevis eller skulle överstiga kontraktsvärde.
- **revenue_reversal_required** — Faktura kredit eller ändrat projektutfall kräver omkörning av intäktsplan.

## Idempotens, spårbarhet och audit

- Varje billable item ska ha stabil `source_type + source_id + source_version`.
- Revenue run ska låsas på `project + period + recognition_model`.
- Fakturering från projektunderlag ska bära `billing_run_key` så att samma urval inte kan skapa dubbla fakturor.
- Alla ändringar i kontraktsmodell, rate card och milstolpeplan ska versionsspåras.

## Golden tests

1. **Löpande tidfaktura**

- Godkänn tidsrader och skapa faktura.
- Förväntat utfall: projektintäkt bokas och billable items markeras invoiced.

2. **Förskottsfaktura**

- Fakturera 50 procent före start.
- Förväntat utfall: 2860 används tills prestation sker.

3. **Release av deferred revenue**

- Kör periodisk intäktsföring.
- Förväntat utfall: debet 2860, kredit projektintäkt.

4. **WIP före faktura**

- Redovisa intäkt över tid före fakturering.
- Förväntat utfall: 1540 används och senare faktura kvittar 1540.

5. **Kredit av projektfaktura**

- Kreditera del av tidigare projektfaktura.
- Förväntat utfall: både reskontra och projektstatistik justeras.

## Exit gate

- [ ] projektkontrakt har definierad fakturerings- och intäktsföringsmodell
- [ ] billable items och milestones kan inte dubbelräknas
- [ ] WIP, deferred revenue och fakturering går att följa till ledgern
- [ ] kredit och reversal påverkar både reskontra och intäktsplan korrekt
- [ ] close kan tie-outa projektkonton och kontraktsvärden
