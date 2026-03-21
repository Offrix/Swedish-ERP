# Search indexing and global search

## Syfte

Detta dokument definierar hur global sökning, sökindex, saved searches och strukturerad filtrering fungerar över alla objekt som ska vara sökbara i systemet. Modellen ska ge snabba resultat, strikt permissions trimming, reproducerbar reindex och tydlig hantering av stale data, delete/update-semantik och audit av sökningar.

## Scope

### Ingår

- indexering av affärsobjekt, dokumentmetadata, reskontraposter, checklistor, klientbegäranden, supportärenden, kommentarer och rapportdefinitioner
- fritextsökning, strukturerad sökning, facets, ranking och saved searches
- indexuppdatering vid create, update, state change, permission change och delete
- sökresultat med permission trimming, markerad stale data och begränsad snippetsvisning
- full reindex, delreindex, tombstones och delete-semantik
- audit av sökningar, reindex och administrativ diagnostik

### Ingår inte

- fulltextsökning i rå binärfil; endast extraherad text eller metadata som godkänts för indexering
- sökning i data som enligt policy aldrig får exponeras i fri text, till exempel hemligheter eller fullständiga identitetsdokument
- UI-komponenter utanför sökdialog, filterpanel och resultatlistor

### Systemgränser

- källdomänen äger objektets sakdata och permissionsmodell
- sökindexet äger endast läsoptimerad projektion och rankingfält
- global search-tjänsten äger query parsing, resultatranking och redaktion av dolda resultat
- auditmotorn äger loggning av sökningar och administrativa indexåtgärder

## Roller

- **Slutanvändare** får söka inom sitt bolag och sitt tilldelade objekt- och rollscope.
- **Bureau user** får söka över de klienter som ingår i portföljscope men inte över andra klienters data.
- **Company admin** får använda strukturerade filtersökningar och skapa delade saved searches där policy tillåter.
- **Search operator** får köra diagnostik, delreindex och tombstone-reparation men får inte ändra källdatats innehåll.
- **Security admin** ansvarar för vilka fält som får indexeras och hur dolda träffar ska redovisas.
- **Support admin** får endast använda sökdiagnostik i supportbackoffice inom godkänt supportscope.

## Begrepp

- **Search document** — En indexerad projektion av ett källobjekt med fält för rankning, filter och snippets.
- **Indexed object type** — Typkod som styr vilka fält, filter och permissionsregler som gäller för objektet.
- **Permissions trimming** — Efter- eller före-filterssteg som tar bort eller redigerar träffar som användaren inte får se.
- **Saved search** — Namngiven uppsättning filter, sortering, facets och eventuellt fritextuttryck.
- **Structured filter** — Fältspecifik sökning som inte tolkar indata som fri text.
- **Free text query** — Fråga som matchas mot tokeniserade textfält och synonymregister.
- **Stale index** — Tillstånd där indexets version ligger efter källdomänens senaste publicerade version.
- **Tombstone** — Markerad indexpost som representerar raderat eller gömt objekt tills full reindex eller cleanup har gått klart.

## Objektmodell

### Sökbara objekt

#### Obligatoriskt indexerade objekt
- företag, användare i tillåtet scope, kunder, leverantörer, kundfakturor, leverantörsfakturor, betalningar, statement lines, dokumentmetadata, projekt, arbetsorder, work items, close checklist items, submissions, support cases, rapportdefinitioner och saved views
- varje objekttyp ska ha `object_type`, `object_id`, `company_id`, `display_title`, `status`, `search_text`, `filter_payload`, `permission_scope`, `version_no`, `updated_at`

#### Exakta sökfält per kategori
- kund: kundnummer, namn, organisationsnummer, momsnummer, e-post, kundreferens
- leverantör: leverantörsnummer, namn, organisationsnummer, bankgiro/IBAN-maskad, fakturanummer
- fakturaobjekt: fakturanummer, motpart, orderreferens, buyer reference, OCR-referens, belopp, valuta, status, period
- dokument: dokument-id, filnamn, dokumenttyp, fakturanummer, motpart, OCR-nyckelfält, mottagarkanal
- work items och checklistor: titel, task type, source id, owner, queue, blocker severity, period, deadline
- rapporter och exportjobb: rapportnamn, metric ids, version, export job id, watermark status
- kommentarer och supportärenden: rubrik, kommentarstext i tillåten omfattning, mention-targets, case id

