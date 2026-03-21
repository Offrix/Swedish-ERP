# Reporting metric catalog and export jobs

## Syfte

Detta dokument definierar måttkatalog, metric definitions, rapportdefinitioner, drilldownkrav, reproducerbarhet och asynkrona exportjobb för Excel och PDF. Målet är att varje siffra i rapporter och dashboards ska vara versionsstyrd, ägd, reproducerbar och spårbar från metric definition till exportfil.

## Scope

### Ingår

- central måttkatalog och ägarskap per mått
- versionsstyrda metric definitions och rapportdefinitioner
- drilldown från rapport till underlag
- reproducerbarhet över tid och hantering när underlag ändras efter tidigare export
- async exportjobb för Excel och PDF med watermarking där relevant
- exportaudit och statusmodell

### Ingår inte

- allmän BI-plattform utanför produktens definierade rapporter
- redigering av rå ledgerdata via rapportgränssnitt
- godtycklig användarskriven formellogik i produktion

### Systemgränser

- reporting-domänen äger metric catalog, report definition, report snapshot och export job
- källdomäner äger de råa fakta som rapporten bygger på
- sök/vy-dokumentet äger listvyer och saved views; reporting äger officiella rapportmått och exports

## Roller

- **Metric owner** ansvarar för definition, affärsmening och change management för ett mått.
- **Report owner** ansvarar för rapportens innehåll och version.
- **Data steward eller controller** granskar reproducerbarhet och avvikelser.
- **Export operator** övervakar exportjobb.
- **User** får köra rapporter och exports inom sin behörighet.

## Begrepp

- **Metric definition** — Versionsstyrd specifikation av hur ett mått beräknas.
- **Metric owner** — Namngiven ansvarig roll eller person för ett mått.
- **Report definition** — Versionsstyrd sammansättning av mått, dimensioner, filter och layout.
- **Report snapshot** — Fryst bild av rapportens input och version vid en viss tidpunkt.
- **Drilldown** — Möjlighet att spåra ett visat belopp till lägre nivå eller källdokument.
- **Export job** — Asynkront jobb som producerar Excel- eller PDF-fil.
- **Watermark** — Markering som visar att rapporten är preliminär, ersatt eller ej godkänd för extern användning.

## Objektmodell

### Metric definition
- fält: `metric_id`, `name`, `owner_role`, `version_no`, `formula_ref`, `source_domains`, `allowed_dimensions`, `sign_rules`, `effective_from`, `effective_to`, `status`
- invariant: ett mått får inte sakna namngiven owner eller giltighetsintervall

### Report definition
- fält: `report_id`, `name`, `purpose`, `version_no`, `metric_refs`, `groupings`, `default_filters`, `drilldown_mode`, `export_templates`, `status`
- invariant: alla metric_refs måste peka på aktiva eller explicit historiska metric-versioner

### Export job
- fält: `export_job_id`, `report_id`, `report_snapshot_id`, `format`, `requested_by`, `status`, `watermark_mode`, `started_at`, `completed_at`, `artifact_ref`, `content_hash`
- invariant: exportjobbet ska alltid bära referens till exakt report snapshot

## State machine

### Metric definition
- `draft -> active -> deprecated -> retired`
- ny version skapas i stället för tyst mutation av aktiv version

### Report definition
- `draft -> active -> superseded -> retired`
- `active -> superseded` när ny rapportversion tar över

### Export job
- `queued -> running -> materialized -> delivered`
- `running -> failed -> retry_pending -> running`
- `materialized -> superseded` om nyare snapshot gör tidigare export inaktuell enligt policy

## Användarflöden

### Definiera och ändra mått
1. Metric owner skapar eller ändrar metric definition.
2. Reproducerbarhet, golden data och påverkan på rapporter granskas.
3. Ny version aktiveras med giltighetsdatum.
4. Berörda rapportdefinitioner uppdateras eller markerar att de använder äldre version.

### Köra rapport och export
1. Användaren väljer rapport och filter.
2. Systemet bygger report snapshot med metric-versioner, källsnapshotar och filter.
3. UI visar rapport och tillåter drilldown där policy tillåter.
4. Exportjobbet använder samma snapshot för Excel eller PDF.

