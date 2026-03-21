# Document inbox and OCR engine

Detta dokument definierar dokumentinbox, dokumenttyper, deduplicering, OCR-fält, confidence, klassificering, granskningskö, omkörning, versionskedja och hur dokument länkas till AP, AR och ledger utan att förlora råoriginal eller auditkedja.

## Scope

### Ingår

- inboxkanaler för inkommande e-post, filuppladdning, API-import och partnerflöden såsom Peppol
- lagring av råmeddelande, bilagor, dokumentversioner, derivat, OCR-text och klassificeringsresultat
- deduplicering av meddelanden, bilagor och dokumentversioner
- klassificering av dokumenttyp, routing till rätt domän och confidence-baserad auto- eller review-beslut
- OCR-fältextraktion, radtolkning, totalsummering, versionskedja och omkörning
- granskningsköer, karantän, felköer och manuell korrigering
- koppling mellan dokument och affärsobjekt i AP, AR, ledger, lön eller andra domäner

### Ingår inte

- själva bokföringen av dokumentets ekonomiska innebörd; den görs av respektive affärsdomän
- extern arkivpolicy och retentionregler i detalj; de styrs av separat policy-dokument
- teknisk e-postleverantörsinstallation; den styrs av separat runbook

### Systemgränser

- Dokumentmotorn äger dokument, dokumentversion, råmail, attachment, OCR-körning och review-task.
- AP, AR och andra domäner äger tolkningen av affärsbetydelsen efter att ett dokument har routats och länkats.
- Ledgern får aldrig bokas direkt från dokumentmotorn; dokumentmotorn kan endast ge signaler som `document_ready_for_ap`.
- Malware- och spam-signaler från leverantören är input till dokumentmotorn men ersätter inte intern karantänlogik.

## Hårda regler

1. Originalfil och råmeddelande får aldrig skrivas över eller försvinna vid omkörning. Varje ny bearbetning ska skapa ny version eller nytt derivat.
2. Ett dokument måste ha ett bolag, en intake-kanal och en tidsstämpel innan det får behandlas vidare.
3. Filer som bryter tillåtna filtyper, storleksgränser eller malware-regler ska stoppas före OCR och routing.
4. Deduplicering ska ske på minst tre nivåer: meddelande-id, binär filhash och affärsidentitet såsom fakturanummer plus leverantör.
5. Klassificering under konfigurerad confidence-gräns får inte auto-routas till autopostande flöden.
6. Omkörning får inte mutera eller radera tidigare OCR-resultat; den ska skapa ny version med tydlig orsak.
7. Mänsklig korrigering av OCR-fält ska bevara både ursprungligt maskinförslag och användarens ändring.
8. Dokumentlänkar ska vara många-till-många men måste ha rolltyp, till exempel `source_document`, `supporting_attachment` eller `rendered_copy`.
9. Råmail, dokumentversioner och länkningar ska vara fullt auditerade.
10. Alla intake-händelser och OCR-körningar ska vara idempotenta.

## Begrepp och entiteter

- **Inboxkanal** — Konfigurerad ingång per bolag och användningsfall, till exempel AP, kundfaktura, kvitton eller lön.
- **Intake event** — Den första tekniska händelsen när ett meddelande eller en fil når systemet.
- **Råmail** — Oförändrad lagrad representation av inkommande e-post med headers och MIME-delar.
- **Attachment** — En fil knuten till ett intake event innan den eventuellt blir eget dokument.
- **Dokument** — Den logiska enhet som används i produkten för att representera ett affärsunderlag.
- **Dokumentversion** — En specifik fil eller derivatversion i dokumentets versionskedja.
- **Klassificering** — Maskinell eller regelbaserad bedömning av dokumenttyp och routingmål.
- **OCR-fält** — Extraherade rubrik- och radvärden som kan användas av AP-, AR- eller andra domäner.
- **Confidence** — Säkerhetsmått för klassificering eller fälttolkning, sparat per modell, per fält och per körning.
- **Granskningskö** — Arbetskö där människa granskar dokument med låg säkerhet, konflikt eller fel.
- **Versionskedja** — Den immutabla historiken från original till senare tolkningar, korrigeringar och derivat.
- **Karantän** — Säker lagringszon för misstänkt skadlig eller policybrytande fil.

## State machines

### Intake event

- `received -> accepted -> rejected -> quarantined`

