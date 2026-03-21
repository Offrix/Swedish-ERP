# Opening balances and historical import engine

Detta dokument definierar öppningsbalanser, historisk import, öppna AR/AP-poster, differenshantering och en spårbar importkedja från legacy-system till den nya ledgern.

## Scope

### Ingår

- öppningsbalans per cutover-datum eller per nytt räkenskapsår
- historisk import av huvudbokstransaktioner, subledgerobjekt och dokumentreferenser
- import av öppna kund- och leverantörsposter utan att dubbelräkna kontrollkonton
- differenshantering, mappingversioner, importbatcher och full auditkedja

### Ingår inte

- löpande ordinarie bokföring efter go-live
- fri manuell rättning av legacy-data utan importspår

### Systemgränser

- Importmotorn äger import profile, import batch, row mapping, difference report och cutover metadata.
- Ledgern tar emot posting intents för historiska verifikationer i serie P eller W.
- AR/AP tar emot historiska öppna poster och markerar dem som importerade i stället för nygenererade.

## Hårda regler

1. Samma importfil eller importbatch får inte postas två gånger med samma batch-id och hash.
2. Öppningsbalans, historik och löpande bokföring ska hållas isär i både serier, metadata och rapporter.
3. Kontrollkonton för AR/AP får inte dubbelbokas både genom aggregat-IB och detaljimport av öppna poster utan uttrycklig skuggmodell.
4. Alla importer ska kunna visa källa, radnummer, mappingversion och eventuellt fel eller manuellt beslut.
5. Differens mot legacy-trial-balance får inte tyst gömmas i startvärden; den ska blockera import eller bokas till särskilt differenskonto med godkännande.
6. Historiska verifikationer får aldrig muteras efter import. Korrigering sker med nya importer eller korrigeringsverifikationer.
7. Cutover-datum ska vara entydigt och inga importerade transaktioner får råka korsa in i live-perioden utan explicit beslut.

## Begrepp och entiteter

- **Cutover-datum** — Tidpunkt då legacy-systemet slutar vara bokföringskälla och den nya produkten tar över.
- **Öppningsbalans** — Startsaldo per konto på eller före första live-dagen.
- **Historisk batch** — Importerad mängd med transaktioner eller objekt från tidigare system.
- **Skuggimport av öppna poster** — Import av AR/AP-objekt utan ny ledgerpost när kontrollkontot redan finns i öppningsbalansen.
- **Mappingversion** — Versionsstyrd regeluppsättning som översätter legacykonton och objekt till nya modellen.
- **Differensrapport** — Rapport som visar exakt var importen inte stämmer mot legacy-källan.

## State machines

### Import profile

- `draft -> validated -> approved -> running -> posted -> reconciled -> failed`

- `validated` kräver full mapping och balanseringskontroller.
- `posted` betyder att ledger eller subledger faktiskt fått data.
- `reconciled` kräver att importerat utfall stämmer mot förväntad legacy-summa.

### Import batch

- `received -> parsed -> mapped -> posted -> review -> failed`

- Batch som går till `review` får inte delvis smygpostas utan versionskontroll.
- Om batch körs om ska gamla rader upptäckas via batch-id och row-key.

### Imported open item

- `imported_open -> partially_settled -> settled -> written_off -> reversed`

- Importerad post ska kunna leva vidare i ordinarie AR/AP efter go-live men behålla legacy-referens.
- `reversed` används endast när importen i sig varit fel och korrigeras med ny batch.

## Inputfält och valideringar

### Importkällor

#### Fält

- trial balance, huvudbokstransaktioner, öppna kundposter, öppna leverantörsposter, kund- och leverantörsregister, anläggningar, projekt och dokumentlänkar
- batch-id, källa, filhash, exporttid från legacy-system, radnyckel, legacy-id

#### Valideringar

- filhash och radnycklar ska sparas före första postning
- källdatum efter cutover ska blockeras eller särskilt godkännas
- valuta, bolag och räkenskapsår måste vara entydiga

### Mapping och balanskontroll

#### Fält

- legacy-konto, nytt konto, rapportkategori, momskod, dimensionsmapping, motpartsmapping, differenskonto och fallbackregler

#### Valideringar

- obligatoriska systemkonton måste vara mappade innan batch kan godkännas
- AR- och AP-open item-summor måste förklaras mot respektive kontrollkonto i öppningsbalansen eller separat detaljerad postning
- konto som bytt semantik får inte bara återanvändas; mappingen måste dokumentera ny innebörd

### Öppna poster

#### Fält

