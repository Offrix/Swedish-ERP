> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Secret rotation

Detta runbook är den bindande 3.5-kedjan för hemligheter, callback-hemligheter och certifikat.

## Syfte

- separera vaults per mode
- registrera ägare, backup-ägare och rotationsfrekvens
- rotera hemligheter utan att blanda trial, sandbox, test, pilot och production
- hålla callback-overlap kort och spårbar
- verifiera rotation med smoke test innan gammal hemlighet pensioneras

## Objekt som måste finnas

- `ManagedSecret`
- `SecretRotationRecord`
- `CertificateChain`
- `CallbackSecret`

## Regler

1. Alla refs ska använda `vault://<mode>/<provider>/<secret-name>`.
2. `mode` får bara vara `trial`, `sandbox_internal`, `test`, `pilot_parallel` eller `production`.
3. Varje hemlighet måste ha ägare, backup-ägare och `rotationCadenceDays`.
4. Callback-hemligheter får bara dual-runnas under explicit overlap.
5. Certifikatkedjor måste bära `notAfter`, `renewalWindowDays` och private-key-ref i samma mode/provider.
6. Trial, sandbox, test, pilot och production får aldrig dela refs.

## Registrera inventory

1. Registrera managed secret via `POST /v1/ops/secrets`.
2. Registrera callback-hemlighet via `POST /v1/ops/callback-secrets`.
3. Registrera certifikatkedja via `POST /v1/ops/certificate-chains`.
4. Kontrollera inventory via:
   - `GET /v1/ops/secrets`
   - `GET /v1/ops/callback-secrets`
   - `GET /v1/ops/certificate-chains`

## Rotation

1. Skapa nytt secret i rätt vault för rätt mode/provider.
2. Kör `POST /v1/ops/secrets/:managedSecretId/rotate`.
3. Ange:
   - `nextSecretRef`
   - `verificationMode`
   - `dualRunningUntil` om callback-overlap krävs
   - länkade `callbackSecretIds` och `certificateChainIds` när det behövs
4. Kontrollera att rotationen loggats via `GET /v1/ops/secret-rotations`.
5. Kör smoke test:
   - `GET /v1/ops/observability?companyId=...`
   - kontrollera att `secretManagement.modeIsolationViolationCount = 0`
   - kontrollera att ny callback-hemlighet eller private key nu pekar på rätt redigerad ref
6. Efter verifierad overlap pensioneras tidigare hemlighet i vaulten utanför repo och hålls inte kvar längre än policyn tillåter.

## Smoke test

Efter varje rotation ska minst detta verifieras:

1. `verify_secret_refs` kan bekräfta den nya refen.
2. `GET /v1/ops/observability` visar inga isoleringsbrott.
3. Callback-secret står i `dual_running` endast under planerad overlap.
4. Certifikatkedja har inte passerat `renewalDueAt` eller `notAfter`.

## Rollback

1. Om smoke test fallerar under overlap:
   - återställ callback till tidigare hemlighet
   - kör ny rotation med fungerande ref
2. Om certifikatförnyelse fallerar:
   - håll gammal kedja aktiv där provider stöder det
   - skapa ny kedja i samma mode/provider
3. Om fel mode/provider användes:
   - rotera omedelbart bort fel ref
   - registrera korrekt ref
   - dokumentera incidenten i backoffice

## Exit gate

- [ ] varje managed secret har owner, backup owner och cadence
- [ ] callback secrets är mode-isolerade
- [ ] certificate chains har renewal window och private-key-ref i rätt vault
- [ ] minst ett smoke test körs efter rotation
- [ ] `GET /v1/ops/observability` visar `modeIsolationViolationCount = 0`

