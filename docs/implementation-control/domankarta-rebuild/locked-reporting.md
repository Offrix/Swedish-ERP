# locked-reporting

## Syfte

Denna runbook äger operativt förfarande för att skapa, läsa, verifiera, distribuera, återöppna och återbygga locked reporting artifacts.

## Gäller för

- huvudbokspaket
- verifikationslista
- momsrapport
- AGI-underlag där tillämpligt
- close package
- year-end package
- ändra reporting artifacts som ska uppfattas som legal eller revisionsbar snapshot

## Absoluta regler

- locked reporting får aldrig bygga på ren live-fragning utan snapshot boundary
- varje locked artifact måste ha digest, storage profile, actor receipt och source checkpoint receipt
- drilldown från locked artifact måste vara snapshot-scopead
- om nagon source checkpoint är stale eller okand får artifact inte läsa till `locked`
- reopen får aldrig förstora gammalt artifact; ny lineage måste skapas

## Förberedelser

Innan ett artifact fa r lockas måste operatorn verifiera:
- tenant och fiscal year
- vilken rapporttyp som ska låsas
- legal accounting context
- alla source checkpoints och deras versionsreferenser
- att inga blockerande stale eller missing-proof issues finns
- att permissions och signoff-nivå är tillracklig

## Steg för att skapa locked artifact

1. skapa eller valj `preliminary_snapshot`
2. validera source checkpoints och proof bindings
3. generera artifact i verklig lagringsprofil
4. beräkna digest/checksumma
5. skriv `ExportArtifactReceipt`
6. skriv actor receipt och, där krävs, review receipt
7. satt state till `locked`
8. registrera relation till tidigare artifact eller `first_locked_version`

## Minsta obligatoriska metadata på locked artifact

- `artifactId`
- `artifactType`
- `tenantId`
- `fiscalYearId`
- `snapshotId`
- `snapshotDigest`
- `sourceCheckpointRefs[]`
- `artifactDigest`
- `storageRef`
- `createdBy`
- `createdAt`
- `reviewedBy` där krävs
- `distributionStatus`
- `supersedesArtifactId` där relevant

## Drilldown-regler

- drilldown måste läsa samma snapshotId eller artifact-specific immutable drilldown package
- live-drift drilldown är förbjuden på locked artifact
- om drilldown-data saknas måste artifact markeras med issue och får inte kallas fullständigt locked

## Distribution-regler

- distribution får bara ske från materialiserat artifact
- distribution måste skriva receipt per kanal eller mottagare
- download count ersätter inte distribution receipt

## Reopen-regler

Reopen får endast ske via:
- explicit correction case
- separat approver
- impact analysis
- ny plan för re-close och nya artifacts

Regel:
- gammalt locked artifact får aldrig muteras
- nytt artifact måste peka på gammalt via supersession lineage

## Restore och rebuild

Vid restore/rebuild ska operatorn:
1. valja artifact eller snapshot lineage
2. verifiera att canonical source artifacts finns
3. återskapa artifact deterministiskt
4. jamfora digest, scope och included ids mot tidigare receipt
5. om digest avviker, skapa incident och blockera green status

## Incidenthantering

Skapa incident om nagon av dessa intraffar:
- artifact saknar storageRef
- digest mismatch
- snapshot mismatch mot drilldown
- stale checkpoint i locked artifact
- distribution receipt saknas trots markerad leverans
- memory:// eller fake payload upptacks

## No-go

Det är förbjudet att satt a `locked` om:
- source checkpoints är stale eller unknown
- artifact bara finns i minnet
- digest saknas
- drilldown scope inte är fastlast
- actor receipt saknas
- required review receipt saknas