- legacy invoice no, datum, förfallodatum, originalbelopp, restbelopp, valuta, motpart, momsstatus, dokumentreferens och om posten är tvistad eller krediterad

#### Valideringar

- samma legacy-post får inte importeras två gånger som öppen post
- restbelopp ska vara rimligt i förhållande till originalbelopp
- importerade öppna poster måste kunna länkas till kund/leverantör eller till särskild migrationsmotpart

## Beslutsträd/regler

### Val mellan aggregat-IB och detaljerad historik

- Om kunden endast behöver starta ny drift med korrekta saldon används öppningsbalans i serie P och öppna AR/AP-poster importeras som skuggobjekt utan ny ledgerpost.
- Om kunden behöver transaktionshistorik i systemet kan historiska verifikationer importeras i serie W med originaldatum och legacy-referens.
- Samma period får inte få både fullständig historisk verifikation och separat aggregat-öppningsbalans som täcker samma saldo.

### Öppna AR/AP-poster

- När kontrollkontot redan finns i öppningsbalansen ska öppna poster importeras som subledgerobjekt med `shadow_posting = false`.
- Om kontrollkontot inte finns i öppningsbalansen får detaljerad open-item-import skapa faktisk ledgerpost i serie W, men då ska separat aggregatpost uteslutas.
- Betalningar efter go-live ska kunna stänga importerad post på samma sätt som nyskapad post.

### Differenshantering

- Differens under noll tolerans ska blockera batchen tills mapping eller källdata rättats.
- Endast uttryckligen godkänd differens får bokas till migreringsdifferenskonto och då med separat verifikation samt sign-off.
- Varje differens ska kunna härledas till specifika källrader eller avsaknad av sådana.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Öppningsbalans | P | Alla debetsaldon enligt trial balance | Alla kreditsaldon enligt trial balance | Balanserad startpost på cutover eller räkenskapsårets början. |
| Historisk detaljimport | W | Enligt importerade legacyrader | Enligt importerade legacyrader | Varje rad bär legacy-id och batch-id. |
| Godkänd migreringsdifferens | P eller W | Migreringsdifferenskonto eller korrekt konto | Motkonto enligt differensanalys | Endast med uttryckligt godkännande. |
| Skuggimport av AR/AP-open items | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Subledgerobjekt skapas men ledgern rörs inte när kontrollkonton redan ligger i IB. |

## Fel- och granskningsköer

- **mapping_missing** — Konto, motpart eller dimension saknar mapping.
- **balance_difference** — Importerad totalsumma stämmer inte mot legacy-källa.
- **duplicate_batch_or_row** — Samma batch eller row-key återanvänds.
- **cutover_conflict** — Data ligger efter cutover eller i redan live period.
- **open_item_conflict** — Öppen post skulle dubbelräkna kontrollkonto eller saknar motpart.
- **document_link_missing** — Dokumentreferens saknas eller kan inte återskapas.

## Idempotens, spårbarhet och audit

- Importprofil ska ha stabil profil-id och varje batch ska ha filhash, batch-id och row-key.
- Posting till ledger får bara ske en gång per `batch_id + row_key + mapping_version`.
- Subledgerobjekt från legacy ska bära `legacy_system`, `legacy_id` och `import_batch_id` för framtida spårbarhet.
- Differensrapporter och reconcile-rapporter ska sparas som egna artefakter knutna till batchversionen.
- Om mappingversionen ändras ska ny batchversion skapas i stället för att gammal postning skrivs över.

## Golden tests

1. **Öppningsbalans från trial balance**

- Importera balanserad TB som serie P.
- Förväntat utfall: alla konton får rätt startsaldo.

2. **Skuggimport av kundreskontra**

- Kontrollkonto 1210 ligger i IB och öppna kundposter importeras separat.
- Förväntat utfall: inga nya ledgerposter men full AR-reskontra.

3. **Detaljerad historik i serie W**

- Importera gammal huvudbok med legacy-id.
- Förväntat utfall: rapporter kan drill-downa till batch och legacy-id.

4. **Differens blockerar**

- En rad saknar mapping så att totalsumma inte balanserar.
- Förväntat utfall: batch stannar i balance_difference.

5. **Idempotent återimport**

- Kör samma fil två gånger.
- Förväntat utfall: andra körningen skapar inga nya poster.

## Exit gate

- [ ] cutover-strategi är entydig och dokumenterad per bolag
- [ ] öppningsbalans, historisk import och löpande drift kan särskiljas i rapporter
- [ ] öppna AR/AP-poster dubbelräknar inte kontrollkonton
- [ ] alla importer har differensrapport, mappingversion och auditspår
- [ ] återimport och korrigerad import beter sig idempotent
