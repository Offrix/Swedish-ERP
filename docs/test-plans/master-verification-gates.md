# Master verification gates

Detta dokument definierar de grindar som mÃ¥ste passeras innan en fas eller release anses klar.

## Ã–vergripande grindar

### Gate A â€” Intern demo klar
- repo fungerar
- docs finns
- seed-data finns
- demo-konto finns
- bootstrap kan kÃ¶ras frÃ¥n tom maskin

### Gate B â€” Pilot redo
- ledger
- moms
- AR
- AP
- dokumentinbox
- tid
- lÃ¶n
- fÃ¶rmÃ¥ner
- traktamente
- pension
- projekt
- personalliggare/byggspÃ¥r om mÃ¥lsegment krÃ¤ver

### Gate C â€” Extern byrÃ¥ redo
- portfÃ¶ljvy
- deadlines
- klientgodkÃ¤nnanden
- massÃ¥tgÃ¤rder
- close checklists

### Gate D â€” Offentlig sektor redo
- Peppol in/ut
- buyer reference/order reference
- valideringar
- kvittenser
- kreditnota

### Gate E â€” Ã…rsrapportering redo
- Ã¥rsredovisningsgenerator
- versionslÃ¥sning
- signeringsflÃ¶de
- inlÃ¤mningsflÃ¶de eller integrerad operatÃ¶rsstrategi

## Fasgrindar

### TvÃ¤rgÃ¥ende verifieringspaket som alltid ska passeras nÃ¤r scope berÃ¶r omrÃ¥det
- `docs/test-plans/queue-resilience-and-replay-tests.md`
- `docs/test-plans/search-relevance-and-permission-trimming-tests.md`
- `docs/test-plans/mobile-offline-sync-tests.md`
- `docs/test-plans/migration-parallel-run-diff-tests.md`
- `docs/test-plans/audit-review-and-sod-tests.md`
- `docs/test-plans/feature-flag-rollback-and-disable-tests.md`
- `docs/test-plans/report-reproducibility-and-export-integrity-tests.md`


