# AR customer invoicing engine

Detta dokument definierar hela kundfaktura- och kundreskontramaskinen för svenska bolag: kundregister, artiklar, offerter, avtal, fakturaplaner, fakturering, kreditering, påminnelser, delbetalningar, write-off och exakt bokföringspåverkan.

## Scope

### Ingår

- kundregister med kundnummer, juridisk identitet, faktureringsadress, leveransadress, betalningsvillkor, kreditgräns och språk
- artikelregister med artikeltyp, momsbeteende, prislista, intäktskonto, dimensionskrav och om raden är återkommande eller projektbunden
- offerter, avtal, abonnemang och fakturaplaner som genererar framtida fakturaunderlag
- manuell och automatiserad skapning av kundfakturor, deldebiteringar, slutfakturor, kreditfakturor och samlingsfakturor
- kundreskontra med öppna poster, åldersanalys, delbetalning, överbetalning, underbetalning, tvist och write-off
- påminnelseavgift, dröjsmålsränta, överlämning till inkasso och återföring från inkasso
- matchning mellan inbetalningar, kreditnotor, kundförskott och öppna fakturaposter
- bokföringspåverkan från kundfaktura fram till slutlig avprickning eller förlust

### Ingår inte

- transport av e-faktura till externa accesspunkter; den delen ligger i Peppol-dokumentet
- bankfeed, statement-import och teknisk bankkommunikation; den delen ligger i bank- och betalningsmotorn
- konstaterad kundförlust och momsjustering för kundförlust i detalj; den delen ligger i collections-dokumentet
- projektspecifika WIP- och intäktsföringsregler; den delen ligger i projektfaktureringsdokumentet

### Systemgränser

- AR äger kund, offert, avtal, fakturaplan, kundfaktura, kundkreditfaktura och kundreskontrapost.
- Ledgern äger själva verifikationen och accepterar endast posting intents från AR.
- Momsmotorn avgör momskod, momssats, deklarationsmappning och om en avgift ligger utanför momsens scope.
- Bankmotorn äger bankhändelsen; AR äger allokeringen av en bankhändelse mot kundposter.
- Dokumentmotorn äger PDF, e-post och OCR-utdata; AR får endast länka dokument till affärsobjekt.

## Hårda regler

1. Varje bolag ska ha en unik, monotont stigande kundfakturanummerserie. Nummer får aldrig återanvändas eller bytas efter `issued`.
2. En kundfaktura får inte nå `issued` om header, rader, momsbeslut, kundidentitet, förfallodatum och betalreferens saknas.
3. En faktura som inte är märkt som proforma ska skapa exakt en ekonomisk händelse i ledgern och exakt en öppen kundpost.
4. Kreditfaktura ska alltid länka till ursprungsfaktura eller explicit skälkod för fristående kredit. Kredit får inte överskrida tillåtet kvarvarande belopp utan särskilt godkännande.
5. Delfakturering får aldrig göra att fakturerad kvantitet eller summa överstiger avtalad leverans utan override med audit-spår.
6. Påminnelseavgift får endast skapas om avtalsvillkor eller kundvillkor tillåter det från skuldens uppkomst. Dröjsmålsränta ska beräknas enligt avtalad ränta eller lagstadgad modell.
7. Överbetalning är aldrig intäkt. Den ska ligga som kundförskott eller ej allokerad inbetalning tills den återbetalas, omförs eller används mot annan öppen post.
8. Underbetalning får inte auto-skrivas av över bolagets policygräns. Över gränsen krävs tvist, ny betalning eller formell write-off.
9. Reskontran ska kunna återskapas för varje historisk tidpunkt utifrån oförändrade händelser och reverseringar.
10. Alla automationer som genererar fakturor, påminnelser eller allokeringar ska vara idempotenta.

## Begrepp och entiteter

