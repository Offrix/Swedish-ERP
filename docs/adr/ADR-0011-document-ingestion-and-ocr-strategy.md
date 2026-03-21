# ADR-0011 — Document ingestion and OCR strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten behöver en robust dokumentingest för leverantörsfakturor, kvitton, avtal och andra underlag. Den måste fungera per bolag, vara säker och inte förlora råoriginal.
- Dokumentflöden är centrala för AP, AR och intern kontroll och behöver ett tydligt val av leverantör, filtyper, size limits och human review-regler.

## Decision

- Inbound e-post i v1 byggs på AWS SES receiving i eu-north-1 med S3-lagring av råmail, SNS/SQS för händelser och worker-pipeline för routing.
- Inboxmodellen är per bolag och per användningsfall. Minimikategorier i v1 är AP, kvitton/utlägg, lön/HR och generisk företagsinbox.
- OCR för leverantörsfakturor och kvitton använder AWS Textract AnalyzeExpense som primär motor. Generell text och vissa övriga dokument använder annan Textract-profil eller enkel textutvinning som fallback.
- Dokumentklassificering görs inte enbart av OCR-leverantören utan av en egen regel- och modellkomponent som kombinerar kanal, metadata, text och motpartsmatchning.
- Malware- och spamförsvar sker i två steg: leverantörens inbyggda scan där den finns, plus egen karantänprocess innan dokument släpps till affärsdomäner.
- Tillåtna filtyper i v1 är PDF, JPG, JPEG, PNG, TIFF, XML för strukturerade e-fakturor samt EML för lagring av råmail. Exekverbara filer och arkiv med aktiva binärer blockeras.
- Produktens egna gränser i v1 är 25 MB per råmail, 15 MB per enskilt dokument för OCR, högst 10 bilagor per meddelande och högst 200 sidor per OCR-jobb om inte administrativ override används.
- Auto-route kräver hög klassificeringssäkerhet. AP/AR auto-draft kräver dessutom säkra nyckelfält såsom motpart, totalbelopp och referens.

## Why

- AWS-native ingest i Stockholm ger enkel drift, tydlig miljöseparation och låg arkitekturfriktion mot övrig AWS-baserad plattform.
- Textract AnalyzeExpense täcker faktura- och kvittoscenarier bättre än generisk OCR och returnerar både fält och line items.
- Egen klassificeringskomponent behövs för att få affärsdomänspecifik routing och för att kunna versionera bolagsspecifika regler.
- Tvåstegs scanning minskar risken att osäker e-post eller bilaga når AP/AR-flöden.

## Consequences

- OCR-kostnad och väntetid måste övervakas aktivt, särskilt vid batch-omkörning.
- SES, S3, SQS, worker och OCR-run behöver sammanhållen observability och retry-strategi.
- Human review blir en first-class-funktion och måste prioriteras i produkt-UI.
- Fil- och sidgränser måste kommuniceras tydligt till användare och support.

## Out of scope

- Dokumentmotorn ska inte auto-bokföra ekonomi utan mänskligt eller regelbaserat godkännande i affärsdomän.
- Fri uppladdning av alla filformat i v1.

## Exit gate

- [ ] bolagsvisa inboxar kan ta emot, lagra och routa dokument utan dataförlust
- [ ] OCR-resultat är versionsstyrda och kan omköras
- [ ] malware, spam och otillåtna filer stoppas före affärsdomän
- [ ] classify-thresholds och human-review-regler är definierade och testade
