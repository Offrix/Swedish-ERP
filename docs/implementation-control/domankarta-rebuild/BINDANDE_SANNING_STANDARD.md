# BINDANDE_SANNING_STANDARD

## Status

Detta dokument är bindande meta-sanning för varje fil som slutar med `_BINDANDE_SANNING.md` under `docs/implementation-control/domankarta-rebuild/`.

Ingen ny bindande sanning får skapas i tunnare, vagare eller mindre verifierbar form an `FAKTURAFLODET_BINDANDE_SANNING.md`.

## Syfte

Detta dokument definierar exakt hur varje bindande sanning måste skrivas, vilka sektioner som är obligatoriska, vilken detaljniva som krävs och vilka fel som är förbjudna.

Detta dokument styr:
- namnstandard
- sektionsordning
- detaljniva
- scenario- och proof-modell
- källkrav
- blockerregler
- testkrav
- tvärdomänskoppling

## Absoluta principer

- varje bindande sanning ska ensam kunna styra sitt flöde utan att läsaren gissar
- varje bindande sanning ska vara svart på vitt, inte intention eller riktning
- varje bindande sanning ska beskriva hur flödet fungerar, hur det bokför, hur det blockerar fel och hur det verifieras
- varje bindande sanning ska vara minst lika hard som `FAKTURAFLODET_BINDANDE_SANNING.md`
- om ett flöde paverkar bokföring, skatt, moms, AGI, HUS, bank eller rapportering måste exakta utfall anges
- om en sektion inte är tillämplig måste den fortfarande finnas och markeras `EJ TILLÄMPLIGT` med exakt motiv
- inga ord som `ungefar`, `typiskt`, `vanligen`, `kan vara`, `bör kunna` eller `normalt` får ersätta bindande regler
- ingen regel får sakna källtyp: officiell regel, canonical produktpolicy eller uttryckligt blockerkrav
- inga scenarier får dorras igenom på metadata utan proof-ledger, field blockers och expected outcome

## Namnstandard

Varje bindande sanning ska:
- ha ett filnamn i versaler med ASCII
- sluta med `_BINDANDE_SANNING.md`
- namnges efter verkligt flöde eller regelkarna, inte domännummer

Exempel:
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `LEVFAKTURAFLODET_BINDANDE_SANNING.md`
- `LONEFLODET_BINDANDE_SANNING.md`
- `MOMSFLODET_BINDANDE_SANNING.md`

## Tvingande sektionsordning

Varje bindande sanning måste ha exakt denna toppstruktur i samma ordning:

1. `## Status`
2. `## Syfte`
3. `## Omfattning`
4. `## Absoluta principer`
5. `## Bindande dokumenthierarki för <flöde>`
6. `## Kanoniska objekt`
7. `## Kanoniska state machines`
8. `## Kanoniska commands`
9. `## Kanoniska events`
10. `## Kanoniska route-familjer`
11. `## Kanoniska permissions och review boundaries`
12. `## Nummer-, serie-, referens- och identitetsregler`
13. `## Valuta-, avrundnings- och omräkningsregler`
14. `## Replay-, correction-, recovery- och cutover-regler`
15. `## Huvudflödet`
16. `## Bindande scenarioaxlar`
17. `## Bindande policykartor`
18. `## Bindande canonical proof-ledger med exakta konton eller faltutfall`
19. `## Bindande rapport-, export- och myndighetsmappning`
20. `## Bindande scenariofamilj till proof-ledger och rapportspar`
21. `## Tvingande dokument- eller indataregler`
22. `## Bindande legal reason-code-katalog eller specialorsakskatalog`
23. `## Bindande faltspec eller inputspec per profil`
24. `## Scenariofamiljer som hela systemet måste tacka`
25. `## Scenarioregler per familj`
26. `## Blockerande valideringar`
27. `## Rapport- och exportkonsekvenser`
28. `## Förbjudna förenklingar`
29. `## Fler bindande proof-ledger-regler för specialfall`
30. `## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger`
31. `## Bindande verifikations-, serie- och exportregler`
32. `## Bindande variantmatris som måste korsas mot varje scenariofamilj`
33. `## Bindande fixture-klasser för <flöde>`
34. `## Bindande expected outcome-format per scenario`
35. `## Bindande canonical verifikationsseriepolicy`
36. `## Bindande expected outcome per central scenariofamilj`
37. `## Bindande kompakt expected outcome-register för alla scenariofamiljer`
38. `## Bindande testkrav`
39. `## Källor som styr dokumentet`

Viktig precisering om rubriknamn:
- punkt 5 är flödesspecifik i sitt sista led och måste heta `## Bindande dokumenthierarki för <flöde>` eller motsvarande exakt flödesnamn
- punkt 33 är flödesspecifik i sitt sista led och måste heta `## Bindande fixture-klasser för <flöde>` eller motsvarande exakt flödesnamn
- övriga rubriker ska ligga i samma semantiska ordning även om de i några dokument behovar smala ordval för ett icke-bokföringsdrivet flöde
- validering mot standarden får darfor inte jamfora punkt 5 eller 33 mot ett enda kanoniskt fakturarubriknamn; den ska verifiera plats, semantik och att flödesnamnet är explicit

