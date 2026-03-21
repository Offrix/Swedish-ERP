# Annual reporting engine

Detta dokument definierar årsstängning, årsredovisningspaket, digital inlämning, deklarationsunderlag och versionskedja.

## Scope

- årsstängning
- bokslutsjusteringar
- K2/K3-spår
- årsredovisningspaket
- signeringsunderlag
- digital inlämning
- deklarationsunderlag
- versionskontroll och kontrollsumma

## Principer

1. Årsredovisningen byggs från låsta perioder.
2. När ett årsredovisningspaket skapas ska det peka på exakt databas- och regelversion.
3. Textdelar, noter och siffror ska versioneras tillsammans.
4. Om underlaget ändras ska ny version skapas.
5. Signering och inlämning ska vara spårbar.
6. Bolag med olika regelverk eller format får egna paketprofiler.

## Datamodell

Minst:
- `annual_report_packages`
- `annual_report_versions`
- `annual_report_signatories`
- `annual_report_documents`
- `annual_report_submission_events`
- `tax_declaration_packages`

## Årsstängningsflöde

1. lås samtliga perioder för året
2. kör close checklist
3. kör bokslutsjusteringar
4. stäm av skatt, moms, lön, pension, HUS och reskontra
5. generera årsredovisningspaket
6. granska och signera
7. skicka via adapter
8. spara kvittens

## 35. Årsredovisning och digital inlämning — byggspec

### 35.1 Grundmodell
- stöd minst för K2 och K3
- årsredovisning ska kunna skapas från ledger + mapping + noter
- fastställelseintyg ska kunna genereras som separat del i flödet
- digital inlämning ska bygga på versionerad fil och checksumma

### 35.2 Digitalt flöde
- användare laddar upp eller systemet genererar årsredovisningsfil
- behörig styrelseledamot eller VD bjuds in
- personen loggar in med e-legitimation
- fastställelseintyg signeras
- handlingarna skickas digitalt
- kvittens sparas
- inlämnad version låses

### 35.3 Version och kontrollsumma
- varje inlämningskandidat ska få checksumma
- revisionen ska kunna hänvisa till exakt version
- om ny version skapas efter granskning ska checksumma ändras
- användaren ska se vilken version som signerats och vilken som lämnats in

## Paketet ska minst innehålla

- balansräkning
- resultaträkning
- noter enligt vald profil
- förvaltningsberättelse eller motsvarande textdelar där det krävs
- fastställelseintyg där det krävs
- signeringsmetadata
- checksumma över alla delar

## Deklarationsunderlag

Systemet ska kunna skapa:
- underlag för inkomstdeklaration
- underlag för särskild löneskatt på pensionskostnader
- HUS-sammandrag
- moms- och AGI-sammandrag för revisionssyfte
- export eller adapterpayload till vald deklarationsväg

## Golden tests

- litet AB med K2-spår
- större bolag med K3-spår
- nytt årsredovisningspaket efter ändrad bokslutsverifikation
- signeringskedja med flera företrädare
- submission-kvittens sparas
- återöppnad period kräver nytt paket

## Codex-prompt

```text
Read docs/compliance/se/annual-reporting-engine.md, docs/compliance/se/accounting-foundation.md and docs/test-plans/master-verification-gates.md.

Implement the annual reporting engine with:
- annual report packages
- versioned submissions
- signatory model
- tax package outputs
- diffing between versions
- golden tests

Never reuse an old package after financial data changed.
```

## Exit gate

- [ ] Paketet är versionslåst och checksummeberäknat.
- [ ] Signering och submission kan spåras.
- [ ] Ändrad bokföring tvingar fram ny paketversion.
- [ ] Deklarationsunderlag går att härleda till ledgern.
