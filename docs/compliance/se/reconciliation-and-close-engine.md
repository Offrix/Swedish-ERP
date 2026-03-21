# Reconciliation and close engine

Detta dokument definierar bankavstämning, kundreskontraavstämning, leverantörsreskontraavstämning, momsavstämning, periodstängning, sign-off, reopen/rättelse och close-checklistor för svenska bolag.

## Scope

### Ingår

- bankavstämning mellan externt kontosaldo, importerade bankrader och ledgerns bankkonton
- kundreskontra- och leverantörsreskontraavstämning mot respektive kontrollkonto
- momsavstämning mellan transaktionsunderlag, momsrapport och ledgerns momskonton
- periodstängning, close-checklistor, sign-off, låsning, reopen och dokumentation av avvikelser
- uppföljning av suspense-konton, clearingkonton, gamla differenser och manuella close-justeringar
- månatlig, kvartalsvis och årlig close med versionsstyrda sign-off-paket

### Ingår inte

- själva skapandet av vanliga kund- eller leverantörsposter; det sker i AR/AP
- årsredovisningsproduktion och inlämning; den delen ligger i annual-reporting-engine
- incidentpolicy och driftberedskap; den delen ligger i separat policy och runbook

### Systemgränser

- Reconciliation motorn äger reconciliation run, close period, close checklist, sign-off och reopen request.
- Ledgern levererar kontosaldon och verifikationer men closemotorn äger inte deras innehåll.
- AR, AP, bank, moms, lön och andra subledgers levererar tie-out-underlag som closemotorn sammanställer.
- Manual journals kan användas för skillnadsrättning, men beslutet att bokföra skillnaden styrs via closemotorns köer och policy.

## Hårda regler

1. Ingen period får nå `hard_closed` om materiella differenser saknar dokumenterad förklaring eller godkänd waiver.
2. Bank, AR, AP och moms ska stämmas på samma cutoff-datum när close-paketet skapas.
3. Sign-off ska vara personlig, tidsstämplad och knuten till exakt snapshot-version av underlaget.
4. Reopen av stängd period kräver särskilt godkännande, reason code och audit; reopen får inte ske tyst.
5. Close-checklistor är versionerade. En ändrad checklista får inte retroaktivt ändra vad som krävdes för en redan signerad period.
6. Skillnadsbokningar i close ska ske via separata verifikationer, aldrig genom att manipulerade saldon skrivs direkt i avstämningsvyn.
7. Subledgerkonton som 1210, 2410, 2450, 2650, 2950, 1170, 1190 och 2490 ska ingå i explicit reconciliation-scope.
8. Gamla suspense-poster och ej utbetalda leverantörsbetalningar ska ha ägare, ålder och åtgärdsplan i close-paketet.
9. Alla close-beslut, sign-off och reopen ska vara reproducerbara historiskt.
10. Closeautomationer ska vara idempotenta per period och bolag.

## Begrepp och entiteter

- **Reconciliation run** — En avstämningskörning för ett definierat konto- eller subledgerområde och ett visst datumintervall.
- **Tie-out** — Jämförelse mellan subledgerns summering och ledgerns kontrollkonto.
- **Reconciliation difference** — Dokumenterad skillnad mellan två källor som måste lösas, bokas eller waivas.
- **Close checklist** — Den kontrollerade lista av aktiviteter som måste slutföras före stängning.
- **Sign-off** — Elektronisk bekräftelse att en definierad close-snapshot är granskad och godkänd.
- **Hard close** — Tillstånd där perioden är låst för ordinarie mutationer och endast reopen-rutin kan återöppna den.
- **Reopen request** — Formell begäran att öppna en stängd period med motiv, påverkan och godkännande.
- **Waiver** — Godkänd avvikelse där differens accepteras tillfälligt med tydlig ägare och slutdatum.

## State machines

### Reconciliation run

- `draft -> in_progress -> ready_for_signoff -> signed -> closed -> reopened`

- `ready_for_signoff` kräver att varje line item är löst, dokumenterad eller waivad.
- `reopened` skapar ny run-version; tidigare signerad version ligger kvar orörd.

