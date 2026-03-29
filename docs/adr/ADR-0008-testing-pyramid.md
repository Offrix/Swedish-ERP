> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0008 — Testing pyramid

Status: Accepted  
Date: 2026-03-21

## Decision

Vi använder en hård testpyramid med extra vikt på reglerade golden-data-tester.

## Pyramid

1. **Static checks**
   - lint
   - format
   - typecheck
   - forbidden dependency rules

2. **Unit tests**
   - rena funktioner
   - regelbeslut
   - mappingar

3. **Property tests**
   - debit = credit
   - moms summerar rätt
   - AGI-mappning har exakt ett giltigt utfall där så krävs
   - HUS-belopp kan inte bli negativt

4. **Contract tests**
   - API-kontrakt mellan UI och backend
   - adapterkontrakt mot externa tjänster
   - XML/JSON-schema för myndighetsfiler

5. **Golden tests**
   - momsfall
   - lönefall
   - förmånsfall
   - traktamentsfall
   - HUS-fall
   - personalliggare-fall
   - bokslutsfall

6. **Integration tests**
   - databas
   - köer
   - objektlagring
   - mail ingestion
   - bankflöden
   - Peppol-flöden

7. **E2E-tests**
   - affärsflöden från UI till bokföring till rapport

8. **Performance and resilience**
   - load
   - soak
   - chaos
   - disaster recovery

## Gate policy

- Reglerade förändringar får inte mergeas utan golden tests.
- Alla buggar som orsakat felbokning eller felrapportering ska resultera i ett nytt regressionstest.
- Testdata ska vara versionsstyrd och reproducerbar.

## Verification

- [ ] CI rapporterar testlager separat.
- [ ] Golden-testbibliotek finns per domän.
- [ ] Varje incident ger nytt regressionsfall.