## Gate for FAS 0 â€” Bootstrap, repo och dokumentgrund

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 0.1 Monorepo och runtime-lÃ¥sning
- [ ] Ren maskin kan bootstrapa projektet
- [x] Versioner matchar ADR-0001
- [x] Health checks svarar grÃ¶nt
- [x] Prompt `P0-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 0.2 CI, kvalitet och sÃ¤kerhetsbas
- [ ] Trasig PR blockeras
- [x] Secrets och sÃ¥rbarheter fÃ¥ngas
- [x] CI Ã¤r deterministisk
- [x] Prompt `P0-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 0.3 DomÃ¤nskelett och docskeleton
- [x] Inga cirkulÃ¤ra beroenden
- [x] Alla domÃ¤ner har README
- [x] Alla obligatoriska dokument finns
- [x] Prompt `P0-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 1 â€” Identitet, organisation, auth och onboarding

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 1.1 Organisation, roller och accesskontroll
- [x] Bolag kan inte se varandras data
- [x] Delegation respekterar datum och scope
- [x] Servern blockerar otillÃ¥tna actions
- [x] Prompt `P1-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 1.2 Inloggning, sessioner och stark autentisering
- [x] Sessioner kan Ã¥terkallas
- [x] MFA krÃ¤vs fÃ¶r admins
- [x] Audit log skapas fÃ¶r autentisering
- [x] Prompt `P1-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 1.3 Bolagssetup och onboarding wizard
- [x] Onboarding skapar komplett bolagskonfiguration
- [x] Checklista visar saknade steg
- [x] Setup kan Ã¥terupptas
- [x] Prompt `P1-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 2 â€” Dokumentmotor, fÃ¶retagsinbox och OCR

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 2.1 Dokumentarkiv och metadata
- [x] Original och derivat skiljs Ã¥t
- [x] Export av dokumentkedja fungerar
- [x] Duplikat upptÃ¤cks
- [x] Prompt `P2-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 2.2 FÃ¶retagsinbox och mail ingestion
- [x] Flera bilagor hanteras korrekt
- [x] Message-ids dedupliceras
- [x] Felaktiga bilagor flaggas
- [x] Prompt `P2-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 2.3 OCR, klassificering och granskningskÃ¶
- [x] Fakturor, kvitton och avtal sÃ¤rskiljs
- [x] MÃ¤nniskan kan korrigera tolkningen
- [x] OmkÃ¶rning sparar ny derivatversion
- [x] Prompt `P2-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 3 â€” Huvudbok, kontomodell, journaler och avstÃ¤mningsgrund

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 3.1 Ledger-schema och verifikationsmotor
- [x] Debet = kredit i alla tester
- [x] Verifikationsnummer Ã¤r deterministiska
- [x] Import markerar kÃ¤lltyp
- [x] Prompt `P3-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 3.2 Dimensioner, perioder och bokfÃ¶ringsregler
- [x] LÃ¥sta perioder gÃ¥r inte att mutera
- [x] RÃ¤ttelser skapar ny verifikation
- [x] Obligatoriska dimensioner valideras
- [x] Prompt `P3-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 3.3 AvstÃ¤mningscenter och rapportgrund
- [x] Rapporter kan Ã¥terskapas historiskt
- [x] Drilldown fungerar till kÃ¤lldokument
- [x] AvstÃ¤mning sparar sign-off
- [x] Prompt `P3-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 4 â€” Momsmotor

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 4.1 Momsmasterdata och beslutstrÃ¤d
- [x] Alla transaktionstyper fÃ¥r ett spÃ¥rbart momsbeslut
- [x] Historiska regler kan Ã¥terspelas
- [x] Oklara fall gÃ¥r till granskningskÃ¶
- [x] Prompt `P4-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 4.2 Sverige, EU, import, export och omvÃ¤nd moms
- [x] Deklarationsboxar summerar rÃ¤tt
- [x] Kreditnota spegelvÃ¤nder moms korrekt
- [x] Importmoms och reverse charge dubbelbokas rÃ¤tt
- [x] Prompt `P4-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 4.3 OSS, IOSS, periodisk sammanstÃ¤llning och rapportering
- [x] B2C-distansfÃ¶rsÃ¤ljning landas rÃ¤tt
- [x] EU-lista kan skapas om och om igen
- [x] Momsrapport stÃ¤mmer mot ledgern
- [x] Prompt `P4-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 5 â€” FÃ¶rsÃ¤ljning, kundreskontra och kundfakturor

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 5.1 Kundregister, artiklar, offerter och avtal
- [x] Offerter versionshanteras
- [x] Avtal genererar korrekt fakturaplan
- [x] Kunddata kan importeras
- [x] Prompt `P5-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 5.2 Kundfakturor och leveranskanaler
- [x] Faktura bokfÃ¶rs bara en gÃ¥ng
- [x] Kreditfaktura stÃ¤nger rÃ¤tt poster
- [x] Peppol-export validerar
- [x] Prompt `P5-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 5.3 Kundreskontra, pÃ¥minnelser och inbetalningsmatchning
- [x] Delbetalningar hanteras
- [x] Felmatchningar kan backas
- [x] Ã…ldersanalys Ã¤r korrekt
- [x] Prompt `P5-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 6 â€” LeverantÃ¶rsfakturor, inkÃ¶p, bank och betalningar

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 6.1 LeverantÃ¶rsregister, PO och mottagning
- [x] LeverantÃ¶rer och PO kan importeras
- [x] Mottagning kopplar till faktura
- [x] Dubblettskydd finns
- [x] Prompt `P6-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 6.2 LeverantÃ¶rsfaktura in, tolkning och matchning
- [x] Flera kostnadsrader bokas rÃ¤tt
- [x] MomsfÃ¶rslag kan fÃ¶rklaras
- [x] Avvikelser krÃ¤ver granskning
- [x] Prompt `P6-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 6.3 Attest, bankintegration och utbetalning
- [x] ObehÃ¶riga kan inte betala
- [x] Utbetalningar bokfÃ¶rs korrekt
- [x] Returer kan Ã¥terimporteras
- [x] Prompt `P6-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 7 â€” Tidportal, HR-bas och anstÃ¤lldportal

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 7.1 AnstÃ¤lldregister och HR-master
- [x] Samma person kan ha flera anstÃ¤llningar
- [x] AnstÃ¤llningshistorik bevaras
- [x] KÃ¤nsliga fÃ¤lt loggas
- [x] Prompt `P7-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 7.2 Tidrapportering, schema och saldon
- [x] LÃ¥sning av period fungerar
- [x] Tid kan kopplas till projekt och aktivitet
- [x] BerÃ¤kning av saldon Ã¤r reproducerbar
- [x] Prompt `P7-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 7.3 FrÃ¥nvaro, attest och anstÃ¤lldportal
- [x] FrÃ¥nvaro kan inte Ã¤ndras efter AGI-signering
- [x] Historik visas fÃ¶r anstÃ¤lld och admin
- [x] Uppgifter fÃ¶r frÃ¥nvarosignaler Ã¤r kompletta
- [x] Prompt `P7-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 8 â€” LÃ¶n och AGI

