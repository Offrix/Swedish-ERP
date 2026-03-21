# Master verification gates

Detta dokument definierar de grindar som måste passeras innan en fas eller release anses klar.

## Övergripande grindar

### Gate A — Intern demo klar
- repo fungerar
- docs finns
- seed-data finns
- demo-konto finns
- bootstrap kan köras från tom maskin

### Gate B — Pilot redo
- ledger
- moms
- AR
- AP
- dokumentinbox
- tid
- lön
- förmåner
- traktamente
- pension
- projekt
- personalliggare/byggspår om målsegment kräver

### Gate C — Extern byrå redo
- portföljvy
- deadlines
- klientgodkännanden
- massåtgärder
- close checklists

### Gate D — Offentlig sektor redo
- Peppol in/ut
- buyer reference/order reference
- valideringar
- kvittenser
- kreditnota

### Gate E — Årsrapportering redo
- årsredovisningsgenerator
- versionslåsning
- signeringsflöde
- inlämningsflöde eller integrerad operatörsstrategi

## Fasgrindar

## Gate for FAS 0 — Bootstrap, repo och dokumentgrund

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 0.1 Monorepo och runtime-låsning
- [ ] Ren maskin kan bootstrapa projektet
- [ ] Versioner matchar ADR-0001
- [ ] Health checks svarar grönt
- [ ] Prompt `P0-01` är körd och resultat dokumenterat

### 0.2 CI, kvalitet och säkerhetsbas
- [ ] Trasig PR blockeras
- [ ] Secrets och sårbarheter fångas
- [ ] CI är deterministisk
- [ ] Prompt `P0-02` är körd och resultat dokumenterat

### 0.3 Domänskelett och docskeleton
- [ ] Inga cirkulära beroenden
- [ ] Alla domäner har README
- [ ] Alla obligatoriska dokument finns
- [ ] Prompt `P0-03` är körd och resultat dokumenterat

## Gate for FAS 1 — Identitet, organisation, auth och onboarding

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 1.1 Organisation, roller och accesskontroll
- [ ] Bolag kan inte se varandras data
- [ ] Delegation respekterar datum och scope
- [ ] Servern blockerar otillåtna actions
- [ ] Prompt `P1-01` är körd och resultat dokumenterat

### 1.2 Inloggning, sessioner och stark autentisering
- [ ] Sessioner kan återkallas
- [ ] MFA krävs för admins
- [ ] Audit log skapas för autentisering
- [ ] Prompt `P1-02` är körd och resultat dokumenterat

### 1.3 Bolagssetup och onboarding wizard
- [ ] Onboarding skapar komplett bolagskonfiguration
- [ ] Checklista visar saknade steg
- [ ] Setup kan återupptas
- [ ] Prompt `P1-03` är körd och resultat dokumenterat

## Gate for FAS 2 — Dokumentmotor, företagsinbox och OCR

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 2.1 Dokumentarkiv och metadata
- [ ] Original och derivat skiljs åt
- [ ] Export av dokumentkedja fungerar
- [ ] Duplikat upptäcks
- [ ] Prompt `P2-01` är körd och resultat dokumenterat

### 2.2 Företagsinbox och mail ingestion
- [ ] Flera bilagor hanteras korrekt
- [ ] Message-ids dedupliceras
- [ ] Felaktiga bilagor flaggas
- [ ] Prompt `P2-02` är körd och resultat dokumenterat

### 2.3 OCR, klassificering och granskningskö
- [ ] Fakturor, kvitton och avtal särskiljs
- [ ] Människan kan korrigera tolkningen
- [ ] Omkörning sparar ny derivatversion
- [ ] Prompt `P2-03` är körd och resultat dokumenterat

## Gate for FAS 3 — Huvudbok, kontomodell, journaler och avstämningsgrund

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 3.1 Ledger-schema och verifikationsmotor
- [ ] Debet = kredit i alla tester
- [ ] Verifikationsnummer är deterministiska
- [ ] Import markerar källtyp
- [ ] Prompt `P3-01` är körd och resultat dokumenterat

### 3.2 Dimensioner, perioder och bokföringsregler
- [ ] Låsta perioder går inte att mutera
- [ ] Rättelser skapar ny verifikation
- [ ] Obligatoriska dimensioner valideras
- [ ] Prompt `P3-02` är körd och resultat dokumenterat

### 3.3 Avstämningscenter och rapportgrund
- [ ] Rapporter kan återskapas historiskt
- [ ] Drilldown fungerar till källdokument
- [ ] Avstämning sparar sign-off
- [ ] Prompt `P3-03` är körd och resultat dokumenterat

## Gate for FAS 4 — Momsmotor

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 4.1 Momsmasterdata och beslutsträd
- [ ] Alla transaktionstyper får ett spårbart momsbeslut
- [ ] Historiska regler kan återspelas
- [ ] Oklara fall går till granskningskö
- [ ] Prompt `P4-01` är körd och resultat dokumenterat