### Underlag ändras efter tidigare export
1. Ny bokning, rättelse eller datakorrektion publiceras i källdomän.
2. Befintliga tidigare exports ligger kvar som historiska artefakter.
3. Nya rapportkörningar använder ny snapshot och kan markera äldre export som ersatt eller preliminär beroende på policy.

## Affärsregler

### Metric governance
- varje mått ska ha tydlig affärsdefinition, ägare, giltighetsintervall och testbevis
- ändring av formel eller datakälla kräver ny version
- återanvända metric ids utan versionslyft är förbjudet
- mått som används i regulatorisk rapportering ska ha strängare förändringskontroll

### Drilldown
- varje officiellt rapportmått ska ange om drilldown går till journal, reskontrapost, dokument, checklista eller endast aggregerad nivå
- om drilldown saknas ska orsaken anges explicit, till exempel sekretess eller aggregat från flera källor
- drilldown ska använda samma snapshot eller tydligt markera när realtidsdata visas i stället

### Reproducerbarhet
- rapporter ska kunna köras om med samma snapshot och ge samma resultat
- report snapshot ska innehålla filter, metric-versioner, valutakurser, periodstatus och relevanta regelversioner
- exports ska bära content hash och referens till snapshot
- preliminära rapporter ska watermarksättas när policy kräver det

## Behörigheter

- endast metric owner eller utsedd reviewer får ändra metric definition
- report owner får ändra rapportdefinition inom ramen för godkända metric-versioner
- användare får exportera endast rapporter de får läsa
- export operator får retrya exportjobb men inte ändra snapshots eller metric-innehåll

## Fel- och konfliktfall

- exportjobb utan snapshot ska nekas
- rapportdefinition som refererar till retired metric utan uttrycklig historikregel ska markeras `broken`
- mismatch mellan drilldown-summa och visat mått ska behandlas som blockerande rapportfel
- filgenereringsfel ska inte förstöra report snapshot utan endast exportjobbet

## Notifieringar

- metric owner får notis när använd metric-version ska deprecieras eller när golden-data-test misslyckas
- report owner får notis när ändrad metric påverkar rapporten
- användare får notifiering när exportjobb är klart eller har fallerat
- export operator får notis vid backlog eller återkommande exportfel

## Audit trail

- metric- och rapportändringar ska auditloggas med gammal och ny version, owner och beslutsunderlag
- varje export ska logga snapshot-id, format, watermark-läge, begärande användare och artifact-ref
- systemet ska kunna visa vilken export som byggde på vilken metric- och rapportversion
- om äldre export ersätts av ny snapshot ska relationen vara spårbar

## API/events/jobs

- kommandon: `create_metric_definition`, `activate_metric_version`, `create_report_definition`, `run_report_snapshot`, `request_export_job`, `retry_export_job`
- events: `metric_definition_activated`, `report_snapshot_created`, `export_job_requested`, `export_job_completed`, `export_job_failed`
- jobb: `report_snapshot_builder`, `excel_export_worker`, `pdf_export_worker`, `export_artifact_retention_job`

## UI-krav

- rapportvyn ska visa metric-version, rapportversion och snapshot-tid
- drilldown-länkar ska tydligt visa vilken nivå användaren går till
- exportdialog ska visa format, watermark-läge och om aktuell rapport är preliminär
- när underlag ändrats efter tidigare export ska UI kunna visa att äldre export är historisk eller ersatt

## Testfall

1. ändra metric-formel; förväntat utfall: ny version och opåverkad historik
2. kör rapport två gånger mot samma snapshot; förväntat utfall: identiskt resultat
3. exportera Excel och PDF från samma snapshot; förväntat utfall: samma siffror
4. ändra underlag efter tidigare export; förväntat utfall: ny rapport snapshot, gammal export kvar historiskt
5. rapport med saknad drilldown-konfiguration markeras felaktig

## Exit gate

- [ ] alla officiella mått har ägare, version och reproducerbar definition
- [ ] rapporter kan reproduceras från snapshots och ge samma exportutfall
- [ ] drilldown är definierat eller uttryckligen förbjudet per mått
- [ ] exportjobb är asynkrona, spårbara och watermarksätter när policy kräver det
- [ ] tidigare exporter kan relateras till senare ändrade underlag
