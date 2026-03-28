> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Collective agreement intake verification

## Syfte

Verifiera att nya kollektivavtal tas in via support/backoffice, går genom intern extraktion och review, och bara publiceras eller lokalsupplementeras via styrda beslut.

## Forkrav

- repo ligger pa ratt branch och working tree ar forstadd
- Node och pnpm matchar laste verifierade versioner
- API-processen kan startas lokalt
- feature flags for HR, time och security/backoffice ar aktiva

## Steg for steg

1. Kor statiska kontroller:
   - `node scripts/lint.mjs`
   - `node scripts/typecheck.mjs`
   - `node scripts/build.mjs`
2. Kor riktade collective agreement-tester:
   - `node --test tests/unit/phase18-collective-agreements.test.mjs`
   - `node --test tests/integration/phase18-collective-agreements-api.test.mjs`
3. Verifiera att backoffice kan skapa intake case:
   - `POST /v1/backoffice/agreement-intake/cases`
4. Verifiera att intake case kan ga till extraction:
   - `POST /v1/backoffice/agreement-intake/cases/:agreementIntakeCaseId/start-extraction`
5. Verifiera reviewutfall:
   - `approved_for_publication` skapar version och publicerad catalog entry
   - `approved_for_local_supplement` skapar approved local supplement
   - `rejected` skapar inget aktiverbart objekt
6. Verifiera dropdown-katalog:
   - `GET /v1/collective-agreements/catalog`
7. Verifiera att tenant-anvandare inte kan aktivera opublicerade versioner:
   - assignment mot opublicerad version ska ge konflikt

## Required assertions

- inga tenant-rutter far skapa intake cases
- intake sker bara via backoffice
- review maste finnas innan catalog entry eller local supplement blir aktiverbar
- publicerad dropdown visar bara publicerade catalog entries
- assignment blockeras utan publicerad catalog entry eller approved local supplement

## Exit gate

- supportstyrd intake ar verifierad
- publicerad dropdown fungerar
- unpublished assignment blockeras
- local supplement skapas bara genom styrt reviewflode