#### Saved search
- fält: `saved_search_id`, `owner_scope`, `visibility`, `query_json`, `default_sort`, `pinned_filters`, `created_from_surface`, `version_no`, `is_favorite`
- invariant: saved search måste vara knuten till en objektyta eller globalt söksområde och får inte referera till icke-tillåtna filterfält

## State machine

### Indexdokument
- `queued -> indexing -> indexed -> stale -> tombstoned -> purged`
- `indexed -> stale` när källdomänen publicerar ny version eller permissionsändring som ännu inte materialiserats
- `tombstoned` används när objektet raderats, soft-deletats eller blivit helt otillgängligt
- `purged` får endast ske när retention- och auditregler medger full borttagning från indexet

### Reindexjobb
- `requested -> running -> verifying -> completed`
- `running -> failed -> retry_pending -> running`
- `completed -> superseded` när ett nyare reindexjobb tar över samma scope

### Saved search
- `draft -> active -> broken -> repaired -> archived`
- `broken` används när refererat filterfält, vy eller objekttyp inte längre finns eller när scope ändrats så att frågan inte kan köras oförändrad

## Användarflöden

### Indexuppdatering vid objektändring
1. Källdomänen skriver sin transaktion och publicerar en outbox-händelse med objekttyp, id, ny version och permissions-hash.
2. Indexeringsjobbet hämtar aktuell läsmodell och bygger ett search document.
3. Om objektet inte längre får indexeras skapas tombstone eller delete enligt policy.
4. När indexversionen matchar källversionen markeras posten som `indexed`.

### Global sökning
1. Användaren anger fri text, strukturerade filter eller båda.
2. Query parser normaliserar format, språk, datumintervall, nummer och operatorer.
3. Sökningen körs först mot tillåtna objekttyper och bolagsscope.
4. Permissions trimming sker innan snippets returneras.
5. Om objektet finns men inte får visas returneras antingen ingen träff eller en dold platsmarkör beroende på policy för ytan.

### Saved search och reparation
1. Användaren sparar en fråga från aktuell yta.
2. Systemet validerar att alla fält får delas eller sparas.
3. När schema eller filterkatalog ändras görs kompatibilitetskontroll.
4. Trasig saved search markeras `broken` med reparationsförslag i stället för tyst fallback.

## Affärsregler

### Ranking
- exakt träff på primäridentifierare, till exempel fakturanummer, kundnummer eller submission-id, väger högst
- därefter rankas exakta prefixträffar på titel- och namnfält
- därefter kombination av fritextrelevans, objekttypens affärsvikt, recency och användarens aktuella ytkontext
- `critical` work items och blockerande checklistor får boost inom respektive yta men får inte tränga undan exakta id-träffar i andra kategorier
- rankingen måste vara deterministisk för samma query, samma indexversion och samma permissionssnapshot

### Permissions trimming
- varje search document ska innehålla materialiserad `permission_scope` samt referens till källdomänens accessmodell
- resultat ska filtreras både på bolagsscope och objektspecifikt scope
- snippets får bara byggas från fält som användaren får se; annars ska snippet ersättas med neutral text
- facets får inte avslöja existensen av otillåtna objekt i små mängder om det skulle kunna deanonymisera data

### Fritext vs strukturerad sökning
- fritext får söka över `display_title`, tillåtna aliasfält, söktext och kontrollerade OCR-fält
- strukturerad sökning använder exakta eller typanpassade operatorer för datum, belopp, status, owner, period och objektkategori
- fritext och filter kan kombineras; resultat måste då uppfylla alla filter men rankas med fritextpoäng
- jokertecken och fuzzy-matchning får inte användas på fält som riskerar persondataexponering utan explicit godkänd policy

### Stale data-regler
- indexerade objekt ska bära `source_version` och `indexed_version`
- om `indexed_version < source_version` ska träffen märkas som `stale` i operatörsläge och kunna trigga delreindex
- slutanvändarvy ska i första hand visa senaste godkända indexerade version och i andra hand neutral information om att objektet uppdateras
- close, betalning och sign-off får aldrig läsa beslutsdata direkt från sökindexet