- **Kund** — Motpart på intäktssidan med juridisk identitet, betalningsvillkor, kommunikationsinställningar och kreditstatus.
- **Artikel** — Säljbar radmall med beskrivning, enhet, pris, intäktskonto och standardmomskod.
- **Offert** — Versionsstyrd försäljningshandling utan bokföring som kan konverteras till order eller avtal.
- **Avtal** — Kommersiellt åtagande som styr fakturaplan, prislogik, indexering och kreditregler.
- **Fakturaplan** — Kalender och regeluppsättning som avgör när ett avtal genererar faktureringsbara poster.
- **Kundfaktura** — Utgående faktura som normalt skapar kundfordran, intäkt och utgående moms.
- **Deldeliverans/deldebitering** — Delvis fakturering av kvantitet eller belopp där resterande åtagande ligger kvar öppet.
- **Kreditfaktura** — Negativ kundfaktura som reducerar öppen post och spegelvänder ursprunglig bokföring.
- **Kundreskontrapost** — Öppen eller stängd ekonomisk post mot kund som kan allokeras mot betalning, kredit eller write-off.
- **Tvistad faktura** — Faktura eller del av faktura som är under formell invändning och därför stoppas från påminnelse- och inkassoflöde.
- **Överbetalning** — Belopp som mottagits över summan av allokerade fakturor och därför blir kundskuld eller förskott.
- **Underbetalning** — Betald summa understiger öppen fakturasumma och lämnar en restpost som måste hanteras.
- **Write-off** — Kontrollerad avskrivning eller avslut av liten restpost utan att ursprunglig historik skrivs över.

## State machines

### Offert

- `draft -> sent -> accepted -> rejected -> expired -> converted`

- Endast `accepted` offert får konverteras till order eller avtal.
- Ny offertversion skapas vid ändring efter utskick; tidigare version förblir läsbar.
- Utgången offert får inte återanvändas utan explicit re-open och versionshöjning.

### Avtal

- `draft -> pending_approval -> active -> paused -> terminated -> expired`

- Fakturaplan får bara genereras från `active` avtal.
- Paus stoppar nya fakturaförslag men påverkar inte redan utställda fakturor.
- Terminering kräver slutdatum och beslut om kvarvarande fakturaplanrader ska annulleras eller slutfaktureras.

### Kundfaktura

- `draft -> validated -> approved -> issued -> delivered -> partially_paid -> paid -> overdue -> disputed -> credited -> written_off -> reversed`

- `draft` får redigeras fritt inom versionskedjan.
- `validated` kräver att summeringar, moms och kunddata går ihop exakt.
- `approved` krävs om bolagets attestpolicy säger det; små standardfakturor kan gå direkt till `issued` via regelmotor.
- `issued` låser fakturanummer, belopp, kund, valutadata och momsfakta.
- `partially_paid` och `paid` drivs av reskontraallokeringar, inte av användarstatus.
- `disputed` blockerar påminnelse, inkasso och auto-write-off men blockerar inte historik.

### Allokering

- `proposed -> confirmed -> reversed`

- Auto-allokering ska alltid kunna backas genom reversal av allokeringen, inte genom ändring av originalhändelsen.
- Samma inbetalningsrad får allokeras mot flera fakturor men summan av allokeringarna får aldrig överstiga tillgängligt belopp.
- Kreditfakturaallokering och betalningsallokering använder samma öppna-poster-logik.

### Påminnelsespår

- `none -> stage_1 -> stage_2 -> escalated -> hold -> closed`

- Tvist, konkursflagga eller manuell hold stoppar vidare steg.
- Ny stage får inte skapas två gånger för samma faktura, avgiftstyp och dag.
- Stängning sker när restbeloppet är noll eller när fordran lämnar AR-domänens ansvar.

## Inputfält och valideringar

### Kundregister

#### Fält

- `customer_no`, juridiskt namn, organisationsnummer eller annan identitet, landkod, språk, momsstatus, valuta, betalningsvillkor, fakturasätt, kreditgräns, påminnelseprofil
- fakturaadress, leveransadress, kontaktperson, e-post för PDF, Peppol-ID när e-faktura används
- standardkonto för kundfordran utifrån geografi, standardintäktssegment, projekt- eller kostnadsställekrav
- flaggor för `allow_reminder_fee`, `allow_interest`, `allow_partial_delivery`, `blocked_for_invoicing`, `blocked_for_delivery`