- `accepted` kräver att grundläggande routing till bolag och kanal lyckats.
- `quarantined` används för malware, spam, policybrott eller oklar avsändare som måste granskas.

### Dokument

- `created -> classified -> extracted -> linked -> posted_by_domain -> archived`

- `posted_by_domain` sätts endast när annan domän faktiskt använt dokumentet i en ekonomisk händelse eller annat slutflöde.
- `archived` betyder inte borttaget; det betyder att dokumentet inte längre är aktivt i arbetsköer.

### Review task

- `open -> claimed -> corrected -> approved -> rejected -> requeued`

- `corrected` bevarar både användarens ändring och original-OCR.
- `approved` skickar dokumentet vidare enligt kanalregler och får inte hoppa över audit.

### OCR rerun

- `requested -> processing -> completed -> failed`

- Varje omkörning ska bära orsak såsom modelluppgradering, dålig kvalitet, fel kanal eller manuell begäran.
- Ny körning får inte radera tidigare resultat även om den ger bättre utfall.

## Inputfält och valideringar

### Inboxkanaler och routing

#### Fält

- kanal-id, bolag, användningsfall, e-postadress eller API-key, tillåtna filtyper, maxstorlek, tillåtet språk, default-domän
- routingregler på avsändare, mottagaradress, subject-taggar, dokumenttyp och prioritet

#### Valideringar

- en kanal får inte routa till flera bolag utan explicit multi-tenant-strategi
- tillåtna filtyper ska valideras både på filändelse och MIME-sniffning
- maxstorlek ska gälla före OCR och före långvarig lagring
- råmail utan mottagarträff ska gå till routing_review, inte droppas

### Dokumentmetadata

#### Fält

- document_id, document_type, source_channel, source_message_id, source_attachment_index, filename, hash, received_at, language_hint
- klassificeringsresultat med kandidatlista, sannolikheter, modellversion och routingbeslut

#### Valideringar

- samma filhash inom samma bolag och närliggande tidsfönster ska flaggas som dokumentdubblett
- samma source_message_id ska inte skapa flera intake events om inte leverantören explicit markerat retry med samma id
- document_type `unknown` får inte routas till autoposterande flöde

### OCR-fält och line extraction

#### Fält

- för leverantörsfaktura: leverantörsnamn, organisationsnummer, fakturanummer, fakturadatum, förfallodatum, valuta, netto, moms, brutto, betalreferens, bankgiro/IBAN, PO-referens, orderreferens
- för kundfaktura: kundnamn, eget fakturanummer, leveransdatum, belopp, buyer reference, orderreferens, kundreferens
- för kvitto: butik, datum, totalsumma, momsbelopp, valutaslag, betalmedel och kvittotyp
- raddata: beskrivning, kvantitet, enhetspris, radbelopp, momsgrupp och summeringskontroll

#### Valideringar

- OCR-totaler måste gå att summera eller markeras som osäkra
- confidence ska sparas per fält, inte bara per dokument
- dokument utan läsbar text eller med oläsliga sidor ska markeras som extraction_failed eller low_confidence

### Versionskedja och länkar

#### Fält

- version_no, version_type, parent_version, created_by, created_at, reason_code, storage_object_ref
- document_link med target_type, target_id, relation_type, linked_by, linked_at

#### Valideringar

- endast en version får markeras som `original`
- manuellt uppladdad ersättningsfil ska skapa ny version, inte skriva över befintligt objekt
- dokument får inte länkas till stängd eller låst målpost utan särskild override

## Beslutsträd/regler

### Klassificering och routing

- Klassificering använder först kanalregler och metadata, därefter dokumentmodell och slutligen affärsregler som motpartsmatchning.
- Hög säkerhet på dokumenttyp men låg säkerhet på bolagsrouting ska ändå gå till review; båda måste vara godkända för auto-route.
- Peppol-XML och andra strukturerade dokument ska primärt parse:as maskinellt; OCR är fallback för visuella dokument.

### Deduplicering

- Meddelandedubblett upptäcks via source message id och mottagarkanal.
- Fildubblett upptäcks via binär hash oavsett filnamn.
- Affärsdubblett upptäcks via dokumenttyp, motpart, fakturanummer, belopp och datumfönster.
- Om exakt dubblett hittas ska den nya händelsen markeras som duplicate och länkas till befintligt dokument i stället för att skapa ny primärpost.

### OCR-confidence och review

