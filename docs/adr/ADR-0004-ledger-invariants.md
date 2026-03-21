# ADR-0004 — Ledger invariants

Status: Accepted  
Date: 2026-03-21

## Context

Redovisningssystemets trovärdighet avgörs av ledgern. Om ledgern går att manipulera tyst eller om rapporter inte går att återskapa är hela produkten värdelös.

## Decision

Följande invarianten är absoluta:

1. Varje journalentry tillhör exakt ett bolag.
2. Summan debet = summan kredit för varje verifikation.
3. Verifikationer i låsta perioder får inte ändras eller raderas.
4. Rättelser sker via:
   - korrigeringsverifikation
   - spegelvänd reversal
   - ny korrekt verifikation
5. Varje rad ska ha spårbar källa:
   - source_type
   - source_id
   - actor
   - timestamp
6. Alla rapporter ska gå att återskapa per historisk tidpunkt.
7. All nummerering ska vara deterministisk per serie och bolag.
8. Ingen domän utanför ledger får skriva journalrader direkt.
9. Importerade historiska data ska markeras som importerade, inte förväxlas med systemskapade verifikationer.
10. Valuta och kurs ska sparas på radnivå när annat än basvaluta används.

## Voucher series policy

Rekommenderad default-serie per bolag:

- `A` Manuella verifikationer
- `B` Kundfakturor
- `C` Kundkreditfakturor
- `D` Kundinbetalningar
- `E` Leverantörsfakturor
- `F` Leverantörsbetalningar
- `G` Kassa och korttransaktioner
- `H` Löneverifikationer
- `I` Momsverifikationer
- `J` Periodiseringar
- `K` Anläggningar och avskrivningar
- `L` Lager och materialomföringar
- `M` Projekt- och WIP-justeringar
- `N` Valutaomräkning och kursdifferenser
- `O` Bokslutstransaktioner
- `P` Årsöppning/IB/UB
- `Q` Skattekonto
- `R` Resor, traktamente och utlägg
- `S` Pension och särskild löneskatt
- `T` HUS/ROT-RUT justeringar
- `U` Bankavstämningskorrigeringar
- `V` Automaträttelser
- `W` Historisk import
- `X` Revisionsjusteringar
- `Y` Teknisk reservserie för migrationer
- `Z` Spärrad reserv för framtida utökning

## Manual journals policy

Manuell verifikation får endast användas för:
- opening balance
- bokslutsjustering
- korrigering av externa importfel
- dokumenterade specialfall som inte täcks av systemmotor

För manuell verifikation krävs:
- beskrivning
- bilaga eller explicit orsak
- attest om belopp eller policy kräver det

## Verification

- [ ] Property tests verifierar att journalbalansen aldrig bryts.
- [ ] Mutation tests visar att försök att ändra låst period stoppas.
- [ ] E2E-test visar att rättelse skapar ny verifikation, inte tyst uppdatering.
- [ ] Drilldown från rapport till rad till källdokument fungerar.
