# Golden data catalog

Detta dokument listar vilka golden datasets som finns per domän, versionsnummer, källa, förväntat utfall och vilka faser de blockerar.

## Principer

- Golden data ska vara versionsstyrd, immutable och kopplad till förväntade verifikationer, rapporter eller statusutfall.
- Varje dataset ska kunna köras om i tom miljö och ge samma utfall.
- När regelpaket ändras ska ny datasetversion skapas, inte den gamla skrivas över.

## Katalog

| Dataset-id | Domän | Version | Källa | Förväntat utfall | Blockerar faser |
| --- | --- | --- | --- | --- | --- |
| GD-LEDGER-CORE | ledger | 1.0 | seeddata + deterministiska journaler | balanserade verifikationer, periodlåsning, reversal | FAS 3 |
| GD-VAT-SE | moms | 1.0 | svenska försäljnings- och inköpsexempel | rätt momskod, rätt deklarationsrutor | FAS 4 |
| GD-AR-BASIC | AR | 1.0 | kunder, artiklar, fakturor, delbetalningar | öppna poster, påminnelse, write-off | FAS 5 |
| GD-AP-BASIC | AP | 1.0 | leverantörsfakturor, PO, receipts | dubblettskydd, 2-way/3-way matchning | FAS 6 |
| GD-BANK-RECON | banking | 1.0 | statement-linjer, betalningsreserver, returer | bankavstämning, suspense, 2450-flöde | FAS 6 |
| GD-DOC-INBOX | documents | 1.0 | råmail, bilagor, dubbletter, malware-fall | routing, OCR, review-köer | FAS 2 |
| GD-PAYROLL-CORE | lön | 1.0 | anställda, lönearter, frånvaro | nettobrutto, AGI-underlag | FAS 8 |
| GD-BENEFITS | förmåner | 1.0 | friskvård, gåvor, bilförmån, nettolöneavdrag | skatteklassificering och lönepåverkan | FAS 9 |
| GD-TRAVEL | resor | 1.0 | tjänsteresor, traktamente, utlägg | ersättning och bokföringsutslag | FAS 9 |
| GD-PENSION | pension | 1.0 | tjänstepension och löneväxling | premier och särskild löneskatt | FAS 10 |
| GD-PROJECT | projekt | 1.0 | T&M, fastpris, milstolpe, WIP | projektfaktura och intäktsföring | FAS 11 |
| GD-CLOSE | close | 1.0 | hela månadsstängningspaket | bank, AR, AP, moms tie-out och sign-off | FAS 12 |
| GD-DR-RESTORE | recovery | 1.0 | backup/restore fixtures | återläsning och replay utan dubblering | Pilot go-live |

## Versionsregler

- Patch-version används för icke-sematiska justeringar, till exempel tydligare metadata eller extra kommentar.
- Minor-version används när fler edge cases läggs till men gamla förväntningar fortfarande gäller.
- Major-version används när affärsregler, konton eller lagtolkning ändras så att förväntat utfall förändras.

## Obligatoriskt innehåll per dataset

- källfiler eller genereringsscript
- förväntade verifikationer eller rapportutslag
- förväntade köer, warnings och error cases
- mapping till vilka testsviter och vilka fasgrindar datasetet blockerar

## Exit gate

- [ ] varje blockerande domän har minst ett golden dataset
- [ ] datasetversion och förväntat utfall är dokumenterat
- [ ] ändringar i regelpaket skapar ny datasetversion
- [ ] restore av golden data kan köras i tom miljö