### Delete/update-semantik och reindex
- soft delete i källdomänen ska ge tombstone om audit eller hänvisningsbehov finns
- hard delete får bara leda till full purge när retentionregler tillåter det
- permissionsändring ska betraktas som indexuppdatering även om affärsdata är oförändrad
- full reindex ska kunna köras per bolag, per objekttyp, per tidsfönster eller globalt
- reindex måste vara idempotent per scope, startversion och jobb-id

## Behörigheter

- användare får endast söka på objektkategorier som är aktiverade för rollen och ytan
- saved search med `shared` eller `default` visibility kräver särskild rättighet
- search operator får köra reindex och diagnostik men får inte läsa affärsinnehåll utanför sitt supportscope
- security admin får ändra indexpolicy, synonymer och dolda-fält-lista
- support admin får se att objekt existerar för felsökning endast när supportpolicy tillåter detta och måste då få redigerad träff utan känslig snippet

## Fel- och konfliktfall

- saknat search document för existerande objekt ska ge `index_missing` och köa delreindex
- felaktig permissions trimming ska behandlas som säkerhetsincident
- trasig saved search ska markeras `broken`, inte köras med tyst borttagna filter
- reindexkollision mellan två jobb på samma scope ska lösas genom versionsjämförelse och `superseded`-state
- query som innehåller ogiltigt filter, okänd operator eller förbjudet fält ska returnera valideringsfel med tydlig felorsak
- vid stale index över toleransgräns ska användaren få tydlig markering och operatören få diagnostiksignal

## Notifieringar

- användaren kan få in-app-notis när delad saved search ändras eller går sönder
- search operator får varning när stale rate, indexfel eller tombstone-backlog passerar tröskel
- company admin får notis när default search eller delad saved search ändras för bolaget
- support och security får incidentnotis vid permissions trimming-fel eller onormal mängd reindexfel

## Audit trail

- varje sökning ska logga användare, bolagsscope, querytyp, använda filterfält, antal träffar och om dolda träffar fanns
- full fri text får inte sparas oförändrad när policyn förbjuder det; då lagras hash eller redigerad representation
- skapande, ändring, delning, reparation och arkivering av saved searches ska auditloggas
- alla reindexjobb, delreindex, tombstone-purge och indexpolicyändringar ska ha correlation id, ansvarig användare och resultatstatus
- auditspåret ska kunna visa vilken indexversion ett export- eller drilldownresultat byggde på

## API/events/jobs

- query-API ska stödja `query_text`, `structured_filters`, `object_types`, `sort`, `page_token`, `search_context`
- saved search-API: `create_saved_search`, `update_saved_search`, `share_saved_search`, `repair_saved_search`, `archive_saved_search`
- events: `search_document_upsert_requested`, `search_document_tombstoned`, `search_reindex_requested`, `saved_search_broken`
- jobb: `search_upsert_worker`, `search_reindex_worker`, `search_tombstone_cleanup`, `saved_search_compatibility_scan`

## UI-krav

- global search ska visa kategori, titel, sekundär metadata, status och trygg markering för dolda delar
- när objekt finns men inte får visas ska UI visa neutral text som `träff finns men åtkomst saknas` endast på ytor där sådan platsmarkör är tillåten; annars ska träffen utelämnas helt
- facets ska kunna filtreras utan att hoppa i ordning mellan sidladdningar
- saved searches ska visa ägare, synlighet, senast använd och om frågan är `broken`
- operatörsvy ska kunna visa stale-flagga, indexed_version och senaste indexfel

## Testfall

1. exakt sökning på fakturanummer ger rätt träff högst upp
2. användare utan objektåtkomst får ingen snippet eller komplett träff
3. permissionsändring uppdaterar index trots oförändrad affärsdata
4. trasig saved search markeras `broken` med reparationsförslag
5. soft-deletat objekt blir tombstone men kan inte öppnas från standard-UI
6. full reindex per bolag återskapar samma träffmängd som före purge
7. stale index över tröskel markeras i operatörsvy men blockerar inte vanlig listning
8. auditloggen visar querytyp, filter och träffantal utan att exponera otillåten data

## Exit gate

- [ ] alla definierade objekttyper har exakta indexfält, filter och permissionsregler
- [ ] global search returnerar deterministiskt rankade och korrekt trimmade resultat
- [ ] saved searches kan delas, gå sönder, repareras och arkiveras utan dold fallback
- [ ] reindex och tombstone-semantik är idempotenta och spårbara
- [ ] användaren får tydligt men säkert beteende när objekt finns men inte får visas
