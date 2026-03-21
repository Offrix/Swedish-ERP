# Accounting foundation

Detta dokument definierar redovisningskärnan för systemet: seed-kontomodell, verifikationsserier, bokföringsinvarianten, periodhantering, rättelser, export och verifiering.

## Syfte

- ge Codex en självständig grund för ledgern
- ge systemet en intern standardkontoplan för seedning och testdata
- definiera hur alla andra domäner får påverka bokföringen
- definiera hur konton, verifikationer, perioder och korrigeringar fungerar

## Hårda regler

1. Bokföring sker endast genom ledger-tjänsten.
2. Alla verifikationer ska balansera.
3. Alla verifikationer ska vara spårbara till källa.
4. Inga historiska verifikationer skrivs över.
5. Låsta perioder muteras inte.
6. Importerad historik markeras som historisk import.
7. Alla automationer ska vara idempotenta.
8. Alla rapporter ska kunna återskapas för vald tidpunkt.

## Verifikationsserier

Systemet ska seedas med följande bokstavsserier:

- `A` Manuella verifikationer
- `B` Kundfakturor
- `C` Kundkreditfakturor
- `D` Kundinbetalningar
- `E` Leverantörsfakturor
- `F` Leverantörsbetalningar
- `G` Kassa och kort
- `H` Löneverifikationer
- `I` Momsverifikationer
- `J` Periodiseringar
- `K` Anläggningar
- `L` Lager och material
- `M` Projekt och WIP
- `N` Valutaomräkning
- `O` Bokslut
- `P` Årsöppning, IB, UB
- `Q` Skattekonto
- `R` Resor, traktamente, utlägg
- `S` Pension och särskild löneskatt
- `T` HUS/ROT-RUT justeringar
- `U` Bankavstämningskorrigeringar
- `V` Automaträttelser
- `W` Historisk import
- `X` Revisionsjusteringar
- `Y` Teknisk reservserie
- `Z` Framtida reserv

Serier ska vara per bolag. Nummer ska vara monotont stigande inom serie. Inga nummer återanvänds.

## Ledger state machine

- `draft`
- `validated`
- `posted`
- `reversed`
- `locked_by_period`

En verifikation får bara gå från `draft` till `validated` om debet = kredit och obligatoriska fält finns. Den får bara gå från `validated` till `posted` genom ledger application service. `posted` får inte ändras; korrigering sker via ny verifikation.

## Import och öppningsbalans

- Öppningsbalanser ska bokas i serie `P` eller `W`.
- Historisk import får inte blandas med ny löpande bokföring.
- Importerade dokument ska länkas till importerad verifikation när underlag finns.
- Differensrapport ska sparas per import.

## 24. Svensk standardkontomodell för systemets seed-data

Detta dokument använder **DSAM** (Default Swedish Account Model) som intern seed-kontoplan för att kunna bygga systemet från noll utan att vara beroende av extern filimport i själva utvecklingen. Den är strukturerad för svensk praxis och ska kunna mappas mot kundens importerade kontoplan senare.

### 24.1 Grundprincip
- kontoklass 1 = tillgångar
- kontoklass 2 = eget kapital och skulder
- kontoklass 3 = intäkter
- kontoklass 4 = direkta kostnader/varuinköp
- kontoklass 5 = övriga externa kostnader
- kontoklass 6 = personalkostnader
- kontoklass 7 = avskrivningar och finansiella poster
- kontoklass 8 = bokslutsdispositioner och skatt

### 24.2 Obligatoriska seed-konton

