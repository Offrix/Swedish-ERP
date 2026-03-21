# Backup restore and disaster recovery

Detta runbook beskriver backupfrekvens, PITR, restore-test, objektlagringsrestore, kö-replay, RTO/RPO och exakt rollback-ordning.

## Förutsättningar

- RDS, objektlagring, köer och infrastruktur som kod är i drift
- backup-policyer är definierade i plattformen
- isolera återställningsmiljö finns eller kan skapas snabbt

## Berörda system

- RDS PostgreSQL med PITR
- S3 med versionshantering
- köer/outbox
- ECS eller motsvarande applikationsplattform
- AWS Backup eller motsvarande backup-orkestrering

## Steg för steg

### Backupstrategi

1. Databas kör kontinuerlig PITR med daglig snapshot.
2. Objektlagring använder versionshantering och skydd mot oavsiktlig radering.
3. Konfigurations- och infrastrukturskod ligger i repo och reproduceras via terraform eller motsvarande.
4. Köer ska i möjligaste mån vara replaybara från outbox eller källdata i stället för att vara enda sanningskälla.

### Mål för återställning

1. Standardmål för prod är RTO 4 timmar för kritiska kärnflöden och RPO 15 minuter för databasen.
2. Objektlagring ska normalt kunna återställas till senaste versionstillstånd utan dataförlust utöver eventuellt osynkat metadatafönster.
3. Mindre kritiska analyssystem kan ha längre återställningstid.

### Återställningsordning

1. Frys skrivande trafik och stoppa automationer som annars kan skapa ny driftdata i fel läge.
2. Återställ databasen till isolerad miljö först och verifiera schema, migrationsnivå och antal poster.
3. Återställ objektlagring eller peka om till korrekta objektversioner.
4. Återställ secrets och konfiguration endast om de också förlorats eller komprometterats.
5. Rebuild indexer, caches och härledda materialiseringar från återställd databas.
6. Replaya idempotenta köer eller outbox-händelser där det behövs.
7. Öppna trafik stegvis efter smoke tests.

### Restore-test

1. Kör kvartalsvis full restore-test till isolerad miljö.
2. Verifiera att bank-, AR-, AP-, dokument- och auth-kärndata går att använda efter restore.
3. Spara restore-protokoll, tidsåtgång, fel och förbättringsåtgärder.

## Verifiering

- backup finns för databas, objekt och konfigurering
- PITR fungerar till vald tidpunkt
- isolerad restore-miljö kan startas
- quarterly restore-test är dokumenterat
- RTO och RPO följs upp mot verkligt utfall

## Rollback och återställning

- om återställd miljö inte är konsistent, stanna kvar i read-only eller maintenance mode och återställ på nytt från annan tidpunkt
- öppna inte skrivande trafik förrän smoke tests och data-kontroller är gröna
- om replay ger fel, återställ till senaste goda återställningspunkt och kör om med mindre scope

## Vanliga fel och felsökning

### Databasåterställning

- fel tidsstämpel vald för PITR
- schema och applikationsversion matchar inte
- migrationsjobb körs igen av misstag på redan återställd data

### Objekt och köer

- metadata finns men objekt saknas eller fel version används
- kö replayas dubbelt utan idempotensskydd
- sökindex eller cache visar gammal eller partiell data efter restore

## Exit gate

- [ ] RTO/RPO är definierade och spårade
- [ ] restoreordning är känd och övad
- [ ] backup och versionering täcker både databas och objekt
- [ ] kö-replay och maintenance mode är testade
- [ ] restore-protokoll finns för senaste test
