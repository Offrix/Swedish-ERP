# FAS 1 Auth And Onboarding Verification

Detta dokument sammanfattar resultatet av `P1-01`, `P1-02` och `P1-03`.

## P1-01 Organisation, roller och accesskontroll

- `domain-org-auth` modellerar bolag, bolagsanvandare, objektgrants, delegationer och attestkedjor.
- API:t blockerar cross-company access server-side.
- Delegationer ar datum- och scope-styrda och kan verifieras via `POST /v1/authz/check`.

## P1-02 Inloggning, sessioner och stark autentisering

- `auth-core` innehaller sessionshelpers, TOTP-stod, explicita auth-beslut och auditbara resultat.
- API:t har login/logout, sessionsrevokering, TOTP-verifiering, passkey-registrering/assertion och BankID-stub bakom provideraliaset `signicat-bankid`.
- Adminsessioner stannar i `pending` tills tva faktormetoder verifierats.

## P1-03 Bolagssetup och onboarding wizard

- Onboarding skapar bolag, adminkoppling och resumebar checklist state.
- Checklistan omfattar bolagsprofil, registreringar, kontoplansmall, momssetup och periodsetup.
- Slutforad onboarding aktiverar bolaget och sparar blueprint for kontoplans- och momssetup.

## Disable And Rollback

- Satt `PHASE1_AUTH_ONBOARDING_ENABLED=false` for att returnera `503` pa FAS 1-routes utan att stoppa API-processen.
- Databassidan anvander en framatrullande migrationsmodell; rollback sker med disable-strategi och efterfoljande korrigeringsmigration vid behov.

## Verifieringskommandon

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run verify:phase1
pnpm run db:migrate -- --dry-run
pnpm run db:seed -- --dry-run
pnpm run seed:demo -- --dry-run
```

## Verifierat

- bolag kan inte lasa andra bolags data via API
- delegation respekterar datum och scope
- servern blockerar otillatna actions
- sessioner kan aterkallas och blir ogiltiga direkt
- admins krav pa flerfaktorsautentisering verifieras
- audit events skapas for auth- och onboardinghandelser
- onboarding visar saknade steg, kan aterupptas och skapar komplett setup state
