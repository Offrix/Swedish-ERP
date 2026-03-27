> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Chart of accounts import and mapping engine

Detta dokument definierar import av kundkontoplan, mapping mot DSAM/BAS, versionsstyrning och spärrar så att historik och rapporter inte bryts.

## Scope

### Ingår

- import av kundens kontoplan från fil eller API
- mapping mellan kundkonton och produktens standardroller, DSAM-kategorier och rapportgrupper
- versionsstyrning av kontoplan, effektiva datum, spärrar och kontoarkivering
- skydd för historik när konton byter namn, typ eller rapportplacering

### Ingår inte

- fri manuell massomklassning av redan bokförd historik
- själva bokföringen; kontoplanmotorn styr bara vilken mapping som senare används

### Systemgränser

- Kontoplanmotorn äger chart version, account master, system role mapping och report mapping.
- Ledgern använder aktiv mapping vid bokföring men bevarar historisk mapping på varje rad.
- Import- och migrationsdokument använder kontoplanmotorn som master för mappingversioner.

## Hårda regler

1. Kontokoder får inte återanvändas med ny semantik utan ny version eller nytt konto.
2. Konto med historiska bokningar får inte raderas så att rapportreproduktion blir omöjlig.
3. Varje bokföringsrad ska bära den mappingversion som var aktiv när raden bokades.
4. Obligatoriska systemroller såsom bank, kundfordran, leverantörsskuld, moms och resultatkonton måste vara mappade före go-live.
5. Namnbyte på konto får ske utan historikbrott, men ändrad kontotyp eller rapportplacering ska versionssättas.
6. Kontrollkonton ska kunna spärras för manuell bokning även om kundens kontoplan i övrigt är öppen.

## Begrepp och entiteter

- **Chart version** — Versionsstyrd bild av hela kontoplanen för ett bolag.
- **System role** — Produktintern roll såsom `ar_control`, `ap_control`, `bank_main` eller `vat_output_25`.
- **Report mapping** — Koppling mellan konto och rapportgrupp, till exempel balans eller resultatkategori.
- **Effective dating** — Start- och slutdatum för när konto eller mapping är aktivt.
- **History-safe change** — Ändring som inte förstör möjligheten att återskapa äldre rapporter.

## State machines

### Chart version

- `draft -> validated -> approved -> active -> superseded`

- Ny version blir aktiv från definierat datum och tidigare version ligger kvar läsbar.
- Superseded version får inte användas för nya bokningar men ska kunna användas för historik.

### Account

- `draft -> active -> blocked -> archived`

- Blockerat konto får inte användas för nya journaler efter effektivitetsdatum.
- Arkiverat konto ligger kvar för historik men ska inte visas som valbart i normal UI.

### Mapping rule

- `draft -> tested -> active -> retired`

- Retired mapping finns kvar för historiska rader.
- Testad mapping ska minst ha kontroll på moms, rapportgrupp och systemroll.

## Inputfält och valideringar

### Kontoplan

#### Fält

- kontokod, namn, kontotyp, aktiv från/till, momsbeteende, tillåtna dimensioner, manuell bokningsspärr, rapportgrupp

#### Valideringar

- kontokod ska vara unik inom sin aktiva version
- typbyte som ändrar balans/resultat eller kontrollkonto-klass kräver ny version
- konton med historiska saldon får inte tas bort ur aktiva rapporter utan ersättningsmapping

### System role mapping

#### Fält

- systemroll, kontokod, giltighetsdatum, prioritet, fallback, bolagsspecifik override

#### Valideringar

- alla obligatoriska systemroller måste vara mappade före godkännande
- roller som kräver exakt ett konto, till exempel huvudbank eller kundfordran per geografityp, får inte få flera samtidiga aktiva mappingar om inte motorn uttryckligen stödjer det

### Importmetadata

#### Fält

- filhash, källa, importör, changed_by, diff mot föregående version, godkännare

#### Valideringar

- samma filhash ska inte skapa ny version om innehållet är identiskt
- diff mot föregående version ska kunna visas innan aktivering

## Beslutsträd/regler

### Initial import och delta

- Första kundkontoplanen skapar version 1 och mappar samtidigt systemroller.
- Senare import jämför mot aktiv version och skapar ny version endast när verklig diff finns.
- Namnändring utan semantisk ändring kan vara history-safe i samma konto, medan typbyte kräver ny version eller kontoersättning.

### DSAM/BAS-mapping

- Varje kundkonto ska mappas till en DSAM-kategori eller motsvarande intern rapportroll för att funktioner som moms, AR och AP ska fungera.
- Om kundens konto saknar direkt motsvarighet ska bolagsspecifik mappingregel skapas och godkännas.
- Produkten ska bevara både kundens eget kontonamn och intern systemroll så att rapporter kan visas på båda sätten.

### Skydd för historik

- Nya bokningar ska använda aktiv mappingversion, men historiska rader ska alltid visa ursprunglig mappingversion.
- Konton som stängs för framtiden ska blockeras framåt i tiden men fortfarande visas i historiska rapporter.
- Rapport- eller momsomläggningar mitt i år får inte göra att äldre transaktioner omtolkas retroaktivt.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Kontoplanimport | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Kontoplanmotorn skapar metadata, inte verifikationer. |
| Mappingändring | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Ny mappingversion påverkar bara framtida bokningar. |
| Kontostängning eller blockering | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Operativ regelhändelse utan ledgerpåverkan. |

## Fel- och granskningsköer

- **mandatory_role_missing** — Obligatorisk systemroll saknar konto.
- **history_break_risk** — Importen skulle bryta historisk rapportering eller omtolka gamla rader.
- **duplicate_account_code** — Samma kontokod förekommer oförenligt i aktiv version.
- **type_change_review** — Kontotyp eller rapportgrupp ändras och kräver särskild kontroll.
- **manual_posting_block_conflict** — Konto måste spärras för manuell bokning men är ännu inte korrekt mappat.

## Idempotens, spårbarhet och audit

- Varje importversion ska ha `company + filehash + imported_at` och diff mot tidigare version.
- Mappingregler ska vara versions- och datumstyrda så att framtidsändringar inte skriver om historik.
- Varje bokföringsrad ska bära `chart_version_id` och `mapping_version_id` för reproducerbarhet.

## Golden tests

1. **Initial kontoplanimport**

- Importera kundens första kontoplan.
- Förväntat utfall: version 1 med full systemrollmapping.

2. **Namnbyte utan semantikändring**

- Ändra kontonamn men inte typ.
- Förväntat utfall: history-safe uppdatering.

3. **Typbyte kräver version**

- Gör balanskonto till kostnadskonto.
- Förväntat utfall: type_change_review och ny version krävs.

4. **Blockera manuella poster på kontrollkonto**

- Markera kundfordringskonto som kontrollkonto.
- Förväntat utfall: kontot spärras för manuell bokning.

5. **Historisk rapport**

- Visa gammal period efter ny mappingversion.
- Förväntat utfall: rapport använder ursprunglig mapping.

## Exit gate

- [ ] kundkontoplan kan importeras utan att förstöra historik
- [ ] alla obligatoriska systemroller är mappade och testade
- [ ] mappingversioner bevaras på varje bokföringsrad
- [ ] konton kan blockeras eller ersättas framtidssäkert
- [ ] DSAM/BAS-rapportering och kundens egen rapportlogik kan samexistera