#### Klass 1 — Tillgångar
- 1000 Kassa
- 1010 Kassaredovisning fält
- 1030 Växelkassa
- 1070 Digitala plånböcker
- 1080 Internt clearingkonto kontanter
- 1090 Kassatranseringar ej bokförda
- 1100 Bank
- 1110 Huvudbankkonto
- 1120 Skattekonto spegling
- 1130 Klientmedel ej tillåtet i kärnprodukt utan separat reglering
- 1140 Valutakonto EUR
- 1150 Valutakonto USD
- 1160 Spärrat konto
- 1170 Kortkonto clearing
- 1180 Inbetalningar under utredning
- 1190 Utbetalningar under utredning
- 1200 Kundfordringar
- 1210 Kundfordringar inrikes
- 1220 Kundfordringar EU
- 1230 Kundfordringar export
- 1240 Osäkra kundfordringar
- 1250 Nedskrivning kundfordringar
- 1290 Reserverad AR-clearing
- 1300 Övriga kortfristiga fordringar
- 1310 Fordran kortutlägg anställda
- 1320 Fordran kundkorttransaktioner
- 1330 Fordran Swish/kortinlösen
- 1340 Fordran moms
- 1350 Fordran på leverantörer
- 1360 Förskott till leverantörer
- 1370 Interimsfordringar
- 1380 Övriga fordringar
- 1390 Valutakursdifferens fordran
- 1400 Lager
- 1410 Råvarulager
- 1420 Handelsvarulager
- 1430 Lager för projektmaterial
- 1440 Pågående arbete material
- 1450 Reserv lagerdifferenser
- 1460 Inventarier småvärde i omsättning
- 1490 Inkuransreserv
- 1500 Förutbetalda kostnader och upplupna intäkter
- 1510 Förutbetalda hyror
- 1520 Förutbetalda försäkringar
- 1530 Övriga förutbetalda kostnader
- 1540 Upplupna intäkter
- 1550 Upplupna bidrag
- 1590 Interimsfordringar övrigt
- 1600 Anläggningstillgångar immateriella
- 1610 Balanserade utvecklingsutgifter
- 1620 Programvarulicenser
- 1630 Patent/varumärken
- 1690 Ackumulerade avskrivningar immateriella
- 1700 Materiella anläggningstillgångar
- 1710 Mark
- 1720 Byggnader
- 1730 Förbättringsutgifter annans fastighet
- 1740 Maskiner
- 1750 Inventarier
- 1760 Datorer/servrar
- 1770 Fordon
- 1780 Verktyg och utrustning
- 1790 Ackumulerade avskrivningar materiella

#### Klass 2 — Eget kapital och skulder
- 2000 Eget kapital
- 2010 Aktiekapital/egen insättning beroende bolagsform
- 2020 Reservfond/bundna reserver
- 2030 Balanserat resultat
- 2040 Årets resultat
- 2050 Egna uttag
- 2060 Egna insättningar
- 2090 Överföringar eget kapital
- 2100 Obeskattade reserver
- 2110 Periodiseringsfond
- 2120 Överavskrivningar
- 2190 Obeskattade reserver övrigt
- 2200 Avsättningar
- 2210 Garantireserv
- 2220 Tvister och åtaganden
- 2290 Övriga avsättningar
- 2300 Långfristiga skulder
- 2310 Banklån långfristigt
- 2320 Leasing skuld långfristig
- 2330 Aktieägarlån
- 2390 Övriga långfristiga skulder
- 2400 Leverantörsskulder
- 2410 Leverantörsskulder inrikes
- 2420 Leverantörsskulder EU
- 2430 Leverantörsskulder import
- 2440 Leverantörskreditnotor
- 2450 Ej utbetalda leverantörsbetalningar
- 2490 AP-clearing
- 2500 Skatteskulder
- 2510 Beräknad inkomstskatt
- 2520 Momsskuld
- 2530 Personalskatt
- 2540 Arbetsgivaravgifter
- 2550 Särskild löneskatt
- 2560 ROT/RUT-skuld/fordran mot Skatteverket
- 2570 Skattekonto clearing
- 2590 Övriga skatter
- 2600 Utgående moms
- 2610 Utgående moms 25
- 2620 Utgående moms 12
- 2630 Utgående moms 6
- 2640 Ingående moms
- 2650 Redovisningskonto moms
- 2660 Moms EU-förvärv
- 2670 Moms omvänd byggmoms
- 2680 Moms import
- 2690 Momsjusteringar
- 2700 Personalskulder
- 2710 Avdragen preliminärskatt
- 2720 Utmätning/löneavdrag
- 2730 Semesterskuld
- 2740 Pension skuld kortfristig
- 2750 Nettolöneavdrag skuld
- 2760 Löneväxling skuld
- 2790 Övriga personalrelaterade skulder
- 2800 Upplupna kostnader och förutbetalda intäkter
- 2810 Upplupna löner
- 2820 Upplupna semesterlöner
- 2830 Upplupna pensioner
- 2840 Upplupna bonusar/provisioner
- 2850 Förutbetalda intäkter abonnemang
- 2860 Förutbetalda projektintäkter
- 2890 Interimskulder övrigt
- 2900 Övriga kortfristiga skulder
- 2910 Moms/avgifter under utredning
- 2920 Depositionsskuld
- 2930 Presentkort/skuld
- 2940 Kundförskott
- 2950 Ej allokerade inbetalningar
- 2990 Övriga kortfristiga skulder

