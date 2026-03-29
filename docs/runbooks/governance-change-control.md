> Statusnotis: Detta dokument Ã¤r inte primÃ¤r sanning. Bindande styrning fÃ¶re UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument Ã¤r historiskt input- eller stÃ¶ddokument och fÃ¥r inte Ã¶verstyra dem.
# Governance Change Control

## Syfte

Denna runbook styr hur bindande sanning fÃ¥r Ã¤ndras efter att:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

har lÃ¥sts som primÃ¤r styrning.

## PrimÃ¤r sanning

Endast fÃ¶ljande dokument Ã¤r bindande fÃ¶r allt kvarvarande arbete fÃ¶re UI:

- `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`

Alla andra dokument i repo:t Ã¤r:

- historiska inputkÃ¤llor
- stÃ¶ddokument
- runbooks
- evidens eller analysunderlag

De fÃ¥r inte Ã¶verstyra de tvÃ¥ primÃ¤ra dokumenten.

## NÃ¤r denna runbook mÃ¥ste anvÃ¤ndas

AnvÃ¤nd denna runbook nÃ¤r nÃ¥gon vill:

- Ã¤ndra byggordning
- lÃ¤gga till eller ta bort en fas eller delfas
- markera en fas som klar
- Ã¤ndra produktkategori eller benchmark
- byta providerstrategi
- nedgradera eller uppgradera legacy-kod
- Ã¤ndra trial/live-grÃ¤nser
- Ã¤ndra regulated logic, receipts, replay, recovery eller auditkrav

## Obligatorisk Ã¤ndringsprocess

1. Identifiera vilken rad eller delfas i roadmapen som pÃ¥verkas.
2. Identifiera vilken del i implementation-bibeln som pÃ¥verkas.
3. Verifiera om Ã¤ndringen Ã¤r:
   - governance-stÃ¤dning
   - hardening
   - rewrite
   - replace
   - remove/deprecate
   - ny kapabilitet
4. Kontrollera om Ã¤ndringen pÃ¥verkar:
   - regulated logic
   - auth/security
   - provider/adapters
   - trial/live-isolering
   - cutover/migration
   - competitor parity
   - competitor advantage
5. Uppdatera bÃ¥da primÃ¤ra dokumenten om Ã¤ndringen pÃ¥verkar bÃ¥da.
6. Uppdatera stÃ¶ddokument endast efter att primÃ¤r sanning Ã¤ndrats.
7. LÃ¤gg till eller uppdatera traceability-rad i `docs/implementation-control/ANALYSIS_TRACEABILITY_MATRIX.md` om Ã¤ndringen pÃ¥verkar tidigare analysfynd.
8. LÃ¤gg till tester, verifiering och runbooks om Ã¤ndringen krÃ¤ver det.

## Regler fÃ¶r att markera fas eller delfas som klar

En fas eller delfas fÃ¥r bara markeras som klar nÃ¤r:

- koden finns
- tester finns
- testerna Ã¤r grÃ¶na
- nÃ¶dvÃ¤ndiga runbooks finns
- exit gate i roadmapen Ã¤r uppfylld
- motsvarande del i implementation-bibeln faktiskt Ã¤r omsatt i repo-verklighet

GrÃ¶n testsvit ensam rÃ¤cker inte.

## FÃ¶rbjudna genvÃ¤gar

FÃ¶ljande Ã¤r fÃ¶rbjudet:

- markera fas klar fÃ¶r att â€œdet mesta finnsâ€
- behandla shell-appar eller seeds som produktmognad
- rÃ¤kna stub-provider som live coverage
- lÃ¥ta Ã¤ldre master-control-dokument Ã¥ter bli primÃ¤r sanning
- Ã¤ndra roadmapen utan motsvarande Ã¤ndring i implementation-bibeln
- bygga utanfÃ¶r roadmapens ordning

## NÃ¤r dual review krÃ¤vs

Dual review krÃ¤vs fÃ¶r Ã¤ndringar som rÃ¶r:

- regulated flows
- providerbyten
- trial/live-grÃ¤nser
- cutover/rollback
- impersonation/break-glass
- payroll tax, AGI, HUS, VAT, tax account
- product category och competitor benchmark

## Evidens

Varje governance-Ã¤ndring ska dokumentera:

- varfÃ¶r Ã¤ndringen gjordes
- vilken tidigare sanning som ersattes
- vilka faser/delfaser som pÃ¥verkas
- vilka tester eller verifieringar som mÃ¥ste uppdateras

## Slutregel

Om en Ã¤ndring inte kan kopplas till bÃ¥de roadmap och implementation-bibel Ã¤r Ã¤ndringen inte godkÃ¤nd.

