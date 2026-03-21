# FAS 2 Document Archive Verification

Detta dokument beskriver vad som maste verifieras innan `P2-01` far markeras som klar.
FAS 2.1 ar inte verifierad i huvudrepot och inga resultat far skrivas in som genomforda
forran implementation, tester, migrationer och verifieringsscript finns pa plats.

## P2-01 Dokumentarkiv och metadata

Det som maste finnas innan delfasen far kryssas:

- dokumentarkivet skiljer mellan originalfil, derivatfil och metadatarekord
- dokumentobjekt bar hash, filstorlek, mime-typ, mottagningstid, kallkanal, bolag,
  periodkoppling och lankar till affarsobjekt
- versionering och kedjelankning gor att ny tolkning eller ny derivatfil inte skriver over
  originalet
- duplikat kan upptackas via hash, filfingeravtryck och kallreferens utan att legitim ny
  version blockeras

## Verifieringskrav

Foljande maste kunna visas med kod, tester och verifieringskommandon:

- original och derivat skiljs at
- export av dokumentkedja fungerar
- duplikat upptacks
- audit-spar kan foljas fran dokumentmottagning till lankat affarsobjekt

## Verifieringskommandon

Minimikrav innan delfasen far kryssas:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

FAS 2.1 far inte markeras som klar forran repo:t dessutom innehaller:

- en fas-specifik migration for dokumentarkivet
- fas-specifika tester for dokumentkedja, dubblettdetektion och export
- ett fas-specifikt verifieringsscript eller likvardig verifieringskedja

## Disable And Rollback

Nar FAS 2.1 senare implementeras ska dokumentarkivet kunna stoppas med en explicit
disable-strategi utan att existerande metadata eller revisionsspar skrivs over. Eventuell
rollback ska ske med framatrullande korrigeringsmigration, inte med omskrivning av historik.
