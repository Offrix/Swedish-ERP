# Close checklists, blockers and sign-off

## Syfte

Detta dokument definierar checklistor, delmoment, blockers, sign-off chain, overrides, undantag och reopen för periodstängning och bokslut. Målet är att stängning bara ska kunna ske på explicit gröna kontrollpunkter och att alla öppna avvikelser, undantag och återöppningar ska vara fullt synliga i rapportering och audit.

## Scope

### Ingår

- versionsstyrda close-checklistor per bolag, periodtyp och regelprofil
- checklistesteg, delmoment, blockers, severity, owner och evidens
- sign-off chain, override, waiver, undantag och reopen
- policykoppling till close, correction, support access och access-attestation
- regler för vad som måste vara grönt innan stängning och hur återöppning påverkar rapporter

### Ingår inte

- själva avstämningsberäkningen; den ägs av respektive domän
- bokföringsrättelsen i detalj; den ägs av corrections-motorn
- allmän projekt- eller operativ task management som inte tillhör close-processen

### Systemgränser

- close checklist-domänen äger checklista, steg, blocker, sign-off package och reopen request
- källdomäner som bank, AR, AP, moms och ledger publicerar kontrollresultat
- policy avgör vilka blockers som är hårda, vilka undantag som är tillåtna och vilken sign-off-kedja som gäller

## Roller

- **Close owner** koordinerar periodens close och äger checklista på bolagsnivå.
- **Step owner** ansvarar för specifikt checklistesteg, till exempel bankavstämning eller momsavstämning.
- **Close reviewer** granskar uppladdad evidens och kan öppna blocker.
- **Close signatory** lämnar formell sign-off enligt kedjan.
- **CFO eller motsvarande** får godkänna override eller undantag över policygräns.
- **Auditor eller revisor** kan få läsrätt till evidens och historik men inte ändra state.

## Begrepp

- **Checklist template** — Den definierade struktur som används för att skapa periodens checklista.
- **Checklist instance** — Den faktiska checklistan för ett bolag och en period.
- **Checklist step** — Ett kontrollmål som måste utföras och dokumenteras.
- **Sub-step** — Detaljmoment under ett checklistesteg.
- **Blocker severity** — `informational`, `warning`, `hard_stop` eller `critical`.
- **Sign-off chain** — Den ordning i vilken roller måste godkänna en period.
- **Override** — Explicit beslut att passera blocker trots att den inte är tekniskt löst.
- **Exception / Undantag** — Dokumenterat undantag från standardkrav med giltighetstid och ägare.

## Objektmodell

### Checklist instance
- fält: `checklist_id`, `company_id`, `period_id`, `template_version`, `status`, `close_type`, `owner_user_id`, `signoff_state`, `evidence_snapshot_ref`
- invariant: en period får ha högst en aktiv checklist instance per close_type

### Checklist step
- fält: `step_id`, `step_code`, `title`, `owner_user_id`, `status`, `severity`, `requires_evidence`, `policy_binding`, `completed_at`, `completed_by`, `evidence_count`
- invariant: stegstatus får inte sättas till grönt om obligatorisk evidens saknas

### Blocker
- fält: `blocker_id`, `step_id`, `severity`, `reason_code`, `opened_by`, `opened_at`, `resolved_at`, `override_state`, `waiver_until`
- invariant: `hard_stop` och `critical` blocker måste vara lösta eller ha giltig override före slutlig sign-off

### Sign-off record
- fält: `signoff_id`, `checklist_id`, `signatory_role`, `signatory_user_id`, `decision`, `decision_at`, `evidence_snapshot_ref`, `comment`
- invariant: sign-off ska alltid peka på exakt checklistversion och exakt evidenssnapshot

## State machine

### Checklist instance
- `created -> in_progress -> review_ready -> signoff_pending -> signed_off -> closed`
- `signed_off -> reopened`
- `reopened -> in_progress`
- `closed` betyder att periodstatus och checklistans slutstatus harmoniserar

### Checklist step
- `not_started -> in_progress -> awaiting_review -> complete`
- `complete -> reopened`
- `in_progress -> blocked`
- `blocked -> in_progress` när blocker lösts

### Sign-off chain
- `not_started -> reviewer_signed -> finance_signed -> final_signed`
- om bolagets policy kräver färre eller fler led ska kedjan ändå materialiseras explicit i data, inte implicit i kod

## Användarflöden

### Skapa periodens checklista
1. Systemet instansierar checklistmall för bolag, periodtyp och regelprofil.
2. Steg och sub-steg får owner, severity och policybindning.
3. Källdomäner kopplas in som underlag eller automatiska stegresultat.

### Arbeta med steg och blockers
1. Step owner laddar upp evidens eller triggar automatisk kontroll.
2. Review eller kontrollmotor kan markera steget grönt eller öppna blocker.
3. Öppna blockers visas både i checklistan och i överordnad close-workbench.

