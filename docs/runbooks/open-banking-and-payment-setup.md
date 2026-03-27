> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Open banking and payment setup

Detta runbook beskriver hur open-banking-partner, sandbox/prod, webhooks, kontokoppling, betalningsinitiering eller betalfilstrategi, nycklar, fallback och felsökning sätts upp.

## Förutsättningar

- partnerkonto hos vald open-banking-leverantör
- bolagets företagsbankkonto och behörighet att koppla konto
- beslut enligt ADR-0010 att v1 använder AIS och betalfil till bankportal
- egna webhook-domäner och secrets per miljö

## Berörda system

- Enable Banking sandbox
- Enable Banking produktion
- produktens bankadapter och bankkonto-master
- AWS Secrets Manager
- bankportal eller bankens filuppladdningsgränssnitt för leverantörsbetalningar

## Steg för steg

### Skapa partnerapplikationer

1. Skapa separat app eller credentials för sandbox, staging och produktion.
2. Registrera redirect-URL:er, webhook-endpoints och scope för konto- och transaktionsläsning.
3. Lägg partnercredentials i AWS Secrets Manager under `/erp/<env>/banking/<name>`.

### Koppla bankkonton

1. Starta bankkopplingen från produktens bankinställningar för rätt bolag.
2. Låt användaren genomföra bankens samtyckes- eller fullmaktsflöde.
3. När kopplingen är klar, mappa varje externt konto till rätt ledgerkonto, valuta och startdatum.
4. Dokumentera eventuella bankunika begränsningar, till exempel om vissa betalningsfiler eller referenser beter sig annorlunda.

### Konfigurera feed och hämtjobb

1. Sätt initial historikperiod så att minst en full avstämningscykel kan hämtas.
2. Kör regelbunden synk, till exempel minst varje timme dagtid och alltid före close-körningar.
3. Spara provider transaction id, kontobalans när sådan finns och råpayload-hash för varje hämtning.

### Aktivera betalfilflöde

1. Konfigurera ISO 20022 eller bankgodkänt exportformat enligt bankens krav.
2. Bestäm betalningsreferens, sign-off-flöde och filnamnstandard.
3. Säkerställ att export av betalfil triggar reservering mot 2450 men att slutlig bankbokning fortfarande väntar på bankhändelse.

### Webhooks och säkerhet

1. Aktivera webhooks för konto- eller samtyckesstatus om partnern stöder detta.
2. Verifiera varje webhook med signatur eller annat leverantörsspecifikt bevis före behandling.
3. Lagra endast miljöspecifik webhook-hemlighet i aktuell miljö.

### Fallback-rutin

1. Om AIS-feed ligger nere ska manuell statement-import kunna användas på samma bankkonto utan att duplicera poster.
2. Om betalfil inte kan laddas upp ska betalningsförslaget ligga kvar i reserverat läge tills ny fil eller manuellt bankbeslut dokumenterats.

## Verifiering

- konto kan kopplas i sandbox och produktion med separata credentials
- minst ett konto kan läsa saldo och transaktioner med korrekta referenser
- webhooks eller polling ger inte dubbla transaktioner
- betalfil kan exporteras och 2450-reserv skapas innan bankbokning
- manuell fallback-import fungerar och är idempotent

## Rollback och återställning

- revokera samtycke eller koppling hos partnern om fel konto råkat länkas
- disable feed för konto som ger felaktiga data och gå över till manuell import
- rotera webhook-hemlighet och re-register endpoint vid misstänkt kompromettering

## Vanliga fel och felsökning

### Bankkoppling misslyckas

- saknad firmatecknings- eller fullmaktsnivå hos banken
- fel redirect-URL eller otillåtna scopes
- partnerns sandbox-konto skiljer sig från produktionsbeteende och måste testas separat

### Data- eller matchningsfel

- samma transaktion kommer både via polling och webhook: kontrollera idempotensnyckel
- referensnummer saknas: fall tillbaka på remittance text och beloppsmatchning men skicka till review om osäkert
- banken levererar batchad transaktion: utred om den måste brytas upp med hjälp av settlement- eller bokningsdetalj från annan källa

### Betalfilproblem

- fil avvisas av bankportal: kontrollera formatversion, teckenkodning, referenslängd och mottagarkonto
- fil laddas upp två gånger: använd export-id i filnamn och håll batchen reserverad tills bokning kommer

## Exit gate

- [ ] AIS-koppling är etablerad och verifierad
- [ ] konto-mapping, polling och webhook-säkerhet fungerar
- [ ] betalfilflöde är testat från förslag till bankbokning
- [ ] fallback till manuell import är dokumenterad och övad
- [ ] bankunika begränsningar är nedskrivna per stödd bank

