> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Inbound email inbox setup

Detta runbook beskriver hur domäner och adresser för företagsinbox sätts upp, hur routingregler, råmail-lagring, bilagehantering, spam/skadlig fil-hantering och felsökning fungerar.

## Förutsättningar

- ägarskap till domän eller subdomän för inkommande e-post
- AWS-konto med SES i rätt region
- S3-bucket, SNS/SQS och worker pipeline skapade
- inkanalmodell per bolag och användningsfall beslutad

## Berörda system

- Cloudflare DNS
- AWS SES receiving
- S3 bucket för råmail
- SNS/SQS eller motsvarande ingest-kö
- produktens dokumentingest

## Steg för steg

### DNS och domän

1. Välj separat subdomän för inbound, till exempel `inbound.<domän>`.
2. Lägg MX-poster så att inkommande mail går till SES receiving-endpoint i vald region.
3. Lägg nödvändiga DNS-poster för SPF/DKIM/DMARC enligt leverantörens rekommendationer.

### SES receiving

1. Verifiera domänen eller relevanta adresser i SES.
2. Skapa receipt rule set som tar emot mail för definierade adresser och lagrar råmail i S3.
3. Aktivera scan och TLS-policy enligt säkerhetsbaslinjen.

### S3 och metadata

1. Lagra varje råmail under stig enligt `/company/<company_id>/channel/<channel_id>/yyyy/mm/dd/<message_id>.eml` eller motsvarande.
2. Aktivera versionshantering och server-side-kryptering.
3. Spara metadata om mottagare, ämne, storlek, message-id och scanresultat tillsammans med objektet.

### Routing till dokumentmotorn

1. Publicera händelse till kö eller topic när nytt råmail lagrats.
2. Dokumentmotorn ska läsa råmail, extrahera attachments, köra dedupe på message-id och skapa intake event.
3. Mappa adressmönster såsom `ap+<company>@...` eller separata alias till rätt bolag och kanal.

### Bilagor, spam och malware

1. Tillåt endast definierade filtyper att släppas vidare till OCR och routing.
2. Flytta misstänkta eller otillåtna bilagor till karantän men behåll råmail för revisionsspår.
3. Om ett mail innehåller flera relevanta bilagor ska varje bilaga bli eget dokument, men fortfarande peka på samma råmail.

### Operativ test

1. Skicka testmail med enkel PDF, flera bilagor, otillåten filtyp och avsiktlig dubblett.
2. Verifiera att dedupe, karantän och routing beter sig enligt dokumentmotorn.

## Repoimplementation i FAS 2.2

- API:t exponerar `POST /v1/inbox/channels` for kanalregistrering per bolag.
- API:t exponerar `POST /v1/inbox/messages` for ingest av råmailmetadata och bilagor.
- API:t exponerar `GET /v1/inbox/messages/:emailIngestMessageId?companyId=...` for att lasa tillbaka routingutfall, bilagestatus och kopplade dokument.
- `PHASE2_COMPANY_INBOX_ENABLED=false` returnerar `503` pa FAS 2.2-rutter utan att stoppa resten av API-processen.
- Giltiga bilagor blir separata dokument med gemensam raw-mail-referens, medan ogiltiga eller skanningsflagga bilagor markeras som karantan.

## Verifiering

- mail tas emot på rätt adresser och lagras som råmail i S3
- message-id används för dedupe
- rätt bolag och kanal identifieras från adress eller regel
- malware/spam och otillåtna bilagor stoppas eller karantänas
- flera bilagor blir separata dokument utan att råmail går förlorat

## Rollback och återställning

- peka tillfälligt MX till reservmottagare eller stoppa receipt rules om ingest skadar data
- om routing är fel, parkera alla nya mail i karantän tills reglerna rättats
- återspela råmail från S3 efter rättad routing eftersom originalet finns kvar

## Vanliga fel och felsökning

### Ingen e-post tas emot

- fel MX-post eller fel region-endpoint
- domän ej verifierad i SES
- receipt rule set ej aktiverat

### Fel bolag eller kanal

- adressalias saknar mapping
- message subject-regel eller recipient-regel har fel prioritet
- gamla alias pekar fortfarande till tidigare bolag

### Bilageproblem

- MIME mismatch mellan filändelse och faktisk filtyp
- filer större än produktgräns går till karantän
- upprepade samma message-id ska inte skapa nya dokument

## Exit gate

- [ ] inbound-domän och MX är satta och testade
- [ ] råmail lagras krypterat med versionshantering
- [ ] routing från adress till bolag och kanal fungerar
- [ ] dedupe, karantän och bilagelogik är verifierade
- [ ] råmail kan återspelas efter fel

