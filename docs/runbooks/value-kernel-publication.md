# Value Kernel Publication

## Syfte

Denna runbook styr hur `packages/domain-core/src/value-kernel.mjs` publiceras, verifieras och görs bindande för senare migrering av money-, rate-, quantity- och fx-semantik.

## Publiceringskrav

1. `VALUE_KERNEL_VERSION` ska uppdateras när semantiken ändras.
2. Rounding- och normaliseringsbeteende måste vara täckt av en golden unit-svit.
3. Publiceringen får inte ändra affärsdomäner tyst; senare ersättningar ska ske i egna delfaser.

## Minsta verifiering

- `node --test tests/unit/phase1-value-kernel.test.mjs`
- `node --check packages/domain-core/src/value-kernel.mjs`

## Evidence

- commit som introducerar eller ändrar value kernel
- grön unit-svit
- uppdaterad exportyta i `packages/domain-core/src/index.mjs` och `packages/domain-core/src/index.ts`

## Förbjudet

- nya lokala `roundMoney`-familjer som marknadsförs som canonical
- tyst ändring av scale/precision utan versionshopp
- att räkna value kernel som publicerad utan testbevis