#### Klass 3 — Intäkter
- 3000 Försäljning huvudgrupp
- 3010 Tjänsteförsäljning Sverige 25
- 3020 Varuförsäljning Sverige 25
- 3030 Försäljning Sverige 12
- 3040 Försäljning Sverige 6
- 3050 Försäljning utan moms Sverige
- 3060 Byggtjänster omvänd moms
- 3070 ROT-arbete
- 3080 RUT-arbete
- 3090 Övrig försäljning
- 3100 Försäljning EU
- 3110 Varor EU B2B
- 3120 Tjänster EU B2B
- 3130 Varor EU B2C
- 3140 Tjänster EU B2C
- 3150 OSS-försäljning
- 3160 Trepartshandel
- 3190 EU-försäljning övrigt
- 3200 Export utanför EU
- 3210 Varuexport
- 3220 Tjänsteexport
- 3230 Export övrigt
- 3290 Exportjusteringar
- 3300 Abonnemang och återkommande intäkter
- 3310 Abonnemang månadsvis
- 3320 Serviceavtal
- 3330 Supportavtal
- 3340 Licensintäkter
- 3350 Transaktionsintäkter
- 3390 Abonnemang övrigt
- 3400 Projektintäkter
- 3410 Fastprisprojekt
- 3420 Löpande projekt
- 3430 Milstolpsintäkter
- 3440 ÄTA-intäkter
- 3450 Vidarefakturering material
- 3460 Vidarefakturering resor
- 3490 Projektintäkter övrigt
- 3500 Övriga rörelseintäkter
- 3510 Faktureringsavgifter
- 3520 Påminnelseavgifter
- 3530 Ränteintäkter kundreskontra
- 3540 Valutakursvinster rörelse
- 3590 Övriga rörelseintäkter

#### Klass 4 — Direkta kostnader
- 4000 Inköp huvudgrupp
- 4010 Varuinköp Sverige
- 4020 Varuinköp EU
- 4030 Varuinköp import
- 4040 Underentreprenörer
- 4050 Inköpt material till projekt
- 4060 Frakt och tull inköp
- 4070 Lagerförändring
- 4090 Direkta kostnader övrigt

#### Klass 5 — Övriga externa kostnader
- 5000 Lokaler
- 5010 Hyra
- 5020 El/värme
- 5030 Städning
- 5040 Reparation lokaler
- 5090 Lokal övrigt
- 5100 Fastighetskostnader övrigt
- 5200 Maskiner/fordon drift
- 5210 Leasing fordon
- 5220 Bränsle
- 5230 Reparation fordon
- 5240 Försäkring fordon
- 5250 Trängsel/infrastruktur
- 5260 Parkering
- 5290 Fordon övrigt
- 5300 Resor
- 5310 Tjänsteresor
- 5320 Logi
- 5330 Traktamente kostnad
- 5340 Taxi/kollektivtrafik
- 5350 Milersättning kostnad
- 5390 Resor övrigt
- 5400 Förbrukningsinventarier
- 5410 Förbrukningsmaterial
- 5420 Arbetskläder
- 5430 Verktyg småvärde
- 5490 Förbrukning övrigt
- 5500 Reparation och underhåll
- 5600 Kostnader för IT och programvara
- 5610 Programvara abonnemang
- 5620 Molndrift
- 5630 Tele/datakom
- 5640 OCR/AI-tjänster
- 5650 Konsultutveckling IT
- 5690 IT övrigt
- 5700 Frakter/post
- 5800 Reklam/marknadsföring
- 5810 Webb/SEO
- 5820 Annonsering
- 5830 Säljmaterial
- 5890 Marknad övrigt
- 5900 Försäkringar och risk
- 6000 Administration
- 6010 Kontorsmaterial
- 6020 Redovisningskonsult
- 6030 Revisionskostnad
- 6040 Juridik
- 6050 Inkasso
- 6060 Bankavgifter
- 6070 Betalningsavgifter
- 6080 Domän/hosting publika ytor
- 6090 Admin övrigt
- 6100 KMA, utbildning och certifiering
- 6200 Telekom och porto
- 6300 Företagsförsäkringar
- 6400 Representation
- 6410 Intern representation
- 6420 Extern representation
- 6430 Gåvor till kunder
- 6440 Personalvård ej löner
- 6490 Representation övrigt
- 6500 Övriga externa tjänster
- 6600 Avdragsgilla/ej avdragsgilla avgifter
- 6900 Övriga externa kostnader

