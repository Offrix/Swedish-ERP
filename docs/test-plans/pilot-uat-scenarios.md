# Pilot UAT scenarios

Detta dokument definierar riktiga pilotscenarier för AR, AP, bank, moms, dokumentinbox, lön, close och återställning.

## Pilotupplägg

- Varje pilot ska köras av verklig användarroll, inte enbart intern superadmin.
- Varje scenario ska samla både affärsbevis och teknisk observability.
- Avvikelse mot förväntat utfall ska kategoriseras som blockerande, viktig eller kosmetisk.

## Scenarier

### PILOT-AR-01 Normal kundresa

- Förutsättning: bolag har kundregister, artikelregister och OCR-referens aktiverad.
- Steg: skapa offert, konvertera till avtal, generera kundfaktura, skicka via PDF eller Peppol, importera inbetalning och stäng posten.
- Förväntat: intäkt, moms, kundfordran och bankmatchning är spårbara utan manuell SQL.

### PILOT-AR-02 Delbetalning och överbetalning

- Förutsättning: två öppna fakturor till samma kund.
- Steg: importera delbetalning, därefter överbetalning, allokera överskott och återbetala rest.
- Förväntat: reskontra visar rätt saldon, 2950 används och bankavstämning stämmer.

### PILOT-AP-01 Leverantörsfaktura med PO

- Förutsättning: leverantör, PO och receipt finns.
- Steg: ta emot faktura via inbox, låt OCR skapa AP-draft, kör 3-way-matchning, attestera och skicka till betalningsförslag.
- Förväntat: dubblettskydd, avvikelselogik och 2450-reserv fungerar.

### PILOT-AP-02 Kreditnota och förskott

- Förutsättning: leverantör med förskottsbetalning och senare kreditnota.
- Steg: betala förskott, bokför faktura, kvitta förskott, bokför kreditnota.
- Förväntat: 1360, 2410 och 2440 beter sig enligt regelverket.

### PILOT-DOC-01 Inbound email och OCR

- Förutsättning: inboxadresser och SES-ingest är satta.
- Steg: skicka mail med två bilagor varav en leverantörsfaktura och en otillåten fil.
- Förväntat: fakturan routas till AP, otillåten fil går till karantän, råmail bevaras.

### PILOT-BANK-01 Kontoavstämning och leverantörsbetalning

- Förutsättning: bankkonto kopplat via AIS och minst ett betalningsförslag klart.
- Steg: exportera betalfil, ladda upp i bankportal, hämta banktransaktion, bokför avgift och kör avstämning.
- Förväntat: 2450-reserv, bankbokning och avgift stämmer mot statement.

### PILOT-VAT-01 Momsmånad med kredit och utland

- Förutsättning: försäljning Sverige, EU-inköp och kreditnota finns i perioden.
- Steg: kör momsrapport, jämför mot ledger och rätta ett avsiktligt fel i öppet skede.
- Förväntat: rapport och ledger tie-outar och rättelse kan förklaras.

### PILOT-PAYROLL-01 Lön med förmån och utlägg

- Förutsättning: anställd med friskvård och ett godkänt utlägg.
- Steg: kör lönekörning, inkludera förmån, utlägg och nettolönepåverkan, generera AGI-underlag.
- Förväntat: lön, förmån, arbetsgivaravgift och utläggsbokning stämmer.

### PILOT-CLOSE-01 Månadsstängning

- Förutsättning: perioden innehåller AR, AP, bank, moms och ett fåtal suspense-poster.
- Steg: kör bank-, AR-, AP- och momsavstämning, hantera differens, signera close-paket och lås perioden.
- Förväntat: sign-off paket, differenser och låsstatus kan visas historiskt.

### PILOT-DR-01 Återställning

- Förutsättning: staging eller isolerad miljö med backupmaterial.
- Steg: återställ databas, objekt och queue/outbox, kör smoke test på AP, AR, auth och bank.
- Förväntat: tjänsten kan köras igen utan dubbletter och restore-protokoll fylls i.

## Acceptanskriterier

- ingen blockerande avvikelse i kärnscenarierna AR, AP, bank, dokumentinbox eller close
- alla ekonomiska händelser kan spåras till verifikation, dokument och användarbeslut
- restore-scenario kan genomföras i isolerad miljö utan manuellt databashack

## Exit gate

- [ ] minst ett verkligt bolag eller realistiskt pilotbolag har kört varje kärnscenario
- [ ] observability-data och affärsbevis är sparade per scenario
- [ ] blockerande fel har stängts eller fått signerad riskacceptans