### Difference item

- `open -> investigating -> proposed_adjustment -> resolved -> waived`

- `proposed_adjustment` betyder att en bokföringsåtgärd eller reskontraåtgärd har föreslagits men ännu inte genomförts.
- `waived` måste bära ägare, belopp, motivering och slutdatum för uppföljning.

### Period close

- `open -> subledger_locked -> vat_locked -> ledger_locked -> signed_off -> hard_closed -> reopened`

- Låsning sker stegvis för att minska risken att sena underlag smyger in.
- `signed_off` betyder att checklista och reconciliations är godkända; `hard_closed` betyder dessutom att systemlåsen aktiverats.
- `reopened` kräver ny checklistversion eller markering av vilka kontroller som måste köras om.

### Checklist item

- `open -> done -> blocked -> waived`

- Ett blockerat checklist-item får inte ignoreras utan waiver eller resolution.
- Waiver på checklist-item ska vara synlig i slutligt close-paket.

## Inputfält och valideringar

### Reconciliation setup

#### Fält

- bolag, period, reconciliation area, cutoff-datum, kontolista eller subledgerkälla, materialitetsgräns, ägare och sign-off-krav
- regel för daglig, månadsvis, kvartalsvis eller årlig körning

#### Valideringar

- cutoff-datum måste vara samma för jämförda källor om inte körningen uttryckligen avser timing differences
- materialitetsgräns får inte användas för att dölja systematiska fel eller kontrollkonton med strukturell mismatch
- period får inte stängas om föregående period enligt policy fortfarande är oavslutad

### Bank, AR, AP och VAT underlag

#### Fält

- banksaldo per konto, statement completeness, importerade bankrader, suspense-listor
- AR-aging, öppna kundposter, överbetalningar, kundförskott, write-off-listor
- AP-aging, öppna leverantörsposter, kreditnotor, 2450-reserv, förskott till leverantör
- momssummeringar, momsdeklarationsutkast, momskonton 2610-2690 och 2650

#### Valideringar

- subledgerunderlag ska vara versionslåst när sign-off sker
- korrigeringar som bokats efter cutoff ska inte smygas in i äldre snapshot utan särskild differensanalys
- öppna poster utan motpart eller utan dokumentlänk ska flaggas före sign-off

### Checklistor och reopen

#### Fält

- checklistversion, item-id, ansvarig, deadline, status, bevislänk, waiver och kommentar
- reopen request med period, orsak, påverkan på rapporter, föreslagen åtgärd och beslutsfattare

#### Valideringar

- reopen får inte godkännas utan tydlig analys av om moms, AGI eller andra externa rapporter redan skickats
- close-checklista ska minst täcka bank, AR, AP, moms, suspense, manuella journaler, dokumentköer och backup av rapportpaket

## Beslutsträd/regler

### Bankavstämning

- Extern bankbalans jämförs mot bokfört bankkonto plus/minus kända ej bokade eller ej bekräftade poster enligt bankmotorns regelverk.
- Om differens uppstår ska den klassificeras som timing, importgap, felklassificering, okänd bankrad eller verkligt bokföringsfel.
- Timing-differenser får finnas kvar endast om de har identifierbar motpost och rimligt åldersfönster.

### AR- och AP-avstämning

- Summan av öppna och stängda reskontraposter per cutoff ska exakt motsvara kontrollkonto i ledgern efter att ej allokerade och reserverade poster beaktats enligt regelverket.
- Överbetalningar, kundförskott, leverantörskreditnotor och 2450-reserver ska särredovisas och inte maskeras i totalbeloppet.
- Differens får inte lösas med manuell journal mot kontrollkonto utan att rotorsaken dokumenteras.

### Momsavstämning och periodstängning

- Momsmotorns summering, momsrapportens rutor och ledgerns momskonton ska kunna följas transaktion för transaktion.
- Om momsrapport redan skickats ska fel i normalfallet rättas i nästa öppna period eller via formell reopen enligt policy.
- När alla obligatoriska checklistpunkter är klara kan perioden stegvis låsas från subledger till ledger och därefter hard close.