### AllmÃ¤nt krav
- [x] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [x] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [x] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 8.1 LÃ¶nearter, lÃ¶nekalender och lÃ¶nekÃ¶rning
- [x] LÃ¶nekedjan fÃ¶ljer definierad ordning
- [x] Retrofall Ã¤r spÃ¥rbara
- [x] LÃ¶nebesked kan regenereras
- [x] Prompt `P8-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 8.2 Skatt, arbetsgivaravgifter, SINK och AGI
- [x] AGI innehÃ¥ller rÃ¤tt fÃ¤lt per individ
- [x] FrÃ¥nvarouppgifter lÃ¥ses i tid
- [x] RÃ¤ttelseversioner kan skapas
- [x] Prompt `P8-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 8.3 LÃ¶nebokfÃ¶ring och utbetalning
- [ ] BokfÃ¶ring per projekt/kostnadsstÃ¤lle fungerar
- [ ] Utbetalningar matchas mot bank
- [ ] Semesterskuld kan Ã¥terskapas
- [ ] Prompt `P8-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 9 â€” FÃ¶rmÃ¥ner, resor, traktamente, pension och lÃ¶nevÃ¤xling

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 9.1 FÃ¶rmÃ¥nsmotor
- [ ] FÃ¶rmÃ¥ner med och utan kontant lÃ¶n hanteras
- [ ] BilfÃ¶rmÃ¥n start/stopp per mÃ¥nad fungerar
- [ ] AGI-mappning och bokfÃ¶ring Ã¤r korrekt
- [ ] Prompt `P9-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 9.2 Resor, traktamente, kÃ¶rjournal och utlÃ¤gg
- [ ] 50 km-krav och Ã¶vernattning styr korrekt
- [ ] MÃ¥ltidsreduktion minskar rÃ¤tt
- [ ] Ã–verskjutande del blir lÃ¶n
- [ ] Prompt `P9-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 9.3 Pension, extra pension och lÃ¶nevÃ¤xling
- [ ] Rapportunderlag per kollektivavtal stÃ¤mmer
- [ ] LÃ¶nevÃ¤xling varnar under trÃ¶skel
- [ ] Pension bokfÃ¶rs och avstÃ¤ms
- [ ] Prompt `P9-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 10 â€” Projekt, bygg, fÃ¤lt, lager och personalliggare

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 10.1 Projekt, budget och uppfÃ¶ljning
- [ ] Projektkostnad inkluderar lÃ¶n, fÃ¶rmÃ¥ner, pension och resor
- [ ] WIP kan stÃ¤mmas av mot fakturering
- [ ] Forecast at completion fungerar
- [ ] Prompt `P10-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 10.2 Arbetsorder, serviceorder, fÃ¤ltapp och lager
- [ ] Offline-sync tÃ¥l nÃ¤tavbrott
- [ ] Materialuttag gÃ¥r till projekt
- [ ] Arbetsorder kan faktureras
- [ ] Prompt `P10-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 10.3 Byggspecifika regler: Ã„TA, HUS, omvÃ¤nd moms, personalliggare
- [ ] HUS-kundandel och ansÃ¶kan stÃ¤mmer
- [ ] Byggmoms triggas korrekt
- [ ] Personalliggare exporterar kontrollbar kedja
- [ ] Prompt `P10-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 11 â€” Rapporter, byrÃ¥lÃ¤ge, mÃ¥nadsstÃ¤ngning och bokslut

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 11.1 Rapporter och drilldown
- [ ] Rapporter Ã¤r historiskt reproducerbara
- [ ] Belopp kan spÃ¥ras till kÃ¤lldokument
- [ ] Export till Excel/PDF fungerar
- [ ] Prompt `P11-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 11.2 ByrÃ¥lÃ¤ge och portfÃ¶ljhantering
- [ ] ByrÃ¥n ser bara klienter i scope
- [ ] Deadlines hÃ¤rleds frÃ¥n bolagsinstÃ¤llningar
- [ ] Klientdokument kan begÃ¤ras och spÃ¥ras
- [ ] Prompt `P11-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 11.3 MÃ¥nadsstÃ¤ngning och bokslutschecklistor
- [ ] MÃ¥nad kan stÃ¤ngas med komplett checklista
- [ ] Ã–ppna avvikelser blockerar sign-off dÃ¤r policy krÃ¤ver
- [ ] Ã…terskapad period ger samma rapport
- [ ] Prompt `P11-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 12 â€” Ã…rsredovisning, deklaration och myndighetskopplingar

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 12.1 Ã…rsredovisningsmotor
- [ ] Ã…rspaket lÃ¥ser underlag
- [ ] Signaturkedja spÃ¥ras
- [ ] RÃ¤ttelse skapar ny version
- [ ] Prompt `P12-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 12.2 Skatt, deklarationsunderlag och myndighetsfiler
- [ ] Filer matchar interna siffror
- [ ] Submission loggas med kvittens
- [ ] Fel gÃ¥r till Ã¥tgÃ¤rdskÃ¶
- [ ] Prompt `P12-02` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 13 â€” API, integrationer, AI och automation

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 13.1 Publikt API och webhooks
- [ ] Scopes begrÃ¤nsar rÃ¤tt data
- [ ] Webhook events Ã¤r idempotenta
- [ ] Backward compatibility bevakas
- [ ] Prompt `P13-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 13.2 Partnerintegrationer och marknadsplats
- [ ] Varje adapter har kontraktstest
- [ ] Fallback finns vid extern driftstÃ¶rning
- [ ] Rate limits respekteras
- [ ] Prompt `P13-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 13.3 AI, automation och no-code-regler
- [ ] Alla AI-beslut har confidence och fÃ¶rklaring
- [ ] Human-in-the-loop kan Ã¶verstyra
- [ ] Felaktiga AI-fÃ¶rslag pÃ¥verkar inte ledger utan granskning
- [ ] Prompt `P13-03` Ã¤r kÃ¶rd och resultat dokumenterat

## Gate for FAS 14 â€” HÃ¤rdning, pilot, prestanda, sÃ¤kerhet och go-live

### AllmÃ¤nt krav
- [ ] Kod, tester och docs Ã¤r uppdaterade i samma fÃ¶rÃ¤ndring
- [ ] Demo kan kÃ¶ras pÃ¥ seed-data
- [ ] Ingen kritisk eller hÃ¶g bug stÃ¥r Ã¶ppen utan signerad accept
- [ ] Rollback eller disable-strategi finns om fasen pÃ¥verkar produktion

### 14.1 SÃ¤kerhet och behÃ¶righetsgranskning
- [ ] Kritiska findings Ã¤r Ã¥tgÃ¤rdade
- [ ] Admin-spÃ¥r granskas
- [ ] Secrets-hantering Ã¤r verifierad
- [ ] Prompt `P14-01` Ã¤r kÃ¶rd och resultat dokumenterat

### 14.2 Prestanda, Ã¥terlÃ¤sning och chaos-test
- [ ] Systemet klarar mÃ¥llast
- [ ] RTO/RPO uppfylls
- [ ] KÃ¶er Ã¥terhÃ¤mtar sig efter fel
- [ ] Prompt `P14-02` Ã¤r kÃ¶rd och resultat dokumenterat

### 14.3 Pilotkunder, datamigrering och go-live-ritual
- [ ] ParallellkÃ¶rning stÃ¤mmer
- [ ] Kunddata migreras utan differenser
- [ ] Support-runbook Ã¤r bemannad
- [ ] Prompt `P14-03` Ã¤r kÃ¶rd och resultat dokumenterat


## Bevis som ska bifogas varje gate

- testkÃ¶rningsresultat
- demo-video eller demo-notes
- diff pÃ¥ docs
- lista Ã¶ver migrationsfiler
- lista Ã¶ver nya externa beroenden
- eventuella kÃ¤nda begrÃ¤nsningar
- rollback-plan

## Exit gate

- [ ] Ingen fas markeras klar utan dokumenterat bevis.
- [ ] Alla gate-checklistor kan fÃ¶ljas av nÃ¥gon som inte skrivit koden.
- [ ] Gate-status kan granskas i efterhand.

