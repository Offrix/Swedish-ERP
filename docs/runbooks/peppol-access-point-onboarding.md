> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Peppol access point onboarding

Detta runbook beskriver access point-onboarding, identiteter, mottagarregistrering, testflöden, kvittenser, buyer reference/order reference-krav och produktionssättning för Peppol.

## Förutsättningar

- avtal med vald access point-partner
- juridiska bolagsuppgifter, Peppol-identiteter och önskade dokumenttyper
- miljöspecifika webhook-domäner och secrets
- Peppol-compliance-dokument och valideringspaket färdiga

## Berörda system

- Storecove sandbox
- Storecove produktion
- produktens Peppol-adapter
- webhook-endpoints för inkommande och status
- dokumentarkiv och AP/AR-routing

## Steg för steg

### Skapa miljöer och legal entities

1. Skapa separat sandbox- och produktionskonto hos access point-partnern.
2. Registrera legal entity per bolag med korrekta identifierare och kontaktuppgifter.
3. Lägg credentials i Secrets Manager per miljö.

### Konfigurera dokumentflöden

1. Aktivera sändning och mottagning för de dokumenttyper som ska stödjas i v1.
2. Registrera webhook för inkommande dokument, leveransstatus, kvittenser och fel.
3. Konfigurera discovery och mottagarkontroll i adaptern innan sändning till extern mottagare tillåts.

### Valideringsregler och referenser

1. Aktivera aktuell Peppol BIS Billing 3-validering i adaptern och koppla produktens affärsregler ovanpå den.
2. Gör buyer reference och order reference till tydliga fält i AR-draft och blockera sändning när kundsegmentet kräver dem.
3. Säkerställ att kreditnota och faktura använder korrekta dokumenttyper och referenser till original.

### Sandbox-test

1. Skicka testfaktura, kreditnota och mottagningstest i sandbox.
2. Verifiera att statuskoder, kvittenser och tekniska fel hamnar i rätt köer.
3. Verifiera att inkommande dokument går till dokumentmotorn och därefter till AP utan dubbletter.

### Produktionssättning

1. Rotera temporära sandbox-värden bort från produktionen.
2. Bekräfta att mottagarregistrering är klar för relevanta parter och att discovery svarar korrekt.
3. Begränsa första produktionstrafiken till intern pilot eller vitlistade kunder och övervaka kvittenser i realtid.

## Verifiering

- sandbox och prod använder olika credentials och webhook-hemligheter
- discovery, sändning, kvittenskedja och mottagning fungerar
- buyer reference/order reference valideras när affärsregler kräver det
- kreditnota kan knytas till originalfaktura
- inkommande dokument skapar rätt dokument- och AP-flöden

## Rollback och återställning

- stäng sändning till produktion genom feature flag om kvittenser eller routing blir fel
- inaktivera inkommande webhook och gå över till partnerportal eller manuell retrieval om adaptationen störs
- rotatera credentials om fel miljö eller fel legal entity använts

## Vanliga fel och felsökning

### Valideringsfel

- saknad buyer reference eller order reference när mottagarkrav finns
- ogiltig kreditnota-referens till originalfaktura
- BIS-regelpaket uppdaterat utan att intern validering följt med

### Transportfel

- webhook-signatur stämmer inte: kontrollera secret och replay-skydd
- mottagare kan inte hittas via discovery: kontrollera Peppol-id och registreringsstatus
- partnern accepterar dokument men mottagare avvisar det: bevara teknisk och affärsmässig kvittens separat

## Exit gate

- [ ] legal entities och credentials är satta per miljö
- [ ] discovery, sändning och mottagning är testade end-to-end
- [ ] kvittenser och fel går till rätt köer
- [ ] buyer reference/order reference-krav är inbyggda i processen
- [ ] första prod-trafiken kan övervakas i realtid

