> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Manual journals and corrections engine

Detta dokument definierar manuella verifikationer, korrigeringar, reverseringar, underlagskrav, attest och låsta perioder för svenska bolag.

## Scope

### Ingår

- manuella verifikationer som inte genereras av annan domän men som ändå måste bokföras kontrollerat
- korrigering av felbokningar genom delta-justering eller reversal plus ny korrekt verifikation
- automatiska och manuella reverseringar med framtida reverseringsdatum
- underlagskrav, reason codes, attestnivåer och kontroll av låsta perioder
- begränsningar för kontrollkonton och högriskkonton

### Ingår inte

- domänspecifika normalflöden såsom AR, AP, lön eller moms där egna motorer redan finns
- historisk import i stor skala; den delen ligger i opening balances- och historical import-dokumentet

### Systemgränser

- Manual journals-motorn äger journal draft, approval chain, scheduled reversal och correction request.
- Ledgern äger själva postningen och verifikationsnumret i serie A, V eller X enligt regel.
- Dokumentmotorn äger underlagsfiler men manual journals-motorn äger kravet att sådana finns.

## Hårda regler

1. Ingen postad verifikation får redigeras. Alla korrigeringar ska ske med ny verifikation.
2. Varje manuell verifikation ska ha tydligt syfte, ekonomisk händelse, datum, belopp, motpart när relevant och underlag som uppfyller bokföringslagens verifikationskrav.
3. Kontrollkonton för bank, kundfordringar, leverantörsskulder, moms, löneskatter och andra subledgers får inte bokas manuellt utan särskild behörighet och reason code.
4. Låsta perioder får inte bokas manuellt i utan formell reopen-process eller särskild rättelsemetod enligt policy.
5. Högriskjournaler ska ha fyrögonsprincip och, när policy kräver det, en attestant som inte deltagit i framtagandet.
6. Auto-reversal ska vara deterministisk och får inte skapa fler än en reversal för samma ursprungsverifikation.
7. Otydliga eller odokumenterade verifikationer får inte postas även om de balanserar.
8. Alla manuella journals och korrigeringar ska vara fullt auditerade och sökbara.

## Begrepp och entiteter

- **Manuell verifikation** — Verifikation skapad direkt av användare eller kontrollerad adminprocess.
- **Korrigeringsverifikation** — Ny verifikation som rättar en tidigare postad verifikation utan att skriva över historiken.
- **Reversal** — Spegelvänd journal som nollar hela eller delar av ursprunglig verifikation.
- **Auto-reversal** — Reversal som schemalagts på framtida datum, till exempel nästa periodstart.
- **Reason code** — Obligatorisk kod som förklarar varför manuell journal eller korrigering behövs.
- **Kontrollkonto** — Konto vars saldo normalt ska härledas från subledger eller särskilt regelverk och därför inte får manipuleras fritt.

## State machines

### Manual journal

- `draft -> validated -> pending_approval -> approved -> posted -> reversed`

- `validated` kräver balans, kontoexistens, öppet datum och komplett metadata.
- `posted` låser alla bokföringsfält. Endast nya korrigeringsobjekt får därefter skapas.
- `reversed` nås när full reversal bokats och länkats till originalet.

### Correction request

- `open -> approved -> executed -> cancelled`

- Korrigeringsförslag ska visa både bokförd nulägesbild och tänkt diff innan attest.
- `executed` kräver länk till skapad journal och eventuell reopen-referens.

### Scheduled reversal

- `planned -> ready -> posted -> failed -> cancelled`

- Samma ursprungsjournal får bara ha en aktiv scheduled reversal per reversaltyp.
- Misslyckad reversal ska gå till högriskkö eftersom period och saldo kan ha ändrats.

## Inputfält och valideringar

### Journal header och rader

#### Fält

- journaldatum, serie, beskrivning, reason code, ekonomisk händelse, motpart, underlagsreferens, dimensionskontext
- radkonto, debet/kredit, belopp i valuta och funktionell valuta, projekt, kostnadsställe, momskod när relevant

#### Valideringar

- debet och kredit ska balansera exakt
- konton måste vara aktiva och tillåtna för manuell användning
- rader mot kontrollkonto kräver särskild roll och extra attest
- datum i låst period ska blockeras om inte reopen eller särskild policykod finns

### Underlag och metadata

#### Fält

- fritekstförklaring, underlagsfiler, hänvisning till tidigare verifikation eller affärsobjekt, attestmatris, eventuell auto-reversal-dag

#### Valideringar

- förklaring får inte vara tom eller generisk
- underlag måste vara läsbart och länkat innan posting
- om auto-reversal anges måste reverseringsdatum vara framtida och i öppen eller planerad period

