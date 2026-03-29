> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Migration parallel run diff tests

## Mål

Målet är att verifiera att migrationer kan köras reproducerbart, att parallellkörning identifierar och klassificerar differenser korrekt och att cutover endast sker när evidensen visar att målmiljön matchar källan inom godkända gränser.

## Scope

- importbatch, mapping review, diff report, manuella korrigeringar, acceptansgrind och sign-off
- parallellkörning för ledger, AR, AP, moms, bank, dokument, rapporter och öppna poster
- rollback och omkörning per scope eller batch
- objekt-för-objekt-spårning från källa till mål

## Fixtures

- källdatautdrag från minst två systemvariationer och minst två bolag med olika komplexitet
- låst mappingversion och dokumenterade manuella mappings
- golden diff reports med kända skillnader och deras klassificering
- fixtures för bristfälliga källfält, felaktiga dokumentlänkar och trasiga saldoövergångar

## Testlager

1. Unit tests för diffklassificering, mappingregler och toleransberäkning.
2. Integrations- och komponenttester för importbatch, objektlagring, mapping review och batchstatus.
3. Contract tests för importformat, diff report-schema och sign-off-evidence.
4. E2E-tester från batchskapande till parallellkörning, acceptans och cutoverbeslut.
5. Restore- och rollbacktester för misslyckad eller avbruten migration.

## Golden data

- golden batchar med förväntade objektantal, hashar och saldon
- golden diff cases för `mapping`, `source_gap`, `rounding`, `timing`, `missing_document`, `manual_adjustment_required` och `explained_difference`
- golden cutover rehearsal med definierat stoppläge och post-cutover-kontroller

## Kontraktstester

- verifiera importkontrakt för metadata, dokumenthash, primärnycklar, relationsnycklar och valutaformat
- verifiera att diff reports är versionsstyrda och maskinläsbara
- verifiera att cutover-API eller adminflöde kräver godkänd sign-off innan produktionsöppning

## E2E-scenarier

- kör full importbatch, reviewa mapping, generera diff report och verifiera klassificering
- rätta mappingfel och kör om batch; verifiera att diff minskar utan att nya orelaterade diffar uppstår
- simulera källsystem som fortsätter skriva efter fryspunkt; verifiera att cutover blockeras
- kör rollback efter medvetet misslyckad slutimport och verifiera att sanningskälla återställs
- följ ett enskilt objekt från källa till mål, genom diff och sign-off evidence

## Prestanda

- mäta importgenomströmning, diffberäkningstid och objektlagringsprestanda per batchstorlek
- verifiera att parallel run för stora dataset ryms inom beslutat migrationsfönster
- verifiera att omkörning av delscope inte kräver full batch när detta inte behövs

## Felvägar

- diffklassificering blir inkonsekvent mellan körningar
- dokument eller relationer tappas trots korrekta källdata
- cutover tillåts trots öppna blockerande differenser
- rollback lämnar delvis aktiverad målmiljö
- manuell korrigering sker utanför spårbar batchkedja

## Acceptanskriterier

- parallellkörning ger reproducerbara diff reports
- blockerande differenser stoppar cutover konsekvent
- rollback kan genomföras utan okänd dataförlust
- varje importerat objekt kan spåras till källa, mappingversion och batchstatus

## Exit gate

Testplanen är klar när migrationscockpit, diff reports och cutover-sign-off bevisligen kan styra en säker pilotmigrering utan oklassificerade differenser.

