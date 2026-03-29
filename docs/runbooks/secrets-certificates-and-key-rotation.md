> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Secrets certificates and key rotation

Detta runbook beskriver var hemligheter ligger, naming-standard, rot/rotation, ansvarig person, certifikatförnyelse och hur lokala, staging- och prod-secrets skiljs åt.

## Förutsättningar

- AWS Secrets Manager och KMS är aktiverat
- tydlig miljömodell dev/staging/prod
- lista över alla externa adaptrar och deras hemligheter

## Berörda system

- AWS Secrets Manager
- AWS KMS
- ACM
- Cloudflare
- lokal utvecklingsmiljö med separat developer secret flow

## Steg för steg

### Naming-standard

1. Använd namnschema `/erp/<env>/<domain>/<secret_name>` för maskinhemligheter.
2. Exempel på domäner: auth, banking, peppol, mail, ocr, observability, app.
3. Lägg alltid metadata om ägare, rotationsfrekvens och senaste rotationsdatum.

### Lagring per typ

1. API-hemligheter och webhook-secrets lagras i Secrets Manager.
2. Publika TLS-certifikat för AWS-endpoints hanteras i ACM.
3. Cloudflare edge-certifikat och API-tokens hanteras i Cloudflare respektive Secrets Manager enligt minsta behörighet.
4. Leverantörscertifikat eller privata nycklar lagras krypterat och exporteras inte till repo.

### Miljöseparation

1. Dev, staging och prod har separata hemligheter och aldrig delade credentials.
2. Lokala utvecklarmaskiner får bara tidsbegränsade eller utvecklarspecifika hemligheter, inte prod-hemligheter.
3. Staging får inte använda prod-webhooks eller prod-domäner.

### Rotation

1. Webhook- och API-hemligheter roteras minst kvartalsvis eller vid misstanke om kompromettering.
2. Certifikat som löper ut ska förnyas minst 30 dagar före utgång.
3. När hemlighet roteras ska dual-running-period användas där både gammal och ny hemlighet kan verifieras under kort övergångstid om adapter stöder det.
4. Efter rotation ska gammal hemlighet revokeras och tas bort så snart verifiering är klar.

### Ansvar och verifiering

1. Varje secret ska ha ägare, backup-ägare och systemscope.
2. Efter rotation ska minst ett verkligt eller syntetiskt anrop verifiera att ny hemlighet fungerar.
3. Misslyckad rotation ska ge omedelbar rollback till senast fungerande hemlighet om risken motiverar det.

## Verifiering

- alla hemligheter följer naming-standard
- ingen prod-secret används i annan miljö
- rotationsdatum och ägare finns dokumenterade
- minst ett test körs efter varje rotation
- utgångsdatum för certifikat övervakas

## Rollback och återställning

- återställ senaste fungerande hemlighet om ny rotation orsakar driftstopp
- om certifikatförnyelse misslyckas, håll gammalt certifikat aktivt tills nytt verifierats där det är möjligt
- om fel miljö fått fel hemlighet, rotera båda miljöerna och återställ rätt mapping

## Vanliga fel och felsökning

### Vanliga hemlighetsfel

- fel namespace eller fel miljö vid hämtning
- hemlighet roterad i leverantör men inte i appen
- för bred IAM-behörighet som exponerar mer än nödvändigt

### Certifikatfel

- kommande utgång utan förnyelseplan
- fel SAN/domän efter förnyelse
- gammal webhook-signaturhemlighet kvar för länge efter rotation

## Exit gate

- [ ] all secrets- och certifikatlager är inventerade och ägda
- [ ] rotationer kan köras med verifiering och rollback
- [ ] miljöseparationen är tydlig och testad
- [ ] utgångsdatum övervakas proaktivt

