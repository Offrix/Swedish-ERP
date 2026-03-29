> Statusnotis: Detta dokument Ã¤r inte primÃ¤r sanning. Bindande styrning fÃ¶re UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument Ã¤r historiskt input- eller stÃ¶ddokument och fÃ¥r inte Ã¶verstyra dem.
# Import case review

## Syfte

Detta runbook beskriver hur import cases granskas, blockerande fel beslutas, correction requests hanteras och hur ett godkÃ¤nt import case appliceras replay-sÃ¤kert till downstream-domÃ¤n utan fÃ¶rbjudna autopostningar.

## NÃ¤r den anvÃ¤nds

- nÃ¤r ett import case ligger i `collecting_documents`, `ready_for_review`, `approved` eller `applied`
- nÃ¤r blocker codes mÃ¥ste fÃ¶rstÃ¥s eller Ã¥tgÃ¤rdas
- nÃ¤r en correction request ska Ã¶ppnas, godkÃ¤nnas eller avslÃ¥s
- nÃ¤r ett godkÃ¤nt import case ska appliceras till downstream-domÃ¤n
- nÃ¤r support eller finance behÃ¶ver utreda varfÃ¶r ett import case inte fÃ¥r gÃ¥ vidare

## FÃ¶rkrav

1. OperatÃ¶ren ska ha rÃ¤tt queue-/approval-behÃ¶righet och stark autentisering.
2. KÃ¤lldokument, components och eventuell klassificeringskÃ¤lla ska vara Ã¥tkomliga.
3. Det ska vara tydligt vilket downstream-objekt importfallet avser att skapa eller lÃ¥sa upp.
4. Replay, correction och review-historik ska vara synlig innan beslut tas.

## Steg fÃ¶r steg

1. Identifiera importfallet.
   - sÃ¶k pÃ¥ `importCaseId`, `caseReference`, bolag, tullreferens eller kÃ¤lldokument
   - bekrÃ¤fta att rÃ¤tt dokumentversion och rÃ¤tt case-kedja anvÃ¤nds
2. LÃ¤s completeness-status och blocker codes.
   - `PRIMARY_SUPPLIER_DOCUMENT_MISSING`: huvudunderlag saknas
   - `CUSTOMS_EVIDENCE_MISSING`: tullbevis krÃ¤vs men saknas
   - `IMPORT_COMPONENTS_MISSING`: goods/freight/duty/VAT-komponenter saknas
   - `IMPORT_VAT_AMOUNT_MISSING`: VAT-base finns men VAT amount saknas trots tullbevis
   - `SOURCE_CLASSIFICATION_NOT_APPROVED`: upstream-klassificering Ã¤r inte godkÃ¤nd/dispatched
   - `OPEN_CORRECTION_REQUESTS`: Ã¶ppna correction requests blockerar approval/apply
   - `DOWNSTREAM_MAPPING_CONFLICT`: case har redan applicerats mot annan downstream-mappning
3. Kontrollera evidens.
   - primary supplier document mÃ¥ste finnas
   - customs evidence mÃ¥ste finnas nÃ¤r varuursprung och casepolicy krÃ¤ver det
   - components mÃ¥ste Ã¥terspegla goods, duty, freight och import VAT dÃ¤r relevant
   - source classification case mÃ¥ste vara godkÃ¤nd om importfallet bygger pÃ¥ upstream-klassning
4. Hantera correction request.
   - Ã¶ppna correction request nÃ¤r mapping, evidens eller klassning inte lÃ¤ngre Ã¤r tillfÃ¶rlitlig
   - correction request blockerar approval och downstream apply tills den Ã¤r stÃ¤ngd
   - `approve` krÃ¤ver replacement case reference och skapar ny correction chain
   - `reject` krÃ¤ver motivering och Ã¥terÃ¶ppnar inte case automatiskt om andra blockers finns kvar