### 4.2 Sverige, EU, import, export och omvänd moms
- [ ] Deklarationsboxar summerar rätt
- [ ] Kreditnota spegelvänder moms korrekt
- [ ] Importmoms och reverse charge dubbelbokas rätt
- [ ] Prompt `P4-02` är körd och resultat dokumenterat

### 4.3 OSS, IOSS, periodisk sammanställning och rapportering
- [ ] B2C-distansförsäljning landas rätt
- [ ] EU-lista kan skapas om och om igen
- [ ] Momsrapport stämmer mot ledgern
- [ ] Prompt `P4-03` är körd och resultat dokumenterat

## Gate for FAS 5 — Försäljning, kundreskontra och kundfakturor

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 5.1 Kundregister, artiklar, offerter och avtal
- [ ] Offerter versionshanteras
- [ ] Avtal genererar korrekt fakturaplan
- [ ] Kunddata kan importeras
- [ ] Prompt `P5-01` är körd och resultat dokumenterat

### 5.2 Kundfakturor och leveranskanaler
- [ ] Faktura bokförs bara en gång
- [ ] Kreditfaktura stänger rätt poster
- [ ] Peppol-export validerar
- [ ] Prompt `P5-02` är körd och resultat dokumenterat

### 5.3 Kundreskontra, påminnelser och inbetalningsmatchning
- [ ] Delbetalningar hanteras
- [ ] Felmatchningar kan backas
- [ ] Åldersanalys är korrekt
- [ ] Prompt `P5-03` är körd och resultat dokumenterat

## Gate for FAS 6 — Leverantörsfakturor, inköp, bank och betalningar

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 6.1 Leverantörsregister, PO och mottagning
- [ ] Leverantörer och PO kan importeras
- [ ] Mottagning kopplar till faktura
- [ ] Dubblettskydd finns
- [ ] Prompt `P6-01` är körd och resultat dokumenterat

### 6.2 Leverantörsfaktura in, tolkning och matchning
- [ ] Flera kostnadsrader bokas rätt
- [ ] Momsförslag kan förklaras
- [ ] Avvikelser kräver granskning
- [ ] Prompt `P6-02` är körd och resultat dokumenterat

### 6.3 Attest, bankintegration och utbetalning
- [ ] Obehöriga kan inte betala
- [ ] Utbetalningar bokförs korrekt
- [ ] Returer kan återimporteras
- [ ] Prompt `P6-03` är körd och resultat dokumenterat

## Gate for FAS 7 — Tidportal, HR-bas och anställdportal

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 7.1 Anställdregister och HR-master
- [ ] Samma person kan ha flera anställningar
- [ ] Anställningshistorik bevaras
- [ ] Känsliga fält loggas
- [ ] Prompt `P7-01` är körd och resultat dokumenterat

### 7.2 Tidrapportering, schema och saldon
- [ ] Låsning av period fungerar
- [ ] Tid kan kopplas till projekt och aktivitet
- [ ] Beräkning av saldon är reproducerbar
- [ ] Prompt `P7-02` är körd och resultat dokumenterat

### 7.3 Frånvaro, attest och anställdportal
- [ ] Frånvaro kan inte ändras efter AGI-signering
- [ ] Historik visas för anställd och admin
- [ ] Uppgifter för frånvarosignaler är kompletta
- [ ] Prompt `P7-03` är körd och resultat dokumenterat

## Gate for FAS 8 — Lön och AGI

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 8.1 Lönearter, lönekalender och lönekörning
- [ ] Lönekedjan följer definierad ordning
- [ ] Retrofall är spårbara
- [ ] Lönebesked kan regenereras
- [ ] Prompt `P8-01` är körd och resultat dokumenterat

### 8.2 Skatt, arbetsgivaravgifter, SINK och AGI
- [ ] AGI innehåller rätt fält per individ
- [ ] Frånvarouppgifter låses i tid
- [ ] Rättelseversioner kan skapas
- [ ] Prompt `P8-02` är körd och resultat dokumenterat

### 8.3 Lönebokföring och utbetalning
- [ ] Bokföring per projekt/kostnadsställe fungerar
- [ ] Utbetalningar matchas mot bank
- [ ] Semesterskuld kan återskapas
- [ ] Prompt `P8-03` är körd och resultat dokumenterat

## Gate for FAS 9 — Förmåner, resor, traktamente, pension och löneväxling

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 9.1 Förmånsmotor
- [ ] Förmåner med och utan kontant lön hanteras
- [ ] Bilförmån start/stopp per månad fungerar
- [ ] AGI-mappning och bokföring är korrekt
- [ ] Prompt `P9-01` är körd och resultat dokumenterat

### 9.2 Resor, traktamente, körjournal och utlägg
- [ ] 50 km-krav och övernattning styr korrekt
- [ ] Måltidsreduktion minskar rätt
- [ ] Överskjutande del blir lön
- [ ] Prompt `P9-02` är körd och resultat dokumenterat

### 9.3 Pension, extra pension och löneväxling
- [ ] Rapportunderlag per kollektivavtal stämmer
- [ ] Löneväxling varnar under tröskel
- [ ] Pension bokförs och avstäms
- [ ] Prompt `P9-03` är körd och resultat dokumenterat

