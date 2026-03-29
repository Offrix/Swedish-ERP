# Account Catalog Update

## Syfte

Denna runbook styr hur den versionerade BAS/DSAM-katalogen i [dsam-2026.catalog.json](/C:/Users/snobb/Desktop/Swedish%20ERP/packages/domain-ledger/src/data/dsam-2026.catalog.json) uppdateras, verifieras och publiceras utan att kontometadata glider tillbaka till hårdkodad runtime.

## Bindande regler

1. Kontoplanen får bara publiceras via den externa datafilen och [account-catalog.mjs](/C:/Users/snobb/Desktop/Swedish%20ERP/packages/domain-ledger/src/account-catalog.mjs).
2. `versionId`, `sourceName`, `sourceDocumentName`, `effectiveFrom`, `publishedAt`, `checksumAlgorithm`, `checksum` och `accountCount` måste alltid vara ifyllda.
3. `accountClass` måste alltid matcha första siffran i kontonumret.
4. Dubbletter eller ogiltiga kontonummer blockerar import/publicering direkt.
5. Ledgerfilen får aldrig åter få en inbäddad `RAW_DSAM_ACCOUNTS`-massa.

## Minsta uppdateringssteg

1. Uppdatera katalogdatafilen.
2. Beräkna om checksumma över canonical payload.
3. Verifiera att `accountCount` och checksumma matchar den faktiska filen.
4. Kör verifieringstesterna nedan.
5. Uppdatera roadmapstatus först när verifieringen är grön.

## Minsta verifiering

- `node --test tests/unit/phase1-account-catalog.test.mjs`
- `node --test tests/unit/ledger-phase3.test.mjs`
- `node --check packages/domain-ledger/src/account-catalog.mjs`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-phase1.ps1`

## Evidence

- commit som ändrar katalogversionen
- grön katalogtestsvit
- uppdaterad checksumma i datafilen
- uppdaterad publiceringsmetadata i runtime

## Förbjudet

- manuell kontoplan direkt i [index.mjs](/C:/Users/snobb/Desktop/Swedish%20ERP/packages/domain-ledger/src/index.mjs)
- publicering utan checksummeverifiering
- tyst ändring av `effectiveFrom` eller `versionId`
- att behandla ett nytt kataloginnehåll som publicerat utan testbevis
