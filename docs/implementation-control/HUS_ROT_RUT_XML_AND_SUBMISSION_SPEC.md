> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# HUS_ROT_RUT_XML_AND_SUBMISSION_SPEC

Status: Bindande HUS/ROT/RUT-specifikation för claim-kedja, XML, submission, receipts och recovery.

Detta dokument definierar exakt när claim får skapas, hur betalning verifieras, vilka uppgifter som måste låsas, hur XML ska genereras, hur submission och receipts ska hanteras och hur recovery ska bokas.

## 1. Grundregler

1. HUS-case äger claim-logiken. AR äger fakturan. Banking äger betalningsbevis. Integrationsdomänen äger XML-transport och receipts.
2. Claim får endast skapas från låst `HusClaimVersion`.
3. Samma claim-version får replayas tekniskt; materiell ändring kräver ny claim-version.
4. Systemet får inte låtsas att direktmyndighetskanal finns om officiell kanal endast stödjer XML-import till e-tjänst.
5. XML-generatorn ska vara version-pinnad till aktuell officiell schema-version för rot och rut företag. Nuvarande baseline är schemafamilj version 6.
6. Rot- och rutbegäran får inte blandas i samma XML-fil.
7. En XML-fil får inte bryta officiella regler om köpare, betalningsår, timmar, material eller beloppssamband.
8. Teknisk import eller kvittens är inte materiellt beslut.

## 2. Objektmodell

### 2.1 HusCase
- `hus_case_id`
- `project_ref`
- `customer_invoice_id`
- `service_family`
- `status`
- `rule_year`
- `claim_readiness_status`
- `claim_blocker_codes`

### 2.2 HusServiceLine
- `hus_service_line_id`
- `hus_case_id`
- `service_type_code`
- `work_description`
- `work_completed_from`
- `work_completed_to`
- `hours_worked`
- `labour_amount_incl_vat`
- `material_amount`
- `other_cost_amount`
- `property_ref`

### 2.3 HusBuyerAllocation
- `hus_buyer_allocation_id`
- `hus_case_id`
- `buyer_person_or_org_no`
- `buyer_name`
- `share_of_paid_amount`
- `share_of_requested_amount`
- `payment_date`
- `paid_amount`
- `property_role_code`
- `brf_org_no`
- `housing_form_code`

### 2.4 HusClaimVersion
- `hus_claim_version_id`
- `hus_case_id`
- `version_no`
- `rule_year`
- `service_family`
- `payload_hash`
- `xml_schema_version`
- `status`
- `locked_at`
- `locked_by`
- `submission_transport_mode`

### 2.5 HusSubmission
- `hus_submission_id`
- `hus_claim_version_id`
- `submission_envelope_id`
- `transport_mode`
- `status`
- `technical_receipt_ref`
- `business_decision_ref`

### 2.6 HusDecision
- `hus_decision_id`
- `hus_claim_version_id`
- `decision_type`
- `accepted_amount`
- `rejected_amount`
- `decision_date`
- `decision_reference`
- `source_payload_ref`

### 2.7 HusRecoveryCandidate
- `hus_recovery_candidate_id`
- `original_claim_version_id`
- `trigger_type`
- `trigger_source_ref`
- `candidate_amount`
- `status`

## 3. När claim får skapas

Claim får skapas först när följande är sant:
- fakturan är utfärdad
- kundfakturan är låst och innehåller korrekt HUS-klassificering
- arbetet är utfört
- minst en verifierad kundbetalning finns
- alla köparuppgifter är formellt korrekta
- arbetskostnad, materialkostnad, timmar och servicekod är fastställda
- begärt belopp ryms inom regelverk och buyer allocation
- rule year har fastställts på betalningsårsbasis
- claim blocker list är tom

## 4. Betalningsverifiering

### 4.1 Godkända betalningsbevis
- bank settlement från statement line med match mot kundfaktura
- kort- eller PSP-settlement när betalningsreferens, belopp och datum kan knytas till fakturan
- annat betalningsbevis endast via explicit review och evidence pack

