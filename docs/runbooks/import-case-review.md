> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Import case review

## Syfte

Detta runbook beskriver hur import cases granskas, blockerande fel beslutas, correction requests hanteras och hur ett godkänt import case appliceras replay-säkert till downstream-domän utan förbjudna autopostningar.

## När den används

- när ett import case ligger i `collecting_documents`, `ready_for_review`, `approved` eller `applied`
- när blocker codes måste förstås eller åtgärdas
- när en correction request ska öppnas, godkännas eller avslås
- när ett godkänt import case ska appliceras till downstream-domän
- när support eller finance behöver utreda varför ett import case inte får gå vidare

## Förkrav

1. Operatören ska ha rätt queue-/approval-behörighet och stark autentisering.
2. Källdokument, components och eventuell klassificeringskälla ska vara åtkomliga.
3. Det ska vara tydligt vilket downstream-objekt importfallet avser att skapa eller låsa upp.
4. Replay, correction och review-historik ska vara synlig innan beslut tas.

## Steg för steg

1. Identifiera importfallet.
   - sök på `importCaseId`, `caseReference`, bolag, tullreferens eller källdokument
   - bekräfta att rätt dokumentversion och rätt case-kedja används
2. Läs completeness-status och blocker codes.
   - `PRIMARY_SUPPLIER_DOCUMENT_MISSING`: huvudunderlag saknas
   - `CUSTOMS_EVIDENCE_MISSING`: tullbevis krävs men saknas
   - `IMPORT_COMPONENTS_MISSING`: goods/freight/duty/VAT-komponenter saknas
   - `IMPORT_VAT_AMOUNT_MISSING`: VAT-base finns men VAT amount saknas trots tullbevis
   - `SOURCE_CLASSIFICATION_NOT_APPROVED`: upstream-klassificering är inte godkänd/dispatched
   - `OPEN_CORRECTION_REQUESTS`: öppna correction requests blockerar approval/apply
   - `DOWNSTREAM_MAPPING_CONFLICT`: case har redan applicerats mot annan downstream-mappning
3. Kontrollera evidens.
   - primary supplier document måste finnas
   - customs evidence måste finnas när varuursprung och casepolicy kräver det
   - components måste återspegla goods, duty, freight och import VAT där relevant
   - source classification case måste vara godkänd om importfallet bygger på upstream-klassning
4. Hantera correction request.
   - öppna correction request när mapping, evidens eller klassning inte längre är tillförlitlig
   - correction request blockerar approval och downstream apply tills den är stängd
   - `approve` kräver replacement case reference och skapar ny correction chain
   - `reject` kräver motivering och återöppnar inte case automatiskt om andra blockers finns kvar
5. Godkänn importfallet.
   - approval får bara ske från `ready_for_review`
   - completeness måste vara `complete`
   - inga öppna correction requests får finnas
   - review item ska stängas med auditspår när approval genomförs
6. Applicera till downstream-domän.
   - applicera endast från approved case
   - använd explicit `targetDomainCode`, `targetObjectType`, `targetObjectId` och `appliedCommandKey`
   - samma payload + samma command key ska vara idempotent
   - avvikande payload eller target mot redan applicerat case ska stoppas som mapping conflict
7. Dokumentera avslut.
   - kontrollera att downstream application, correction requests och audit events är synliga
   - bekräfta att review item och activity spårar beslutet

## Verifiering

- import case visar korrekt completeness-status och blocker codes
- correction request syns som egen objektkedja med request-, decision- och actor-fält
- approval blockeras när correction request är öppen
- reject av correction request återställer inte case till `complete` om andra blockers återstår
- approve av correction request skapar replacement case i correction chain
- downstream apply är idempotent för samma command key + payload
- divergent replay ger `import_case_downstream_mapping_conflict`
- inget import case bokför direkt; endast downstream-domän kan fortsätta efter explicit apply

## Vanliga fel

- **Fel:** operatör försöker godkänna case trots öppna correction requests.  
  **Åtgärd:** stäng eller avslå correction request först och räkna om case.
- **Fel:** case ser komplett ut men VAT-belopp saknas.  
  **Åtgärd:** kontrollera att tullbevis finns och att VAT-komponenten registrerats uttryckligen.
- **Fel:** samma import case appliceras igen mot annan leverantörsfaktura eller annat objekt.  
  **Åtgärd:** stoppa som mapping conflict och öppna correction request om ursprunglig mappning är fel.
- **Fel:** upstream-klassificering har ändrats efter att importfallet skapats.  
  **Åtgärd:** öppna correction request och skapa replacement case i stället för att mutera befintligt case.

## Återställning

- skapa replacement case via correctionflow, skriv aldrig över tidigare import case
- korrigera dokumentlänkar eller components genom ny caseversion när redan godkänt case blivit fel
- om downstream apply blev felaktigt ska motsvarande downstream-domäns correction/reversal-flow användas; import case-historiken lämnas orörd

## Rollback

- rollback av kodändring sker via ny commit, inte genom att skriva över import case-data
- audit- och correction-historik i import case får aldrig raderas
- redan applicerat case rullas inte tillbaka i tysthet; ny correction request eller downstream correction krävs

## Ansvarig

- finance/compliance-operatör för review och approval
- support/backoffice vid incident eller mapping conflict
- domänägare för import/AP om downstream correction krävs

## Exit gate

- import case kan granskas, korrigeras, godkännas och appliceras utan otydliga blockers
- correction requests har tydlig human decision-kedja
- replay-safe downstream mapping är verifierad
- inga förbjudna autopostningar eller tysta mutationer finns i kedjan