### Sign-off och reopen
1. När alla steg som policy kräver är gröna går checklistan till `signoff_pending`.
2. Signatory granskar snapshot av checklista och evidens.
3. Om nytt fel upptäcks efter sign-off skapas reopen request.
4. Reopen återöppnar berörda steg, markerar tidigare sign-off som superseded och påverkar rapportpaket enligt regler nedan.

## Affärsregler

### Vad som måste vara grönt innan stängning
- alla obligatoriska steg ska vara `complete`
- inga öppna blockers med severity `hard_stop` eller `critical` får finnas
- alla overrides och undantag ska vara godkända av rätt nivå
- checklistan ska peka på komplett evidenssnapshot
- sign-off chain ska vara fullständig för aktuell policyprofil

### Policykoppling
- steg kan bindas till specifik policy, till exempel låsta perioder, manuella journaler eller klientgodkännande
- policyändring får inte mutera redan signerad checklista; i stället krävs ny version eller reopen
- undantag ska ha tydlig slutdag, owner och hänvisning till beslutsfattare

### Öppna avvikelser och blockerlogik
- `warning` får finnas kvar vid sign-off endast om policy uttryckligen tillåter det och det finns dokumenterad waiver
- `hard_stop` blockerar sign-off direkt
- `critical` blockerar både sign-off och periodlåsning samt kräver eskalering
- steg med öppna blockers får inte manuellt markeras som gröna av vanlig step owner

### Återöppningens effekt på rapporter och audit
- reopen ska markera tidigare rapporter, exports och approvals som potentiellt inaktuella
- periodens `closed_at` får inte raderas; ny close-cykel ska i stället skapas i historiken
- tidigare sign-off records ska ligga kvar som superseded med orsak till reopen
- alla downstream-objekt med dependence på checklistans snapshot ska kunna hitta att ny version finns

## Behörigheter

- `close_owner` får skapa checklista, omfördela steg och begära reopen
- `step_owner` får arbeta med eget steg men får inte godkänna egna overrides över policygräns
- `close_reviewer` får öppna blocker och godkänna evidens
- `close_signatory` får signera men inte hoppa över blocker utan uttrycklig override-rätt
- `cfo` eller motsvarande får godkänna undantag och override som policyn reserverar
- `auditor` har läsrätt till evidens och historik men inga stateövergångar

## Fel- och konfliktfall

- försök till sign-off med öppna `hard_stop` blockers ska nekas
- evidens som inte matchar stegtyp eller period ska ge `evidence_mismatch`
- reopen på redan återöppnad checklista ska vara idempotent men loggas
- borttaget eller otillgängligt evidensobjekt ska sätta checklistan i `review_required`
- override utan korrekt beslutsroll ska ge `override_not_authorized`

## Notifieringar

- step owner får notis när steg tilldelas, blocker öppnas eller deadline närmar sig
- close owner får notis vid nya `critical` blockers, saknad evidens och begärd reopen
- signatory får notis när checklistan är redo för nästa led i kedjan
- reopen ska ge notifiering till alla tidigare signatories och berörda rapportägare

## Audit trail

- varje stegstatus, blocker, evidenslänk, sign-off och reopen ska auditloggas
- auditspåret ska bevara exakt checklistversion, template-version och evidenssnapshot som användes vid varje beslut
- override och undantag ska logga beslutsfattare, skäl, giltighetstid och policyreferens
- systemet ska kunna visa hur en återöppning påverkade tidigare signerade rapporter och exports

## API/events/jobs

- kommandon: `instantiate_close_checklist`, `complete_checklist_step`, `open_close_blocker`, `resolve_close_blocker`, `request_reopen`, `approve_override`, `sign_off_checklist`
- events: `close_checklist_created`, `checklist_step_completed`, `close_blocker_opened`, `close_signed_off`, `close_reopened`
- jobb: `close_deadline_monitor`, `close_blocker_escalation_job`, `close_snapshot_builder`

## UI-krav

- checklistan ska visa steg, delmoment, owner, evidensstatus och blocker severity utan att användaren behöver öppna varje rad
- UI ska tydligt markera vad som är grönt, vad som har waiver och vad som blockerar
- sign-off-vyn ska låsa sig till en specifik evidenssnapshot och visa kedjan i ordning
- återöppning ska visa konsekvenser för rapporter, exports och tidigare approvals innan bekräftelse

## Testfall

1. skapa checklista med obligatoriska steg; förväntat utfall: alla steg i `not_started`
2. ladda evidens och markera steg klart; förväntat utfall: `complete`
3. öppna `hard_stop` blocker och försök signera; förväntat utfall: blockering
4. godkänn override med fel roll; förväntat utfall: nekad
5. signera komplett checklista; förväntat utfall: full kedja registrerad
6. återöppna signerad checklista; förväntat utfall: tidigare sign-off superseded, rapportpåverkan markerad

## Exit gate

- [ ] checklistor, steg, blockers och sign-off chain är versionsstyrda
- [ ] endast gröna eller korrekt undantagna steg tillåter sign-off
- [ ] reopen bevarar tidigare beslut och markerar downstream-påverkan
- [ ] override och undantag följer policy och auditkrav
- [ ] close-workbench kan tydligt visa vad som blockerar stängning