#### Valideringar

- kundnummer ska vara unikt per bolag
- organisationsnummer ska valideras enligt landsregel när sådant finns
- Peppol-ID får inte användas utan land och identifierarens typ
- kreditgräns får inte vara negativ
- spärrad kund får inte få ny faktura utan override och audit

### Artiklar, offerter och avtal

#### Fält

- artikelkod, benämning, artikeltyp, enhet, standardpris, rabattregel, intäktskonto, momskod, dimensionskrav
- offertheader med giltighetstid, valuta, kund, rabattmodell och offertversion
- avtal med start/slutdatum, fakturafrekvens, indexering, minimiavgift, fakturaplan, uppsägningsregel och kreditregel
- fakturaplanrad med planerat fakturadatum, belopp eller kvantitet, fakturaperiod och länk till ursprungsåtagande

#### Valideringar

- fakturaplan får inte skapa luckor eller överlapp som gör att samma period faktureras dubbelt om inte avtalstypen uttryckligen stödjer det
- prislista och valuta måste vara giltiga på fakturadatum
- indexering får inte slå igenom retroaktivt utan versionshöjning av avtalet
- slutfaktura får inte lämna negativ rest på avtal eller offert

### Fakturahuvud och rader

#### Fält

- fakturanummer, fakturadatum, leverans-/skattedatum, förfallodatum, valuta, kund, betalreferens, betalningssätt, leveranssätt
- radtyp, artikel eller fri text, kvantitet, enhetspris, rabatt, nettobelopp, momskod, momsbelopp, projekt, dimensionsfält, källobjekt
- headeravgifter såsom faktureringsavgift som måste representeras som separata rader med egen momshantering
- för fristående kreditfaktura: kreditorsak, hänvisning till underlag och attestorsak

#### Valideringar

- förfallodatum får inte ligga före fakturadatum om inte betalningsvillkor är `due_on_receipt`
- radsummor och headertotal ska stämma exakt efter avrundningsregler
- varje rad ska ha ett spårbart momsbeslut eller explicit `out_of_scope`
- betalreferens ska följa bolagets referensregel; OCR-referens måste vara numerisk om OCR används
- fakturanummer bör hållas kort och interoperabelt; systemet ska därför varna över 9 tecken men inte bryta kundens egna nummerserie om den uttryckligen godkänts

### Reskontra och matchning

#### Fält

- öppen post-id, ursprungsfaktura, restbelopp i valuta och funktionell valuta, förfallodatum, åldersbucket, tvistflagga, inkassostatus
- allokeringsobjekt med källa, belopp, datum, användare/automation, motpost och eventuellt restbelopp
- write-off-objekt med skälkod, beslutsnivå, policygräns, motkonto och koppling till originalpost

#### Valideringar

- allokeringsbelopp får inte överstiga tillgängligt öppet belopp
- cross-currency-allokering kräver FX-stöd och sparad kurs
- write-off över policygräns måste ha attestspår
- tvistad post får inte auto-allokeras mot påminnelseavgift eller ränta

## Beslutsträd/regler

### Faktura skapad från avtal, offert eller manuell källa

- Om fakturaplanradens datum infaller och underlaget är komplett skapas ett fakturaförslag.
- Om leveransbevis eller projektgodkännande krävs får förslag inte gå till `validated` före sådant underlag.
- Samfakturering får endast ske om kund, valuta, betalningsvillkor och leveranskanal är kompatibla.
- Deldeliverans ska minska återstående kvantitet eller belopp på källobjektet och skapa tydlig rest.
- Slutfaktura ska markera källobjektets resterande faktureringsbara värde som förbrukat.

### Kreditfaktura