#### Klass 6 — Personalkostnader
- 7000 Löner huvudgrupp
- 7010 Månadslöner
- 7020 Timlöner
- 7030 Övertid
- 7040 OB
- 7050 Jour/beredskap
- 7060 Bonus/provision
- 7070 Semesterlön
- 7080 Sjuklön
- 7090 Lön övrigt
- 7100 Sociala avgifter
- 7110 Arbetsgivaravgifter
- 7120 Särskild löneskatt
- 7130 Pensionspremier
- 7140 Extra pension
- 7150 Fora/kollektivavtalade premier
- 7160 Löneväxling arbetsgivarpåslag
- 7190 Sociala kostnader övrigt
- 7200 Förmåner
- 7210 Bilförmån kostnad
- 7220 Drivmedelsförmån kostnad
- 7230 Sjukvårdsförsäkring
- 7240 Kostförmån
- 7250 Telefonförmån
- 7260 Gåvor till anställda
- 7270 Friskvård
- 7290 Förmåner övrigt
- 7300 Utlägg och ersättningar
- 7310 Traktamente utbetalt
- 7320 Milersättning utbetald
- 7330 Utlägg ersatta
- 7390 Ersättningar övrigt
- 7400 Utbildning personal
- 7500 Rekrytering
- 7600 Personalförsäkringar
- 7700 Nedlagd tid intern
- 7780 Semesterskuld förändring
- 7790 Personalkostnader övrigt

#### Klass 7 — Avskrivningar och finansiella poster
- 7800 Avskrivningar immateriella
- 7810 Avskrivningar byggnader
- 7820 Avskrivningar maskiner
- 7830 Avskrivningar inventarier
- 7840 Avskrivningar fordon
- 7890 Avskrivningar övrigt
- 7900 Finansiella intäkter/kostnader
- 7910 Räntekostnader
- 7920 Leasingränta
- 7930 Valutakursförluster
- 7940 Valutakursvinster
- 7950 Bankräntor
- 7960 Dröjsmålsräntor
- 7990 Finansiellt övrigt

#### Klass 8 — Bokslutsdispositioner och skatt
- 8800 Bokslutsdispositioner
- 8810 Avsättning periodiseringsfond
- 8820 Återföring periodiseringsfond
- 8830 Överavskrivningar förändring
- 8890 Dispositioner övrigt
- 8900 Skatt
- 8910 Skatt på årets resultat
- 8920 Uppskjuten skatt
- 8990 Årets resultat

### 24.3 Konton som måste användas av motorerna
Minimikrav för att kärnflöden ska fungera:
- kundfakturor: 1210/2610/2620/2630/3010-3490/2650
- leverantörsfakturor: 2410/2640/4010-6990/2650
- lön: 7010-7390/2710/2730/2740/7110-7160
- pension: 7130-7160/2740/2760
- traktamente: 5330 eller 7310 beroende modell + lönearter
- ROT/RUT: 3070/3080/2560 eller särskild fordran/skuld
- projektkostnad: kostnadskonto + projektdimension
- bank: 1110/1170/1180/1190
- skattekonto: 1120/2570/2510-2590