5. GodkÃ¤nn importfallet.
   - approval fÃ¥r bara ske frÃ¥n `ready_for_review`
   - completeness mÃ¥ste vara `complete`
   - inga Ã¶ppna correction requests fÃ¥r finnas
   - review item ska stÃ¤ngas med auditspÃ¥r nÃ¤r approval genomfÃ¶rs
6. Applicera till downstream-domÃ¤n.
   - applicera endast frÃ¥n approved case
   - anvÃ¤nd explicit `targetDomainCode`, `targetObjectType`, `targetObjectId` och `appliedCommandKey`
   - samma payload + samma command key ska vara idempotent
   - avvikande payload eller target mot redan applicerat case ska stoppas som mapping conflict
7. Dokumentera avslut.
   - kontrollera att downstream application, correction requests och audit events Ã¤r synliga
   - bekrÃ¤fta att review item och activity spÃ¥rar beslutet

## Verifiering

- import case visar korrekt completeness-status och blocker codes
- correction request syns som egen objektkedja med request-, decision- och actor-fÃ¤lt
- approval blockeras nÃ¤r correction request Ã¤r Ã¶ppen
- reject av correction request Ã¥terstÃ¤ller inte case till `complete` om andra blockers Ã¥terstÃ¥r
- approve av correction request skapar replacement case i correction chain
- downstream apply Ã¤r idempotent fÃ¶r samma command key + payload
- divergent replay ger `import_case_downstream_mapping_conflict`
- inget import case bokfÃ¶r direkt; endast downstream-domÃ¤n kan fortsÃ¤tta efter explicit apply

## Vanliga fel

- **Fel:** operatÃ¶r fÃ¶rsÃ¶ker godkÃ¤nna case trots Ã¶ppna correction requests.  
  **Ã…tgÃ¤rd:** stÃ¤ng eller avslÃ¥ correction request fÃ¶rst och rÃ¤kna om case.
- **Fel:** case ser komplett ut men VAT-belopp saknas.  
  **Ã…tgÃ¤rd:** kontrollera att tullbevis finns och att VAT-komponenten registrerats uttryckligen.
- **Fel:** samma import case appliceras igen mot annan leverantÃ¶rsfaktura eller annat objekt.  
  **Ã…tgÃ¤rd:** stoppa som mapping conflict och Ã¶ppna correction request om ursprunglig mappning Ã¤r fel.
- **Fel:** upstream-klassificering har Ã¤ndrats efter att importfallet skapats.  
  **Ã…tgÃ¤rd:** Ã¶ppna correction request och skapa replacement case i stÃ¤llet fÃ¶r att mutera befintligt case.

## Ã…terstÃ¤llning

- skapa replacement case via correctionflow, skriv aldrig Ã¶ver tidigare import case
- korrigera dokumentlÃ¤nkar eller components genom ny caseversion nÃ¤r redan godkÃ¤nt case blivit fel
- om downstream apply blev felaktigt ska motsvarande downstream-domÃ¤ns correction/reversal-flow anvÃ¤ndas; import case-historiken lÃ¤mnas orÃ¶rd

## Rollback

- rollback av kodÃ¤ndring sker via ny commit, inte genom att skriva Ã¶ver import case-data
- audit- och correction-historik i import case fÃ¥r aldrig raderas
- redan applicerat case rullas inte tillbaka i tysthet; ny correction request eller downstream correction krÃ¤vs

## Ansvarig

- finance/compliance-operatÃ¶r fÃ¶r review och approval
- support/backoffice vid incident eller mapping conflict
- domÃ¤nÃ¤gare fÃ¶r import/AP om downstream correction krÃ¤vs

## Exit gate

- import case kan granskas, korrigeras, godkÃ¤nnas och appliceras utan otydliga blockers
- correction requests har tydlig human decision-kedja
- replay-safe downstream mapping Ã¤r verifierad
- inga fÃ¶rbjudna autopostningar eller tysta mutationer finns i kedjan