- Hela eller delar av ursprungsfakturan kan krediteras radvis eller som procentsats, men systemet ska alltid kunna visa exakt vilka rader som spegelvänds.
- Om kredit sker efter betalning skapar krediten kundsaldo till godo och ska därefter allokeras mot annan skuld eller återbetalas.
- Kredit efter låst period får skapa ny kreditverifikation i öppen period, aldrig ändra historisk kundfaktura.

### Påminnelse, ränta och avgifter

- Påminnelseflöde startar först efter förfallodatum och eventuell kundspecifik karenstid.
- Påminnelseavgift skapas bara om kundvillkor eller avtal tillåter avgiften från skuldens uppkomst.
- Dröjsmålsränta beräknas på förfallet restbelopp dag för dag enligt avtalad procentsats eller lagmodell med referensränta plus åtta procentenheter.
- Påminnelseavgift och ränta ska faktureras som egna AR-poster för att kunna matchas och reverseras separat.
- Tvist, pågående kredit, död/konkursflagga eller compliance-hold stoppar automatiska påminnelser.

### Matchning av betalning, kredit och write-off

- Auto-matchning använder betalreferens, OCR, kundidentitet, belopp, valuta, datumfönster och öppen post-prioritet.
- Exakt referensträff och exakt belopp matchar först. Därefter prövas kombinationsmatchning inom policytolerans.
- Överbetalning bokas till kundskuld/ej allokerad inbetalning tills användare eller regelmotor omför den.
- Underbetalning inom liten restgräns kan föreslås för write-off men inte postas utan policygodkännande.
- Om en allokering backas ska reskontraposten återöppnas med full historik över tidigare statusar.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Utställ normal kundfaktura | B | 1210 / 1220 / 1230 Kundfordringar | Intäktskonto 30xx, utgående moms 2610/2620/2630 | En öppen kundreskontrapost skapas samtidigt som verifikationen. |
| Utställ kundkreditfaktura | C | Intäktskonto 30xx, utgående moms 2610/2620/2630 | 1210 / 1220 / 1230 Kundfordringar | Spegelvänder ursprungsfaktura rad för rad så långt underlaget medger. |
| Mottagen inbetalning exakt matchad | D | 1110 / 1140 / 1150 Bankkonto | 1210 / 1220 / 1230 Kundfordringar | Bankkontot väljs efter faktiskt konto och valuta. |
| Mottagen inbetalning utan säker match | D | 1110 / 1140 / 1150 Bankkonto | 2950 Ej allokerade inbetalningar | Används tills posten allokeras eller återbetalas. |
| Allokera tidigare överbetalning mot faktura | D | 2950 Ej allokerade inbetalningar | 1210 / 1220 / 1230 Kundfordringar | Ingen ny bankrörelse uppstår, endast reskontraomföring. |
| Mottaget kundförskott före faktura | D | 1110 / 1140 / 1150 Bankkonto | 2940 Kundförskott | Används när betalning kommer före utställd faktura. |
| Förbrukning av kundförskott vid senare faktura | D | 2940 Kundförskott | 1210 / 1220 / 1230 Kundfordringar | Kopplas till ursprungsfakturan via allokering. |
| Påminnelseavgift | B | 1210 / 1220 / 1230 Kundfordringar | 3520 Påminnelseavgifter | Ingen moms om avgiften är ren förseningskompensation. |
| Dröjsmålsränta | B | 1210 / 1220 / 1230 Kundfordringar | 3530 Ränteintäkter kundreskontra | Ingen moms om räntan är ren dröjsmålsränta. |
| Liten underbetalning write-off | V | Konfigurerat motkonto för smådifferenser, default 6900 | 1210 / 1220 / 1230 Kundfordringar | Får endast användas inom policygräns och med reason code. |
| Återbetalning av kunds överbetalning | D | 2950 Ej allokerade inbetalningar | 1110 / 1140 / 1150 Bankkonto | Används när överskott inte ska kvittas mot annan skuld. |

## Fel- och granskningsköer