### 4.2 Regler
- betalningsdatum får inte vara senare än ansökningsdatum
- alla buyer payments i samma claim-version ska avse samma betalningsår
- partial payment ska proportionera begärt belopp
- begärt belopp får inte överstiga betalt belopp
- begärt belopp + betalt belopp får inte överstiga arbetskostnaden
- om betalning inte kan verifieras deterministiskt får claim inte låsas

## 5. Obligatoriska uppgifter som måste låsas

I `HusClaimVersion` ska följande frysas:
- utförarens organisationsnummer
- kundfaktura-id och fakturadatum
- rule year
- service family: ROT eller RUT
- service lines med hours worked, labour amount incl VAT, material amount
- arbetets datumintervall
- köpare
- person-/organisationsnummer per köpare
- betalt belopp per köpare
- betalningsdatum per köpare
- andel begärt belopp per köpare
- fastighetsbeteckning eller BRF-uppgifter där relevant
- housing form
- begärt totalbelopp
- payload hash
- xml schema version

## 6. Blocking validations

Systemet ska neka låsning eller submission när något av följande gäller:
- köpare fyller inte minst 18 år under betalningsåret
- köparens personnummer är formellt felaktigt
- köparens personnummer är identiskt med utförarens personnummer
- BRF-nummer är formellt felaktigt när BRF används
- service family blandar ROT och RUT i samma fil
- ingen köpare finns
- fler än 100 köpare finns
- betalningsdatum är tidigare än tillåtet minimum eller senare än ansökningsdatum
- begärt belopp överskrider regelverkets gränser
- timmar eller material saknas för samtliga arbetsområden
- betalningsår skiljer mellan köpare i samma claim-version
- claim deadline 31 januari året efter betalningsåret har passerat

## 7. XML-struktur och serializer

### 7.1 Extern princip
Systemet ska generera XML som validerar mot aktuell officiell `Begaran.xsd` för rot och rut företag.

### 7.2 Intern canonical model
Intern canonical XML-source ska vara:
- `claim_header`
- `executor`
- `buyers[]`
- `service_lines[]`
- `property_or_brf`
- `payment_allocations[]`
- `requested_amount_summary`
- `schema_version`

### 7.3 Serializer-regler
- en serializer per schema-version
- serializer ägs av integrationsdomänen
- HUS-domänen skickar canonical payload, inte XML-fragment
- serializer får inte hämta data direkt från UI
- payload hash ska beräknas på canonical payload före rendering
- xml hash ska beräknas på slutligt XML-dokument efter rendering

### 7.4 Transport modes
- `xml_download_for_e_service_import` är obligatorisk baseline
- `direct_machine_submission` får endast aktiveras när officiell kanal eller avtalsstyrd adapter finns och contract tests är gröna
- om direktkanal saknas får systemet inte presentera submission som direktinskickad

## 8. Hur filen laddas ner korrekt

När transport mode är `xml_download_for_e_service_import` ska systemet:
1. skapa låst XML-fil från `HusClaimVersion`
2. ge filen deterministiskt namn: `hus_{orgnr}_{payment_year}_{claim_version_id}.xml`
3. spara xml hash, file size och generated-at receipt
4. exponera en auditbar download action
5. länka download receipt till claim-version

## 9. Hur den skickas

### 9.1 Baselinekanal
- operator importerar XML till officiell e-tjänst
- operator granskar förifyllda uppgifter
- operator signerar/skickar i e-tjänsten
- systemet registrerar technical receipt och business decision när de kommer tillbaka via import eller manuellt bevisflöde

### 9.2 Direktkanal
- endast tillåten om officiell eller kontrakterad maskinkanal faktiskt finns
- måste använda samma `SubmissionEnvelope`
- måste ge technical receipt och decision import i samma generiska receiptmodell
- contract tests mot aktuell kanal är obligatoriska