## Gate for FAS 10 — Projekt, bygg, fält, lager och personalliggare

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 10.1 Projekt, budget och uppföljning
- [ ] Projektkostnad inkluderar lön, förmåner, pension och resor
- [ ] WIP kan stämmas av mot fakturering
- [ ] Forecast at completion fungerar
- [ ] Prompt `P10-01` är körd och resultat dokumenterat

### 10.2 Arbetsorder, serviceorder, fältapp och lager
- [ ] Offline-sync tål nätavbrott
- [ ] Materialuttag går till projekt
- [ ] Arbetsorder kan faktureras
- [ ] Prompt `P10-02` är körd och resultat dokumenterat

### 10.3 Byggspecifika regler: ÄTA, HUS, omvänd moms, personalliggare
- [ ] HUS-kundandel och ansökan stämmer
- [ ] Byggmoms triggas korrekt
- [ ] Personalliggare exporterar kontrollbar kedja
- [ ] Prompt `P10-03` är körd och resultat dokumenterat

## Gate for FAS 11 — Rapporter, byråläge, månadsstängning och bokslut

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 11.1 Rapporter och drilldown
- [ ] Rapporter är historiskt reproducerbara
- [ ] Belopp kan spåras till källdokument
- [ ] Export till Excel/PDF fungerar
- [ ] Prompt `P11-01` är körd och resultat dokumenterat

### 11.2 Byråläge och portföljhantering
- [ ] Byrån ser bara klienter i scope
- [ ] Deadlines härleds från bolagsinställningar
- [ ] Klientdokument kan begäras och spåras
- [ ] Prompt `P11-02` är körd och resultat dokumenterat

### 11.3 Månadsstängning och bokslutschecklistor
- [ ] Månad kan stängas med komplett checklista
- [ ] Öppna avvikelser blockerar sign-off där policy kräver
- [ ] Återskapad period ger samma rapport
- [ ] Prompt `P11-03` är körd och resultat dokumenterat

## Gate for FAS 12 — Årsredovisning, deklaration och myndighetskopplingar

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 12.1 Årsredovisningsmotor
- [ ] Årspaket låser underlag
- [ ] Signaturkedja spåras
- [ ] Rättelse skapar ny version
- [ ] Prompt `P12-01` är körd och resultat dokumenterat

### 12.2 Skatt, deklarationsunderlag och myndighetsfiler
- [ ] Filer matchar interna siffror
- [ ] Submission loggas med kvittens
- [ ] Fel går till åtgärdskö
- [ ] Prompt `P12-02` är körd och resultat dokumenterat

## Gate for FAS 13 — API, integrationer, AI och automation

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 13.1 Publikt API och webhooks
- [ ] Scopes begränsar rätt data
- [ ] Webhook events är idempotenta
- [ ] Backward compatibility bevakas
- [ ] Prompt `P13-01` är körd och resultat dokumenterat

### 13.2 Partnerintegrationer och marknadsplats
- [ ] Varje adapter har kontraktstest
- [ ] Fallback finns vid extern driftstörning
- [ ] Rate limits respekteras
- [ ] Prompt `P13-02` är körd och resultat dokumenterat

### 13.3 AI, automation och no-code-regler
- [ ] Alla AI-beslut har confidence och förklaring
- [ ] Human-in-the-loop kan överstyra
- [ ] Felaktiga AI-förslag påverkar inte ledger utan granskning
- [ ] Prompt `P13-03` är körd och resultat dokumenterat

## Gate for FAS 14 — Härdning, pilot, prestanda, säkerhet och go-live

### Allmänt krav
- [ ] Kod, tester och docs är uppdaterade i samma förändring
- [ ] Demo kan köras på seed-data
- [ ] Ingen kritisk eller hög bug står öppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen påverkar produktion

### 14.1 Säkerhet och behörighetsgranskning
- [ ] Kritiska findings är åtgärdade
- [ ] Admin-spår granskas
- [ ] Secrets-hantering är verifierad
- [ ] Prompt `P14-01` är körd och resultat dokumenterat

### 14.2 Prestanda, återläsning och chaos-test
- [ ] Systemet klarar mållast
- [ ] RTO/RPO uppfylls
- [ ] Köer återhämtar sig efter fel
- [ ] Prompt `P14-02` är körd och resultat dokumenterat

### 14.3 Pilotkunder, datamigrering och go-live-ritual
- [ ] Parallellkörning stämmer
- [ ] Kunddata migreras utan differenser
- [ ] Support-runbook är bemannad
- [ ] Prompt `P14-03` är körd och resultat dokumenterat


## Bevis som ska bifogas varje gate

- testkörningsresultat
- demo-video eller demo-notes
- diff på docs
- lista över migrationsfiler
- lista över nya externa beroenden
- eventuella kända begränsningar
- rollback-plan

## Exit gate

- [ ] Ingen fas markeras klar utan dokumenterat bevis.
- [ ] Alla gate-checklistor kan följas av någon som inte skrivit koden.
- [ ] Gate-status kan granskas i efterhand.