- **invoice_validation_failed** — Saknade obligatoriska fält, obalanserade totalsummor, ogiltigt momsbeslut eller spärrad kund.
- **delivery_failed** — Faktura kunde inte levereras via vald kanal och kräver ny sändning eller kanalbyte.
- **allocation_review** — Auto-matchning hittade flera sannolika kandidater eller beloppet kräver manuell split.
- **credit_link_missing** — Kreditfaktura saknar giltig koppling till ursprung eller överskrider kvarvarande krediterbart belopp.
- **dunning_hold** — Påminnelseflöde stoppat av tvist, kredit under arbete, kundspärr eller compliance-hold.
- **writeoff_approval_required** — Restbelopp över automatgräns eller motkonto saknar godkänd mapping.

## Idempotens, spårbarhet och audit

- Varje genererad faktura ska bära `source_type`, `source_id`, `source_version` och ett deterministiskt `invoice_generation_key`.
- Fakturanummerserie reserveras först i det ögonblick då fakturan går till `issued`; förhandsvalidering får använda tillfälligt draft-id men aldrig bränna nummer.
- Påminnelse-, ränte- och avgiftskörningar ska använda nyckeln `company + invoice_id + stage + calculation_window`.
- Allokering av bankhändelse ska lagra bankens transaktions-id, statement line hash och allokeringsversion för att kunna upptäcka återimport.
- Alla statusövergångar, användarbeslut, attest, leveransförsök och reverseringar ska auditeras med vem, när, varför och vilken data som användes.
- Historisk åldersanalys ska kunna reproduceras genom att summera öppna poster per tidpunkt i stället för att lita på muterade statusfält.

## Golden tests

1. **Standardfaktura Sverige 25 procent**

- Skapa kund, artikel och faktura med en rad.
- Förväntat utfall: serie B, kundfordran i 1210, intäkt i 30xx, moms i 2610 och en öppen post i reskontran.

2. **Deldeliverans och slutfaktura**

- Fakturera 40 procent av avtalat belopp och därefter resterande 60 procent.
- Förväntat utfall: två separata fakturor, korrekt återstående rest efter första fakturan och noll kvar efter slutfakturan.

3. **Kredit av redan delbetald faktura**

- Betala del av fakturan, skapa därefter delkredit.
- Förväntat utfall: reskontran visar rätt nettoskuld, överbetalning uppstår endast om krediten överstiger resterande skuld.

4. **Påminnelseavgift tillåten**

- Faktura passerar förfallodatum och kund har tillåtelse för avgift.
- Förväntat utfall: separat AR-post i serie B utan moms och spårbar dunning-stage.

5. **Påminnelseavgift förbjuden**

- Faktura passerar förfallodatum men kundvillkor förbjuder avgift.
- Förväntat utfall: endast påminnelsebrev eller stage-händelse, ingen bokföring.

6. **Överbetalning**

- Importera en bankhändelse som överstiger fakturans restbelopp.
- Förväntat utfall: fakturan stängs, överskott hamnar i 2950 och kan senare återbetalas.

7. **Liten underbetalning med write-off**

- Restbelopp understiger policygräns.
- Förväntat utfall: serie V med motkonto för smådifferenser och full audit.

8. **Tvistad faktura**

- Markera faktura som tvistad före påminnelsekörning.
- Förväntat utfall: dunning stoppas och status går till hold.

9. **Idempotent avtalsskapad faktura**

- Kör samma fakturagenerering två gånger för samma källversion.
- Förväntat utfall: exakt en utställd faktura och samma idempotency key i auditloggen.

## Exit gate

- [ ] kundregister, artikelregister, offert, avtal och fakturaplan kan köras från seed-data utan manuell SQL
- [ ] normal faktura, kredit, delbetalning, överbetalning och write-off ger deterministiska posting intents
- [ ] påminnelse- och räntespår kan förklaras för varje faktura och går att reversera
- [ ] åldersanalys, kundsaldo och reskontra mot ledger stämmer på samma cutoff-datum
- [ ] alla automationer har golden tests för idempotens och historisk reproducerbarhet