### Korrigering och reversal

#### Fält

- original journal id, korrigeringstyp, delmängd av rader eller full reversal, nytt korrekt belopp eller rätt konto, reopen- eller policyflagga

#### Valideringar

- samma original och korrigeringsversion får inte köras två gånger
- delvis reversal måste tydligt visa vilka rader som påverkas
- korrigering i senare period måste markera att originalperioden lämnas orörd

## Beslutsträd/regler

### Val mellan delta-korrigering och reversal

- Om endast en mindre del av en öppen period är fel kan delta-korrigering användas.
- Om hela händelsen är fel eller om reverseringslogik krävs för tydlighet ska full reversal plus ny korrekt journal användas.
- Efter hard close ska rättelse normalt ske i nästa öppna period om inte formell reopen godkänts.

### Attest och högriskregler

- Journaler över policygräns, mot kontrollkonto eller med manuell moms ska kräva extra atteststeg.
- Samma person får inte både skapa och slutattestera högriskjournal om SoD-regler kräver separation.
- Om journalen påverkar externa rapporter ska motorn varna om moms-, AGI- eller close-effekt.

### Auto-reversal

- Periodiseringar och vissa bokslutsjusteringar kan reverseras automatiskt på förutbestämt datum.
- Auto-reversal ska skapa länkad journal i serie V eller annan definierad serie med tydlig referens till ursprunget.
- Om målperioden är låst eller konto ej längre giltigt ska reversal gå till failure queue, inte tyst hoppas över.

## Posting intents till ledgern

| Händelse | Serie | Debet | Kredit | Kommentar |
| --- | --- | --- | --- | --- |
| Manuell verifikation | A | Valda debetkonton | Valda kreditkonton | Exakt linjekontering enligt användarens godkända input. |
| Full reversal av tidigare journal | V eller X | Tidigare kreditkonton | Tidigare debetkonton | Originaljournalen lämnas oförändrad men länkas till reversal. |
| Delta-korrigering | A eller V | Korrigeringsdifferens i debet | Korrigeringsdifferens i kredit | Endast den ekonomiska skillnaden bokas. |
| Schemalagd auto-reversal | V | Som reversal ovan | Som reversal ovan | Skapas av motorn på förutbestämt datum med stark länk till ursprunget. |

## Fel- och granskningsköer

- **manual_journal_review** — Journal balanserar men bryter mot policy, konto- eller attestregler.
- **evidence_missing** — Underlag eller fri förklaring saknas eller är otillräcklig.
- **control_account_override** — Försök att manuellt boka mot kontrollkonto utan rätt roll.
- **locked_period_exception** — Användaren försöker bokföra i låst period.
- **scheduled_reversal_failed** — Planerad reversal kunde inte postas på måldatum.
- **external_reporting_warning** — Journalen påverkar redan rapporterad moms, AGI eller close-period.

## Idempotens, spårbarhet och audit

- Varje manuell journal ska ha `draft_id` och `approval_version`; posting får bara ske en gång per version.
- Korrigeringsjournal ska bära referens till originaljournal och `correction_key` för att undvika dubletter.
- Schemalagda reverseringar ska låsas med `origin_journal_id + reversal_date + reversal_type`.
- Auditlogg ska spara vem som skrev fritext, vem som laddade upp underlag och vem som godkände slutligt beslut.
- Historik över redigeringsutkast ska bevaras men bara godkänd version får kunna postas.

## Golden tests

1. **Balanserad manuell journal**

- Skapa två rader som balanserar och har godkänt underlag.
- Förväntat utfall: går genom attest till serie A.

2. **Obalanserad journal**

- Skapa journal där debet != kredit.
- Förväntat utfall: blockeras i validation.

3. **Kontrollkonto utan behörighet**

- Försök boka direkt mot 1210.
- Förväntat utfall: control_account_override.

4. **Auto-reversal**

- Skapa periodisering med auto-reversal nästa månad.
- Förväntat utfall: länkad reversal bokas exakt en gång.

5. **Korrigering i stängd period**

- Försök rätta gammal period utan reopen.
- Förväntat utfall: warning och styrning till nästa öppna period eller reopen-process.

## Exit gate

- [ ] manuella journaler kräver fullständigt underlag och går igenom policybaserad attest
- [ ] korrigering och reversal är egna immutabla händelser med länkar till original
- [ ] låsta perioder och kontrollkonton är tekniskt skyddade
- [ ] schemalagda reverseringar kan köras idempotent och övervakas
- [ ] audit och sökbarhet räcker för intern kontroll och extern revision