- Klassificering under kanalens auto-threshold går till review.
- Dokument med totalsumma men utan säker motpart eller utan säker fakturareferens går till review även om övriga fält är starka.
- Mänsklig korrigering ska kunna trigga ny matchning eller ny OCR-körning med annan profil.
- Om en modelluppgradering förbättrar utfall får omkörning ske batchvis men endast som ny version.

### Länkning mot AP, AR och ledger

- AP- eller AR-draft får skapas automatiskt först när kanal, dokumenttyp och obligatoriska fält når bolagets definierade säkerhetsnivå.
- Dokument kan länkas som stödjande underlag till redan postad verifikation utan att skapa ny ekonomi.
- Samma dokument kan länkas till både källdokument och verifikation men relationstyperna måste vara explicita.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Intake, klassificering och OCR | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Dokumentmotorn bokför inte själv ekonomi. |
| Länkning till AP/AR-draft | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Affärsdomänen kan därefter skapa posting intent om dokumentet godkänns. |
| Länkning till befintlig verifikation | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Används endast för spårbarhet och underlag, inte för ny bokföring. |
| Karantän, review eller omkörning | Ingen | Ingen direkt bokföring | Ingen direkt bokföring | Operativ händelse utan ledgerpåverkan. |

## Fel- och granskningsköer

- **routing_review** — Bolag eller kanal kunde inte bestämmas säkert.
- **duplicate_review** — Sannolik dubblett upptäckt men inte med absolut säkerhet.
- **classification_low_confidence** — Dokumenttyp eller routingmål under tröskel.
- **ocr_low_confidence** — Viktiga fält saknas eller har låg säkerhet.
- **malware_quarantine** — Spam, malware eller policybrott kräver karantän.
- **link_conflict** — Dokument försöker länkas till oförenliga eller låsta målobjekt.
- **rerun_failed** — OCR- eller klassificeringsomkörning misslyckades tekniskt.

## Idempotens, spårbarhet och audit

- Varje intake event ska bära `channel_id`, `source_message_id` eller motsvarande extern nyckel, samt binär hash för varje attachment.
- Ny OCR-körning ska lagras som egen `ocr_run_id` med modellversion, inte som mutation av tidigare run.
- Manuella korrigeringar ska auditeras fält för fält, inklusive tidigare värde, nytt värde, användare och kommentar.
- Dokumentlänkar ska vara versionsmedvetna så att det går att se vilken dokumentversion ett AP- eller AR-utkast byggde på.
- Karantänbeslut, malware-resultat, spamresultat, release från karantän och destruktionsbeslut ska gå att följa i auditloggen.
- Batch-omkörning av äldre dokument ska kunna göras utan att skapa dubbletter eller förlora tidigare approvals.

## Golden tests

1. **E-post med två bilagor**

- Skicka en AP-faktura och ett kvitto i samma mail.
- Förväntat utfall: två separata dokument med gemensam råmail-länk.

2. **Exakt filhash-dubblett**

- Ladda upp samma PDF två gånger i samma kanal.
- Förväntat utfall: andra uppladdningen flaggas som duplicate.

3. **Låg confidence på fakturanummer**

- OCR lyckas med totalsumma men inte fakturanummer.
- Förväntat utfall: ocr_low_confidence och ingen auto-AP.

4. **Peppol XML**

- Importera strukturerad e-faktura.
- Förväntat utfall: parse används framför OCR och obligatoriska fält landar i AP-draft.

5. **Malwareflagga**

- Skicka fil som markeras som skadlig.
- Förväntat utfall: intake går till karantän och ingen affärsdomän nås.

6. **Manuell korrigering**

- Granskare justerar OCR-fält och godkänner.
- Förväntat utfall: tidigare OCR-värden bevaras och ny version länkas till AP-draft.

7. **Omkörning efter modellbyte**

- Kör om dokument med ny OCR-profil.
- Förväntat utfall: ny ocr_run och nytt derivat utan att gammal historik försvinner.

## Exit gate

- [ ] alla inkommande kanaler skapar råoriginal, dokumentobjekt och auditspår
- [ ] klassificering, deduplicering och OCR har tydliga thresholds och review-köer
- [ ] omkörning och manuell korrigering skapar versionskedja i stället för mutation
- [ ] AP, AR och ledger kan länka dokument utan att dokumentmotorn bokför ekonomi
- [ ] malware, spam och policybrott stoppas före affärsbehandling