## Sektionsregler

### 1. Status till och med 5. Dokumenthierarki

Måste klargora:
- att dokumentet är bindande
- vilka domäner, masterfiler och ändra bindande sanningar som lutar på dokumentet
- vilka dokument som inte får definiera avvikande truth
- att rubriken uttryckligen namnger just det flöde eller den policyyta som dokumentet äger

### 6. Kanoniska objekt

Måste beskriva:
- exakt objektnamn
- exakt syfte
- exakt legal effect
- exact ownership
- exakt durability-krav

Om flödet paverkar pengar, skuld, fordran, skatt, moms eller AGI måste varje objekt ange:
- vilken ekonomisk sanning objektet bar
- om objektet är huvudboksskapande, reskontraskapande, rapportskapande eller bara bevis/receipt

### 7. State machines

Måste vara slutna och bindande:
- tillstand
- tillåtna övergångar
- otillåtna övergångar
- vilka commands som driver övergångarna
- vilka events som kvitterar dem

### 8. Commands och 9. Events

Måste vara:
- namngivna
- entydiga
- auditkritiska där legal effect finns
- kopplade till idempotency, concurrency och replay-regler

### 10. Route-familjer

Måste ange:
- vilka routefamiljer som är tillåtna
- vilka som uttryckligen inte får skriva legal truth
- vilka operations som måste vara command-only

### 11. Permissions och review boundaries

Måste ange:
- läsrätt
- utkast/förberedelser
- legal issue
- korrektion/kredit/rättelse
- high-risk approval
- support/backoffice-granser

### 12-14. Identitet, valuta, replay/cutover

Måste ange:
- nummerserier
- OCR/referensidentiteter
- valutaomrakning
- avrundningsregler
- correction/replay
- recovery
- cutover/import/rollback

### 15. Huvudflödet

Måste beskriva steg för steg:
- indata
- klassning
- review
- issue
- settlement
- correction
- reporting
- export
- closure

### 16. Scenarioaxlar

Måste vara en bindande permutationsmodell, inte bara en lista.

Varje dokument ska minst definiera alla axlar som kan ändra:
- skatt
- bokföring
- myndighetsrapport
- kanal
- identitet
- betal- eller regleringsutfall
- correction
- valuta
- periodisering
- migration/replay

### 17. Policykartor

Om flödet rör reglerad mapping måste dokumentet innehålla bindande kartor, till exempel:
- BAS-kontokarta
- momsrutekarta
- AGI-faltkarta
- skattekontomappning
- dokumentprofilkarta
- legal-reason-code-karta
- provider/profile-karta

### 18. Canonical proof-ledger

Om flödet paverkar bokföring måste det finnas en proof-ledger med:
- unika `P0001+`-liknande ids
- exakta konton
- exakta debet/kredit-regler
- exakt skatteeffekt
- exakt rapporteffekt

Om flödet inte är bokföringsdrivande måste motsvarande proof-tabell finnas för:
- fält
- state
- receipt
- export
- permission

### 19. Rapport-, export- och myndighetsmappning

Måste ange:
- exakt vilken rapport/export som paverkas
- exakt vilket fält eller vilken ruta som paverkas
- vilka scenarier som inte får mappas till rapport trots att de finns i runtime

### 20. Scenariofamilj till proof-ledger

Varje scenariofamilj måste peka till:
- minst en proof-regel
- minst en policykarta
- minst ett rapport-/exportspAr

### 21-23. Dokumentregler, legal codes och faltspec

Måste vara field-level och blockerande.

När specialregler finns, till exempel:
- ROT
- RUT
- grön teknik
- reverse charge
- export
- EU B2B
- VMB
- AGI
- SIE4

måste dokumentet uttryckligen lista:
- obligatoriska fält
- obligatoriska texter
- obligatoriska identiteter
- blockerregler om fält saknas

### 24. Scenariofamiljekatalog

Måste vara uttommande på familjeniva.
Ingen kategori får sakna familje-id.

Varje scenariofamilj måste ha:
- unikt scenario-id
- kort namn
- exakt syfte
- bindande koppling till proof-ledger

### 25. Scenarioregler per familj

Måste ange:
- vad scenariot betyder
- när det är tillatet
- när det är blockerande
- hur state paverkas
- hur bokföring/fält/export paverkas

### 26. Blockerande valideringar

Måste vara explicita, issue-blockerande eller settle-blockerande.

De får inte vara generella platityder.
De ska ga att bygga till faktisk runtime validation.

### 27. Rapport- och exportkonsekvenser

Måste ange exakt:
- vad som kommer med
- vad som inte kommer med
- när omklassning sker
- vilka receipts som måste finnas