## 10. Technical receipt

Technical receipt ska lagra:
- submission id
- claim version id
- transport mode
- provider reference
- received_at
- technical status
- raw receipt hash
- terminal flag

Technical receipt betyder endast att transport eller import accepterats tekniskt.

## 11. Materiellt beslut

`HusDecision` ska särskilja:
- `accepted`
- `partially_accepted`
- `rejected`
- `recovery_required`

Materiellt beslut ska lagra:
- beslutsdatum
- beslutsreferens
- accepterat belopp
- avvisat belopp
- reason codes
- source payload ref

## 12. Correction, retry, replay och recovery

### 12.1 Retry
- används endast när samma claim-version inte fått teknisk slutstatus
- sker på samma payload hash
- ny attempt skapas i submission envelope

### 12.2 Replay
- teknisk replay av samma claim-version är tillåten när receipt saknas eller transportfel inträffat
- replay får inte användas för materiell ändring

### 12.3 Correction
- materiell ändring kräver ny `HusClaimVersion`
- tidigare claim-version ligger kvar immutable
- ny version länkar till tidigare via supersedes-ref

### 12.4 Recovery
Recovery ska öppnas när:
- senare kreditnota eller prisnedsättning minskar underlag efter utbetalning
- fel köpare eller fel belopp upptäckts efter beslut
- Skatteverkets beslut kräver återkrav

`HusRecoveryCandidate` ska leda till:
- review
- economic impact analysis
- eventuell kundfordran
- recovery submission eller manuell återbetalningskedja beroende på regelutfall

## 13. AR, HUS-state, ledger och customer debt reconciliation

- AR äger kundfaktura och kreditnota
- HUS äger claim status och recovery status
- ledger äger bokföring
- customer debt engine i AR äger slutlig kvarstående kundfordran

### 13.1 Accepted claim
- HUS-fordran stängs när utbetalning eller beslut + settlement kommer
- kundfordran ska redan vara reducerad till kundens del

### 13.2 Partial acceptance
- accepterad del stänger motsvarande HUS-fordran
- restbelopp blir antingen:
  - kundfordran om kund ska debiteras
  - discrepancy case om rättsläget eller avtalet kräver review
- systemet får inte automatiskt skriva bort differensen

### 13.3 Rejection
- hela HUS-andelen flyttas till kundfordran eller särskild tvist-/förlustprocess enligt policy
- activity, notification och work item skapas

### 13.4 Recovery
- redan stängd HUS-fordran kan återöppnas endast genom recovery case
- recovery bokas och följs separat

## 14. API-rutter

- `POST /v1/hus/cases`
- `POST /v1/hus/cases/:id/classify`
- `POST /v1/hus/cases/:id/lock-claim-version`
- `POST /v1/hus/cases/:id/generate-xml`
- `GET /v1/hus/claims/:claim_version_id/download`
- `POST /v1/hus/claims/:claim_version_id/submit`
- `POST /v1/hus/submissions/:id/replay`
- `POST /v1/hus/decisions/imports`
- `POST /v1/hus/recovery-candidates`
- `GET /v1/hus/object-profiles/:id`

## 15. Testkrav

- full payment before claim
- partial payment proportional claim
- two buyers same payment year
- two buyers different payment year blocked
- buyer under 18 blocked
- invalid BRF number blocked
- requested amount > paid amount blocked
- requested amount + paid amount > labour cost blocked
- mixed ROT/RUT file blocked
- accepted claim
- partial acceptance
- rejection
- replay same version
- correction new version
- recovery after credit note

## 16. Exit gate

Dokumentet är uppfyllt först när:
- claim creation, lock, XML generation, submission, receipt, decision och recovery fungerar som separata steg
- XML är versionspinnad och validerad mot officiellt schema
- systemet inte låtsas att direktkanal finns när den inte finns
- reconciliation mellan AR, HUS-state, ledger och customer debt är fullständig

