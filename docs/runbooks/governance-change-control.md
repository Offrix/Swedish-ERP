# Governance Change Control

## Syfte

Denna runbook styr hur bindande sanning får ändras efter att:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

har låsts som primär styrning.

## Primär sanning

Endast följande dokument är bindande för allt kvarvarande arbete före UI:

- `docs/implementation-control/GO_LIVE_ROADMAP.md`
- `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`

Alla andra dokument i repo:t är:

- historiska inputkällor
- stöddokument
- runbooks
- evidens eller analysunderlag

De får inte överstyra de två primära dokumenten.

## När denna runbook måste användas

Använd denna runbook när någon vill:

- ändra byggordning
- lägga till eller ta bort en fas eller delfas
- markera en fas som klar
- ändra produktkategori eller benchmark
- byta providerstrategi
- nedgradera eller uppgradera legacy-kod
- ändra trial/live-gränser
- ändra regulated logic, receipts, replay, recovery eller auditkrav

## Obligatorisk ändringsprocess

1. Identifiera vilken rad eller delfas i roadmapen som påverkas.
2. Identifiera vilken del i implementation-bibeln som påverkas.
3. Verifiera om ändringen är:
   - governance-städning
   - hardening
   - rewrite
   - replace
   - remove/deprecate
   - ny kapabilitet
4. Kontrollera om ändringen påverkar:
   - regulated logic
   - auth/security
   - provider/adapters
   - trial/live-isolering
   - cutover/migration
   - competitor parity
   - competitor advantage
5. Uppdatera båda primära dokumenten om ändringen påverkar båda.
6. Uppdatera stöddokument endast efter att primär sanning ändrats.
7. Lägg till eller uppdatera traceability-rad i `docs/implementation-control/ANALYSIS_TRACEABILITY_MATRIX.md` om ändringen påverkar tidigare analysfynd.
8. Lägg till tester, verifiering och runbooks om ändringen kräver det.

## Regler för att markera fas eller delfas som klar

En fas eller delfas får bara markeras som klar när:

- koden finns
- tester finns
- testerna är gröna
- nödvändiga runbooks finns
- exit gate i roadmapen är uppfylld
- motsvarande del i implementation-bibeln faktiskt är omsatt i repo-verklighet

Grön testsvit ensam räcker inte.

## Förbjudna genvägar

Följande är förbjudet:

- markera fas klar för att “det mesta finns”
- behandla shell-appar eller seeds som produktmognad
- räkna stub-provider som live coverage
- låta äldre master-control-dokument åter bli primär sanning
- ändra roadmapen utan motsvarande ändring i implementation-bibeln
- bygga utanför roadmapens ordning

## När dual review krävs

Dual review krävs för ändringar som rör:

- regulated flows
- providerbyten
- trial/live-gränser
- cutover/rollback
- impersonation/break-glass
- payroll tax, AGI, HUS, VAT, tax account
- product category och competitor benchmark

## Evidens

Varje governance-ändring ska dokumentera:

- varför ändringen gjordes
- vilken tidigare sanning som ersattes
- vilka faser/delfaser som påverkas
- vilka tester eller verifieringar som måste uppdateras

## Slutregel

Om en ändring inte kan kopplas till både roadmap och implementation-bibel är ändringen inte godkänd.