### Reopen och rättelse

- Om felet endast påverkar intern rapportering och perioden ännu inte signats externt kan reopen användas efter godkännande.
- Om fel påverkar extern rapportering ska motorn vägleda mellan reopen, reversal i ny period eller extern rättelse enligt särskild policy.
- Varje reopen ska skapa ny close-version och ny uppsättning sign-off-beslut för de delar som påverkats.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Ren avstämning utan differens | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Reconciliation i sig skapar ingen verifikation. |
| Godkänd bankdifferens som kräver bokning | U eller O | Identifierat motkonto enligt analys, alternativt 1190/2950 under utredning | Bankkonto eller omvänt | Endast när rotorsaken är fastställd och godkänd. |
| Close-omföring eller slutjustering | O | Enligt godkänd close- eller momsjustering | Enligt motkonto i justeringen | Ska referera till difference item och sign-off. |
| Reversal av tidigare close-justering | V eller O | Tidigare kreditkonto | Tidigare debetkonto | Används när reopen eller ny analys kräver återföring. |

## Fel- och granskningsköer

- **bank_reconciliation_difference** — Bankkonto stämmer inte mot extern källa.
- **ar_reconciliation_difference** — AR-reskontra och kontrollkonto 1210/1220/1230 stämmer inte.
- **ap_reconciliation_difference** — AP-reskontra eller 2450/2440/2410-2430 stämmer inte.
- **vat_reconciliation_difference** — Momssummering och ledgerns momskonton skiljer sig.
- **old_suspense_followup** — Suspense- eller clearingpost äldre än policyfönster.
- **close_checklist_blocked** — Checklistpunkt blockerad eller saknar bevis.
- **reopen_pending** — Reopen begärd men ännu inte beslutad.

## Idempotens, spårbarhet och audit

- Varje reconciliation run ska ha `company + area + period + version` som unik nyckel.
- Sign-off ska knytas till hashad snapshot av underlag, inte bara till periodnamn.
- Close-checklistor ska vara versionsstyrda så att ändringar efter sign-off inte omskriver historik.
- Reopen ska alltid skapa ny close-version och lämna tidigare version läsbar och oförändrad.
- Difference items ska bevara hela livscykeln från upptäckt till lösning, inklusive eventuell bokföringsverifikation och återtest.
- Rapportpaket, tie-out-exports och sign-off-underlag ska kunna exporteras i exakt det skick som användes vid godkännandet.

## Golden tests

1. **Bankkonto utan differens**

- Importera fullständig statement-period och kör bankavstämning.
- Förväntat utfall: extern balans = bokförd balans och run går till ready_for_signoff.

2. **AR-tie-out med överbetalning**

- Kund överbetalar en faktura och har saldo i 2950.
- Förväntat utfall: AR-avstämningen förklarar att kontrollkonto plus 2950 ger full kundposition.

3. **AP-tie-out med betalningsreserv**

- AP-faktura ligger i exporterad men ännu ej bokad betalfil.
- Förväntat utfall: 2450 visas separat och periodens skuld förklaras korrekt.

4. **Momsavstämning efter kreditnota**

- Skapa försäljning och senare kredit.
- Förväntat utfall: momssummering och ledger följer samma nettologik.

5. **Reopen av signerad period**

- Begär reopen efter upptäckt fel.
- Förväntat utfall: ny close-version, gammal sign-off kvar i historiken och tydlig reason code.

6. **Waiver av liten differens**

- Lägg en differens under policygräns i waiver.
- Förväntat utfall: waiver syns i close-paketet med ägare och slutdatum.

## Exit gate

- [ ] bank, AR, AP och moms kan avstämmas med versionsstyrda snapshots
- [ ] close-checklistor täcker alla obligatoriska domäner och har ägare
- [ ] reopen, waiver och difference items har full audit och tydliga regler
- [ ] periodlåsning sker stegvis och kan visas i historik
- [ ] sign-off går att koppla till exakt det underlag som användes vid stängning
