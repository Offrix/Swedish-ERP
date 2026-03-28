# Fas 14.6 Verification

Den här runbooken verifierar att personalliggare, ID06 och egenkontroll verkligen är härdade som separata vertikala pack ovanpå generell project/field core.

## Obligatoriska verifieringar

1. Kör route-contract- och metadata-gaten:

```powershell
node --test --test-isolation=none tests/integration/api-route-metadata.test.mjs
```

2. Kör access-matrisen för desktop-only kontrolläsningar:

```powershell
node --test --test-isolation=none tests/integration/phase14-surface-access-matrix-api.test.mjs
```

3. Kör separata API-flöden för varje pack:

```powershell
node --test --test-isolation=none tests/integration/phase29-personalliggare-identity-api.test.mjs
node --test --test-isolation=none tests/integration/phase28-id06-api.test.mjs
node --test --test-isolation=none tests/integration/phase30-egenkontroll-api.test.mjs
```

4. Kör domännivå för append-only- och signoff-regler:

```powershell
node --test --test-isolation=none tests/unit/phase29-personalliggare-industry-packs.test.mjs
node --test --test-isolation=none tests/unit/phase28-id06.test.mjs
node --test --test-isolation=none tests/unit/phase30-egenkontroll.test.mjs
```

## Måste vara sant innan fasen räknas som klar

- Personalliggare-attendance är separat sanning och kan korrigeras append-only.
- Trusted kiosk är obligatorisk för kioskfångst och kan inte kringgås.
- ID06 har verifieringskedja för företag, person, kort, workplace binding och evidence export.
- Egenkontroll blockerar signoff när deviationer är öppna och kräver riktig signoff-kedja.
- Publicerad route metadata innehåller de kritiska 14.6-ytorna.
- Publicerade muterande route contracts har explicita action classes för 14.6 och faller inte tillbaka på generiska derivat.
- Field users nekas personalliggare-, ID06- och egenkontroll-kontrolläsningar på desktop-only ytor.

## Rekommenderad full gate efter 14.6

```powershell
node scripts/run-tests.mjs all
node scripts/lint.mjs
node scripts/typecheck.mjs
node scripts/build.mjs
node scripts/security-scan.mjs
```
