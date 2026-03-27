> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0010 — Banking and money movement strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten behöver läsa svenska företagskonton, stämma av betalningar och på sikt stödja utbetalningar, men byggplanen vill undvika reglerad hantering av klientmedel eller onödigt regulatoriskt scope i v1.
- V1 behöver stabil kontoavstämning, OCR/inbetalningsreferenser och en betalstrategi som fungerar utan att produkten blir betalningsinstitut.

## Decision

- V1 använder Enable Banking som open-banking-partner för account information services, saldo och transaktionsläsning.
- V1 stöder i första hand svenska större banker med verifierad AIS-täckning i den svenska marknaden: Swedbank/Sparbankerna, SEB, Handelsbanken, Nordea och Länsförsäkringar. Fler banker aktiveras först efter adaptertest och pilot.
- V1 inkluderar inte direkt payment initiation via open banking i produktion. Leverantörsbetalningar initieras i v1 genom systemgenererat betalningsförslag och exportfil till bankportal, följt av läsning och avprickning när banken bokat transaktionen.
- OCR-/betalreferens i v1 använder numerisk OCR-strategi där bolag som väljer OCR får numeriska referenser med kontrollsiffra och konfigurerad längd. Fritextreferenser stöds separat när OCR inte används.
- Swish och ren kortbetalacceptans ligger utanför kärnproduktens v1-scope. Eventuella kort- eller acquirerflöden hanteras i separat domän som settlement/import, inte som online-betalväxel.
- Valutastrategi i v1 är läsning, import, avprickning och bokföring av befintliga valutakonton. Ingen treasury- eller PIS-baserad FX-handel stöds i v1.

## Why

- Enable Banking ger svensk banktäckning för AIS utan att produkten behöver bygga och drifta egna bankkopplingar.
- Att avstå PIS i v1 undviker beroende av PISP-licens och minskar regulatorisk och operativ risk.
- Export-till-bankportal är mindre elegant men mycket tydlig ur intern kontrollsynpunkt och fungerar väl för första piloter.
- Numerisk OCR-strategi gör inbetalningsmatchning robust i svensk bankmiljö där OCR-referenser fortfarande är centrala.

## Consequences

- V1 får ett manuellt steg i utbetalningsflödet mellan betalningsförslag och bankbokning.
- Produktteamet måste underhålla exportformat, bankportalrutiner och tydliga avprickningsregler.
- Inkommande och utgående bankflöden blir fortfarande välspårade eftersom slutlig sanning tas från bankhändelse och statement-linje.
- Om en kund absolut kräver direkt PIS måste det hanteras som ett senare scope med separat regulatorisk bedömning.

## Out of scope

- Produkten ska inte hålla klientmedel eller agera betalningsinstitut i v1.
- Swish checkout, e-commerce acquirer orchestration eller treasury FX i v1.

## Exit gate

- [ ] AIS-koppling kan läsa konto och transaktioner för minst de utvalda svenska bankerna
- [ ] leverantörsbetalning kan köras som förslag, export, bankportaluppladdning och senare bankavprickning
- [ ] OCR-referenser kan genereras, valideras och användas i auto-matchning
- [ ] bankfel, returer och manuella reservrutiner är dokumenterade i runbook