## Posting pipeline

1. Operativt objekt skapas eller ändras.
2. Domänen producerar posting intent.
3. Regelmotorer körs, till exempel moms eller lön.
4. Ledger mappar intent till verifikationsmall.
5. Ledger validerar balans, period, konton, dimensioner och idempotens.
6. Journalentry skapas.
7. Journal lines skapas.
8. Drilldown-länkar skapas.
9. Rapporter och reskontra uppdateras.

## 25. Bokföringslogik och redovisningsinvarianten

### 25.1 Grundregler
- varje affärshändelse ska kunna spåras till verifikation
- varje verifikation ska ha datum, serie, nummer, källa, skapad av, skapad tid
- varje verifikationsrad ska ha konto, belopp, debet/kredit, valfri dimension, källa
- verifikation får inte uppdateras tyst efter bokning
- rättelse ska ske med korrigeringsverifikation eller ombokning
- historiska rapporter måste kunna återskapas exakt
- låst period kräver särskild återöppning med audit log
- allt som påverkar huvudbok ska vara idempotent

### 25.2 Bokningsstrategi
Använd genomgående:
- **operativt objekt** först
- **bokningshändelse** därefter
- **journal batch** sist

Exempel:
1. kundfaktura skapas
2. faktura godkänns/färdigställs
3. VAT engine räknar
4. posting event genereras
5. journal entry skapas
6. reskontra uppdateras

### 25.3 Posting source types
Följande posting sources ska finnas:
- AR_INVOICE
- AR_CREDIT_NOTE
- AR_PAYMENT
- AP_INVOICE
- AP_CREDIT_NOTE
- AP_PAYMENT
- PAYROLL_RUN
- PAYROLL_CORRECTION
- BENEFIT_EVENT
- TRAVEL_CLAIM
- VAT_SETTLEMENT
- BANK_IMPORT
- MANUAL_JOURNAL
- ASSET_DEPRECIATION
- PERIOD_ACCRUAL
- YEAR_END_TRANSFER
- ROT_RUT_CLAIM
- PENSION_REPORT
- PROJECT_WIP

### 25.4 Perioder
- öppna perioder kan bokas
- låsta perioder kan inte muteras
- korrigering i stängd period görs i nästa öppna period om inte särskild återöppning beslutas
- rapporter ska kunna visas:
  - transaktionsbaserat
  - per period
  - rullande 12
  - per räkenskapsår

## Månatlig close-miniminivå

- bankavstämning
- kundreskontra
- leverantörsreskontra
- moms
- skatt och arbetsgivaravgifter
- löneavstämning
- pensionsavstämning
- periodiseringar
- tillgångar och avskrivningar
- projekt/WIP där relevant
- sign-off

## Testvektorer som måste finnas

- enkel manuell verifikation
- kundfaktura med 25 % moms
- kundkreditfaktura
- leverantörsfaktura med flera kostnadsrader
- delbetalning
- valutadifferens
- retroaktiv rättelse
- periodlåsning och blockerad mutation
- anläggning och avskrivning
- HUS-delkreditering
- lönekörning med förmån
- bankavstämning med felmatchning

## Codex-prompt

```text
Read docs/compliance/se/accounting-foundation.md and ADR-0004-ledger-invariants.md.

Implement the accounting foundation exactly as documented:
- accounts
- voucher series
- journal entries
- journal lines
- accounting periods
- posting service
- reversal flow
- period lock rules
- drilldown links
- audit metadata

Do not implement UI polish.
Create migrations, seed data, tests, and docs updates.
Return:
1) created migrations
2) seed accounts and voucher series
3) test results
4) remaining gaps
```

## Exit gate

- [ ] Seed-kontoplan kan installeras i ett nytt bolag.
- [ ] Verifikationsserier fungerar och numreras korrekt.
- [ ] Alla journaler balanserar i testsviten.
- [ ] Periodlåsning blockerar mutation.
- [ ] Drilldown från rapport till rad till dokument fungerar.