### 28. Förbjudna förenklingar

Måste lista:
- UI-genvagar som är förbjudna
- metadataflaggor utan legal effect som är förbjudna
- auto-omklassning som är förbjuden
- stubs/fake-live som är förbjudna

### 29-31. Specialfall, subledger/state-effekt, serie/export

Måste finnas när flödet har:
- flera reskontror
- flera ledgerfamiljer
- flera exportspAr
- kanal-/myndighetsreceipts

### 32. Variantmatris

Måste beskriva hur scenariofamiljer korsas mot:
- motpart
- skatt
- valuta
- kanal
- correction
- period
- legal form
- payment/settlement
- migration source

Ingen scenariofamilj får markeras som tackt utan variantmatris.

### 33. Fixture-klasser

Måste ange bindande testfixture-klasser:
- normala belopp
- ore-/avrundningsfall
- grAnsvarden
- stora belopp
- negativa/korrektionsfall
- multi-line/mixade fall

### 34-37. Expected outcome

Måste ange:
- exakt format
- centrala scenarier fullt utskrivna
- kompakt register för resten
- exakt state/bokföring/export/rapport/receipt-resultat

### 38. Testkrav

Varje bindande sanning måste stalla hårda testkrav:
- unit
- integration
- e2e
- replay/recovery
- migration/cutover
- negative tests
- permutation coverage

Testkraven måste uttryckligen saga:
- vad som blockerar grönt
- vad som måste koras i CI
- vad som måste koras i release gate

### 39. Källor

Varje dokument måste:
- använda officiella primarkallor för regler
- använda officiell leverantörsdokumentation för integrationer
- lista källor explicit i dokumentet
- inte luta sig på sekundara bloggar när primarkalla finns

## Krav på bokföringsdrivande sanningsdokument

Om dokumentet rör pengar, moms, skatt, lön, reskontra eller rapportering är detta obligatoriskt:
- exakta BAS-konton
- exakta debet/kredit-regler
- exakta underkonton eller canonical defaultkonton
- exakta momsrutor eller AGI-fält
- exakta SIE4-/exporteffekter
- exakta reversal-/correction-regler

Det får inte sta:
- `bokas på relevant konto`
- `mappas enligt policy`
- `intäktskonto enligt klass`

I stallet måste dokumentet antingen:
- skriva exakta konton
- eller explicit peka till bindande kontopolicy med exakt konto-id per regel

## Krav på icke-bokföringsdrivande sanningsdokument

Om dokumentet inte är bokföringsdrivande måste det i stallet ha motsvarande precision för:
- identitetskrav
- state transitions
- permission boundaries
- callback/webhook validity
- receipt/evidence
- export/adapters
- security controls

## Krav på tvärdomänskoppling

Varje bindande sanning måste explicit ange:
- vilka ändra bindande sanningar den lutar på
- vilka ändra bindande sanningar som inte får definiera avvikande truth
- vilka domäner i master-roadmap och master-library som måste referera dokumentet

## Krav på sprak

Detta är tvingande:
- tydlig teknisk svenska
- inga marknadsfraser
- inga vaga sammanfattningar
- inga floskler
- inga dolda antäganden
- inga oforklarade akronymer utan första expansion
- inga kodningsskador, mojibake eller odefinierade replacement-tecken i bindande text
- fragetecken får bara förekomma i bindande dokument när de är en verklig del av:
  - en URL
  - ett uttryckligt frivilligt fält i en teknisk schema-/falspec
  - en faktisk fråga i analysisdokument
- om ett dokument tidigare haft `??`, `Ã`, `Â`, `�` eller ensamma `?` mitt i ord måste det normaliseras innan dokumentet får betraktas som bindande igen

## Förbjudet

- tunna dokument som bara sammanfattar riktning
- dokument som bara listar scenariofamiljer utan proof-regler
- dokument som bara listar konton utan scenarioregler
- dokument som bara listar tester utan expected outcome
- dokument som förutsatter att läsaren vet svensk regelmiljo
- dokument som skyller på att reglerna är "för många" för att skrivas ut
- dokument som blandar canonical policy med osaker rekommendation utan att skilja dem
- dokument som låter runtime metadata ersätta legal truth

## Godkännandekrav

En ny bindande sanning är inte klar forran allt detta är sant:
- filen följer tvingande sektionsordning
- inga sektioner saknas utan `EJ TILLÄMPLIGT`-förklaring
- scenariokatalogen är uttommande på familjeniva
- proof-ledger eller motsvarande proof-tabell finns
- blockerregler är explicit skrivna
- expected outcomes är explicit skrivna
- officiella källor är listade
- dokumentet är minst lika hart och detaljrikt som fakturabibeln

## Konsekvens

Om ett nytt bindande sanningsdokument inte uppfyller denna standard ska det:
- skrivas om
- inte refereras som bindande
- inte fa styra kod, test eller UI
